/**
 * Hermes Web UI RTL & Math Fix - Content Script
 * Author: say-alireza
 * Repository: hermes-webui-rtl
 */

(function () {
  'use strict';

  // Persian, Arabic, and relevant RTL Unicode character blocks
  const RTL_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFC]/;
  const LTR_REGEX = /[A-Za-z]/;

  // Target selectors for block elements that contain conversational text
  const TEXT_BLOCK_SELECTORS = 'p, li, h1, h2, h3, h4, h5, h6, blockquote, td, th, .markdown-body > div';
  const CODE_OR_MATH_SELECTORS = 'pre, code, kbd, samp, .katex, .katex-display, .math, .hljs, .monaco-editor, .mermaid-diagram';

  const DEFAULT_CONFIG = {
    enabled: true,
    mode: 'auto', // 'auto' | 'force-rtl' | 'force-ltr'
    persianFont: true,
    formulaIsolation: true,
    inputAutoDetect: true
  };

  let config = { ...DEFAULT_CONFIG };
  let observer = null;
  let debounceTimeout = null;

  // -------------------------------------------------------------------------
  // Storage & State Sync
  // -------------------------------------------------------------------------
  function loadConfig(callback) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['hermes_rtl_config'], (result) => {
        if (result && result.hermes_rtl_config) {
          config = { ...DEFAULT_CONFIG, ...result.hermes_rtl_config };
        }
        if (callback) callback();
      });
    } else {
      try {
        const stored = localStorage.getItem('hermes_rtl_config');
        if (stored) config = { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      } catch (e) {}
      if (callback) callback();
    }
  }

  function saveConfig() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ hermes_rtl_config: config });
    }
    try {
      localStorage.setItem('hermes_rtl_config', JSON.stringify(config));
    } catch (e) {}
  }

  // -------------------------------------------------------------------------
  // Direction Detection (First Strong Directional Character)
  // -------------------------------------------------------------------------
  function detectDirection(text) {
    if (!text) return 'neutral';
    // Clean leading bullets, punctuation, numbers, markdown symbols
    const clean = text.replace(/^[\s\d\.\-*#>[\]()\-:;!?~_`+=|/]+/, '');
    for (const char of clean) {
      if (RTL_REGEX.test(char)) return 'rtl';
      if (LTR_REGEX.test(char)) return 'ltr';
    }
    return 'neutral';
  }

  // -------------------------------------------------------------------------
  // DOM Processing Engine
  // -------------------------------------------------------------------------
  function processElement(el) {
    if (!config.enabled) return;

    // Skip if inside code block or math container
    if (el.closest(CODE_OR_MATH_SELECTORS)) return;

    if (config.mode === 'force-rtl') {
      applyRtl(el, true);
      return;
    }

    if (config.mode === 'force-ltr') {
      applyRtl(el, false);
      return;
    }

    // Auto detection
    const text = el.textContent || '';
    const dir = detectDirection(text);

    if (dir === 'rtl') {
      applyRtl(el, true);
    } else if (dir === 'ltr') {
      applyRtl(el, false);
    }
  }

  function applyRtl(el, isRtl) {
    if (isRtl) {
      el.classList.add('hermes-rtl-text');
      if (config.persianFont) el.classList.add('hermes-persian-font');
      el.setAttribute('dir', 'rtl');

      // Formula and code isolation inside RTL container
      if (config.formulaIsolation) {
        isolateEmbeddedMathAndCode(el);
      }
    } else {
      el.classList.remove('hermes-rtl-text');
      el.classList.remove('hermes-persian-font');
      el.removeAttribute('dir');
    }
  }

  function isolateEmbeddedMathAndCode(parentEl) {
    // Isolate KaTeX formulas
    const formulas = parentEl.querySelectorAll('.katex, .katex-display, .math, [data-latex]');
    formulas.forEach((f) => {
      f.setAttribute('dir', 'ltr');
      f.style.setProperty('direction', 'ltr', 'important');
      f.style.setProperty('unicode-bidi', 'isolate', 'important');
      f.style.setProperty('text-align', 'left', 'important');
    });

    // Isolate inline code
    const inlineCodes = parentEl.querySelectorAll('code, kbd, samp');
    inlineCodes.forEach((c) => {
      c.setAttribute('dir', 'ltr');
      c.style.setProperty('direction', 'ltr', 'important');
      c.style.setProperty('unicode-bidi', 'isolate', 'important');
    });
  }

  function processAllElements() {
    if (!config.enabled) {
      document.querySelectorAll('.hermes-rtl-text, .hermes-persian-font').forEach((el) => {
        el.classList.remove('hermes-rtl-text', 'hermes-persian-font');
        el.removeAttribute('dir');
      });
      return;
    }

    const blocks = document.querySelectorAll(TEXT_BLOCK_SELECTORS);
    blocks.forEach(processElement);

    if (config.inputAutoDetect) {
      setupInputListeners();
    }
  }

  // -------------------------------------------------------------------------
  // Chat Input Field Handling
  // -------------------------------------------------------------------------
  function setupInputListeners() {
    const inputs = document.querySelectorAll('textarea, input[type="text"], [contenteditable="true"]');
    inputs.forEach((inputEl) => {
      if (inputEl.dataset.hermesRtlBound) return;
      inputEl.dataset.hermesRtlBound = 'true';

      const handleInput = () => {
        if (!config.enabled || !config.inputAutoDetect) return;
        const text = inputEl.value || inputEl.innerText || '';
        const dir = detectDirection(text);

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
      handleInput(); // initial check
    });
  }

  // -------------------------------------------------------------------------
  // Mutation Observer for Streaming Responses
  // -------------------------------------------------------------------------
  function startObserver() {
    if (observer) observer.disconnect();

    observer = new MutationObserver(() => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        processAllElements();
      }, 50);
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  // -------------------------------------------------------------------------
  // Message Listener (from Popup / Extension Action)
  // -------------------------------------------------------------------------
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.action === 'getConfig') {
        sendResponse({ config });
      } else if (msg.action === 'updateConfig') {
        config = { ...config, ...msg.config };
        saveConfig();
        processAllElements();
        sendResponse({ success: true, config });
      }
    });
  }

  // -------------------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------------------
  function init() {
    loadConfig(() => {
      if (document.body) {
        processAllElements();
        startObserver();
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          processAllElements();
          startObserver();
        });
      }
    });
  }

  init();
})();
