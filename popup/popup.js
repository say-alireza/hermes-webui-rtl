// Popup logic for Hermes Web UI RTL & Math Fix
document.addEventListener('DOMContentLoaded', () => {
  const toggleEnabled = document.getElementById('toggle-enabled');
  const toggleFont = document.getElementById('toggle-font');
  const toggleFormula = document.getElementById('toggle-formula');
  const toggleInput = document.getElementById('toggle-input');
  const modeButtons = document.querySelectorAll('.mode-btn');
  const applyBtn = document.getElementById('apply-btn');

  let currentConfig = {
    enabled: true,
    mode: 'auto',
    persianFont: true,
    formulaIsolation: true,
    inputAutoDetect: true
  };

  // Load config from active tab or storage
  chrome.storage.local.get(['hermes_rtl_config'], (result) => {
    if (result && result.hermes_rtl_config) {
      currentConfig = { ...currentConfig, ...result.hermes_rtl_config };
    }
    updateUI();
  });

  function updateUI() {
    toggleEnabled.checked = currentConfig.enabled;
    toggleFont.checked = currentConfig.persianFont;
    toggleFormula.checked = currentConfig.formulaIsolation;
    toggleInput.checked = currentConfig.inputAutoDetect;

    modeButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.mode === currentConfig.mode);
    });
  }

  function readUI() {
    currentConfig.enabled = toggleEnabled.checked;
    currentConfig.persianFont = toggleFont.checked;
    currentConfig.formulaIsolation = toggleFormula.checked;
    currentConfig.inputAutoDetect = toggleInput.checked;
  }

  modeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      currentConfig.mode = btn.dataset.mode;
      updateUI();
      saveAndNotify();
    });
  });

  [toggleEnabled, toggleFont, toggleFormula, toggleInput].forEach((input) => {
    input.addEventListener('change', () => {
      readUI();
      saveAndNotify();
    });
  });

  applyBtn.addEventListener('click', () => {
    readUI();
    saveAndNotify();
    applyBtn.textContent = 'Applied ✓';
    setTimeout(() => {
      applyBtn.textContent = 'Apply Now';
    }, 1200);
  });

  function saveAndNotify() {
    chrome.storage.local.set({ hermes_rtl_config: currentConfig });
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'updateConfig',
          config: currentConfig
        }, () => {
          // Ignore error if content script not loaded in active tab
          if (chrome.runtime.lastError) {}
        });
      }
    });
  }
});
