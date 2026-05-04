import React from 'react';

interface LogoK21Props {
  className?: string;
  size?: number;
}

export function LogoK21({ className = '', size = 96 }: LogoK21Props) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 120 120" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Base Background - Dark Blue/Metallic gradient */}
      <defs>
        <linearGradient id="bg-gradient" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1a233a" />
          <stop offset="50%" stopColor="#0d111e" />
          <stop offset="100%" stopColor="#05070a" />
        </linearGradient>
        
        <linearGradient id="gold-gradient" x1="0" y1="20" x2="120" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF1C5" />
          <stop offset="30%" stopColor="#D4AF37" />
          <stop offset="70%" stopColor="#AA7A00" />
          <stop offset="100%" stopColor="#FFDF73" />
        </linearGradient>

        <linearGradient id="border-gradient" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3a4b7a" />
          <stop offset="100%" stopColor="#0d111e" />
        </linearGradient>

        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        
        <filter id="drop-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.6"/>
        </filter>
      </defs>

      {/* Outer Border & Background */}
      <rect x="2" y="2" width="116" height="116" rx="16" fill="url(#bg-gradient)" stroke="url(#border-gradient)" strokeWidth="2" filter="url(#drop-shadow)" />
      
      {/* Inner highlight line */}
      <rect x="4" y="4" width="112" height="112" rx="14" fill="none" stroke="#ffffff" strokeOpacity="0.05" strokeWidth="1" />

      {/* Crown */}
      <g transform="translate(30, 20) scale(0.6)" filter="url(#glow)">
        <path d="M50 15 L65 40 L80 15 L75 55 L25 55 L20 15 L35 40 Z" fill="url(#gold-gradient)" />
        <circle cx="50" cy="10" r="4" fill="url(#gold-gradient)" />
        <circle cx="20" cy="10" r="4" fill="url(#gold-gradient)" />
        <circle cx="80" cy="10" r="4" fill="url(#gold-gradient)" />
        {/* Crown base details */}
        <rect x="25" y="58" width="50" height="4" rx="2" fill="url(#gold-gradient)" />
        <circle cx="35" cy="48" r="2" fill="#1a233a" />
        <circle cx="50" cy="48" r="3" fill="#1a233a" />
        <circle cx="65" cy="48" r="2" fill="#1a233a" />
      </g>

      {/* Letter K */}
      <g transform="translate(25, 45)" filter="url(#drop-shadow)">
        {/* Vertical stem */}
        <path d="M10 0 L22 0 L22 55 L10 55 Z" fill="url(#gold-gradient)" />
        {/* Top diagonal */}
        <path d="M22 30 L45 0 L58 0 L22 40 Z" fill="url(#gold-gradient)" />
        {/* Bottom diagonal */}
        <path d="M35 25 L55 55 L42 55 L22 25 Z" fill="url(#gold-gradient)" />
        {/* Serifs for K */}
        <path d="M5 0 L27 0 L27 4 L5 4 Z" fill="url(#gold-gradient)" />
        <path d="M5 51 L27 51 L27 55 L5 55 Z" fill="url(#gold-gradient)" />
      </g>

      {/* Number 21 */}
      <g transform="translate(65, 65)" filter="url(#drop-shadow)">
        {/* 2 */}
        <path d="M5 5 C5 -5, 22 -5, 22 5 C22 15, 5 25, 5 35 L25 35 L25 28 L12 28 C15 20, 28 15, 28 5 C28 -10, 0 -10, 0 5 Z" fill="url(#gold-gradient)" />
        {/* 1 */}
        <path d="M35 10 L42 5 L42 35 L35 35 Z" fill="url(#gold-gradient)" />
        <path d="M35 35 L49 35 L49 28 L42 28 Z" fill="url(#gold-gradient)" />
      </g>

    </svg>
  );
}
