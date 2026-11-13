import {client} from "./client.ts";

export const toggle_mode = async (mode: boolean): Promise<void> => {
    try {
        const response: Response = await client("/api/toggle_mode", {
            method: "POST",
            body: JSON.stringify({mode}),
        });
        if (!response.ok) {
            console.error(response);
        }
    }
    catch (error: any) {
        console.error(error);
    }
};
