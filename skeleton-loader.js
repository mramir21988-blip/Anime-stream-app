// ===== SKELETON LOADING =====
// Shimmer animation while content loads

(function() {
  'use strict';

  const SkeletonLoader = {
    templates: {
      card: `
        <div class="skeleton-card">
          <div class="skeleton-thumb"></div>
          <div class="skeleton-text"></div>
          <div class="skeleton-text short"></div>
        </div>
      `,
      banner: `
        <div class="skeleton-banner">
          <div class="skeleton-banner-img"></div>
          <div class="skeleton-banner-text"></div>
          <div class="skeleton-banner-text short"></div>
        </div>
      `,
      detail: `
        <div class="skeleton-detail">
          <div class="skeleton-poster"></div>
          <div class="skeleton-info">
            <div class="skeleton-text"></div>
            <div class="skeleton-text"></div>
            <div class="skeleton-text short"></div>
          </div>
        </div>
      `,
      list: `
        <div class="skeleton-list-item">
          <div class="skeleton-list-thumb"></div>
          <div class="skeleton-list-info">
            <div class="skeleton-text"></div>
            <div class="skeleton-text short"></div>
          </div>
        </div>
      `
    },

    show(containerSelector, type = 'card', count = 6) {
      const container = document.querySelector(containerSelector);
      if (!container) return;

      // Save original content
      if (!container.dataset.original) {
        container.dataset.original = container.innerHTML;
      }

      let html = '';
      for (let i = 0; i < count; i++) {
        html += this.templates[type] || this.templates.card;
      }

      container.innerHTML = html;
      container.classList.add('skeleton-active');
    },

    hide(containerSelector) {
      const container = document.querySelector(containerSelector);
      if (!container) return;

      container.classList.remove('skeleton-active');
      if (container.dataset.original) {
        container.innerHTML = container.dataset.original;
        delete container.dataset.original;
      }
    },

    // Auto-show skeleton, run callback, then hide
    async load(containerSelector, type, count, callback) {
      this.show(containerSelector, type, count);
      try {
        await callback();
      } finally {
        this.hide(containerSelector);
      }
    }
  };

  // Inject CSS
  const style = document.createElement('style');
  style.textContent = `
    /* ===== SKELETON LOADING STYLES ===== */
    .skeleton-active {
      pointer-events: none;
    }

    /* Card Skeleton */
    .skeleton-card {
      background: var(--bg-card, rgba(255,255,255,0.04));
      border-radius: 16px;
      overflow: hidden;
      animation: skeleton-pulse 1.5s ease-in-out infinite;
    }
    .skeleton-thumb {
      width: 100%;
      aspect-ratio: 2/3;
      background: linear-gradient(90deg, 
        rgba(255,255,255,0.05) 25%, 
        rgba(255,255,255,0.1) 50%, 
        rgba(255,255,255,0.05) 75%);
      background-size: 200% 100%;
      animation: skeleton-shimmer 1.5s infinite;
    }
    .skeleton-text {
      height: 14px;
      margin: 12px 12px 8px;
      border-radius: 6px;
      background: linear-gradient(90deg, 
        rgba(255,255,255,0.05) 25%, 
        rgba(255,255,255,0.1) 50%, 
        rgba(255,255,255,0.05) 75%);
      background-size: 200% 100%;
      animation: skeleton-shimmer 1.5s infinite;
    }
    .skeleton-text.short {
      width: 60%;
      height: 12px;
      margin-top: 0;
      margin-bottom: 12px;
    }

    /* Banner Skeleton */
    .skeleton-banner {
      background: var(--bg-card, rgba(255,255,255,0.04));
      border-radius: 20px;
      overflow: hidden;
      margin-bottom: 16px;
      animation: skeleton-pulse 1.5s ease-in-out infinite;
    }
    .skeleton-banner-img {
      width: 100%;
      aspect-ratio: 16/9;
      background: linear-gradient(90deg, 
        rgba(255,255,255,0.05) 25%, 
        rgba(255,255,255,0.1) 50%, 
        rgba(255,255,255,0.05) 75%);
      background-size: 200% 100%;
      animation: skeleton-shimmer 1.5s infinite;
    }
    .skeleton-banner-text {
      height: 16px;
      margin: 16px 16px 8px;
      border-radius: 6px;
      background: linear-gradient(90deg, 
        rgba(255,255,255,0.05) 25%, 
        rgba(255,255,255,0.1) 50%, 
        rgba(255,255,255,0.05) 75%);
      background-size: 200% 100%;
      animation: skeleton-shimmer 1.5s infinite;
    }
    .skeleton-banner-text.short {
      width: 40%;
      height: 12px;
      margin-top: 0;
      margin-bottom: 16px;
    }

    /* Detail Skeleton */
    .skeleton-detail {
      display: flex;
      gap: 16px;
      padding: 16px;
      animation: skeleton-pulse 1.5s ease-in-out infinite;
    }
    .skeleton-poster {
      width: 120px;
      aspect-ratio: 2/3;
      border-radius: 12px;
      flex-shrink: 0;
      background: linear-gradient(90deg, 
        rgba(255,255,255,0.05) 25%, 
        rgba(255,255,255,0.1) 50%, 
        rgba(255,255,255,0.05) 75%);
      background-size: 200% 100%;
      animation: skeleton-shimmer 1.5s infinite;
    }
    .skeleton-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 10px;
    }
    .skeleton-info .skeleton-text {
      margin: 0;
    }

    /* List Skeleton */
    .skeleton-list-item {
      display: flex;
      gap: 12px;
      padding: 12px;
      background: var(--bg-card, rgba(255,255,255,0.04));
      border-radius: 12px;
      margin-bottom: 8px;
      animation: skeleton-pulse 1.5s ease-in-out infinite;
    }
    .skeleton-list-thumb {
      width: 60px;
      aspect-ratio: 1;
      border-radius: 8px;
      flex-shrink: 0;
      background: linear-gradient(90deg, 
        rgba(255,255,255,0.05) 25%, 
        rgba(255,255,255,0.1) 50%, 
        rgba(255,255,255,0.05) 75%);
      background-size: 200% 100%;
      animation: skeleton-shimmer 1.5s infinite;
    }
    .skeleton-list-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 8px;
    }
    .skeleton-list-info .skeleton-text {
      margin: 0;
    }

    @keyframes skeleton-shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    @keyframes skeleton-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
  `;
  document.head.appendChild(style);

  window.SkeletonLoader = SkeletonLoader;
})();
