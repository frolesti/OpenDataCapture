import React from 'react';

import { cn } from '@douglasneuroinformatics/libui/utils';

export type LogoProps = React.SVGProps<SVGSVGElement> & {
  /** The color of the logo. If set to auto, will be dark by default and light in dark mode */
  variant: 'auto' | 'dark' | 'light';
};

export const Logo = ({ className, variant = 'auto', ...props }: LogoProps) => (
  <svg
    className={cn(
      // Default purple in light mode login page
      'text-[#9A99FF]',
      // White in dark mode or when in sidebar (sidebar has .bg-slate-900 class on parent)
      'dark:text-white [.bg-slate-900_&]:text-white',
      className
    )}
    fill="none"
    height="40"
    viewBox="0 0 120 40"
    width="120"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    {/* ALTA text */}
    <text
      dominantBaseline="middle"
      fill="currentColor"
      fontFamily="system-ui, -apple-system, sans-serif"
      fontSize="24"
      fontWeight="700"
      letterSpacing="2"
      textAnchor="middle"
      x="60"
      y="18"
    >
      ALTA
    </text>
    {/* medical services text */}
    <text
      dominantBaseline="middle"
      fill="currentColor"
      fontFamily="system-ui, -apple-system, sans-serif"
      fontSize="8"
      fontWeight="400"
      letterSpacing="1"
      textAnchor="middle"
      x="60"
      y="32"
    >
      medical services
    </text>
  </svg>
);
