let mode_on: boolean = false;

export function set_mode(new_mode: boolean): void {
    mode_on = new_mode;
}

export function get_mode(): boolean {
    return mode_on;
}
