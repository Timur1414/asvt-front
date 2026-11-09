import {client} from "./client.ts";
import type {HistoryResponse, ServerErrorResponse} from "../types/responses.ts";

export const get_history = async (): Promise<{success: boolean, data: HistoryResponse | ServerErrorResponse }> => {
    try {
        const response: Response = await client("/api/history");
        if (!response.ok) {
            const data = await response.json() as ServerErrorResponse;
            return {success: false, data: data};
        }
        const data = await response.json() as HistoryResponse;
        return {success: true, data: data};
    }
    catch (error: any) {
        const response: ServerErrorResponse = {
            code: 0,
            message: "Network error",
            request_id: "",
        }
        return {success: false, data: response};
    }
};
