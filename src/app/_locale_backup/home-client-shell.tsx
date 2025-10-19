'use client';
import React from 'react';
import dynamic from 'next/dynamic';

const FearGreedIndex = dynamic(() => import('@/components/FearGreedIndex'), {
  loading: () => <div className="flex items-center justify-center h-full w-full animate-pulse text-[10px] text-white/40">Loading index...</div>
});
const AIBackground = dynamic(() => import('@/components/AIBackground'), {
  loading: () => <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(59,130,246,0.05),transparent_60%)]" />
});

interface Props {
  region: 'background' | 'fear-greed';
}

export default function HomeClientShell({ region }: Props) {
  if (region === 'background') {
    return <AIBackground intensity="subtle" />;
  }
  if (region === 'fear-greed') {
    return <FearGreedIndex />;
  }
  return null;
}
