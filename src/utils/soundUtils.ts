/**
 * Sound utilities for notifications and UI feedback
 */

class SoundManager {
  private audioContext: AudioContext | null = null;
  private soundsEnabled: boolean = true;
  private volume: number = 0.3; // 30% volume by default

  constructor() {
    // Initialize audio context on user interaction to comply with browser policies
    this.initializeAudioContext();
  }

  private async initializeAudioContext() {
    try {
      // Create audio context (may be suspended by browser)
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Resume context if suspended (required by some browsers)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
    } catch (error) {
      console.warn('Audio context not supported:', error);
    }
  }

  /**
   * Play a notification sound
   */
  async playNotificationSound(): Promise<void> {
    if (!this.soundsEnabled) return;

    try {
      // Ensure audio context is initialized
      if (!this.audioContext) {
        await this.initializeAudioContext();
      }

      if (!this.audioContext) return;

      // Create a simple beep sound using Web Audio API
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Configure sound
      oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime); // 800Hz tone
      oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime + 0.1); // Drop to 600Hz

      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(this.volume, this.audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.3);

    } catch (error) {
      console.warn('Failed to play notification sound:', error);
      // Fallback to HTML5 Audio if Web Audio API fails
      this.fallbackNotificationSound();
    }
  }

  /**
   * Fallback notification sound using HTML5 Audio
   */
  private fallbackNotificationSound(): void {
    try {
      // Create a simple beep using data URL
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUeBzeM1fLNeSsFJGXJ8N6TQwsTVrTp66hVFApGn+DyvmUeBzeM1fLNeSsFJGXJ8N6TQwsTVrTp66hVFApGn+DyvmUeBzeM1fLNeSsFJGXJ8N6TQwsTVrTp66hVFApGn+DyvmUeBzeM1fLNeSsFJGXJ8N6T');
      audio.volume = this.volume;
      audio.play().catch(e => console.warn('Fallback audio failed:', e));
    } catch (error) {
      console.warn('Fallback audio not supported');
    }
  }

  /**
   * Play success sound
   */
  async playSuccessSound(): Promise<void> {
    if (!this.soundsEnabled) return;

    try {
      if (!this.audioContext) {
        await this.initializeAudioContext();
      }

      if (!this.audioContext) return;

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Success sound: ascending tones
      oscillator.frequency.setValueAtTime(523, this.audioContext.currentTime); // C5
      oscillator.frequency.setValueAtTime(659, this.audioContext.currentTime + 0.1); // E5
      oscillator.frequency.setValueAtTime(784, this.audioContext.currentTime + 0.2); // G5

      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(this.volume, this.audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.4);

    } catch (error) {
      console.warn('Failed to play success sound:', error);
    }
  }

  /**
   * Play error sound
   */
  async playErrorSound(): Promise<void> {
    if (!this.soundsEnabled) return;

    try {
      if (!this.audioContext) {
        await this.initializeAudioContext();
      }

      if (!this.audioContext) return;

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Error sound: descending tones
      oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime); // G4
      oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime + 0.1); // D4
      oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime + 0.2); // G3

      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(this.volume, this.audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.4);

    } catch (error) {
      console.warn('Failed to play error sound:', error);
    }
  }

  /**
   * Enable or disable sounds
   */
  setSoundsEnabled(enabled: boolean): void {
    this.soundsEnabled = enabled;
    localStorage.setItem('notificationSoundsEnabled', enabled.toString());
  }

  /**
   * Check if sounds are enabled
   */
  getSoundsEnabled(): boolean {
    return this.soundsEnabled;
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('notificationVolume', this.volume.toString());
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Load settings from localStorage
   */
  loadSettings(): void {
    const soundsEnabled = localStorage.getItem('notificationSoundsEnabled');
    if (soundsEnabled !== null) {
      this.soundsEnabled = soundsEnabled === 'true';
    }

    const volume = localStorage.getItem('notificationVolume');
    if (volume !== null) {
      this.volume = parseFloat(volume);
    }
  }
}

// Create singleton instance
const soundManager = new SoundManager();

// Load settings on initialization
soundManager.loadSettings();

// Export convenience functions
export const playNotificationSound = () => soundManager.playNotificationSound();
export const playSuccessSound = () => soundManager.playSuccessSound();
export const playErrorSound = () => soundManager.playErrorSound();
export const setSoundsEnabled = (enabled: boolean) => soundManager.setSoundsEnabled(enabled);
export const getSoundsEnabled = () => soundManager.getSoundsEnabled();
export const setNotificationVolume = (volume: number) => soundManager.setVolume(volume);
export const getNotificationVolume = () => soundManager.getVolume();

/**
 * Browser notification utilities
 */
export class BrowserNotificationManager {
  private notificationsEnabled: boolean = false;

  constructor() {
    this.checkPermission();
  }

  async checkPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Browser notifications not supported');
      return false;
    }

    this.notificationsEnabled = Notification.permission === 'granted';
    return this.notificationsEnabled;
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Browser notifications not supported');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.notificationsEnabled = permission === 'granted';
      return this.notificationsEnabled;
    } catch (error) {
      console.warn('Failed to request notification permission:', error);
      return false;
    }
  }

  async showNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (!this.notificationsEnabled) {
      console.warn('Browser notifications not enabled');
      return;
    }

    try {
      const notification = new Notification(title, {
        icon: '/lovable-uploads/favicon-image.png',
        badge: '/lovable-uploads/favicon-image.png',
        ...options
      });

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

    } catch (error) {
      console.warn('Failed to show browser notification:', error);
    }
  }

  isEnabled(): boolean {
    return this.notificationsEnabled;
  }
}

// Create singleton instance
const browserNotificationManager = new BrowserNotificationManager();

// Export convenience functions
export const requestBrowserNotificationPermission = () => browserNotificationManager.requestPermission();
export const showBrowserNotification = (title: string, options?: NotificationOptions) =>
  browserNotificationManager.showNotification(title, options);
export const isBrowserNotificationsEnabled = () => browserNotificationManager.isEnabled();

export default soundManager;