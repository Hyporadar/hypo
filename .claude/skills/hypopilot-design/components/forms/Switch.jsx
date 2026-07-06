import React from 'react';

export function Switch({ label, checked = false, onChange, disabled = false, style }) {
  return (
    <label style={{
      display: 'inline-flex', alignItems: 'center', gap: 12, cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily: 'var(--font-ui)', fontSize: 15, color: 'var(--ink-900)', opacity: disabled ? 0.45 : 1, ...style,
    }}>
      <span
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange && onChange(!checked)}
        style={{
          width: 44, height: 26, borderRadius: 'var(--radius-pill)', flexShrink: 0,
          background: checked ? 'var(--green-600)' : 'var(--line-strong)', position: 'relative',
          transition: 'background var(--transition-fast)',
        }}
      >
        <span style={{
          position: 'absolute', top: 3, left: checked ? 21 : 3, width: 20, height: 20, borderRadius: '50%',
          background: '#fff', boxShadow: '0 1px 3px rgba(33,30,26,0.25)', transition: 'left var(--transition-fast)',
        }} />
      </span>
      {label && <span onClick={() => !disabled && onChange && onChange(!checked)}>{label}</span>}
    </label>
  );
}
