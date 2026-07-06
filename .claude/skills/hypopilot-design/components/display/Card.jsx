import React from 'react';

export function Card({ tone = 'default', padding = 24, children, style, ...rest }) {
  const tones = {
    default: { background: 'var(--surface-card)', border: '1px solid var(--line)', color: 'var(--ink-900)', boxShadow: 'var(--shadow-card)' },
    brand:   { background: 'var(--green-700)', border: '1px solid var(--green-700)', color: 'var(--text-on-dark)', boxShadow: 'var(--shadow-card)' },
    alt:     { background: 'var(--surface-alt)', border: '1px solid transparent', color: 'var(--ink-900)', boxShadow: 'none' },
    alert:   { background: 'var(--amber-50)', border: '1px solid var(--amber-100)', color: 'var(--ink-900)', boxShadow: 'none' },
  };
  const t = tones[tone] || tones.default;
  return (
    <div {...rest} style={{ borderRadius: 'var(--radius-md)', padding, fontFamily: 'var(--font-ui)', ...t, ...style }}>
      {children}
    </div>
  );
}
