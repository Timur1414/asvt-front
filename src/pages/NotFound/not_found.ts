import {BasePage} from "../base_page.ts";
import template from "./not_found.hbs?raw";
import "./not_found.css";
import Handlebars from "handlebars";

export class NotFoundPage extends BasePage {
    async render(root: HTMLElement): Promise<void> {
        let compiledTemplate = Handlebars.compile(template);
        root.innerHTML = compiledTemplate({}).trim();
    }
}
