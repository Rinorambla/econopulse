import { redirect } from '@/i18n/routing';

export default function OptionsScreenerRemovedRedirect({ params }: { params: { locale: string } }) {
  redirect({ href: '/', locale: params.locale });
}
