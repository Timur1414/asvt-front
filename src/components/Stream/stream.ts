import { BaseComponent } from "../base_component.ts";
import template from "./stream.hbs?raw";
import "./stream.css";
import Hls from "hls.js";
import type { StreamComponentProps, StreamEventType } from "../../types/props_interfaces.ts";

export class StreamComponent extends BaseComponent {
    readonly streamUrl: string;
    private _hls: Hls | null = null;
    private _clockInterval: number | null = null;
    private _toastTimeout: number | null = null;
    private _videoEl: HTMLVideoElement | null = null;
    private readonly _onLogEvent?: (message: string, type: StreamEventType) => void;
    private readonly _onStatusChange?: (status: 'connecting' | 'live' | 'paused' | 'error') => void;
    private _retryCount: number = 0;
    private _maxRetries: number = 5;

    constructor(props: StreamComponentProps) {
        super(template, props);
        this.streamUrl = props.stream_url || "";
        this._onLogEvent = props.onLogEvent;
        this._onStatusChange = props.onStatusChange;
    }

    _afterRender(): void {
        const root: HTMLElement | null = this.getElement();
        if (!root) return;

        this._videoEl = root.querySelector<HTMLVideoElement>("#stream-video");
        if (!this._videoEl) return;

        this._initClock();
        this._initControls();
        this._initVideoListeners();
        this._connectStream();
    }

    private _log(message: string, type: StreamEventType = 'info'): void {
        console.log(`[Stream] [${type.toUpperCase()}] ${message}`);
        if (this._onLogEvent) {
            this._onLogEvent(message, type);
        }
    }

    private _setStatus(status: 'connecting' | 'live' | 'paused' | 'error', message?: string): void {
        const root: HTMLElement | null = this.getElement();
        if (!root) return;

        const badge: HTMLElement | null = root.querySelector<HTMLElement>("#stream-status-badge");
        const dot: HTMLElement | null = root.querySelector<HTMLElement>("#stream-live-indicator");
        const overlay: HTMLElement | null = root.querySelector<HTMLElement>("#stream-overlay");
        const overlayText: HTMLElement | null = root.querySelector<HTMLElement>("#stream-overlay-text");
        const spinner: HTMLElement | null = root.querySelector<HTMLElement>("#stream-spinner");
        const retryBtn: HTMLElement | null = root.querySelector<HTMLElement>("#stream-retry-btn");

        if (this._onStatusChange) {
            this._onStatusChange(status);
        }

        if (status === 'live') {
            if (badge) {
                badge.textContent = "В ЭФИРЕ";
                badge.className = "stream-badge stream-badge--status stream-badge--live";
            }
            if (dot) dot.className = "stream-card__live-dot stream-card__live-dot--active";
            if (overlay) overlay.classList.add("stream-overlay--hidden");
            if (spinner) spinner.style.display = "block";
            if (retryBtn) retryBtn.style.display = "none";
        } else if (status === 'connecting') {
            if (badge) {
                badge.textContent = "ПОДКЛЮЧЕНИЕ";
                badge.className = "stream-badge stream-badge--status stream-badge--connecting";
            }
            if (dot) dot.className = "stream-card__live-dot stream-card__live-dot--pending";
            if (overlay) overlay.classList.remove("stream-overlay--hidden");
            if (overlayText) overlayText.textContent = message || "Подключение к видеопотоку...";
            if (spinner) spinner.style.display = "block";
            if (retryBtn) retryBtn.style.display = "none";
        } else if (status === 'paused') {
            if (badge) {
                badge.textContent = "ПАУЗА";
                badge.className = "stream-badge stream-badge--status stream-badge--paused";
            }
            if (dot) dot.className = "stream-card__live-dot stream-card__live-dot--paused";
        } else if (status === 'error') {
            if (badge) {
                badge.textContent = "НЕДОСТУПЕН";
                badge.className = "stream-badge stream-badge--status stream-badge--error";
            }
            if (dot) dot.className = "stream-card__live-dot stream-card__live-dot--error";
            if (overlay) overlay.classList.remove("stream-overlay--hidden");
            if (overlayText) overlayText.textContent = message || "Поток временно недоступен";
            if (spinner) spinner.style.display = "none";
            if (retryBtn) retryBtn.style.display = "inline-flex";
        }
    }

    private _connectStream(): void {
        const video: HTMLVideoElement | null = this._videoEl;
        if (!video) return;

        if (!this.streamUrl) {
            this._setStatus('error', "URL потока не задан в конфигурации (.env)");
            this._log("URL потока не настроен (VITE_HLS_URL)", "warn");
            return;
        }

        this._setStatus('connecting', `Подключение: ${this.streamUrl}`);
        this._log(`Инициализация источника: ${this.streamUrl}`, 'info');

        this._destroyHls();

        if (Hls.isSupported()) {
            this._hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 30,
                manifestLoadingMaxRetry: 4,
                manifestLoadingRetryDelay: 1000,
            });

            this._hls.attachMedia(video);

            this._hls.on(Hls.Events.MEDIA_ATTACHED, () => {
                this._hls?.loadSource(this.streamUrl);
            });

            this._hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
                this._retryCount = 0;
                this._log(`HLS манифест успешно прочитан (${data.levels.length} уровней качества)`, 'success');
                video.play().catch((err: any) => {
                    console.warn("Autoplay blocked or prevented:", err);
                    this._log("Автовоспроизведение заблокировано браузером. Нажмите Play", "warn");
                });
            });

            this._hls.on(Hls.Events.LEVEL_LOADED, (_event, data) => {
                const targetDuration: number = data.details.targetduration;
                const fpsBadge: Element | null | undefined = this.getElement()?.querySelector("#stream-fps-badge");
                if (fpsBadge && targetDuration) {
                    fpsBadge.textContent = `HLS • ${Math.round(targetDuration)}s chunk`;
                }
            });

            this._hls.on(Hls.Events.ERROR, (_event, data) => {
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            this._log(`Сетевая ошибка потока: ${data.details}`, 'error');
                            this._handleNetworkError();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            this._log(`Ошибка декодирования медиа: ${data.details}`, 'error');
                            this._hls?.recoverMediaError();
                            break;
                        default:
                            this._log(`Неустранимая ошибка HLS: ${data.details}`, 'error');
                            this._destroyHls();
                            this._setStatus('error', "Ошибка загрузки видеопотока");
                            break;
                    }
                }
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Safari (native HLS)
            video.src = this.streamUrl;
            video.addEventListener('loadedmetadata', () => {
                video.play().catch(console.warn);
            });
            this._log("Используется нативный HLS-плеер браузера", "info");
        } else {
            this._setStatus('error', "Ваш браузер не поддерживает HLS воспроизведение");
            this._log("HLS не поддерживается в данном браузере", "error");
        }
    }

    private _handleNetworkError(): void {
        this._retryCount++;
        if (this._retryCount <= this._maxRetries) {
            this._setStatus('connecting', `Переподключение (попытка ${this._retryCount}/${this._maxRetries})...`);
            this._log(`Попытка переподключения #${this._retryCount}`, 'warn');
            this._hls?.startLoad();
        } else {
            this._setStatus('error', "Сервер камеры недоступен. Проверьте соединение.");
            this._log("Превышено число попыток повторного подключения", "error");
        }
    }

    private _initVideoListeners(): void {
        const video: HTMLVideoElement | null = this._videoEl;
        if (!video) return;

        video.addEventListener('playing', () => {
            this._setStatus('live');
            this._updatePlayButtonState(true);
            this._log("Воспроизведение активно (эфир)", "success");
        });

        video.addEventListener('pause', () => {
            if (!video.ended) {
                this._setStatus('paused');
                this._updatePlayButtonState(false);
                this._log("Воспроизведение приостановлено", "info");
            }
        });

        video.addEventListener('waiting', () => {
            this._setStatus('connecting', "Буферизация потока...");
        });

        video.addEventListener('loadedmetadata', () => {
            this._updateResolution();
        });

        video.addEventListener('resize', () => {
            this._updateResolution();
        });

        video.addEventListener('volumechange', () => {
            this._updateVolumeButtonState();
        });
    }

    private _updateResolution(): void {
        const video: HTMLVideoElement | null = this._videoEl;
        const resBadge: Element | null | undefined = this.getElement()?.querySelector("#stream-resolution-badge");
        if (video && resBadge && video.videoWidth && video.videoHeight) {
            resBadge.textContent = `${video.videoWidth} × ${video.videoHeight}`;
        }
    }

    private _initClock(): void {
        const updateClock = () => {
            const clockEl: Element | null | undefined = this.getElement()?.querySelector("#stream-hud-clock");
            if (clockEl) {
                const d = new Date();
                clockEl.textContent = d.toLocaleTimeString('ru-RU', { hour12: false });
            }
        };
        updateClock();
        this._clockInterval = window.setInterval(updateClock, 1000);
    }

    private _initControls(): void {
        const root: HTMLElement | null = this.getElement();
        if (!root || !this._videoEl) return;

        const playPauseBtn: Element | null = root.querySelector("#ctrl-play-pause");
        playPauseBtn?.addEventListener('click', () => {
            if (this._videoEl?.paused) {
                this._videoEl.play();
            } else {
                this._videoEl?.pause();
            }
        });

        const muteBtn: Element | null = root.querySelector("#ctrl-mute");
        muteBtn?.addEventListener('click', () => {
            if (!this._videoEl) return;
            this._videoEl.muted = !this._videoEl.muted;
            this._updateVolumeButtonState();
            this.showToast(this._videoEl.muted ? "Звук отключен" : "Звук включен");
        });

        const liveSyncBtn: Element | null = root.querySelector("#ctrl-live-sync");
        liveSyncBtn?.addEventListener('click', () => {
            if (this._hls && this._videoEl) {
                const liveSyncPosition: number | null = this._hls.liveSyncPosition;
                if (liveSyncPosition) {
                    this._videoEl.currentTime = liveSyncPosition;
                }
                this._videoEl.play();
                this.showToast("Синхронизировано с прямым эфиром");
            }
        });

        const snapshotBtn: Element | null = root.querySelector("#ctrl-snapshot");
        snapshotBtn?.addEventListener('click', () => {
            this.takeSnapshot();
        });

        const reloadBtn: Element | null = root.querySelector("#ctrl-reload");
        reloadBtn?.addEventListener('click', () => {
            this._retryCount = 0;
            this._connectStream();
            this.showToast("Перезапуск видеопотока...");
        });

        const retryBtn: Element | null = root.querySelector("#stream-retry-btn");
        retryBtn?.addEventListener('click', () => {
            this._retryCount = 0;
            this._connectStream();
        });

        const pipBtn: Element | null = root.querySelector("#ctrl-pip");
        if (!document.pictureInPictureEnabled) {
            (pipBtn as HTMLElement)?.setAttribute("style", "display:none;");
        } else {
            pipBtn?.addEventListener('click', async () => {
                try {
                    if (document.pictureInPictureElement) {
                        await document.exitPictureInPicture();
                    } else if (this._videoEl) {
                        await this._videoEl.requestPictureInPicture();
                    }
                } catch (err) {
                    console.error("PiP error:", err);
                    this.showToast("Режим «Картинка в картинке» недоступен");
                }
            });
        }

        const theaterBtn: Element | null = root.querySelector("#ctrl-theater");
        theaterBtn?.addEventListener('click', () => {
            const card: Element | null = root.querySelector(".stream-card");
            card?.classList.toggle("stream-card--theater");
            const isTheater: boolean | undefined = card?.classList.contains("stream-card--theater");
            this.showToast(isTheater ? "Режим широкого экрана включен" : "Стандартный вид");
        });

        const fsBtn: Element | null = root.querySelector("#ctrl-fullscreen");
        const wrapper = root.querySelector("#stream-player-wrapper") as HTMLElement;
        fsBtn?.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                wrapper?.requestFullscreen().catch(err => {
                    console.error("Fullscreen error:", err);
                });
            } else {
                document.exitFullscreen().catch(console.error);
            }
        });

        document.addEventListener('fullscreenchange', () => {
            this._updateFullscreenState();
        });
    }

    private _updatePlayButtonState(isPlaying: boolean): void {
        const root: HTMLElement | null = this.getElement();
        const pauseIcon: HTMLElement | null | undefined = root?.querySelector<HTMLElement>(".icon-pause");
        const playIcon: HTMLElement | null | undefined = root?.querySelector<HTMLElement>(".icon-play");
        if (pauseIcon && playIcon) {
            pauseIcon.style.display = isPlaying ? "block" : "none";
            playIcon.style.display = isPlaying ? "none" : "block";
        }
    }

    private _updateVolumeButtonState(): void {
        const root: HTMLElement | null = this.getElement();
        const isMuted: boolean = !!this._videoEl?.muted;
        const iconMuted: HTMLElement | null | undefined = root?.querySelector<HTMLElement>(".icon-vol-muted");
        const iconHigh: HTMLElement | null | undefined = root?.querySelector<HTMLElement>(".icon-vol-high");
        if (iconMuted && iconHigh) {
            iconMuted.style.display = isMuted ? "block" : "none";
            iconHigh.style.display = isMuted ? "none" : "block";
        }
    }

    private _updateFullscreenState(): void {
        const root: HTMLElement | null = this.getElement();
        const isFs: boolean = !!document.fullscreenElement;
        const iconEnter: HTMLElement | null | undefined = root?.querySelector<HTMLElement>(".icon-enter-fullscreen");
        const iconExit: HTMLElement | null | undefined = root?.querySelector<HTMLElement>(".icon-exit-fullscreen");
        if (iconEnter && iconExit) {
            iconEnter.style.display = isFs ? "none" : "block";
            iconExit.style.display = isFs ? "block" : "none";
        }
    }

    public takeSnapshot(): void {
        const video: HTMLVideoElement | null = this._videoEl;
        if (!video || !video.videoWidth || !video.videoHeight) {
            this.showToast("Снимок невозможен: кадры видео ещё не загружены");
            this._log("Ошибка снимка: отсутствует активный видеокадр", "warn");
            return;
        }

        try {
            const canvas: HTMLCanvasElement = document.createElement("canvas");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx: CanvasRenderingContext2D | null = canvas.getContext("2d");
            if (!ctx) return;

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const now = new Date();
            const timeStr: string = now.toLocaleString('ru-RU');
            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            ctx.fillRect(10, canvas.height - 40, 340, 30);
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 16px monospace";
            ctx.fillText(`CAM-01 • ${timeStr}`, 18, canvas.height - 19);

            const dataUrl: string = canvas.toDataURL("image/png");
            const a: HTMLAnchorElement = document.createElement("a");
            const fileTimestamp: string = now.toISOString().replace(/[:.]/g, "-");
            a.download = `snapshot-cam01-${fileTimestamp}.png`;
            a.href = dataUrl;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            this.showToast("Снимок кадра успешно сохранён!");
            this._log(`Снимок кадра сохранён: snapshot-cam01-${fileTimestamp}.png`, 'success');

            const wrapper: Element | null | undefined = this.getElement()?.querySelector("#stream-player-wrapper");
            wrapper?.classList.add("stream-player-wrapper--flash");
            setTimeout(() => {
                wrapper?.classList.remove("stream-player-wrapper--flash");
            }, 300);
        } catch (err) {
            console.error("Snapshot error (possibly CORS):", err);
            this.showToast("Не удалось сохранить снимок (CORS ограничение потока)");
            this._log("Ошибка захвата кадра через Canvas (CORS)", "error");
        }
    }

    public showToast(text: string): void {
        const toast: HTMLElement | null | undefined = this.getElement()?.querySelector<HTMLElement>("#stream-toast");
        if (!toast) return;

        toast.textContent = text;
        toast.classList.add("stream-toast--visible");

        if (this._toastTimeout) {
            clearTimeout(this._toastTimeout);
        }
        this._toastTimeout = window.setTimeout(() => {
            toast.classList.remove("stream-toast--visible");
        }, 3000);
    }

    private _destroyHls(): void {
        if (this._hls) {
            this._hls.destroy();
            this._hls = null;
        }
    }

    destroy(): void {
        if (this._clockInterval !== null) {
            clearInterval(this._clockInterval);
            this._clockInterval = null;
        }
        if (this._toastTimeout !== null) {
            clearTimeout(this._toastTimeout);
            this._toastTimeout = null;
        }
        this._destroyHls();
        if (this._videoEl) {
            this._videoEl.src = "";
            this._videoEl.load();
            this._videoEl = null;
        }
        super.destroy();
    }
}
