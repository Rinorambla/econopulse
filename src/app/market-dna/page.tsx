"use client";

import React from 'react';
import LocalErrorBoundary from '@/components/LocalErrorBoundary';
import MarketDNAInner from '../_locale_backup/market-dna/page';

export default function MarketDNAPage() {
	return (
		<LocalErrorBoundary fallbackTitle="Market DNA error">
			<MarketDNAInner />
		</LocalErrorBoundary>
	);
}
