import {BaseComponent} from "../base_component.ts";
import template from "./main_menu.hbs?raw";
import "./main_menu.css";
import type {MainMenuProps} from "../../types/props_interfaces.ts";

export class MainMenu extends BaseComponent {
    constructor(props: MainMenuProps) {
        super(template, props);
    }

    _addEventListeners() {
        window.addEventListener("load", () => {
            setTimeout(() => {
                const iframe: HTMLIFrameElement | null = document.querySelector("iframe");
                if (!iframe)
                    return;
                const target_url: string = iframe.dataset.src || "https://example.com/";
                iframe.contentWindow?.location.replace(target_url);
            }, 50);
        });
    }
}