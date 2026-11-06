import {BaseComponent} from "../base_component.ts";
import template from "./stream.hbs?raw";
import "./stream.css";
import Hls from "hls.js";

export class StreamComponent extends BaseComponent {
    constructor(props: any) {
        super(template, props);
    }

    render(container: HTMLElement) {
        super.render(container);
        const video: HTMLVideoElement | null | undefined = container.querySelector<HTMLVideoElement>('.stream_video_player');
        if (!video)
            return;
        const streamUrl: string = "http://95.163.220.75:8888/mystream/index.m3u8";
        if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(streamUrl);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                console.log('HLS поток готов к воспроизведению');
                video.play();
            });
        }
    }
}
