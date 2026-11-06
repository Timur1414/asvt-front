export const SERVER_URL: string = import.meta.env.VITE_SERVER_URL;

export const client = (url: string, data: RequestInit={}): Promise<Response> => {
    const options: RequestInit = {
        credentials: "include",
        ...data,
        headers: {
            ...data.headers,
        }
    };
    return fetch(SERVER_URL + url, options);
};
