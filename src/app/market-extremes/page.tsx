"use client";

import React from 'react';
import LocalErrorBoundary from '@/components/LocalErrorBoundary';
import MarketExtremesInner from '../_locale_backup/market-extremes/page';

export default function MarketExtremesPage() {
	return (
		<LocalErrorBoundary fallbackTitle="Market Extremes error">
			<MarketExtremesInner />
		</LocalErrorBoundary>
	);
}
