import React from 'react';

export function Badge({ tone = 'neutral', children, style }) {
  const tones = {
    neutral: { background: 'var(--surface-alt)', color: 'var(--ink-700)' },
    success: { background: 'var(--success-bg)', color: 'var(--success-ink)' },
    warning: { background: 'var(--warning-bg)', color: 'var(--amber-700)' },
    error:   { background: 'var(--error-bg)', color: 'var(--error)' },
    brand:   { background: 'var(--green-700)', color: 'var(--text-on-dark)' },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, height: 24, padding: '0 10px',
      borderRadius: 'var(--radius-pill)', font: 'var(--text-overline)', letterSpacing: '0.06em', textTransform: 'uppercase',
      ...t, ...style,
    }}>
      {children}
    </span>
  );
}
