import React from 'react';

export function Toast({ tone = 'success', title, children, onClose, style }) {
  const tones = {
    success: { bar: 'var(--success)' },
    warning: { bar: 'var(--amber-600)' },
    error:   { bar: 'var(--error)' },
    info:    { bar: 'var(--ink-500)' },
  };
  const t = tones[tone] || tones.success;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12, width: 380, maxWidth: '100%',
      background: 'var(--ink-900)', color: 'var(--text-on-dark)', borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-raised)', padding: '14px 16px', fontFamily: 'var(--font-ui)', ...style,
    }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.bar, marginTop: 6, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        {title && <div style={{ fontWeight: 600, fontSize: 14, marginBottom: children ? 2 : 0 }}>{title}</div>}
        {children && <div style={{ fontSize: 13, opacity: 0.75, lineHeight: 1.45 }}>{children}</div>}
      </div>
      {onClose && (
        <button onClick={onClose} aria-label="Fermer" style={{
          background: 'none', border: 'none', color: 'var(--text-on-dark)', opacity: 0.6, cursor: 'pointer',
          fontSize: 16, lineHeight: 1, padding: 2,
        }}>×</button>
      )}
    </div>
  );
}
