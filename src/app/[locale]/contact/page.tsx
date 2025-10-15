'use client';

import React from 'react';
import { useLocale } from 'next-intl';
import { redirect } from '@/i18n/routing';

export default function ContactPage() {
  const locale = useLocale();
  // Redirect all contacts to Help (English-only)
  redirect({ href: '/help', locale: 'en' });
  return null;
}
