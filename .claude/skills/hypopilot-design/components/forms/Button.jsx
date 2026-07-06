import React, { useState } from 'react';

const SIZES = {
  sm: { h: 34, px: 16, fs: 13 },
  md: { h: 42, px: 20, fs: 15 },
  lg: { h: 52, px: 28, fs: 16 },
};

export function Button({ variant = 'primary', size = 'md', disabled = false, icon = null, children, style, ...rest }) {
  const [hover, setHover] = useState(false);
  const s = SIZES[size] || SIZES.md;
  const variants = {
    primary:   { bg: hover ? 'var(--green-700)' : 'var(--green-600)', color: '#FFFFFF', border: '1px solid transparent' },
    secondary: { bg: hover ? 'var(--surface-alt)' : 'var(--surface)', color: 'var(--ink-900)', border: '1px solid var(--line-strong)' },
    ghost:     { bg: hover ? 'var(--green-50)' : 'transparent', color: 'var(--green-700)', border: '1px solid transparent' },
    danger:    { bg: hover ? '#9A3A33' : 'var(--error)', color: '#FFFFFF', border: '1px solid transparent' },
  };
  const v = variants[variant] || variants.primary;
  return (
    <button
      {...rest}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        height: s.h, padding: `0 ${s.px}px`, borderRadius: 'var(--radius-pill)',
        fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: s.fs, letterSpacing: '0.01em',
        background: v.bg, color: v.color, border: v.border,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1,
        transition: 'background var(--transition-fast)',
        ...style,
      }}
    >
      {icon}{children}
    </button>
  );
}
