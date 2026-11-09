export type StreamEventType = 'info' | 'success' | 'warn' | 'error';

export interface StreamLogItem {
    id: string;
    timestamp: string;
    message: string;
    type: StreamEventType;
}

export interface StreamComponentProps {
    stream_url: string;
    onLogEvent?: (message: string, type: StreamEventType) => void;
    onStatusChange?: (status: 'connecting' | 'live' | 'paused' | 'error') => void;
}

export interface SecurityEventProps {
    timestamp: string;
    object_class: string;
    object_confidence: number;
    formatted_time?: string;
    relative_time?: string;
    raw_timestamp?: string;
    time_tooltip?: string;
}
