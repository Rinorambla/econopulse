"use client";

import React from 'react';

type SafeBoundaryProps = { children?: React.ReactNode; fallback?: React.ReactNode };

export default class SafeBoundary extends React.Component<SafeBoundaryProps, { hasError: boolean }>{
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any, info: any) {
    if (typeof window !== 'undefined') {
      try {
        console.error('Widget crashed inside SafeBoundary:', { error, info });
      } catch {}
    }
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children as React.ReactNode;
  }
}
