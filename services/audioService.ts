
// Audio Service using HTML5 Audio with Web Audio API Fallback
class AudioService {
  private bgm: HTMLAudioElement;
  private expandSfx: HTMLAudioElement;
  private contractSfx: HTMLAudioElement;
  private isMuted: boolean = false;
  private initialized: boolean = false;
  
  // Web Audio Context for Drone & Fallback
  private useFallback: boolean = false;
  private audioCtx: AudioContext | null = null;
  private droneNodes: { osc: OscillatorNode, gain: GainNode }[] = [];

  constructor() {
    // 1. Initialize Audio Context (lazy load)
    const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
    if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
    }

    // 2. Initialize Audio Elements
    
    // Background Music: Cosmic Meditation / Deep Space Ambient
    // Using a loopable ambient track, slowed down for meditation feel
    this.bgm = new Audio('https://assets.mixkit.co/music/preview/mixkit-stars-in-space-120.mp3');
    this.bgm.loop = true;
    this.bgm.volume = 0.3; // Kept low to blend with drone
    this.bgm.playbackRate = 0.8; // Slower, deeper, more meditative
    this.bgm.preload = "auto";

    // SFX: Ethereal Chime (Expand) - Soft meditation bell
    this.expandSfx = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-magic-marimba-chime-2811.mp3');
    this.expandSfx.volume = 0.4;
    this.expandSfx.preload = "auto";

    // SFX: Soft Breath/Wind (Contract) - Gentle transition
    this.contractSfx = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-light-wind-gust-2608.mp3');
    this.contractSfx.volume = 0.5;
    this.contractSfx.preload = "auto";

    // 3. Robust Error Handling
    const handleLoadError = (sourceName: string, e: Event | string) => {
        console.warn(`${sourceName} failed to load. Switching to Synthesis Fallback.`, e);
        this.useFallback = true;
    };

    this.bgm.onerror = (e) => handleLoadError("BGM", e);
    this.expandSfx.onerror = (e) => handleLoadError("Expand SFX", e);
    this.contractSfx.onerror = (e) => handleLoadError("Contract SFX", e);
  }

  // --- PUBLIC API ---

  async startAmbient() {
    if (this.initialized) return;
    
    // Ensure AudioContext is running (required for Chrome/Safari)
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
    }

    // START COSMIC DRONE (Generative Layer)
    // We always play this to add that deep "meditation" vibration
    this.startDrone();

    if (this.useFallback) {
        this.initialized = true;
        return;
    }

    try {
      const promise = this.bgm.play();
      if (promise !== undefined) {
        await promise;
        console.log("Ambient music started.");
      }
      this.initialized = true;
    } catch (e) {
      // Auto-play policy blocked it
      console.log("Audio waiting for interaction.");
    }
  }

  playExpand() {
    if (this.isMuted) return;

    if (this.useFallback) {
        this.playSynthSfx('expand');
    } else {
        this.safePlay(this.expandSfx);
    }
  }

  playContract() {
    if (this.isMuted) return;
    
    if (this.useFallback) {
        this.playSynthSfx('contract');
    } else {
        this.safePlay(this.contractSfx);
    }
  }

  setVolume(vol: number) {
    this.bgm.volume = vol * 0.6; // Scale relative to drone
    this.isMuted = vol === 0;

    if (this.isMuted) {
        this.bgm.pause();
        this.toggleDroneVolume(0);
    } else {
        this.toggleDroneVolume(0.04); // Restore drone level
        if (!this.initialized) {
            this.startAmbient();
        } else if (!this.useFallback) {
            this.bgm.play().catch(() => {});
        }
    }
  }

  // --- INTERNAL HELPER METHODS ---

  private safePlay(audio: HTMLAudioElement) {
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.warn("Playback failed, using synth", error);
            if (audio === this.expandSfx) this.playSynthSfx('expand');
            if (audio === this.contractSfx) this.playSynthSfx('contract');
        });
    }
  }

  // --- GENERATIVE AUDIO ENGINE ---

  private startDrone() {
    if (!this.audioCtx || this.droneNodes.length > 0) return;

    // Cosmic Drone: Tuned to 432Hz harmonics for meditation
    // 108Hz (Deep A), 216Hz (A3), and a slight detuned layer for texture
    const freqs = [108, 216, 216.5]; 
    
    freqs.forEach((f, i) => {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        const panner = this.audioCtx.createStereoPanner();

        osc.type = 'sine';
        osc.frequency.value = f;

        // Spread across stereo field
        panner.pan.value = (i / (freqs.length - 1)) * 2 - 1;

        osc.connect(panner);
        panner.connect(gain);
        gain.connect(this.audioCtx.destination);

        // Slow fade in for immersive entry (5 seconds)
        const t = this.audioCtx.currentTime;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.04, t + 5.0); 
        
        osc.start();
        this.droneNodes.push({ osc, gain });
    });
  }

  private toggleDroneVolume(targetVol: number) {
      if (!this.audioCtx) return;
      const t = this.audioCtx.currentTime;
      this.droneNodes.forEach(n => {
          n.gain.gain.cancelScheduledValues(t);
          n.gain.gain.linearRampToValueAtTime(targetVol, t + 1.5);
      });
  }

  private playSynthSfx(type: 'expand' | 'contract') {
    if (!this.audioCtx) return;

    const t = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.type = 'sine';

    if (type === 'expand') {
        // Gentle Chime Up
        osc.frequency.setValueAtTime(196, t); // G3
        osc.frequency.exponentialRampToValueAtTime(392, t + 2.5); // G4
        
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.15, t + 0.8);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 4.0);
        
        osc.start(t);
        osc.stop(t + 4.0);
    } else {
        // Breath Down
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(60, t + 3.0);
        
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.1, t + 1.0);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 3.0);
        
        osc.start(t);
        osc.stop(t + 3.0);
    }
  }
}

export const audioService = new AudioService();
