/* Thème de l'espace agent : constantes partagées serveur / navigateur (voir lib/patrimTheme.ts) */

export const PATRIM_THEME_KEY = "patrim:theme";

/** Script inline (app/layout.tsx) : applique le thème mémorisé avant le premier affichage */
export const PATRIM_THEME_SCRIPT = `try{if(localStorage.getItem('${PATRIM_THEME_KEY}')==='light')document.documentElement.setAttribute('data-patrim-theme','light')}catch(e){}`;
