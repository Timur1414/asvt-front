import "./style.css";
import {MainMenu} from "./components/MainMenu/main_menu.ts";
import {Router} from "./router/router.ts";
import {NotFoundPage} from "./pages/NotFound/not_found.ts";
import {HomePage} from "./pages/Home/home.ts";
import {HistoryPage} from "./pages/History/history.ts";

const root: HTMLElement = document.getElementById("app") as HTMLElement;
export const router = new Router(root);

router.addRoute("/", () => new HomePage())
    .addRoute("/history", () => new HistoryPage())
    .addRoute("/404", () => new NotFoundPage());

async function init(): Promise<void> {
    let menu: MainMenu = new MainMenu({});
    let menu_root: HTMLElement = document.getElementById("menu")!;
    menu.render(menu_root);
    router.start();
}

init();
