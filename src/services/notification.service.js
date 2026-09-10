/**
 * Notification Service
 *
 * Manages browser notifications, audio alerts, and unread count tracking.
 */

class NotificationService {
  constructor() {
    this.unreadCount = 0;
    this.audioContext = null;
    this.notificationPermission = Notification.permission;
    this.loadUnreadCount();
  }

  /**
   * Request notification permission
   */
  async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.notificationPermission = 'granted';
      return true;
    }

    if (Notification.permission !== 'denied') {
      try {
        const permission = await Notification.requestPermission();
        this.notificationPermission = permission;
        return permission === 'granted';
      } catch (err) {
        console.error('Error requesting notification permission:', err);
        return false;
      }
    }

    return false;
  }

  /**
   * Show browser notification
   */
  showNotification(title, options = {}) {
    if (this.notificationPermission !== 'granted') {
      return;
    }

    try {
      new Notification(title, {
        icon: '/favicon.ico',
        ...options
      });
    } catch (err) {
      console.error('Error showing notification:', err);
    }
  }

  /**
   * Play audio alert
   */
  playSound(soundType = 'message') {
    try {
      const audioContext = window.AudioContext || window.webkitAudioContext;
      if (!audioContext) return;

      const ctx = new audioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      const now = ctx.currentTime;

      if (soundType === 'message') {
        // Two quick beeps
        oscillator.frequency.setValueAtTime(1000, now);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        oscillator.start(now);
        oscillator.stop(now + 0.1);

        oscillator.frequency.setValueAtTime(1200, now + 0.15);
        gainNode.gain.setValueAtTime(0.3, now + 0.15);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        oscillator.start(now + 0.15);
        oscillator.stop(now + 0.25);
      } else if (soundType === 'sale') {
        // Success chord
        oscillator.frequency.setValueAtTime(1320, now);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        oscillator.start(now);
        oscillator.stop(now + 0.3);
      }
    } catch (err) {
      console.error('Error playing sound:', err);
    }
  }

  /**
   * Update unread count
   */
  setUnreadCount(count) {
    this.unreadCount = count;
    this._persistUnreadCount();
    this._updateBadge();
  }

  /**
   * Increment unread count
   */
  incrementUnread() {
    this.unreadCount++;
    this._persistUnreadCount();
    this._updateBadge();
  }

  /**
   * Decrement unread count
   */
  decrementUnread() {
    if (this.unreadCount > 0) {
      this.unreadCount--;
      this._persistUnreadCount();
      this._updateBadge();
    }
  }

  /**
   * Get unread count
   */
  getUnreadCount() {
    return this.unreadCount;
  }

  /**
   * Update browser tab badge
   */
  _updateBadge() {
    if ('setAppBadge' in navigator) {
      if (this.unreadCount > 0) {
        navigator.setAppBadge(this.unreadCount);
      } else {
        navigator.clearAppBadge();
      }
    }

    // Also update document title
    if (this.unreadCount > 0) {
      document.title = `(${this.unreadCount}) Bandeja`;
    } else {
      document.title = 'Bandeja';
    }
  }

  /**
   * Persist unread count to localStorage
   */
  _persistUnreadCount() {
    localStorage.setItem('unread_count', String(this.unreadCount));
  }

  /**
   * Load unread count from localStorage
   */
  loadUnreadCount() {
    try {
      const stored = localStorage.getItem('unread_count');
      this.unreadCount = stored ? parseInt(stored, 10) : 0;
      this._updateBadge();
    } catch (err) {
      console.error('Error loading unread count:', err);
      this.unreadCount = 0;
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
