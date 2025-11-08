import { redirect } from '@/i18n/routing';

export default function OptionsRemovedRedirect({ params }: { params: { locale: string } }) {
  redirect({ href: '/', locale: params.locale });
}
