import React, { useState } from 'react';

export function IconButton({ label, size = 'md', variant = 'secondary', disabled = false, children, style, ...rest }) {
  const [hover, setHover] = useState(false);
  const d = size === 'sm' ? 34 : size === 'lg' ? 52 : 42;
  const variants = {
    primary:   { bg: hover ? 'var(--green-700)' : 'var(--green-600)', color: '#FFFFFF', border: '1px solid transparent' },
    secondary: { bg: hover ? 'var(--surface-alt)' : 'var(--surface)', color: 'var(--ink-700)', border: '1px solid var(--line-strong)' },
    ghost:     { bg: hover ? 'var(--green-50)' : 'transparent', color: 'var(--ink-700)', border: '1px solid transparent' },
  };
  const v = variants[variant] || variants.secondary;
  return (
    <button
      {...rest}
      aria-label={label}
      title={label}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: d, height: d, borderRadius: 'var(--radius-pill)',
        background: v.bg, color: v.color, border: v.border,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1,
        transition: 'background var(--transition-fast)',
        ...style,
      }}
    >
      {children}
    </button>
  );
}
