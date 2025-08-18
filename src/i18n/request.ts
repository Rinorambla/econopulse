import {getRequestConfig} from 'next-intl/server';
import {notFound} from 'next/navigation';

export default getRequestConfig(async ({locale}) => {
  // Always use English - no dynamic imports
  const finalLocale = 'en';
  
  try {
    // Static import of English messages only
    const messages = (await import('../../messages/en.json')).default;
    return {
      locale: finalLocale,
      messages
    };
  } catch (error) {
    console.error('Error loading messages:', error);
    notFound();
  }
});
