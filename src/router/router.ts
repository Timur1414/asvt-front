import { BasePage } from "../pages/base_page.js";

export type RouteParams = Record<string, string>;
export type PageFactory = (params: RouteParams) => BasePage;

interface Route {
    path: string;
    segments: string[];
    factory: PageFactory;
}

export class Router {
    private readonly root: HTMLElement;
    private routes: Route[] = [];
    private _current_page: BasePage | null = null;

    constructor(root: HTMLElement) {
        this.root = root;

        window.addEventListener("popstate", (): Promise<void> => this._handleRoute());
        document.addEventListener("click", (e: MouseEvent): void => this._handleLinkClick(e));
    }

    addRoute(path: string, pageFactory: PageFactory): Router {
        const segments: string[] = this._splitPath(path);
        this.routes.push({ path, segments, factory: pageFactory });
        return this;
    }

    navigate(path: string): void {
        if (window.location.pathname === path) return;
        window.history.pushState({}, "", path);
        this._handleRoute();
    }

    refresh(): void {
        this._handleRoute();
    }

    private _handleLinkClick(e: MouseEvent): void {
        const link = (e.target as HTMLElement).closest("[data-link]");
        if (!link) return;
        e.preventDefault();
        this.navigate(link.getAttribute("href") ?? "/");
    }

    private _splitPath(path: string): string[] {
        return path.split("/").filter(Boolean);
    }

    private _matchRoute(currentPath: string): { factory: PageFactory; params: RouteParams } | null {
        const current_segments: string[] = this._splitPath(currentPath);
        for (const route of this.routes) {
            if (route.segments.length !== current_segments.length) {
                continue;
            }
            const params: RouteParams = {};
            let is_match: boolean = true;
            for (let i: number = 0; i < route.segments.length; i++) {
                const route_segment: string = route.segments[i];
                const current_segment: string = current_segments[i];
                if (route_segment.startsWith(":")) {
                    const param_name: string = route_segment.slice(1);
                    params[param_name] = decodeURIComponent(current_segment);
                } else if (route_segment !== current_segment) {
                    is_match = false;
                    break;
                }
            }
            if (is_match) {
                return { factory: route.factory, params };
            }
        }
        return null;
    }

    private async _handleRoute(): Promise<void> {
        const path: string = window.location.pathname;
        const matched: {factory: PageFactory; params: RouteParams} | null = this._matchRoute(path);

        let page_factory: PageFactory | undefined;
        let params: RouteParams = {};
        if (matched) {
            page_factory = matched.factory;
            params = matched.params;
        } else {
            const not_found_route: Route | undefined = this.routes.find((r: Route): boolean => r.path === "/404");
            page_factory = not_found_route?.factory;
        }
        if (!page_factory) {
            console.error(`Router: Маршрут "${path}" не найден и страница "/404" не зарегистрирована.`);
            return;
        }
        if (this._current_page?.destroy) {
            this._current_page.destroy();
        }
        const page: BasePage = page_factory(params);
        this._current_page = page;
        this.root.innerHTML = "";
        await page.render(this.root);
    }

    start(): void {
        this._handleRoute();
    }
}
