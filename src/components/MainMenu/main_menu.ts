import { BaseComponent } from "../base_component.ts";
import template from "./main_menu.hbs?raw";
import "./main_menu.css";

export class MainMenu extends BaseComponent {
    private _clockTimer: number | null = null;

    constructor(props: Record<string, any> = {}) {
        super(template, props);
    }

    _afterRender(): void {
        this._startClock();
    }

    private _startClock(): void {
        const updateTime = () => {
            const clockEl: Element | null | undefined = this.getElement()?.querySelector("#sidebar-live-clock");
            if (clockEl) {
                const now = new Date();
                const hours: string = String(now.getHours()).padStart(2, "0");
                const minutes: string = String(now.getMinutes()).padStart(2, "0");
                const seconds: string = String(now.getSeconds()).padStart(2, "0");
                clockEl.textContent = `${hours}:${minutes}:${seconds}`;
            }
        };

        updateTime();
        this._clockTimer = window.setInterval(updateTime, 1000);
    }

    destroy(): void {
        if (this._clockTimer !== null) {
            clearInterval(this._clockTimer);
            this._clockTimer = null;
        }
        super.destroy();
    }
}
