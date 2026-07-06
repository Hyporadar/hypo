import React, { useState } from 'react';

export function Select({ label, hint, error, options = [], style, ...rest }) {
  const [focus, setFocus] = useState(false);
  const border = error ? 'var(--error)' : focus ? 'var(--green-600)' : 'var(--line-strong)';
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'var(--font-ui)', ...style }}>
      {label && <span style={{ font: 'var(--text-label)', color: 'var(--ink-900)' }}>{label}</span>}
      <span style={{ position: 'relative', display: 'block' }}>
        <select
          {...rest}
          onFocus={(e) => { setFocus(true); rest.onFocus && rest.onFocus(e); }}
          onBlur={(e) => { setFocus(false); rest.onBlur && rest.onBlur(e); }}
          style={{
            width: '100%', height: 46, padding: '0 40px 0 14px', appearance: 'none', WebkitAppearance: 'none',
            background: 'var(--surface)', border: `1px solid ${border}`, borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--font-ui)', fontSize: 15, color: 'var(--ink-900)', cursor: 'pointer', outline: 'none',
            boxShadow: focus ? 'var(--focus-ring)' : 'none', transition: 'box-shadow var(--transition-fast)',
          }}
        >
          {options.map((o) => {
            const opt = typeof o === 'string' ? { value: o, label: o } : o;
            return <option key={opt.value} value={opt.value}>{opt.label}</option>;
          })}
        </select>
        <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--ink-500)', fontSize: 12 }}>▾</span>
      </span>
      {(error || hint) && (
        <span style={{ font: 'var(--text-body-sm)', color: error ? 'var(--error)' : 'var(--text-muted)' }}>
          {error || hint}
        </span>
      )}
    </label>
  );
}
