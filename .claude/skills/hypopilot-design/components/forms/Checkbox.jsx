import React from 'react';

export function Checkbox({ label, checked = false, onChange, disabled = false, style }) {
  return (
    <label style={{
      display: 'inline-flex', alignItems: 'flex-start', gap: 10, cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily: 'var(--font-ui)', fontSize: 15, color: 'var(--ink-900)', opacity: disabled ? 0.45 : 1, ...style,
    }}>
      <span
        onClick={() => !disabled && onChange && onChange(!checked)}
        role="checkbox"
        aria-checked={checked}
        style={{
          width: 20, height: 20, flexShrink: 0, marginTop: 1, borderRadius: 6,
          border: `1.5px solid ${checked ? 'var(--green-600)' : 'var(--line-strong)'}`,
          background: checked ? 'var(--green-600)' : 'var(--surface)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background var(--transition-fast), border-color var(--transition-fast)',
        }}
      >
        {checked && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6.5L4.7 9L10 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {label && <span onClick={() => !disabled && onChange && onChange(!checked)}>{label}</span>}
    </label>
  );
}
