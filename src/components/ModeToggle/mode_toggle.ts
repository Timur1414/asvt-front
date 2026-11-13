import {BaseComponent} from "../base_component.ts";
import template from "./mode_toggle.hbs?raw";
import "./mode_toggle.css";
import {set_mode} from "../../store/store.ts";
import {toggle_mode} from "../../api/mode.ts";

export interface ModeToggleProps {
    mode_on: boolean;
}

export class ModeToggle extends BaseComponent {
    constructor(props: ModeToggleProps) {
        super(template, props);
    }

    _afterRender() {
        const input = this.getElement()?.querySelector<HTMLInputElement>("#mode-toggle-checkbox");
        if (!input)
            return;

        this._on(input, "change", async () => {
            set_mode(input.checked);
            await toggle_mode(input.checked);
        });
    }
}
