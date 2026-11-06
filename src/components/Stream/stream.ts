import {BaseComponent} from "../base_component.ts";
import template from "./stream.hbs?raw";
import "./stream.css";
import Hls from "hls.js";
import type {StreamComponentProps} from "../../types/props_interfaces.ts";

export class StreamComponent extends BaseComponent {
    readonly streamUrl: string;

    constructor(props: StreamComponentProps) {
        super(template, props);
        this.streamUrl = props.stream_url;
    }

    render(container: HTMLElement) {
        super.render(container);
        const video: HTMLVideoElement | null | undefined = container.querySelector<HTMLVideoElement>('.stream_video_player');
        if (!video)
            return;
        console.log('!')
        if (Hls.isSupported()) {
            const hls = new Hls();
            console.log(this.streamUrl)
            hls.loadSource(this.streamUrl);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                console.log('HLS поток готов к воспроизведению');
                video.play();
            });
        }
    }
}
