/* js/ui.js */
/**
 * UI Manager Module - Controls sidebar, settings drawer, theme switches,
 * sliders, toast notifications, and general visual states.
 */

// Available themes
export const THEMES = {
  AMETHYST_DARK: 'amethyst-dark',
  CYBERPUNK_NIGHT: 'cyberpunk-night',
  PARCHMENT: 'parchment',
  SLATE: 'slate'
};

/**
 * Toggles the visibility of the left sidebar.
 * Handles both desktop body classes and mobile overlays.
 */
export function toggleSidebar() {
  const isMobile = window.innerWidth <= 1024;
  if (isMobile) {
    document.body.classList.toggle('sidebar-open-mobile');
    document.body.classList.remove('drawer-open-mobile');
  } else {
    document.body.classList.toggle('sidebar-collapsed');
  }
}

/**
 * Toggles the visibility of the right settings drawer.
 */
export function toggleSettingsDrawer() {
  const isMobile = window.innerWidth <= 1024;
  if (isMobile) {
    document.body.classList.toggle('drawer-open-mobile');
    document.body.classList.remove('sidebar-open-mobile');
  } else {
    document.body.classList.toggle('drawer-open');
  }
}

/**
 * Closes all side panels (useful for mobile backdrop click).
 */
export function closeAllPanels() {
  document.body.classList.remove('sidebar-open-mobile', 'drawer-open-mobile');
}

/**
 * Applies a selected theme name to the document body.
 * Removes other active theme classes first.
 * @param {string} themeName 
 */
export function applyTheme(themeName) {
  const validThemes = Object.values(THEMES);
  if (!validThemes.includes(themeName)) {
    console.warn(`Invalid theme requested: ${themeName}. Defaulting to Amethyst Dark.`);
    themeName = THEMES.AMETHYST_DARK;
  }

  // Remove other theme classes
  validThemes.forEach(t => {
    document.body.classList.remove(t);
  });

  // Add selected theme
  document.body.classList.add(themeName);

  // Update theme option checkmarks/active classes in UI if they exist
  const options = document.querySelectorAll('.theme-option');
  options.forEach(opt => {
    if (opt.dataset.theme === themeName) {
      opt.classList.add('active');
    } else {
      opt.classList.remove('active');
    }
  });

  return themeName;
}

/**
 * Updates the display text value next to a slider input.
 * @param {HTMLInputElement} sliderEl 
 * @param {HTMLElement} displayEl 
 * @param {string} suffix 
 */
export function updateSliderDisplay(sliderEl, displayEl, suffix = '') {
  if (sliderEl && displayEl) {
    displayEl.textContent = `${sliderEl.value}${suffix}`;
  }
}

/**
 * Sets a button element to loading state, inserting a spinner and disabling actions.
 * @param {HTMLButtonElement} buttonEl 
 * @param {boolean} isLoading 
 * @param {string} originalHtml - Saved HTML to restore when loading is done
 */
export function setButtonLoading(buttonEl, isLoading, originalHtml = '') {
  if (!buttonEl) return;

  if (isLoading) {
    buttonEl.classList.add('btn-loading');
    buttonEl.disabled = true;
    buttonEl.innerHTML = `<span class="spinner"></span> Processing...`;
  } else {
    buttonEl.classList.remove('btn-loading');
    buttonEl.disabled = false;
    if (originalHtml) {
      buttonEl.innerHTML = originalHtml;
    }
  }
}

/**
 * Displays a non-blocking toast alert in the lower right corner.
 * @param {string} message 
 * @param {'success' | 'error' | 'info'} type 
 * @param {number} duration - Milliseconds before auto-dismissal
 */
export function showToast(message, type = 'info', duration = 3000) {
  // Ensure container exists
  let container = document.querySelector('.alert-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'alert-container';
    document.body.appendChild(container);
  }

  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;

  const textNode = document.createElement('span');
  textNode.textContent = message;
  alert.appendChild(textNode);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'alert-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.setAttribute('aria-label', 'Close notification');
  closeBtn.onclick = () => {
    alert.style.animation = 'slideIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) reverse forwards';
    setTimeout(() => alert.remove(), 300);
  };
  alert.appendChild(closeBtn);

  container.appendChild(alert);

  // Auto-dismiss
  setTimeout(() => {
    if (alert.parentElement) {
      alert.style.animation = 'slideIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) reverse forwards';
      setTimeout(() => {
        if (alert.parentElement) alert.remove();
      }, 300);
    }
  }, duration);
}

/**
 * Updates the storage quota progress bar and percentage display.
 * @param {number} usedBytes 
 * @param {number} totalBytes - Default to 5MB (5,242,880 bytes)
 */
export function updateStorageProgress(usedBytes, totalBytes = 5 * 1024 * 1024) {
  const percentage = Math.min((usedBytes / totalBytes) * 100, 100);
  
  const fillEl = document.getElementById('storage-fill');
  const textEl = document.getElementById('storage-text');

  if (fillEl) {
    fillEl.style.width = `${percentage}%`;
    
    // Set alerts threshold colors
    fillEl.classList.remove('warning', 'danger');
    if (percentage >= 90) {
      fillEl.classList.add('danger');
    } else if (percentage >= 75) {
      fillEl.classList.add('warning');
    }
  }

  if (textEl) {
    const usedMb = (usedBytes / (1024 * 1024)).toFixed(2);
    const totalMb = (totalBytes / (1024 * 1024)).toFixed(0);
    textEl.textContent = `${usedMb} MB / ${totalMb} MB (${percentage.toFixed(1)}%)`;
  }
}

/**
 * Switches the active settings panel tab.
 * @param {string} tabId 
 */
export function switchSettingsTab(tabId) {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabButtons.forEach(btn => {
    if (btn.dataset.tab === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  tabPanes.forEach(pane => {
    if (pane.id === `${tabId}-pane`) {
      pane.classList.add('active');
    } else {
      pane.classList.remove('active');
    }
  });
}

/**
 * Binds DOM event listeners to all core UI controllers.
 */
export function bindUIEventListeners() {
  // Mobile backdrop listener
  const backdrop = document.querySelector('.layout-backdrop');
  if (backdrop) {
    backdrop.addEventListener('click', closeAllPanels);
  }

  // Sidebar toggle button listeners
  const toggleSidebarBtns = document.querySelectorAll('.btn-toggle-sidebar');
  toggleSidebarBtns.forEach(btn => {
    btn.addEventListener('click', toggleSidebar);
  });

  // Settings drawer toggle button listeners
  const toggleDrawerBtns = document.querySelectorAll('.btn-toggle-drawer');
  toggleDrawerBtns.forEach(btn => {
    btn.addEventListener('click', toggleSettingsDrawer);
  });

  // Theme option clicks
  const themeOptions = document.querySelectorAll('.theme-option');
  themeOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      const selectedTheme = opt.dataset.theme;
      applyTheme(selectedTheme);
      showToast(`Theme changed to ${selectedTheme.replace('-', ' ')}`, 'info');
    });
  });

  // Settings Tab switches
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      switchSettingsTab(btn.dataset.tab);
    });
  });

  // Listen for window resize to handle panel visual states cleanups
  window.addEventListener('resize', () => {
    if (window.innerWidth > 1024) {
      closeAllPanels();
    }
  });
}
