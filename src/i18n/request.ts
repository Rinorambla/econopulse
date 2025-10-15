import {getRequestConfig} from 'next-intl/server';
import {notFound} from 'next/navigation';

export default getRequestConfig(async ({locale}) => {
  // Validate locale
  const supportedLocales = ['en', 'it'];
  const validLocale = locale && supportedLocales.includes(locale) ? locale : 'en';
  
  try {
    // Dynamic import based on locale
    const messages = (await import(`../../messages/${validLocale}.json`)).default;
    return {
      locale: validLocale,
      messages
    };
  } catch (error) {
    console.error(`Error loading messages for locale ${validLocale}:`, error);
    // Fallback to English if the locale file doesn't exist
    try {
      const messages = (await import('../../messages/en.json')).default;
      return {
        locale: 'en',
        messages
      };
    } catch (fallbackError) {
      console.error('Error loading fallback messages:', fallbackError);
      notFound();
    }
  }
});
