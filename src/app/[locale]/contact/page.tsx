'use client';

import React from 'react';
import { redirect } from 'next/navigation';

export default function ContactPage() {
  // Redirect all contacts to Help (English-only)
  redirect('/help');
  return null;
}
