'use client';

import { redirect } from 'next/navigation';

export default function DemoPage() {
  // Redirect to ai-pulse - no authentication required
  redirect('/en/ai-pulse');
  return null;
}
