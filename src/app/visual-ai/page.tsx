"use client";

import React from 'react';
import LocalErrorBoundary from '@/components/LocalErrorBoundary';
import VisualAIPageInner from '../_locale_backup/visual-ai/page';

export default function VisualAIPage() {
	return (
		<LocalErrorBoundary fallbackTitle="Visual AI error">
			<VisualAIPageInner />
		</LocalErrorBoundary>
	);
}
