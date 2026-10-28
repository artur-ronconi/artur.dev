export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "theme";

/** Cor da barra do navegador (meta theme-color) em cada tema. */
export const THEME_COLOR: Record<Theme, string> = { dark: "#060a07", light: "#f3f7ef" };

/**
 * Roda no <head>, antes da primeira pintura: aplica o tema salvo (ou o do
 * sistema) para a página nunca piscar no tema errado, e marca que há JS — as
 * animações de entrada só escondem conteúdo quando a classe `js` existe.
 */
export const THEME_INIT_SCRIPT = `(function(){var d=document.documentElement,t;try{t=localStorage.getItem("${THEME_STORAGE_KEY}")}catch(e){}if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}d.dataset.theme=t;d.classList.add("js")})()`;
