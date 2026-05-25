// ===== OFFLINE INDICATOR =====
// Show status when user goes offline/online

(function() {
  'use strict';

  const OfflineIndicator = {
    indicator: null,
    toast: null,

    init() {
      this.createIndicator();
      this.createToast();
      this.bindEvents();
      this.checkStatus();
    },

    createIndicator() {
      this.indicator = document.createElement('div');
      this.indicator.className = 'offline-indicator';
      this.indicator.innerHTML = `
        <div class="offline-dot"></div>
        <span class="offline-text">Offline</span>
      `;
      document.body.appendChild(this.indicator);

      const style = document.createElement('style');
      style.textContent = `
        .offline-indicator {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 32px;
          background: #FF4757;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          z-index: 99999;
          transform: translateY(-100%);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .offline-indicator.show {
          transform: translateY(0);
        }
        .offline-dot {
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
          animation: offline-pulse 1.5s ease infinite;
        }
        .offline-text {
          letter-spacing: 0.05em;
        }
        @keyframes offline-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        /* Push content down when offline */
        body.offline-mode {
          padding-top: 32px;
        }
        body.offline-mode .glass-nav {
          top: 32px;
        }
      `;
      document.head.appendChild(style);
    },

    createToast() {
      this.toast = document.createElement('div');
      this.toast.className = 'online-toast';
      this.toast.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
        <span>Back Online</span>
      `;
      document.body.appendChild(this.toast);

      const style = document.createElement('style');
      style.textContent = `
        .online-toast {
          position: fixed;
          top: 16px;
          left: 50%;
          transform: translateX(-50%) translateY(-60px);
          background: #2ED573;
          color: white;
          padding: 10px 20px;
          border-radius: 30px;
          font-size: 13px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 99999;
          box-shadow: 0 8px 24px rgba(46, 213, 115, 0.3);
          transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .online-toast.show {
          transform: translateX(-50%) translateY(0);
        }
      `;
      document.head.appendChild(style);
    },

    bindEvents() {
      window.addEventListener('online', () => {
        this.hideOffline();
        this.showOnlineToast();
        if (typeof showToast === 'function') {
          showToast('You are back online!');
        }
      });

      window.addEventListener('offline', () => {
        this.showOffline();
        if (typeof showToast === 'function') {
          showToast('You are offline. Some features may not work.');
        }
      });
    },

    checkStatus() {
      if (!navigator.onLine) {
        this.showOffline();
      }
    },

    showOffline() {
      this.indicator.classList.add('show');
      document.body.classList.add('offline-mode');
    },

    hideOffline() {
      this.indicator.classList.remove('show');
      document.body.classList.remove('offline-mode');
    },

    showOnlineToast() {
      this.toast.classList.add('show');
      setTimeout(() => {
        this.toast.classList.remove('show');
      }, 2500);
    }
  };

  window.OfflineIndicator = OfflineIndicator;

  // Auto-init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => OfflineIndicator.init());
  } else {
    OfflineIndicator.init();
  }
})();
