import React from 'react';
import { Button } from '../forms/Button.jsx';

export function Dialog({ open = false, title, children, confirmLabel, cancelLabel = 'Annuler', onConfirm, onCancel, width = 480 }) {
  if (!open) return null;
  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(33,30,26,0.4)', zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          width: '100%', maxWidth: width, background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-overlay)', padding: 32, fontFamily: 'var(--font-ui)', color: 'var(--ink-900)',
        }}
      >
        {title && <h2 style={{ font: 'var(--text-h2)', fontFamily: 'var(--font-display)', margin: '0 0 12px' }}>{title}</h2>}
        <div style={{ font: 'var(--text-body-md)', color: 'var(--ink-700)' }}>{children}</div>
        {(confirmLabel || onCancel) && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 28 }}>
            {onCancel && <Button variant="secondary" onClick={onCancel}>{cancelLabel}</Button>}
            {confirmLabel && <Button variant="primary" onClick={onConfirm}>{confirmLabel}</Button>}
          </div>
        )}
      </div>
    </div>
  );
}
