// ===== CLEAN THEME ENGINE =====
// Simple logic: Click card -> Theme changes -> UI updates instantly

(function() {
  'use strict';

  if (window.DynamicThemeEngine) return;

  const DynamicThemeEngine = {
    characters: {
      naruto: {
        id: 'naruto', name: 'Naruto', anime: 'Naruto',
        color: '#FF6B00', glow: 'rgba(255, 107, 0, 0.5)',
        symbol: '🍥'
      },
      tanjiro: {
        id: 'tanjiro', name: 'Tanjiro', anime: 'Demon Slayer',
        color: '#2E8B57', glow: 'rgba(46, 139, 87, 0.5)',
        symbol: '💧'
      },
      gojo: {
        id: 'gojo', name: 'Gojo', anime: 'Jujutsu Kaisen',
        color: '#800080', glow: 'rgba(128, 0, 128, 0.5)',
        symbol: '👁️'
      },
      luffy: {
        id: 'luffy', name: 'Luffy', anime: 'One Piece',
        color: '#DC143C', glow: 'rgba(220, 20, 60, 0.5)',
        symbol: '👒'
      },
      saitama: {
        id: 'saitama', name: 'Saitama', anime: 'One Punch Man',
        color: '#FFD700', glow: 'rgba(255, 215, 0, 0.5)',
        symbol: '👊'
      },
      anya: {
        id: 'anya', name: 'Anya', anime: 'Spy x Family',
        color: '#FF69B4', glow: 'rgba(255, 105, 180, 0.5)',
        symbol: '🥜'
      }
    },

    currentTheme: 'naruto',

    init() {
      const saved = localStorage.getItem('anime-character-theme');
      if (saved && this.characters[saved]) {
        this.currentTheme = saved;
      }
      this.updateCardSelection(this.currentTheme);
    },

    setCharacterTheme(themeId) {
      if (!this.characters[themeId]) return;

      this.currentTheme = themeId;
      localStorage.setItem('anime-character-theme', themeId);
      localStorage.setItem('thrilling_theme', themeId);

      this.updateCardSelection(themeId);

      const char = this.characters[themeId];
      document.body.className = document.body.className.replace(/theme-\w+/g, '');
      document.body.classList.add('theme-' + themeId);
      document.documentElement.setAttribute('data-theme', themeId);

      const root = document.documentElement.style;
      root.setProperty('--accent', char.color);
      root.setProperty('--accent-glow', char.glow);
      root.setProperty('--accent-secondary', char.color);
      root.setProperty('--check-bg', char.color);
      root.setProperty('--check-color', char.color);
      root.setProperty('--player-accent', char.color);
      root.setProperty('--player-accent-light', char.color);

      this.updateDynamicElements(char.color, char.glow);
      this.updateNavTheme(char.color, char.glow);
      this.updateProgressBars(char.color);

      localStorage.setItem('thrilling_theme_color', char.color);
      localStorage.setItem('thrilling_theme_glow', char.glow);

      this.showToast(char.symbol + ' ' + char.name + ' Theme Activated!', char.color);

      window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: themeId, color: char.color, glow: char.glow } }));
    },

    updateCardSelection(selectedId) {
      document.querySelectorAll('.character-card').forEach(card => {
        const cardTheme = card.dataset.theme;
        let check = card.querySelector('.character-check');

        if (cardTheme === selectedId) {
          card.classList.add('selected');
          if (!check) {
            const checkDiv = document.createElement('div');
            checkDiv.className = 'character-check';
            checkDiv.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';
            card.appendChild(checkDiv);
          }
        } else {
          card.classList.remove('selected');
          if (check) check.remove();
        }
      });
    },

    updateDynamicElements(color, glow) {
      document.querySelectorAll('input:checked + .t-slider').forEach(el => {
        el.style.background = color;
      });

      document.querySelectorAll('.nav-item.active, .bottom-nav .active').forEach(el => {
        el.style.color = color;
      });

      document.querySelectorAll('.t-icon').forEach(el => {
        el.style.background = color + '20';
      });

      // FIX: Settings icon - icon gets color, background stays subtle
      document.querySelectorAll('.settings-icon').forEach(el => {
        el.style.color = color;
        el.style.background = 'rgba(255,255,255,0.06)';
        el.style.border = '1px solid ' + color + '30';
      });
      document.querySelectorAll('.settings-icon svg').forEach(el => {
        el.style.stroke = color;
      });

      const style = document.createElement('style');
      style.id = 'theme-dynamic-styles-appearance';
      style.textContent = `
        .nav-item.active::after { background: ${color} !important; box-shadow: 0 0 8px ${glow} !important; }
        .theme-${this.currentTheme} input:checked + .t-slider { background: ${color} !important; }
        .srv-btn.on { background: ${color} !important; color: #000 !important; }
        /* FIX: Settings icon - icon gets color, not background */
        .settings-icon { color: ${color} !important; background: rgba(255,255,255,0.06) !important; border: 1px solid ${color}30 !important; }
        .settings-icon svg { stroke: ${color} !important; }
      `;
      const oldStyle = document.getElementById('theme-dynamic-styles-appearance');
      if (oldStyle) oldStyle.remove();
      document.head.appendChild(style);
    },

    showToast(message, color) {
      let toast = document.getElementById('theme-toast');

      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'theme-toast';
        toast.className = 'theme-toast';
        document.body.appendChild(toast);
      }

      const char = this.characters[this.currentTheme];
      let iconSvg = '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>';

      switch(char.id) {
        case 'naruto':
          iconSvg = '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>';
          break;
        case 'tanjiro':
          iconSvg = '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07"/></svg>';
          break;
        case 'gojo':
          iconSvg = '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>';
          break;
        case 'luffy':
          iconSvg = '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>';
          break;
        case 'saitama':
          iconSvg = '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>';
          break;
        case 'anya':
          iconSvg = '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
          break;
      }

      toast.innerHTML = iconSvg + '<span class="theme-toast-text">' + message + '</span>';
      toast.style.borderColor = color;

      requestAnimationFrame(function() {
        toast.classList.add('show');
      });

      clearTimeout(this._toastTimeout);
      this._toastTimeout = setTimeout(function() {
        toast.classList.remove('show');
      }, 2500);
    },

    updateNavTheme(color, glow) {
      document.querySelectorAll('.nav-item.active svg').forEach(el => {
        el.style.stroke = color;
        el.style.filter = 'drop-shadow(0 0 6px ' + glow + ')';
      });
      document.querySelectorAll('.nav-item.active span').forEach(el => {
        el.style.color = color;
      });
    },

    updateProgressBars(color) {
      document.querySelectorAll('.history-progress-fill').forEach(el => {
        el.style.background = 'linear-gradient(90deg, ' + color + ', ' + color + ')';
      });
      document.querySelectorAll('.history-landscape-progress').forEach(el => {
        el.style.background = 'linear-gradient(90deg, ' + color + ', ' + color + ')';
      });
    },

    getCurrent() {
      return this.characters[this.currentTheme];
    }
  };

  window.DynamicThemeEngine = DynamicThemeEngine;
  window.setCharacterTheme = function(themeId) {
    DynamicThemeEngine.setCharacterTheme(themeId);
  };

  if (typeof App !== 'undefined') {
    App.setCharacterTheme = function(themeId) {
      DynamicThemeEngine.setCharacterTheme(themeId);
    };
  }

  function init() {
    DynamicThemeEngine.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
