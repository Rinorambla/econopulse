"use client"
import React, { useEffect, useRef, useState } from 'react'

type Importance = '-1' | '0' | '1' | '-1,0' | '-1,1' | '0,1' | '-1,0,1'

export interface EconomicCalendarProps {
  height?: number
  transparent?: boolean
  importanceFilter?: Importance
  countryFilter?: string // CSV of country codes e.g. "us,gb,it,eu"
}

const EconomicCalendarComponent: React.FC<EconomicCalendarProps> = ({
  height,
  transparent = true,
  importanceFilter = '-1,0,1',
  countryFilter = 'ar,au,br,ca,cn,fr,de,in,id,it,jp,kr,mx,ru,sa,za,tr,gb,us,eu',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  // Determine locale without next-intl to avoid provider/runtime issues
  const locale = (typeof navigator !== 'undefined' && navigator.language
    ? navigator.language.split('-')[0]
    : 'en') as string
  const [computedHeight, setComputedHeight] = useState<number>(() => {
    if (typeof window === 'undefined') return height || 600
    // Try to fill nicely without overflowing the viewport area
    const h = Math.max(460, Math.min(820, Math.floor(window.innerHeight - 240)))
    return height || h
  })

  // Update on resize (debounced)
  useEffect(() => {
    if (height) return
    let t: any
    const onResize = () => {
      clearTimeout(t)
      t = setTimeout(() => {
        const h = Math.max(460, Math.min(820, Math.floor(window.innerHeight - 240)))
        setComputedHeight(h)
      }, 150)
    }
    window.addEventListener('resize', onResize)
    return () => { window.removeEventListener('resize', onResize); clearTimeout(t) }
  }, [height])

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.innerHTML = ''
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = `{
      "colorTheme": "dark",
      "isTransparent": ${transparent ? 'true' : 'false'},
      "locale": "${locale}",
      "countryFilter": "${countryFilter}",
      "importanceFilter": "${importanceFilter}",
      "width": "100%",
      "height": ${height || computedHeight}
    }`
    containerRef.current.appendChild(script)
  }, [locale, transparent, importanceFilter, countryFilter, height, computedHeight])

  return (
    <div className="tradingview-widget-container" ref={containerRef}>
      <div className="tradingview-widget-container__widget" />
      <div className="tradingview-widget-copyright">
        <a href="https://www.tradingview.com/economic-calendar/" rel="noopener nofollow" target="_blank">
          <span className="blue-text">Economic calendar by TradingView</span>
        </a>
      </div>
    </div>
  )
}

export const EconomicCalendar = EconomicCalendarComponent
export default EconomicCalendarComponent
