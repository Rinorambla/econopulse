"use client";

import React from 'react';
import MarketParticles from './MarketParticles';

interface AIBackgroundProps {
  className?: string;
  intensity?: 'subtle' | 'default' | 'bold';
}

const opacityMap = {
  subtle: 'opacity-5',
  default: 'opacity-10',
  bold: 'opacity-30',
} as const;

export default function AIBackground({ className = '', intensity = 'default' }: AIBackgroundProps) {
  const opacityClass = opacityMap[intensity];

  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      {/* Animated AI Brain SVG */}
      <div className={`absolute inset-0 ${opacityClass}`}>
        <svg className="w-full h-full" viewBox="0 0 1200 800" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          {/* Brain outline - static for better performance */}
          <path 
            d="M300 200C350 150 450 120 550 140C650 120 750 150 800 200C850 250 870 350 850 450C830 550 780 600 700 620C650 640 550 650 500 640C450 650 350 640 300 620C220 600 170 550 150 450C130 350 150 250 200 200C220 180 260 170 300 200Z" 
            stroke="url(#brainGradient)" 
            strokeWidth="2" 
            fill="none"
          />
          
          {/* Neural pathways - static for better performance */}
          <g>
            <path d="M200 300 Q400 250 600 320" stroke="url(#neuralGradient)" strokeWidth="1.5" fill="none" opacity="0.6"/>
            <path d="M250 400 Q500 350 750 420" stroke="url(#neuralGradient)" strokeWidth="1.5" fill="none" opacity="0.6"/>
            <path d="M300 500 Q550 450 800 480" stroke="url(#neuralGradient)" strokeWidth="1.5" fill="none" opacity="0.6"/>
          </g>
          
          {/* Synapses/nodes - removed animate-ping for better performance */}
          <g>
            <circle cx="300" cy="280" r="4" fill="url(#nodeGradient)">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="4s" repeatCount="indefinite"/>
            </circle>
            <circle cx="500" cy="320" r="4" fill="url(#nodeGradient)">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="4s" repeatCount="indefinite" begin="0.5s"/>
            </circle>
            <circle cx="700" cy="380" r="4" fill="url(#nodeGradient)">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="4s" repeatCount="indefinite" begin="1s"/>
            </circle>
            <circle cx="400" cy="450" r="4" fill="url(#nodeGradient)">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="4s" repeatCount="indefinite" begin="1.5s"/>
            </circle>
            <circle cx="600" cy="480" r="4" fill="url(#nodeGradient)">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="4s" repeatCount="indefinite" begin="2s"/>
            </circle>
          </g>
          
          {/* Gradients */}
          <defs>
            <linearGradient id="brainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{stopColor: '#3B82F6', stopOpacity: 0.8}}/>
              <stop offset="50%" style={{stopColor: '#8B5CF6', stopOpacity: 0.6}}/>
              <stop offset="100%" style={{stopColor: '#06B6D4', stopOpacity: 0.8}}/>
            </linearGradient>
            <linearGradient id="neuralGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{stopColor: '#60A5FA', stopOpacity: 0.4}}/>
              <stop offset="50%" style={{stopColor: '#A78BFA', stopOpacity: 0.8}}/>
              <stop offset="100%" style={{stopColor: '#34D399', stopOpacity: 0.4}}/>
            </linearGradient>
            <radialGradient id="nodeGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" style={{stopColor: '#FBBF24', stopOpacity: 1}}/>
              <stop offset="100%" style={{stopColor: '#3B82F6', stopOpacity: 0.8}}/>
            </radialGradient>
          </defs>
        </svg>
      </div>

      {/* Floating particles for added AI effect (hidden on small screens) */}
      <div className="absolute inset-0 overflow-hidden motion-safe:block hidden sm:block">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '1s', animationDuration: '4s'}}></div>
        <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '2s', animationDuration: '3s'}}></div>
        <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{animationDelay: '0.5s', animationDuration: '5s'}}></div>
        <div className="absolute bottom-1/4 right-1/3 w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{animationDelay: '3s', animationDuration: '3.5s'}}></div>
      </div>

      {/* Canvas particles layer (very subtle) */}
      <div className="absolute inset-0 motion-safe:block hidden md:block">
        <MarketParticles />
      </div>
    </div>
  );
}
