import { redirect } from '@/i18n/routing';

// Server component: redirect locale-scoped /[locale]/help to canonical /help.
// Avoid client-side redirect() which triggers runtime exceptions in production.
export default function HelpRedirect({ params }: { params: { locale?: string } }) {
  redirect({ href: '/help', locale: params?.locale || 'en' });
}
