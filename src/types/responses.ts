export interface EventResponse {
    object_type: string;
    object_confidence: number;
    created_at: string;
}

export interface HistoryResponse {
    events: EventResponse[];
}

export interface ServerErrorResponse {
    code: number;
    message: string;
    request_id: string;
}
