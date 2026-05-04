import React from 'react';
import brand21Icon from '../../Public/brand21Icon.png';

interface LogoK21Props {
  className?: string;
  size?: number;
  borderRadius?: number;
}

export function LogoK21({ className = '', size = 96, borderRadius = 16 }: LogoK21Props) {
  return (
    <div 
      className={`relative inline-block ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Outer glow effect */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle, rgba(212, 175, 55, 0.3) 0%, transparent 70%)',
          filter: 'blur(12px)',
          transform: 'scale(1.1)',
          borderRadius: `${borderRadius}px`,
        }}
      />
      
      {/* Main logo image */}
      <img 
        src={brand21Icon} 
        alt="K21 Casino Logo"
        className="relative z-10 w-full h-full object-contain"
        style={{
          filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.7))',
          borderRadius: `${borderRadius}px`,
        }}
      />
    </div>
  );
}
