'use client'

import React, { useEffect, useRef, memo } from 'react'

export interface TradingViewWidgetProps {
  symbol?: string
  locale?: string
  theme?: 'light' | 'dark'
  interval?: '1' | '5' | '15' | '30' | '60' | '240' | 'D' | 'W' | 'M'
  hideSideToolbar?: boolean
  hideTopToolbar?: boolean
  hideLegend?: boolean
  hideVolume?: boolean
  backgroundColor?: string
  gridColor?: string
  autosize?: boolean
  showRSI?: boolean
  showStochastic?: boolean
  transparent?: boolean
}

function TradingViewWidget({
  symbol = 'AMEX:SPY',
  locale = 'en',
  theme = 'dark',
  interval = 'D',
  hideSideToolbar = true,
  hideTopToolbar = false,
  hideLegend = false,
  hideVolume = false,
  backgroundColor = 'rgba(2, 6, 23, 0)',
  gridColor = 'rgba(148, 163, 184, 0.15)',
  autosize = true,
  showRSI = true,
  showStochastic = false,
  transparent = true,
}: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    // Clean previous widget if any
    containerRef.current.innerHTML = ''
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.type = 'text/javascript'
    script.async = true
    const studies: string[] = []
    // Default studies
    studies.push('STD;Bollinger_Bands')
    if (showRSI) studies.push('STD;RSI')
    if (showStochastic) studies.push('STD;Stochastic')

    script.innerHTML = JSON.stringify({
      allow_symbol_change: true,
      calendar: false,
      details: false,
      hide_side_toolbar: hideSideToolbar,
      hide_top_toolbar: hideTopToolbar,
      hide_legend: hideLegend,
      hide_volume: hideVolume,
      hotlist: false,
      interval,
      locale,
      save_image: true,
      style: '1',
      symbol,
      theme,
      timezone: 'Etc/UTC',
      backgroundColor,
      gridColor,
      watchlist: [],
      withdateranges: false,
      compareSymbols: [],
      studies,
      autosize,
      isTransparent: transparent,
    })
    containerRef.current.appendChild(script)
  }, [symbol, locale, theme, interval, hideSideToolbar, hideTopToolbar, hideLegend, hideVolume, backgroundColor, gridColor, autosize, showRSI, showStochastic, transparent])

  return (
    <div className="tradingview-widget-container" ref={containerRef} style={{ width: '100%', height: '100%', background: 'transparent' }}>
      <div className="tradingview-widget-container__widget" style={{ width: '100%', height: 'calc(100% - 32px)', background: 'transparent' }} />
      <div className="tradingview-widget-copyright">
        <a href={`https://www.tradingview.com/symbols/${encodeURIComponent(symbol.replace(':', '-'))}/`} rel="noopener nofollow" target="_blank">
          <span className="blue-text">{symbol} chart by TradingView</span>
        </a>
      </div>
    </div>
  )
}

export default memo(TradingViewWidget)
