// ===== ACHIEVEMENT SYSTEM =====
// Unlock badges based on user activity

(function() {
  'use strict';

  const Achievements = {
    badges: {
      'first_watch': {
        id: 'first_watch',
        name: 'First Steps',
        description: 'Watch your first anime',
        emoji: '🎬',
        color: '#00D4FF',
        condition: () => this.getWatchedCount() >= 1
      },
      'binge_watcher': {
        id: 'binge_watcher',
        name: 'Binge Watcher',
        description: 'Watch 10 episodes in a day',
        emoji: '🔥',
        color: '#FF6B00',
        condition: () => this.getDailyWatched() >= 10
      },
      'night_owl': {
        id: 'night_owl',
        name: 'Night Owl',
        description: 'Watch anime after midnight',
        emoji: '🦉',
        color: '#8A2BE2',
        condition: () => this.isNightOwl()
      },
      'marathon': {
        id: 'marathon',
        name: 'Marathon Runner',
        description: 'Complete a 24+ episode series',
        emoji: '🏃',
        color: '#FFD700',
        condition: () => this.hasCompletedLongSeries()
      },
      'dub_lover': {
        id: 'dub_lover',
        name: 'Dub Lover',
        description: 'Watch 5 Hindi dubbed anime',
        emoji: '🇮🇳',
        color: '#FF9933',
        condition: () => this.getHindiWatched() >= 5
      },
      'streak_7': {
        id: 'streak_7',
        name: 'Week Warrior',
        description: '7 day watch streak',
        emoji: '⚡',
        color: '#00D4FF',
        condition: () => this.getStreak() >= 7
      },
      'streak_30': {
        id: 'streak_30',
        name: 'Monthly Master',
        description: '30 day watch streak',
        emoji: '👑',
        color: '#FFD700',
        condition: () => this.getStreak() >= 30
      },
      'genre_explorer': {
        id: 'genre_explorer',
        name: 'Genre Explorer',
        description: 'Watch 5 different genres',
        emoji: '🌈',
        color: '#FF69B4',
        condition: () => this.getUniqueGenres() >= 5
      },
      'movie_buff': {
        id: 'movie_buff',
        name: 'Movie Buff',
        description: 'Watch 10 anime movies',
        emoji: '🎥',
        color: '#DC143C',
        condition: () => this.getMoviesWatched() >= 10
      },
      'early_bird': {
        id: 'early_bird',
        name: 'Early Bird',
        description: 'Watch anime before 6 AM',
        emoji: '🌅',
        color: '#FF8C00',
        condition: () => this.isEarlyBird()
      },
      'completionist': {
        id: 'completionist',
        name: 'Completionist',
        description: 'Complete 10 anime series',
        emoji: '💯',
        color: '#4CAF50',
        condition: () => this.getCompletedSeries() >= 10
      },
      'speedster': {
        id: 'speedster',
        name: 'Speedster',
        description: 'Watch at 2x speed for 1 hour',
        emoji: '⚡',
        color: '#FFD700',
        condition: () => this.get2xWatchTime() >= 3600
      }
    },

    unlocked: new Set(),

    init() {
      this.loadUnlocked();
      this.checkAchievements();
      this.renderBadgeSection();
    },

    loadUnlocked() {
      const saved = localStorage.getItem('thrilling_achievements');
      if (saved) {
        this.unlocked = new Set(JSON.parse(saved));
      }
    },

    saveUnlocked() {
      localStorage.setItem('thrilling_achievements', JSON.stringify([...this.unlocked]));
    },

    checkAchievements() {
      let newUnlocks = [];

      Object.values(this.badges).forEach(badge => {
        if (!this.unlocked.has(badge.id) && badge.condition()) {
          this.unlock(badge);
          newUnlocks.push(badge);
        }
      });

      if (newUnlocks.length > 0) {
        this.showUnlockAnimation(newUnlocks);
      }

      return newUnlocks;
    },

    unlock(badge) {
      this.unlocked.add(badge.id);
      this.saveUnlocked();
    },

    showUnlockAnimation(badges) {
      badges.forEach((badge, index) => {
        setTimeout(() => {
          this.createUnlockToast(badge);
        }, index * 800);
      });
    },

    createUnlockToast(badge) {
      const toast = document.createElement('div');
      toast.className = 'achievement-unlock-toast';
      toast.innerHTML = `
        <div class="achievement-unlock-icon" style="background: ${badge.color}20; color: ${badge.color}">
          ${badge.emoji}
        </div>
        <div class="achievement-unlock-info">
          <div class="achievement-unlock-title">Achievement Unlocked!</div>
          <div class="achievement-unlock-name">${badge.name}</div>
          <div class="achievement-unlock-desc">${badge.description}</div>
        </div>
      `;

      document.body.appendChild(toast);

      // Animate in
      requestAnimationFrame(() => {
        toast.classList.add('show');
      });

      // Remove after delay
      setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 500);
      }, 4000);
    },

    renderBadgeSection() {
      const container = document.getElementById('achievements-container');
      if (!container) return;

      const total = Object.keys(this.badges).length;
      const unlocked = this.unlocked.size;
      const progress = (unlocked / total * 100).toFixed(0);

      let html = `
        <div class="achievements-header">
          <div class="achievements-title">
            <span>Achievements</span>
            <span class="achievements-count">${unlocked}/${total}</span>
          </div>
          <div class="achievements-progress-bar">
            <div class="achievements-progress-fill" style="width: ${progress}%"></div>
          </div>
        </div>
        <div class="achievements-grid">
      `;

      Object.values(this.badges).forEach(badge => {
        const isUnlocked = this.unlocked.has(badge.id);
        html += `
          <div class="achievement-badge ${isUnlocked ? 'unlocked' : 'locked'}">
            <div class="achievement-icon" style="${isUnlocked ? `background: ${badge.color}20; color: ${badge.color}` : ''}">
              ${isUnlocked ? badge.emoji : '🔒'}
            </div>
            <div class="achievement-name">${badge.name}</div>
            <div class="achievement-desc">${badge.description}</div>
          </div>
        `;
      });

      html += '</div>';
      container.innerHTML = html;

      // Add CSS if not exists
      if (!document.getElementById('achievements-style')) {
        const style = document.createElement('style');
        style.id = 'achievements-style';
        style.textContent = `
          .achievements-header {
            padding: 16px;
            background: var(--bg-card, rgba(255,255,255,0.04));
            border-radius: 16px;
            margin-bottom: 16px;
          }
          .achievements-title {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
          }
          .achievements-title span:first-child {
            font-size: 16px;
            font-weight: 700;
            color: var(--text-primary, #fff);
          }
          .achievements-count {
            font-size: 14px;
            font-weight: 600;
            color: var(--accent, #00D4FF);
            background: var(--accent-glow, rgba(0,212,255,0.1));
            padding: 4px 12px;
            border-radius: 20px;
          }
          .achievements-progress-bar {
            height: 6px;
            background: rgba(255,255,255,0.1);
            border-radius: 3px;
            overflow: hidden;
          }
          .achievements-progress-fill {
            height: 100%;
            background: linear-gradient(90deg, var(--accent, #00D4FF), var(--accent-secondary, #00D4FF));
            border-radius: 3px;
            transition: width 0.5s ease;
            box-shadow: 0 0 10px var(--accent-glow, rgba(0,212,255,0.3));
          }
          .achievements-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
          }
          .achievement-badge {
            background: var(--bg-card, rgba(255,255,255,0.04));
            border: 1px solid var(--border-card, rgba(255,255,255,0.06));
            border-radius: 16px;
            padding: 16px 12px;
            text-align: center;
            transition: all 0.3s ease;
          }
          .achievement-badge.unlocked {
            border-color: var(--accent, #00D4FF);
            box-shadow: 0 0 20px var(--accent-glow, rgba(0,212,255,0.1));
          }
          .achievement-badge.locked {
            opacity: 0.5;
          }
          .achievement-badge.locked .achievement-icon {
            filter: grayscale(1);
          }
          .achievement-icon {
            width: 48px;
            height: 48px;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            margin: 0 auto 10px;
            background: rgba(255,255,255,0.05);
            transition: all 0.3s ease;
          }
          .achievement-name {
            font-size: 12px;
            font-weight: 700;
            color: var(--text-primary, #fff);
            margin-bottom: 4px;
          }
          .achievement-desc {
            font-size: 10px;
            color: var(--text-muted, rgba(255,255,255,0.4));
            line-height: 1.3;
          }

          /* Unlock toast */
          .achievement-unlock-toast {
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%) translateY(-20px);
            background: rgba(0,0,0,0.95);
            backdrop-filter: blur(20px);
            border: 2px solid var(--accent, #00D4FF);
            border-radius: 20px;
            padding: 16px 20px;
            display: flex;
            align-items: center;
            gap: 14px;
            z-index: 10000;
            opacity: 0;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            box-shadow: 0 20px 40px rgba(0,0,0,0.5), 0 0 30px var(--accent-glow, rgba(0,212,255,0.2));
            min-width: 280px;
          }
          .achievement-unlock-toast.show {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
          .achievement-unlock-toast.hide {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          .achievement-unlock-icon {
            width: 52px;
            height: 52px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            flex-shrink: 0;
          }
          .achievement-unlock-title {
            font-size: 11px;
            font-weight: 700;
            color: var(--accent, #00D4FF);
            text-transform: uppercase;
            letter-spacing: 0.1em;
            margin-bottom: 2px;
          }
          .achievement-unlock-name {
            font-size: 15px;
            font-weight: 800;
            color: white;
            margin-bottom: 2px;
          }
          .achievement-unlock-desc {
            font-size: 12px;
            color: rgba(255,255,255,0.6);
          }
        `;
        document.head.appendChild(style);
      }
    },

    // Helper methods for conditions
    getWatchedCount() {
      const history = JSON.parse(localStorage.getItem('thrilling_continue') || '[]');
      return history.length;
    },

    getDailyWatched() {
      const today = new Date().toDateString();
      const history = JSON.parse(localStorage.getItem('thrilling_continue') || '[]');
      return history.filter(h => h.lastWatched && new Date(h.lastWatched).toDateString() === today).length;
    },

    isNightOwl() {
      const history = JSON.parse(localStorage.getItem('thrilling_continue') || '[]');
      return history.some(h => {
        if (!h.lastWatched) return false;
        const hour = new Date(h.lastWatched).getHours();
        return hour >= 0 && hour < 6;
      });
    },

    isEarlyBird() {
      const history = JSON.parse(localStorage.getItem('thrilling_continue') || '[]');
      return history.some(h => {
        if (!h.lastWatched) return false;
        const hour = new Date(h.lastWatched).getHours();
        return hour >= 5 && hour < 8;
      });
    },

    hasCompletedLongSeries() {
      // Mock - would check episode count
      return false;
    },

    getHindiWatched() {
      const history = JSON.parse(localStorage.getItem('thrilling_continue') || '[]');
      return history.filter(h => h.hindi_dubbed).length;
    },

    getStreak() {
      const history = JSON.parse(localStorage.getItem('thrilling_continue') || '[]');
      const days = new Set();
      history.forEach(h => {
        if (h.lastWatched) days.add(new Date(h.lastWatched).toDateString());
      });
      return days.size;
    },

    getUniqueGenres() {
      const history = JSON.parse(localStorage.getItem('thrilling_continue') || '[]');
      const genres = new Set();
      history.forEach(h => {
        if (h.genre) genres.add(h.genre);
      });
      return genres.size;
    },

    getMoviesWatched() {
      // Mock - would check content type
      return 0;
    },

    getCompletedSeries() {
      // Mock - would check completion status
      return 0;
    },

    get2xWatchTime() {
      // Mock - would track playback speed
      return 0;
    }
  };

  window.Achievements = Achievements;
})();
