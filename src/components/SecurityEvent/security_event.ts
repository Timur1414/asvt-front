import {BaseComponent} from "../base_component.ts";
import template from "./security_event.hbs?raw";
import "./security_event.css";
import type {SecurityEventProps} from "../../types/props_interfaces.ts";

export class SecurityEvent extends BaseComponent {
    constructor(props: SecurityEventProps) {
        super(template, props);
    }
}
