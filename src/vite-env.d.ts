/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SERVER_URL: string;
    readonly PORT?: string;
    readonly DEBUG?: string;
    readonly CERT_FILE?: string;
    readonly KEY_FILE?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
