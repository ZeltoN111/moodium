import en from './en';
import uk from './uk';

export type TKey = keyof typeof en;
export type Language = 'uk' | 'en';
export type LanguageSetting = Language | 'auto';

const dictionaries: Record<Language, Record<TKey, string>> = { en, uk };

export const LOCALES: Record<Language, string> = { en: 'en-US', uk: 'uk-UA' };

/** Language of the device, falling back to English for anything but Ukrainian. */
export function deviceLanguage(): Language {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase().startsWith('uk') ? 'uk' : 'en';
  } catch {
    return 'en';
  }
}

export function resolveLanguage(setting: LanguageSetting): Language {
  return setting === 'auto' ? deviceLanguage() : setting;
}

export type Translate = (key: TKey, params?: Record<string, string | number>) => string;

/** Ukrainian writes decimals with a comma: 2.8 → 2,8. Leaves integers and other text alone. */
function formatParam(value: string | number, language: Language): string {
  const text = String(value);
  return language === 'uk' && /^-?\d+\.\d+$/.test(text) ? text.replace('.', ',') : text;
}

export function createTranslator(language: Language): Translate {
  const dictionary = dictionaries[language];
  return (key, params) => {
    const template = dictionary[key] ?? en[key] ?? key;
    return params
      ? template.replace(/\{(\w+)\}/g, (_, name) =>
          params[name] === undefined ? `{${name}}` : formatParam(params[name], language)
        )
      : template;
  };
}
