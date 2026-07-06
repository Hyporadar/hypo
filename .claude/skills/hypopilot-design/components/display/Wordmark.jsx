import React from 'react';

export function Wordmark({ size = 28, onDark = false, style }) {
  return (
    <span style={{
      fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: size, lineHeight: 1,
      letterSpacing: '-0.02em', display: 'inline-flex', whiteSpace: 'nowrap', ...style,
    }}>
      <span style={{ color: onDark ? 'var(--text-on-dark)' : 'var(--ink-900)' }}>Hypo</span>
      <span style={{ color: onDark ? 'var(--green-200)' : 'var(--green-600)' }}>Pilot</span>
    </span>
  );
}
