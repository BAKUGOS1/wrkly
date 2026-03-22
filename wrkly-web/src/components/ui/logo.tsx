'use client';

import { useTheme } from 'next-themes';
import Image from 'next/image';
import { useEffect, useState } from 'react';

interface LogoProps {
  variant?: 'full' | 'icon';
  width?: number;
  height?: number;
  className?: string;
}

export function Logo({ variant = 'full', width, height, className }: LogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    // Prevent hydration mismatch — render a placeholder with same size
    const w = width ?? (variant === 'full' ? 120 : 28);
    const h = height ?? (variant === 'full' ? 32 : 28);
    return <div style={{ width: w, height: h }} className={className} />;
  }

  const isDark = resolvedTheme === 'dark';

  if (variant === 'icon') {
    return (
      <Image
        src="/brand/wrkly-app-icon-gradient.svg"
        alt="Wrkly"
        width={width ?? 28}
        height={height ?? 28}
        priority
        className={className}
      />
    );
  }

  return (
    <Image
      src={isDark ? '/brand/wrkly-primary-lockup-dark.svg' : '/brand/wrkly-primary-lockup-light.svg'}
      alt="Wrkly"
      width={width ?? 120}
      height={height ?? 32}
      priority
      className={className}
    />
  );
}
