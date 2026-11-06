import {BasePage} from "../base_page.ts";
import template from "./home.hbs?raw";
import "./home.css";
import Handlebars from "handlebars";
import {StreamComponent} from "../../components/Stream/stream.ts";

export class HomePage extends BasePage {
    async render(root: HTMLElement): Promise<void> {
        const compiledTemplate = Handlebars.compile(template);
        root.innerHTML = compiledTemplate({}).trim();

        const stream_root: HTMLElement | null | undefined = root.querySelector<HTMLElement>(".home_container");
        if (!stream_root)
            return;
        console.log("env", import.meta.env.VITE_HLS_URL);
        const stream_component: StreamComponent = new StreamComponent({
            stream_url: import.meta.env.VITE_HLS_URL,
        });
        stream_component.render(stream_root);
    }
}
