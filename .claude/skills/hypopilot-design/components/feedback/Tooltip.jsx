import React, { useState } from 'react';

export function Tooltip({ content, side = 'top', children }) {
  const [show, setShow] = useState(false);
  const pos = side === 'bottom'
    ? { top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' }
    : { bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' };
  return (
    <span
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      style={{ position: 'relative', display: 'inline-flex' }}
    >
      {children}
      {show && (
        <span role="tooltip" style={{
          position: 'absolute', ...pos, zIndex: 50, whiteSpace: 'nowrap',
          background: 'var(--ink-900)', color: 'var(--text-on-dark)', borderRadius: 'var(--radius-sm)',
          padding: '6px 10px', fontFamily: 'var(--font-ui)', fontSize: 12.5, boxShadow: 'var(--shadow-raised)',
        }}>
          {content}
        </span>
      )}
    </span>
  );
}
