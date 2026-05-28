'use client';

import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: number;
}

export default function BrandLogo({ className, size = 32 }: BrandLogoProps) {
  const borderRadiusValue = Math.max(4, Math.round(size * 0.22));

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: `${borderRadiusValue}px`,
        overflow: 'hidden',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        filter: 'drop-shadow(0 2px 6px rgba(139, 94, 60, 0.15))',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="PickMemo Logo"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
        }}
      />
    </div>
  );
}
