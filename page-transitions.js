// ===== SMOOTH PAGE TRANSITIONS =====
// Fade/slide between pages without jank

(function() {
  'use strict';

  const PageTransitions = {
    duration: 180, // Faster: 180ms instead of 250ms
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    isNavigating: false, // Prevent double-clicks

    init() {
      this.injectCSS();
      this.bindLinks();
      this.handleInitialLoad();
    },

    injectCSS() {
      const style = document.createElement('style');
      style.textContent = `
        /* Page Transition Overlay - SOLID color, NO backdrop-filter (causes lag) */
        .page-transition-overlay {
          position: fixed;
          inset: 0;
          background: var(--bg-primary, #0B0B0F);
          z-index: 99999;
          opacity: 0;
          pointer-events: none;
          transition: opacity var(--transition-duration, 180ms) cubic-bezier(0.4, 0, 0.2, 1);
        }
        .page-transition-overlay.active {
          opacity: 1;
          pointer-events: all;
        }

        /* Page enter animation - GPU only (translate3d, scale3d) */
        .page-enter {
          animation: pageEnter var(--transition-duration, 180ms) cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        @keyframes pageEnter {
          from {
            opacity: 0;
            transform: translate3d(0, 12px, 0) scale3d(0.98, 0.98, 1);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale3d(1, 1, 1);
          }
        }

        /* Page exit animation - GPU only */
        .page-exit {
          animation: pageExit var(--transition-duration, 180ms) cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        @keyframes pageExit {
          from {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale3d(1, 1, 1);
          }
          to {
            opacity: 0;
            transform: translate3d(0, -12px, 0) scale3d(0.98, 0.98, 1);
          }
        }

        /* Content stagger on enter */
        .page-enter .stagger-item {
          opacity: 0;
          animation: staggerIn 0.4s ease forwards;
        }
        .page-enter .stagger-item:nth-child(1) { animation-delay: 0.05s; }
        .page-enter .stagger-item:nth-child(2) { animation-delay: 0.1s; }
        .page-enter .stagger-item:nth-child(3) { animation-delay: 0.15s; }
        .page-enter .stagger-item:nth-child(4) { animation-delay: 0.2s; }
        .page-enter .stagger-item:nth-child(5) { animation-delay: 0.25s; }
        .page-enter .stagger-item:nth-child(6) { animation-delay: 0.3s; }

        @keyframes staggerIn {
          from {
            opacity: 0;
            transform: translate3d(0, 16px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }

        /* Progress bar at top during transition */
        .transition-progress {
          position: fixed;
          top: 0;
          left: 0;
          height: 2px;
          background: var(--accent, #00D4FF);
          box-shadow: 0 0 10px var(--accent-glow, rgba(0,212,255,0.5));
          z-index: 100000;
          width: 0%;
          transition: width 0.2s ease;
        }
        .transition-progress.loading {
          width: 70%;
          transition: width 0.3s ease;
        }
        .transition-progress.done {
          width: 100%;
          transition: width 0.15s ease;
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .page-transition-overlay, .page-enter, .page-exit, .transition-progress {
            animation: none !important;
            transition: none !important;
          }
        }
      `;
      document.head.appendChild(style);
    },

    bindLinks() {
      document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href]');
        if (!link) return;

        const href = link.getAttribute('href');
        // Only handle internal page links
        if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) return;

        // Skip if Ctrl/Cmd/Shift clicked (new tab behavior)
        if (e.ctrlKey || e.metaKey || e.shiftKey) return;

        e.preventDefault();
        this.navigate(href);
      });
    },

    navigate(url) {
      if (this.isNavigating) return; // Prevent double-click lag
      this.isNavigating = true;

      const overlay = this.getOverlay();
      const progress = this.getProgress();

      // Start exit
      document.body.classList.add('page-exit');
      progress.classList.add('loading');

      // Small delay for animation to start
      setTimeout(() => {
        overlay.classList.add('active');
      }, 50);

      // Navigate after animation
      setTimeout(() => {
        window.location.href = url;
      }, this.duration);
    },

    handleInitialLoad() {
      // Remove exit class if present
      document.body.classList.remove('page-exit');
      // Add enter animation
      document.body.classList.add('page-enter');

      // Clean up after animation completes
      setTimeout(() => {
        document.body.classList.remove('page-enter');
        this.isNavigating = false;
      }, this.duration + 100);
    },

    getOverlay() {
      let overlay = document.querySelector('.page-transition-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'page-transition-overlay';
        document.body.appendChild(overlay);
      }
      return overlay;
    },

    getProgress() {
      let progress = document.querySelector('.transition-progress');
      if (!progress) {
        progress = document.createElement('div');
        progress.className = 'transition-progress';
        document.body.appendChild(progress);
      }
      return progress;
    },

    // Programmatic navigation with transition
    go(url) {
      this.navigate(url);
    }
  };

  window.PageTransitions = PageTransitions;

  // Auto-init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PageTransitions.init());
  } else {
    PageTransitions.init();
  }
})();