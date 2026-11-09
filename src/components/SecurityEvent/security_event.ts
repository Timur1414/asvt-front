import {BaseComponent} from "../base_component.ts";
import template from "./security_event.hbs?raw";
import "./security_event.css";
import type {SecurityEventProps} from "../../types/props_interfaces.ts";
import {formatSecurityTimestamp} from "../../utils/date.ts";

export class SecurityEvent extends BaseComponent {
    constructor(props: SecurityEventProps) {
        const timeInfo = formatSecurityTimestamp(props.timestamp);
        super(template, {
            ...props,
            raw_timestamp: props.timestamp,
            formatted_time: props.formatted_time ?? timeInfo.formatted,
            relative_time: props.relative_time ?? timeInfo.relative,
            time_tooltip: props.time_tooltip ?? timeInfo.tooltip,
            // Для совместимости, если где-то используется {{ timestamp }}
            timestamp: props.formatted_time ?? timeInfo.formatted,
        });
    }
}
