import React, { useState } from 'react';

export function Tabs({ tabs = [], value, onChange, style }) {
  const [internal, setInternal] = useState(tabs[0] && (typeof tabs[0] === 'string' ? tabs[0] : tabs[0].value));
  const active = value !== undefined ? value : internal;
  const set = (v) => { setInternal(v); onChange && onChange(v); };
  return (
    <div role="tablist" style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--line)', fontFamily: 'var(--font-ui)', ...style }}>
      {tabs.map((t) => {
        const tab = typeof t === 'string' ? { value: t, label: t } : t;
        const isActive = tab.value === active;
        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={isActive}
            onClick={() => set(tab.value)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '10px 16px', marginBottom: -1,
              fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: isActive ? 600 : 500,
              color: isActive ? 'var(--green-700)' : 'var(--ink-500)',
              borderBottom: `2px solid ${isActive ? 'var(--green-600)' : 'transparent'}`,
              transition: 'color var(--transition-fast)',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
