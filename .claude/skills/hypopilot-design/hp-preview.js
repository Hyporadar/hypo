/* hp-preview.js — charge le namespace de composants HypoPilot.
   1) essaie le bundle compilé (_ds_bundle.js) ;
   2) sinon, charge les sources .jsx directement (fallback de prévisualisation).
   Requiert React + Babel standalone déjà chargés. Expose window.__HP_NS (Promise<ns|null>). */
(function () {
  var root = (document.currentScript && document.currentScript.dataset.root) || './';

  function findNamespace() {
    var names = Object.getOwnPropertyNames(window);
    for (var i = 0; i < names.length; i++) {
      try {
        var v = window[names[i]];
        if (v && typeof v === 'object' && typeof v.Button === 'function' && typeof v.Wordmark === 'function') return v;
      } catch (e) {}
    }
    return null;
  }

  function tryBundle() {
    return fetch(root + '_ds_bundle.js', { method: 'HEAD' }).then(function (r) {
      if (!r.ok) return null;
      return new Promise(function (resolve) {
        var s = document.createElement('script');
        s.src = root + '_ds_bundle.js';
        s.onload = function () { resolve(findNamespace()); };
        s.onerror = function () { resolve(null); };
        document.head.appendChild(s);
      });
    }).catch(function () { return null; });
  }

  var FILES = [
    'components/forms/Button.jsx',
    'components/forms/IconButton.jsx',
    'components/forms/Input.jsx',
    'components/forms/Select.jsx',
    'components/forms/Checkbox.jsx',
    'components/forms/Radio.jsx',
    'components/forms/Switch.jsx',
    'components/display/Card.jsx',
    'components/display/Badge.jsx',
    'components/display/Tag.jsx',
    'components/display/Wordmark.jsx',
    'components/feedback/Toast.jsx',
    'components/feedback/Tooltip.jsx',
    'components/feedback/Dialog.jsx',
    'components/navigation/Tabs.jsx'
  ];

  function resolvePath(from, rel) {
    var base = from.split('/').slice(0, -1);
    var parts = rel.split('/');
    for (var i = 0; i < parts.length; i++) {
      if (parts[i] === '..') base.pop();
      else if (parts[i] !== '.') base.push(parts[i]);
    }
    return base.join('/');
  }

  function loadSources() {
    var registry = {};
    var ns = {};
    var chain = Promise.resolve();
    FILES.forEach(function (f) {
      chain = chain.then(function () {
        return fetch(root + f).then(function (r) {
          if (!r.ok) throw new Error('fetch ' + f);
          return r.text();
        }).then(function (src) {
          var code = Babel.transform(src, {
            presets: [['react', { runtime: 'classic' }]],
            plugins: [['transform-modules-commonjs']]
          }).code;
          var module = { exports: {} };
          var require = function (p) {
            if (p === 'react') return window.React;
            if (p === 'react/jsx-runtime') {
              var R = window.React;
              return { jsx: R.createElement, jsxs: R.createElement, Fragment: R.Fragment };
            }
            return registry[resolvePath(f, p)] || {};
          };
          new Function('require', 'module', 'exports', 'React', code)(require, module, module.exports, window.React);
          registry[f] = module.exports;
          Object.assign(ns, module.exports);
        });
      });
    });
    return chain.then(function () { return ns; }).catch(function (e) {
      console.warn('hp-preview fallback failed:', e);
      return null;
    });
  }

  window.__HP_NS = tryBundle().then(function (found) {
    return found || loadSources();
  });
})();
