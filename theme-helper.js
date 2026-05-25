// ===== THEME HELPER =====
// Loads saved character theme on every page automatically
// Include this BEFORE app-core.js in all pages

(function() {
  'use strict';

  const CHARACTERS = {
    naruto:   { color: '#FF6B00', glow: 'rgba(255, 107, 0, 0.5)' },
    tanjiro:  { color: '#2E8B57', glow: 'rgba(46, 139, 87, 0.5)' },
    gojo:     { color: '#800080', glow: 'rgba(128, 0, 128, 0.5)' },
    luffy:    { color: '#DC143C', glow: 'rgba(220, 20, 60, 0.5)' },
    saitama:  { color: '#FFD700', glow: 'rgba(255, 215, 0, 0.5)' },
    anya:     { color: '#FF69B4', glow: 'rgba(255, 105, 180, 0.5)' }
  };

  function applySavedTheme() {
    const savedTheme = localStorage.getItem('anime-character-theme') || localStorage.getItem('thrilling_theme');
    const char = CHARACTERS[savedTheme];

    if (char && savedTheme) {
      // Add theme class to body
      document.body.classList.add('theme-' + savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);

      // Set CSS variables
      const root = document.documentElement.style;
      root.setProperty('--accent', char.color);
      root.setProperty('--accent-glow', char.glow);
      root.setProperty('--accent-secondary', char.color);
      root.setProperty('--player-accent', char.color);
      root.setProperty('--player-accent-light', char.color);
      root.setProperty('--check-bg', char.color);
      root.setProperty('--check-color', char.color);

      // Update nav active states immediately
      document.querySelectorAll('.nav-item.active svg').forEach(el => {
        el.style.stroke = char.color;
        el.style.filter = 'drop-shadow(0 0 6px ' + char.glow + ')';
      });
      document.querySelectorAll('.nav-item.active span').forEach(el => {
        el.style.color = char.color;
      });

      // Update progress bars if any
      document.querySelectorAll('.history-progress-fill, .history-landscape-progress').forEach(el => {
        el.style.background = 'linear-gradient(90deg, ' + char.color + ', ' + char.color + ')';
      });

      // Update toggle switches that are checked
      document.querySelectorAll('input:checked + .t-slider, input:checked + .toggle-slider').forEach(el => {
        el.style.background = char.color;
      });

      // Update stat values
      document.querySelectorAll('.stat-card .value').forEach(el => {
        el.style.color = char.color;
        el.style.textShadow = '0 0 10px ' + char.glow;
      });

      // Update settings icons - ICON gets the color, NOT the background box
      document.querySelectorAll('.settings-icon').forEach(el => {
        el.style.color = char.color;
        el.style.background = 'rgba(255,255,255,0.06)';
        el.style.border = '1px solid ' + char.color + '30';
      });
      // Update settings icons SVG stroke
      document.querySelectorAll('.settings-icon svg').forEach(el => {
        el.style.stroke = char.color;
      });

      // Update hero genre tag
      document.querySelectorAll('.hero-genre-tag').forEach(el => {
        el.style.background = char.color;
        el.style.color = '#000';
        el.style.boxShadow = '0 2px 10px ' + char.glow;
      });

      // Update watch buttons
      document.querySelectorAll('.btn-watch').forEach(el => {
        el.style.background = char.color;
        el.style.color = '#000';
        el.style.boxShadow = '0 4px 20px ' + char.glow;
      });

      // Update filter pills active state
      document.querySelectorAll('.filter-pill.active').forEach(el => {
        el.style.background = char.color;
        el.style.borderColor = char.color;
        el.style.boxShadow = '0 0 15px ' + char.glow;
      });

      // Update rating badges
      document.querySelectorAll('.rating-badge').forEach(el => {
        el.style.borderColor = char.color + '30';
      });

      // Dynamic styles for pseudo-elements and complex selectors
      const style = document.createElement('style');
      style.id = 'theme-dynamic-styles';
      style.textContent = `
        .nav-item.active::after { background: ${char.color} !important; box-shadow: 0 0 8px ${char.glow} !important; }
        .section-title::before { background: ${char.color} !important; box-shadow: 0 0 6px ${char.glow} !important; }
        .hero-dot.active { background: ${char.color} !important; box-shadow: 0 0 8px ${char.glow} !important; }
        .seek-bar::-webkit-slider-thumb { background: ${char.color} !important; box-shadow: 0 0 10px ${char.glow} !important; }
        .history-card::before { background: ${char.color} !important; }
        .history-badge.hindi { background: linear-gradient(135deg, ${char.color}, ${char.color}) !important; }
        .btn-primary { background: ${char.color} !important; box-shadow: 0 0 20px ${char.glow} !important; }
        .pill-btn.active { background: ${char.color} !important; box-shadow: 0 0 15px ${char.glow} !important; }
        .dot.active { background: ${char.color} !important; box-shadow: 0 0 6px ${char.glow} !important; }
        .toast { border-color: ${char.color} !important; box-shadow: 0 0 20px ${char.glow} !important; }
        #user-avatar { background: linear-gradient(135deg, ${char.color}, ${char.color}) !important; box-shadow: 0 0 20px ${char.glow} !important; }
        .glass-strong { border-bottom: 1px solid ${char.glow} !important; }
        .empty-state-box { border-color: ${char.glow} !important; }
        .empty-icon { color: ${char.color} !important; }
        .search-input:focus, .form-input:focus, .settings-select:focus { border-color: ${char.color} !important; box-shadow: 0 0 0 3px ${char.glow} !important; }
        .player-box .big-play-btn { background: ${char.color} !important; box-shadow: 0 0 30px ${char.glow} !important; }
        .player-box .seek-fill { background: linear-gradient(90deg, ${char.color}, ${char.color}) !important; }
        .player-box .ctrl-icon.accent { background: ${char.color} !important; }
        .player-box .skip-pill:hover { background: ${char.color} !important; }
        .player-box .countdown-ring .prog { stroke: ${char.color} !important; }
        .player-box .ep-card.playing { border-color: ${char.color} !important; box-shadow: 0 0 16px ${char.glow} !important; }
        .player-box .ep-badge { background: ${char.color} !important; }
        .player-box .next-overlay .act-btn.save { background: ${char.color} !important; }
        .theme-${savedTheme} input:checked + .t-slider { background: ${char.color} !important; }
        .theme-${savedTheme} input:checked + .toggle-slider { background: ${char.color} !important; }
        .srv-btn.on { background: ${char.color} !important; color: #000 !important; }
        .act-btn.save { background: ${char.color} !important; color: #000 !important; }
        /* FIX: Settings icon - icon gets color, background stays subtle */
        .settings-icon { color: ${char.color} !important; background: rgba(255,255,255,0.06) !important; border: 1px solid ${char.color}30 !important; }
        .settings-icon svg { stroke: ${char.color} !important; }
      `;

      const oldStyle = document.getElementById('theme-dynamic-styles');
      if (oldStyle) oldStyle.remove();
      document.head.appendChild(style);

    } else {
      const root = document.documentElement.style;
      root.setProperty('--accent', '#00D4FF');
      root.setProperty('--accent-glow', 'rgba(0, 212, 255, 0.5)');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applySavedTheme);
  } else {
    applySavedTheme();
  }

  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
      applySavedTheme();
    }
  });

  window.applySavedTheme = applySavedTheme;
  window.getCurrentThemeColor = function() {
    const saved = localStorage.getItem('anime-character-theme') || localStorage.getItem('thrilling_theme');
    return CHARACTERS[saved] ? CHARACTERS[saved].color : '#00D4FF';
  };
})();
