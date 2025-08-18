export const locales = ['en', 'it'] as const;
export const defaultLocale = 'en' as const;

export type Locale = typeof locales[number];
