import { ru } from './ru';
import { en } from './en';

export type Lang = 'ru' | 'en';

const lang: Lang = (import.meta.env.VITE_LANG as Lang) === 'en' ? 'en' : 'ru';

export const t = lang === 'en' ? en : ru;
export { lang };
