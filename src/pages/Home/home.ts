import { BasePage } from "../base_page.ts";
import template from "./home.hbs?raw";
import "./home.css";
import Handlebars from "handlebars";
import { StreamComponent } from "../../components/Stream/stream.ts";
import type { StreamEventType } from "../../types/props_interfaces.ts";

export class HomePage extends BasePage {
    private _streamComponent: StreamComponent | null = null;
    private _logContainer: HTMLElement | null = null;

    async render(root: HTMLElement): Promise<void> {
        const compiledTemplate = Handlebars.compile(template);
        root.innerHTML = compiledTemplate({}).trim();

        const streamMountPoint = root.querySelector<HTMLElement>("#stream-mount-point");
        this._logContainer = root.querySelector<HTMLElement>("#event-log-container");

        const streamUrl: string = import.meta.env.VITE_HLS_URL || "";

        this._streamComponent = new StreamComponent({
            stream_url: streamUrl,
            onLogEvent: (message: string, type: StreamEventType) => {
                this._addLogEntry(message, type);
            },
            onStatusChange: (status: 'connecting' | 'live' | 'paused' | 'error') => {
                this._updateStatusTelemetry(status);
            },
        });

        this._components.push(this._streamComponent);

        if (streamMountPoint) {
            this._streamComponent.render(streamMountPoint);
        }

        this._initPageActions(root, streamUrl);
        this._addLogEntry("Веб-клиент мониторинга успешно запущен", "info");
    }

    private _initPageActions(root: HTMLElement, streamUrl: string): void {
        const snapshotBtn: HTMLButtonElement | null = root.querySelector<HTMLButtonElement>("#btn-header-snapshot");
        snapshotBtn?.addEventListener("click", () => {
            this._streamComponent?.takeSnapshot();
        });

        const copyLinkBtn: HTMLButtonElement | null = root.querySelector<HTMLButtonElement>("#btn-header-copy-link");
        copyLinkBtn?.addEventListener("click", async () => {
            try {
                if (streamUrl) {
                    await navigator.clipboard.writeText(streamUrl);
                    this._streamComponent?.showToast("Ссылка на HLS поток скопирована!");
                    this._addLogEntry("URL потока скопирован в буфер обмена", "info");
                } else {
                    this._streamComponent?.showToast("URL потока не задан");
                }
            } catch (e) {
                console.error("Clipboard copy error:", e);
                this._streamComponent?.showToast("Не удалось скопировать ссылку");
            }
        });

        const clearLogsBtn: HTMLButtonElement | null = root.querySelector<HTMLButtonElement>("#btn-clear-logs");
        clearLogsBtn?.addEventListener("click", () => {
            if (this._logContainer) {
                this._logContainer.innerHTML = "";
                this._addLogEntry("Журнал событий очищен", "info");
            }
        });
    }

    private _updateStatusTelemetry(status: 'connecting' | 'live' | 'paused' | 'error'): void {
        const syncStatusEl: HTMLElement | null = document.getElementById("telemetry-sync-status");
        if (!syncStatusEl) return;

        if (status === 'live') {
            syncStatusEl.textContent = "Синхронизировано (Online)";
            syncStatusEl.className = "info-metric__value info-metric__value--active";
        } else if (status === 'connecting') {
            syncStatusEl.textContent = "Соединение...";
            syncStatusEl.className = "info-metric__value info-metric__value--warning";
        } else if (status === 'paused') {
            syncStatusEl.textContent = "Приостановлено";
            syncStatusEl.className = "info-metric__value";
        } else {
            syncStatusEl.textContent = "Ошибка соединения";
            syncStatusEl.className = "info-metric__value info-metric__value--error";
        }
    }

    private _addLogEntry(message: string, type: StreamEventType = 'info'): void {
        if (!this._logContainer) return;

        const time: string = new Date().toLocaleTimeString("ru-RU", { hour12: false });
        const entry: HTMLDivElement = document.createElement("div");
        entry.className = `event-log-entry event-log-entry--${type}`;

        entry.innerHTML = `
            <span class="event-log-entry__time">[${time}]</span>
            <span class="event-log-entry__tag">${type.toUpperCase()}</span>
            <span class="event-log-entry__msg">${this._escapeHtml(message)}</span>
        `;

        this._logContainer.insertBefore(entry, this._logContainer.firstChild);

        while (this._logContainer.children.length > 40) {
            this._logContainer.lastElementChild?.remove();
        }
    }

    private _escapeHtml(text: string): string {
        const div: HTMLDivElement = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    destroy(): void {
        this._streamComponent = null;
        this._logContainer = null;
        super.destroy();
    }
}
