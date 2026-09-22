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
    inputAutoDetect: true,
    widgetPosition: { bottom: 24, right: 24 }
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
  // Floating Quick-Toggle Widget
  // -------------------------------------------------------------------------
  function createFloatingWidget() {
    if (document.getElementById('hermes-rtl-floating-widget')) return;

    const widget = document.createElement('div');
    widget.id = 'hermes-rtl-floating-widget';
    widget.title = 'Hermes RTL & Math Assistant (Drag to move)';

    const dot = document.createElement('span');
    dot.className = 'hermes-rtl-status-dot';

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'hermes-rtl-toggle-btn';
    toggleBtn.innerHTML = '<span>RTL</span> <span class="hermes-rtl-badge">AUTO</span>';

    const modeBtn = document.createElement('span');
    modeBtn.className = 'hermes-rtl-mode-switch';
    modeBtn.textContent = '⚙';
    modeBtn.title = 'Switch Mode: Auto / Force RTL / LTR';

    widget.appendChild(dot);
    widget.appendChild(toggleBtn);
    widget.appendChild(modeBtn);

    // Apply saved position
    if (config.widgetPosition) {
      widget.style.bottom = `${config.widgetPosition.bottom}px`;
      widget.style.right = `${config.widgetPosition.right}px`;
    }

    document.body.appendChild(widget);

    // Click handler to toggle ON/OFF
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      config.enabled = !config.enabled;
      saveConfig();
      updateWidgetUI();
      processAllElements();
    });

    // Mode switch click handler
    modeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const modes = ['auto', 'force-rtl', 'force-ltr'];
      const nextIdx = (modes.indexOf(config.mode) + 1) % modes.length;
      config.mode = modes[nextIdx];
      saveConfig();
      updateWidgetUI();
      processAllElements();
    });

    makeDraggable(widget);
    updateWidgetUI();
  }

  function updateWidgetUI() {
    const widget = document.getElementById('hermes-rtl-floating-widget');
    if (!widget) return;

    widget.classList.toggle('disabled', !config.enabled);

    const badge = widget.querySelector('.hermes-rtl-badge');
    if (badge) {
      if (!config.enabled) {
        badge.textContent = 'OFF';
      } else if (config.mode === 'auto') {
        badge.textContent = 'AUTO';
      } else if (config.mode === 'force-rtl') {
        badge.textContent = 'RTL';
      } else {
        badge.textContent = 'LTR';
      }
    }
  }

  function makeDraggable(el) {
    let isDragging = false;
    let startX, startY, origX, origY;

    el.addEventListener('mousedown', (e) => {
      if (e.target.closest('button') || e.target.closest('.hermes-rtl-mode-switch')) return;
      isDragging = false;
      startX = e.clientX;
      startY = e.clientY;
      const rect = el.getBoundingClientRect();
      origX = rect.left;
      origY = rect.top;

      const onMouseMove = (moveEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          isDragging = true;
          el.style.left = `${Math.max(10, Math.min(window.innerWidth - el.offsetWidth - 10, origX + dx))}px`;
          el.style.top = `${Math.max(10, Math.min(window.innerHeight - el.offsetHeight - 10, origY + dy))}px`;
          el.style.bottom = 'auto';
          el.style.right = 'auto';
        }
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        if (isDragging) {
          const rect = el.getBoundingClientRect();
          config.widgetPosition = {
            bottom: window.innerHeight - rect.bottom,
            right: window.innerWidth - rect.right
          };
          saveConfig();
        }
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
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
        updateWidgetUI();
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
    });
  }

  init();
})();
