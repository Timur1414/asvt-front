import {BaseComponent} from "../base_component.ts";
import template from "./main_menu.hbs?raw";
import "./main_menu.css";

export class MainMenu extends BaseComponent {
    constructor(props: any) {
        super(template, props);
    }
}