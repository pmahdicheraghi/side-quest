const TRACK_URL = new URL('./audio/side-quest.mp3', document.baseURI).toString();

export class MusicController {
  private readonly audio = new Audio(TRACK_URL);
  private enabled: boolean;
  private unlocked = false;
  private readonly onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      this.audio.pause();
    } else if (this.unlocked && this.enabled) {
      this.play();
    }
  };

  constructor(enabled: boolean) {
    this.enabled = enabled;
    this.audio.loop = true;
    this.audio.preload = 'none';
    this.audio.volume = 0.22;
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.audio.pause();
    } else if (this.unlocked) {
      this.play();
    }
  }

  handleGesture(): void {
    this.unlocked = true;
    if (this.enabled) this.play();
  }

  dispose(): void {
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
  }

  private play(): void {
    void this.audio.play().catch(() => {
      // Browsers can still reject playback when the gesture is not trusted.
    });
  }
}
