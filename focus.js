/* -------------------------------------------------------------
 * FOCUS MODE & AUDIO SYNTHESIZER - FocusFlow AI
 * Coordinates Pomodoro timers, focus scoreboard, and leverages
 * the Web Audio API to synthesize procedural audio soundscapes.
 * ------------------------------------------------------------- */
import { StorageService } from './storage.js';
// Web Audio API Synthesizer Context & Nodes
let audioCtx = null;
const synthNodes = {
  rain: { source: null, filter: null, gain: null, playing: false },
  binaural: { oscLeft: null, oscRight: null, merger: null, gain: null, playing: false },
  breeze: { source: null, filter: null, lfo: null, gain: null, playing: false }
};
function initAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}
// Generate White Noise Buffer (helper)
function createNoiseBuffer() {
  initAudioContext();
  const bufferSize = 2 * audioCtx.sampleRate; // 2 seconds
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}
export const AudioSynthService = {
  toggleSound(type, volumePercent) {
    initAudioContext();
    const volume = volumePercent / 100;
    
    if (synthNodes[type].playing) {
      this.stopSound(type);
      return false;
    } else {
      this.startSound(type, volume);
      return true;
    }
  },
  startSound(type, volume) {
    initAudioContext();
    if (synthNodes[type].playing) return;
    if (type === 'rain') {
      // Pink/Brownish rain: White noise + Biquad Filter (Low-pass)
      const noise = audioCtx.createBufferSource();
      noise.buffer = createNoiseBuffer();
      noise.loop = true;
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, audioCtx.currentTime);
      filter.Q.setValueAtTime(1, audioCtx.currentTime);
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(volume * 0.8, audioCtx.currentTime);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      noise.start();
      synthNodes.rain.source = noise;
      synthNodes.rain.filter = filter;
      synthNodes.rain.gain = gain;
      synthNodes.rain.playing = true;
    } else if (type === 'binaural') {
      // Binaural Beats: Left = 200Hz, Right = 210Hz (creates 10Hz Alpha beat for focus)
      const oscLeft = audioCtx.createOscillator();
      oscLeft.type = 'sine';
      oscLeft.frequency.setValueAtTime(200, audioCtx.currentTime);
      const oscRight = audioCtx.createOscillator();
      oscRight.type = 'sine';
      oscRight.frequency.setValueAtTime(210, audioCtx.currentTime); // 10Hz difference
      const merger = audioCtx.createChannelMerger(2);
      
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(volume * 0.4, audioCtx.currentTime); // keep beat soft
      // Connect channels (merging left to channel 0, right to channel 1)
      oscLeft.connect(merger, 0, 0);
      oscRight.connect(merger, 0, 1);
      
      merger.connect(gain);
      gain.connect(audioCtx.destination);
      oscLeft.start();
      oscRight.start();
      synthNodes.binaural.oscLeft = oscLeft;
      synthNodes.binaural.oscRight = oscRight;
      synthNodes.binaural.merger = merger;
      synthNodes.binaural.gain = gain;
      synthNodes.binaural.playing = true;
    } else if (type === 'breeze') {
      // Shifting wind: White Noise + Modulated Bandpass Filter
      const noise = audioCtx.createBufferSource();
      noise.buffer = createNoiseBuffer();
      noise.loop = true;
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.setValueAtTime(3, audioCtx.currentTime);
      // LFO to modulate filter frequency
      const lfo = audioCtx.createOscillator();
      lfo.frequency.setValueAtTime(0.08, audioCtx.currentTime); // slow sweep: 12 seconds
      
      const lfoGain = audioCtx.createGain();
      lfoGain.gain.setValueAtTime(150, audioCtx.currentTime); // swing center by +-150Hz
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(volume * 0.6, audioCtx.currentTime);
      // Connect LFO modulation to filter cutoff frequency
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      
      // Pass noise through filtered gain
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      filter.frequency.setValueAtTime(350, audioCtx.currentTime); // center frequency
      noise.start();
      lfo.start();
      synthNodes.breeze.source = noise;
      synthNodes.breeze.filter = filter;
      synthNodes.breeze.lfo = lfo;
      synthNodes.breeze.gain = gain;
      synthNodes.breeze.playing = true;
    }
  },
  stopSound(type) {
    if (!synthNodes[type].playing) return;
    if (type === 'rain') {
      synthNodes.rain.source.stop();
      synthNodes.rain.playing = false;
    } else if (type === 'binaural') {
      synthNodes.binaural.oscLeft.stop();
      synthNodes.binaural.oscRight.stop();
      synthNodes.binaural.playing = false;
    } else if (type === 'breeze') {
      synthNodes.breeze.source.stop();
      synthNodes.breeze.lfo.stop();
      synthNodes.breeze.playing = false;
    }
  },
  setVolume(type, volumePercent) {
    if (!synthNodes[type].playing) return;
    const volume = volumePercent / 100;
    const multiplier = type === 'binaural' ? 0.4 : type === 'rain' ? 0.8 : 0.6;
    
    synthNodes[type].gain.gain.setValueAtTime(volume * multiplier, audioCtx.currentTime);
  },
  stopAll() {
    this.stopSound('rain');
    this.stopSound('binaural');
    this.stopSound('breeze');
  }
};
// Pomodoro Timer State
export const PomodoroService = {
  duration: 25 * 60, // default 25 min
  timeLeft: 25 * 60,
  timerId: null,
  isActive: false,
  mode: 'focus', // focus, short-break, long-break
  init(onTickCallback, onCompleteCallback) {
    this.onTick = onTickCallback;
    this.onComplete = onCompleteCallback;
  },
  setDuration(minutes, mode = 'focus') {
    this.mode = mode;
    this.duration = minutes * 60;
    this.timeLeft = this.duration;
    if (this.isActive) {
      this.pause();
    }
    this.onTick(this.timeLeft, this.duration);
  },
  start() {
    if (this.isActive) return;
    initAudioContext();
    this.isActive = true;
    
    this.timerId = setInterval(() => {
      this.timeLeft--;
      this.onTick(this.timeLeft, this.duration);
      if (this.timeLeft <= 0) {
        this.completeSession();
      }
    }, 1000);
  },
  pause() {
    if (!this.isActive) return;
    clearInterval(this.timerId);
    this.isActive = false;
  },
  reset() {
    this.pause();
    this.timeLeft = this.duration;
    this.onTick(this.timeLeft, this.duration);
  },
  completeSession() {
    this.pause();
    
    // Play browser beep alarm sound
    try {
      initAudioContext();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // high pitch A5
      gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5); // Beep for 0.5s
    } catch(e) {}
    // Save metrics
    if (this.mode === 'focus') {
      const state = StorageService.loadState();
      
      // Update historical points
      state.user.focusScore += 50; // 50 points per focus cycle
      
      // Push session stats
      const today = new Date().toISOString().split('T')[0];
      const sessions = state.focusSessions || [];
      const todaySession = sessions.find(s => s.date === today);
      if (todaySession) {
        todaySession.duration += Math.round(this.duration / 60);
      } else {
        sessions.push({ date: today, duration: Math.round(this.duration / 60), completed: true });
      }
      
      state.focusSessions = sessions;
      StorageService.saveState(state);
    }
    this.onComplete(this.mode);
    this.reset();
  }
};