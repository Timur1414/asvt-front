import {BasePage} from "../base_page.ts";
import template from "./history.hbs?raw";
import "./history.css";
import Handlebars from "handlebars";
import {get_history} from "../../api/history.ts";
import type {EventResponse, HistoryResponse, ServerErrorResponse} from "../../types/responses.ts";
import {SecurityEvent} from "../../components/SecurityEvent/security_event.ts";

export class HistoryPage extends BasePage {
    async render(root: HTMLElement): Promise<void> {
        const compiledTemplate = Handlebars.compile(template);
        root.innerHTML = compiledTemplate({}).trim();

        const history_response = await get_history();
        if (!history_response.success) {
            const data = history_response.data as ServerErrorResponse;
            console.error(data.message);
            return;
        }
        const data = history_response.data as HistoryResponse;
        const events: EventResponse[] = data.events;
        const events_root: HTMLElement | null = root.querySelector<HTMLElement>(".history_events_container");
        if (!events_root)
            return;
        for (const event of events) {
            const new_event = new SecurityEvent({
                timestamp: event.created_at,
                object_class: event.object_type,
                object_confidence: event.object_confidence,
            });
            new_event.render(events_root);
        }
    }
}
