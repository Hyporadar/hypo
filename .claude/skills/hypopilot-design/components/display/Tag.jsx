import React from 'react';

export function Tag({ selected = false, onClick, children, style }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 14px',
        borderRadius: 'var(--radius-pill)', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 500,
        background: selected ? 'var(--green-100)' : 'var(--surface)',
        color: selected ? 'var(--green-700)' : 'var(--ink-700)',
        border: `1px solid ${selected ? 'var(--green-200)' : 'var(--line-strong)'}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background var(--transition-fast), border-color var(--transition-fast)',
        ...style,
      }}
    >
      {children}
    </button>
  );
}
