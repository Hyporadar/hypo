import React, { useState } from 'react';

export function Input({ label, hint, error, prefix, suffix, mono = false, style, inputStyle, ...rest }) {
  const [focus, setFocus] = useState(false);
  const border = error ? 'var(--error)' : focus ? 'var(--green-600)' : 'var(--line-strong)';
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'var(--font-ui)', ...style }}>
      {label && <span style={{ font: 'var(--text-label)', color: 'var(--ink-900)' }}>{label}</span>}
      <span style={{
        display: 'flex', alignItems: 'center', gap: 8, height: 46, padding: '0 14px',
        background: 'var(--surface)', border: `1px solid ${border}`, borderRadius: 'var(--radius-sm)',
        boxShadow: focus ? 'var(--focus-ring)' : 'none', transition: 'box-shadow var(--transition-fast), border-color var(--transition-fast)',
      }}>
        {prefix && <span style={{ color: 'var(--ink-500)', fontSize: 14 }}>{prefix}</span>}
        <input
          {...rest}
          onFocus={(e) => { setFocus(true); rest.onFocus && rest.onFocus(e); }}
          onBlur={(e) => { setFocus(false); rest.onBlur && rest.onBlur(e); }}
          style={{
            flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
            fontFamily: mono ? 'var(--font-mono)' : 'var(--font-ui)', fontSize: 15, color: 'var(--ink-900)',
            ...inputStyle,
          }}
        />
        {suffix && <span style={{ color: 'var(--ink-500)', fontSize: 14 }}>{suffix}</span>}
      </span>
      {(error || hint) && (
        <span style={{ font: 'var(--text-body-sm)', color: error ? 'var(--error)' : 'var(--text-muted)' }}>
          {error || hint}
        </span>
      )}
    </label>
  );
}
