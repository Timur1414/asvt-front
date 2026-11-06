import "./style.css";
import {MainMenu} from "./components/MainMenu/main_menu.ts";

async function init(): Promise<void> {
    let menu: MainMenu = new MainMenu({
        url: import.meta.env.VITE_ADVERTISEMENT_URL,
    });
    let menu_root: HTMLElement = document.getElementById("menu")!;
    menu.render(menu_root);
}

init();
