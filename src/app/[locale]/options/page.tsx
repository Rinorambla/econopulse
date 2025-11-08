import { redirect } from '@/i18n/routing';

export default function OptionsRemovedRedirect({ params }: any) {
  redirect({ href: '/', locale: params?.locale || 'en' });
}
