import { redirect } from '@/i18n/routing';

export default function OptionsScreenerRemovedRedirect({ params }: any) {
  redirect({ href: '/', locale: params?.locale || 'en' });
}
