/**
 * Minimal i18n. English text is the key; `DA` holds the Danish translation.
 * Missing translations fall back to English, so nothing ever renders blank.
 * Language: saved choice → device language (Danish devices get Danish) → English.
 */
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { DA } from './i18n.da';

export type Lang = 'da' | 'en';
const STORAGE = 'ps-lang';

export const detectLang = (): Lang => {
  try {
    const saved = localStorage.getItem(STORAGE);
    if (saved === 'da' || saved === 'en') return saved;
  } catch {
    /* storage unavailable */
  }
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('da') ? 'da' : 'en';
};

let current: Lang = detectLang();
if (typeof document !== 'undefined') document.documentElement.lang = current;

export const getLang = () => current;
/** BCP-47 locale for dates and numbers. */
export const locale = () => (current === 'da' ? 'da-DK' : 'en-GB');

/** Translate. `{name}` placeholders are filled from `vars`. */
export function t(text: string, vars?: Record<string, string | number>): string {
  let out = current === 'da' ? (DA[text] ?? text) : text;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  return out;
}

/** Pick the right variant of a content list or value. */
export const byLang = <T,>(v: { en: T; da: T }): T => v[current];

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: current, setLang: () => {} });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(current);
  const setLang = useCallback((l: Lang) => {
    current = l;
    document.documentElement.lang = l;
    try {
      localStorage.setItem(STORAGE, l);
    } catch {
      /* ignore */
    }
    setLangState(l);
  }, []);
  // key: remount the tree so every t() call re-renders in the new language
  return (
    <LangContext.Provider value={{ lang, setLang }}>
      <div key={lang} style={{ display: 'contents' }}>{children}</div>
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
