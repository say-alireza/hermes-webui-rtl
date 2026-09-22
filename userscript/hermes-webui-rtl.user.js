// ==UserScript==
// @name         Hermes Web UI RTL & Math Fix
// @namespace    https://github.com/say-alireza/hermes-webui-rtl
// @version      1.0.0
// @description  Fixes RTL text direction, Persian/Arabic font, and KaTeX math formula reversal in Hermes Web UI / Hermes Studio.
// @author       say-alireza
// @match        http://localhost:*/*
// @match        http://127.0.0.1:*/*
// @match        *://*.hermes-studio.ai/*
// @match        *://hermes-studio.ai/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  const CSS = `
@import url('https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css');

.hermes-persian-font,
.hermes-rtl-text,
.hermes-rtl-block p,
.hermes-rtl-block li,
.hermes-rtl-block h1,
.hermes-rtl-block h2,
.hermes-rtl-block h3,
.hermes-rtl-block h4,
.hermes-rtl-block h5,
.hermes-rtl-block h6 {
  font-family: "Vazirmatn", "Vazir", "Iranian Sans", "IRANSans", "Segoe UI", Tahoma, Arial, sans-serif !important;
  line-height: 1.85 !important;
}

.hermes-rtl-text,
.hermes-rtl-block {
  direction: rtl !important;
  text-align: right !important;
  unicode-bidi: plaintext !important;
}

.hermes-rtl-text p,
p.hermes-rtl-text,
.hermes-rtl-text li,
li.hermes-rtl-text {
  direction: rtl !important;
  text-align: right !important;
  unicode-bidi: plaintext !important;
}

.hermes-rtl-text ul,
.hermes-rtl-text ol {
  direction: rtl !important;
  text-align: right !important;
  padding-inline-start: 26px !important;
  padding-inline-end: 0 !important;
}

.hermes-rtl-text table,
.hermes-rtl-text table th,
.hermes-rtl-text table td {
  direction: rtl !important;
  text-align: right !important;
}

/* Formula & Math Protection */
.katex,
.katex-html,
.katex-mathml,
.katex *,
.math,
mjx-container,
[data-latex] {
  direction: ltr !important;
  text-align: left !important;
  unicode-bidi: isolate !important;
}

.katex {
  display: inline-block !important;
  vertical-align: middle !important;
  margin-inline: 4px !important;
}

.katex-display {
  direction: ltr !important;
  display: block !important;
  text-align: center !important;
  unicode-bidi: isolate !important;
  margin: 1.2em 0 !important;
  overflow-x: auto !important;
  overflow-y: hidden !important;
}

.katex-display > .katex {
  display: inline-block !important;
  text-align: initial !important;
}

/* Code block isolation */
pre, pre *, code, kbd, samp, .hljs, .hljs-code-block, .monaco-editor, .monaco-editor * {
  direction: ltr !important;
  text-align: left !important;
  unicode-bidi: isolate !important;
  font-family: "JetBrains Mono", Consolas, monospace !important;
}

p code, li code, blockquote code, td code {
  display: inline-block !important;
  direction: ltr !important;
  unicode-bidi: isolate !important;
  margin-inline: 3px !important;
  vertical-align: baseline !important;
}

/* Input auto-direction */
.hermes-rtl-input,
textarea.hermes-rtl-input,
input.hermes-rtl-input,
.n-input__textarea-el.hermes-rtl-input {
  direction: rtl !important;
  text-align: right !important;
  unicode-bidi: plaintext !important;
  font-family: "Vazirmatn", "Segoe UI", Tahoma, sans-serif !important;
}

/* Floating widget */
#hermes-rtl-floating-widget {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999999;
  display: flex;
  align-items: center;
  background: rgba(24, 24, 27, 0.88);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 9999px;
  padding: 4px 10px;
  gap: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
  user-select: none;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 12px;
  color: #f4f4f5;
  cursor: grab;
}
#hermes-rtl-floating-widget.disabled {
  opacity: 0.55;
  background: rgba(39, 39, 42, 0.7);
}
.hermes-rtl-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 8px #10b981;
}
#hermes-rtl-floating-widget.disabled .hermes-rtl-status-dot {
  background: #ef4444;
  box-shadow: 0 0 6px #ef4444;
}
.hermes-rtl-toggle-btn {
  background: none;
  border: none;
  color: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  padding: 2px 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.hermes-rtl-badge {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 1px 5px;
  font-size: 10px;
  font-weight: 700;
}
.hermes-rtl-mode-switch {
  cursor: pointer;
  color: #94a3b8;
  font-size: 11px;
  padding: 2px 5px;
  border-radius: 4px;
}
`;

  if (typeof GM_addStyle !== 'undefined') {
    GM_addStyle(CSS);
  } else {
    const styleEl = document.createElement('style');
    styleEl.textContent = CSS;
    (document.head || document.documentElement).appendChild(styleEl);
  }

  const RTL_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFC]/;
  const LTR_REGEX = /[A-Za-z]/;
  const TEXT_BLOCK_SELECTORS = 'p, li, h1, h2, h3, h4, h5, h6, blockquote, td, th, .markdown-body > div';
  const CODE_OR_MATH_SELECTORS = 'pre, code, kbd, samp, .katex, .katex-display, .math, .hljs, .monaco-editor, .mermaid-diagram';

  let enabled = true;
  let mode = 'auto'; // 'auto' | 'force-rtl' | 'force-ltr'

  function detectDirection(text) {
    if (!text) return 'neutral';
    const clean = text.replace(/^[\s\d\.\-*#>[\]()\-:;!?~_`+=|/]+/, '');
    for (const char of clean) {
      if (RTL_REGEX.test(char)) return 'rtl';
      if (LTR_REGEX.test(char)) return 'ltr';
    }
    return 'neutral';
  }

  function processElement(el) {
    if (!enabled) return;
    if (el.closest(CODE_OR_MATH_SELECTORS)) return;

    if (mode === 'force-rtl') {
      applyRtl(el, true);
      return;
    }
    if (mode === 'force-ltr') {
      applyRtl(el, false);
      return;
    }

    const text = el.textContent || '';
    const dir = detectDirection(text);
    if (dir === 'rtl') applyRtl(el, true);
    else if (dir === 'ltr') applyRtl(el, false);
  }

  function applyRtl(el, isRtl) {
    if (isRtl) {
      el.classList.add('hermes-rtl-text', 'hermes-persian-font');
      el.setAttribute('dir', 'rtl');

      const formulas = el.querySelectorAll('.katex, .katex-display, .math, [data-latex]');
      formulas.forEach((f) => {
        f.setAttribute('dir', 'ltr');
        f.style.setProperty('direction', 'ltr', 'important');
        f.style.setProperty('unicode-bidi', 'isolate', 'important');
      });

      const inlineCodes = el.querySelectorAll('code, kbd, samp');
      inlineCodes.forEach((c) => {
        c.setAttribute('dir', 'ltr');
        c.style.setProperty('direction', 'ltr', 'important');
        c.style.setProperty('unicode-bidi', 'isolate', 'important');
      });
    } else {
      el.classList.remove('hermes-rtl-text', 'hermes-persian-font');
      el.removeAttribute('dir');
    }
  }

  function processAllElements() {
    if (!enabled) {
      document.querySelectorAll('.hermes-rtl-text, .hermes-persian-font').forEach((el) => {
        el.classList.remove('hermes-rtl-text', 'hermes-persian-font');
        el.removeAttribute('dir');
      });
      return;
    }
    document.querySelectorAll(TEXT_BLOCK_SELECTORS).forEach(processElement);
    setupInputListeners();
  }

  function setupInputListeners() {
    document.querySelectorAll('textarea, input[type="text"], [contenteditable="true"]').forEach((inputEl) => {
      if (inputEl.dataset.hermesRtlBound) return;
      inputEl.dataset.hermesRtlBound = 'true';
      const handleInput = () => {
        if (!enabled) return;
        const dir = detectDirection(inputEl.value || inputEl.innerText || '');
        if (dir === 'rtl') {
          inputEl.classList.add('hermes-rtl-input');
          inputEl.setAttribute('dir', 'rtl');
        } else if (dir === 'ltr') {
          inputEl.classList.remove('hermes-rtl-input');
          inputEl.setAttribute('dir', 'ltr');
        }
      };
      inputEl.addEventListener('input', handleInput);
      inputEl.addEventListener('keyup', handleInput);
      handleInput();
    });
  }

  let debounceTimer = null;
  function startObserver() {
    const observer = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(processAllElements, 50);
    });
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  function createFloatingWidget() {
    if (document.getElementById('hermes-rtl-floating-widget')) return;
    const widget = document.createElement('div');
    widget.id = 'hermes-rtl-floating-widget';
    widget.innerHTML = `
      <span class="hermes-rtl-status-dot"></span>
      <button class="hermes-rtl-toggle-btn">
        <span>RTL</span> <span class="hermes-rtl-badge">AUTO</span>
      </button>
      <span class="hermes-rtl-mode-switch" title="Switch Mode">⚙</span>
    `;
    document.body.appendChild(widget);

    const toggleBtn = widget.querySelector('.hermes-rtl-toggle-btn');
    const modeBtn = widget.querySelector('.hermes-rtl-mode-switch');
    const badge = widget.querySelector('.hermes-rtl-badge');

    toggleBtn.addEventListener('click', () => {
      enabled = !enabled;
      widget.classList.toggle('disabled', !enabled);
      badge.textContent = enabled ? (mode === 'auto' ? 'AUTO' : (mode === 'force-rtl' ? 'RTL' : 'LTR')) : 'OFF';
      processAllElements();
    });

    modeBtn.addEventListener('click', () => {
      const modes = ['auto', 'force-rtl', 'force-ltr'];
      mode = modes[(modes.indexOf(mode) + 1) % modes.length];
      badge.textContent = mode === 'auto' ? 'AUTO' : (mode === 'force-rtl' ? 'RTL' : 'LTR');
      processAllElements();
    });
  }

  function init() {
    if (document.body) {
      createFloatingWidget();
      processAllElements();
      startObserver();
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        createFloatingWidget();
        processAllElements();
        startObserver();
      });
    }
  }

  init();
})();
