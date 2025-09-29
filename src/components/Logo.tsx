import React from 'react';
import Image from 'next/image';

/**
 * Logo component
 * Props:
 *  - size: base icon size (in stacked layout width scales automatically)
 *  - layout: 'inline' (icon + text in a row) | 'stacked' (icon above text)
 *  - textVariant: 'short' => ECONOPULSE, 'domain' => ECONOPULSE.AI
 *  - showText: hide/show brand text
 *  - ariaLabel: accessible alt label
 */
interface LogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  textVariant?: 'short' | 'domain';
  ariaLabel?: string;
  layout?: 'inline' | 'stacked';
}

export default function Logo({
  size = 40,
  className = '',
  showText = true,
  textVariant = 'short',
  ariaLabel = 'EconoPulse Logo',
  layout = 'inline'
}: LogoProps) {
  const label = textVariant === 'domain' ? 'ECONOPULSE.AI' : 'ECONOPULSE';
  const isStacked = layout === 'stacked';
  const iconSize = isStacked ? Math.round(size * 1.35) : size;

  return (
    <div
      className={[
        'flex',
        isStacked ? 'flex-col items-center justify-center' : 'items-center',
        isStacked ? 'gap-2 sm:gap-3' : 'gap-2 sm:gap-3',
        className
      ].join(' ')}
      aria-label={ariaLabel}
    >
      <Image
        src="/logo-econopulse-wave.svg"
        alt={ariaLabel}
        width={iconSize}
        height={iconSize}
        priority
        sizes="(max-width: 640px) 36px, 56px"
        className="shrink-0 select-none [image-rendering:auto]"
      />
      {showText && (
        <span
          className={[
            'font-extrabold tracking-wide bg-gradient-to-r from-cyan-300 via-sky-500 to-blue-600 bg-clip-text text-transparent',
            isStacked ? 'text-[1.05rem] sm:text-xl leading-tight text-center pt-1' : 'text-xl sm:text-2xl leading-none relative top-[1px] mr-2 sm:mr-4'
          ].join(' ')}
          aria-label={label}
        >
          {label}
        </span>
      )}
    </div>
  );
}
