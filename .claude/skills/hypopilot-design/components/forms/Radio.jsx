import React from 'react';

export function Radio({ label, checked = false, onChange, disabled = false, style }) {
  return (
    <label
      onClick={() => !disabled && onChange && onChange(true)}
      style={{
        display: 'inline-flex', alignItems: 'flex-start', gap: 10, cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'var(--font-ui)', fontSize: 15, color: 'var(--ink-900)', opacity: disabled ? 0.45 : 1, ...style,
      }}
    >
      <span
        role="radio"
        aria-checked={checked}
        style={{
          width: 20, height: 20, flexShrink: 0, marginTop: 1, borderRadius: '50%',
          border: `1.5px solid ${checked ? 'var(--green-600)' : 'var(--line-strong)'}`,
          background: 'var(--surface)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          transition: 'border-color var(--transition-fast)',
        }}
      >
        {checked && <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--green-600)' }} />}
      </span>
      {label && <span>{label}</span>}
    </label>
  );
}
