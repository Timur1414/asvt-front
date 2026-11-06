import {defineConfig, loadEnv} from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { compression } from "vite-plugin-compression2";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname: string = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ command, mode }) => {
    const env: Record<string, string> = loadEnv(mode, process.cwd(), "");
    const is_dev: boolean = command === "serve";
    const is_debug: boolean = env.DEBUG === "true";
    const port: number = env.PORT ? Number(env.PORT) : 5173;

    const server: any = {
        host: true,
        port: port,
        strictPort: true,
        hmr: true,
        allowedHosts: [
            "localhost",
        ],
    };

    if (is_dev && !is_debug) {
        let cert_file: string = env.CERT_FILE;
        let key_file: string = env.KEY_FILE;
        if (cert_file && key_file) {
            server.https = {
                key: fs.readFileSync(path.resolve(__dirname, key_file)),
                cert: fs.readFileSync(path.resolve(__dirname, cert_file)),
            };
        }
        else {
            throw new Error("CERT_FILE or KEY_FILE not set");
        }
    }
    return {
        plugins: [
            VitePWA({
                strategies: "generateSW",
                registerType: "autoUpdate",
                devOptions: {
                    enabled: false,
                    type: "module",
                },
            }),
            compression({
                algorithms: ["gzip", "brotliCompress"],
            }),
        ],
        server: server,
        publicDir: "public",
    }
});
