import { BaseComponent } from "../components/base_component.ts";


export class BasePage {
    protected _components: BaseComponent[];

    constructor() {
        this._components = [];
    }

    async render(_root: HTMLElement): Promise<void> {}

    destroy(): void {
        this._components.forEach((component: BaseComponent): void => {
            if (component && typeof component.destroy === "function") {
                component.destroy();
            }
        });
        this._components = [];
    }
}
