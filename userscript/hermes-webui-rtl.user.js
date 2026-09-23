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

  function init() {
    if (document.body) {
      processAllElements();
      startObserver();
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        processAllElements();
        startObserver();
      });
    }
  }

  init();
})();
