
type SoundName = 'pop' | 'correct' | 'wrong' | 'win';

class AudioService {
  private sounds: Record<SoundName, HTMLAudioElement>;
  private isMuted: boolean = false;

  constructor() {
    this.sounds = {
      // Subtle click/pop for selection
      pop: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-modern-technology-select-3124.mp3'),
      // Pleasant chime for correct group
      correct: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3'),
      // Soft thud/error sound
      wrong: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-game-show-wrong-answer-buzz-950.mp3'),
      // Celebration fanfare
      win: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3')
    };

    // Preload sounds
    Object.values(this.sounds).forEach(audio => {
      audio.load();
      audio.volume = 0.5; // Default volume
    });
  }

  setMute(muted: boolean) {
    this.isMuted = muted;
  }

  play(name: SoundName) {
    if (this.isMuted) return;

    const audio = this.sounds[name];
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(e => {
        // Ignore auto-play blocking errors or network errors
        console.warn('Audio play failed', e);
      });
    }
  }
}

export const audioService = new AudioService();
