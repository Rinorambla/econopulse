import { redirect } from '@/i18n/routing';
// Server component: perform immediate redirect to home. Using a client component here caused
// a runtime error because next-intl/next's redirect() is server-only. Removing 'use client'
// prevents the unsupported client-side redirect invocation that could trigger the global error page.
export default function OptionsLegacyRedirect() {
	redirect({ href: '/', locale: 'en' });
}
