// ========== AUDIO MANAGER ==========
// Handles all audio for the portfolio (ambient sounds + interactive effects)

class AudioManager {
    constructor() {
        this.audioContext = null;
        this.isMuted = localStorage.getItem('audioMuted') === 'true';
        this.ambientGain = null;
        this.effectsGain = null;
        this.ambientOscillators = [];
        this.isAmbientPlaying = false;

        // Volume levels
        this.ambientVolume = 0.08; // Very subtle background
        this.effectVolume = 0.15; // Subtle interactive sounds

        // Debounce timers
        this.hoverDebounce = null;
        this.lastHoverTime = 0;
    }

    // Initialize audio context (must be called after user interaction)
    init() {
        if (this.audioContext) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Create gain nodes for volume control
            this.ambientGain = this.audioContext.createGain();
            this.ambientGain.connect(this.audioContext.destination);

            this.effectsGain = this.audioContext.createGain();
            this.effectsGain.connect(this.audioContext.destination);

            // Set initial volumes
            this.ambientGain.gain.value = this.isMuted ? 0 : this.ambientVolume;
            this.effectsGain.gain.value = this.isMuted ? 0 : this.effectVolume;

            console.log('🎵 Audio system initialized');
        } catch (e) {
            console.warn('Audio not supported:', e);
        }
    }

    // Start ambient space background sound
    startAmbient() {
        if (!this.audioContext || this.isAmbientPlaying || this.isMuted) return;

        this.isAmbientPlaying = true;

        // Create deep space ambient drone (3 layered oscillators)
        const frequencies = [55, 82.5, 110]; // Deep bass frequencies

        frequencies.forEach((freq, index) => {
            const oscillator = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.value = freq;

            // Each layer has different volume
            gain.gain.value = 0.3 - (index * 0.08);

            oscillator.connect(gain);
            gain.connect(this.ambientGain);

            oscillator.start();
            this.ambientOscillators.push(oscillator);
        });

        // Add subtle modulation for cosmic feel
        const lfo = this.audioContext.createOscillator();
        const lfoGain = this.audioContext.createGain();

        lfo.frequency.value = 0.2; // Very slow modulation
        lfoGain.gain.value = 3;

        lfo.connect(lfoGain);
        lfoGain.connect(this.ambientOscillators[0].frequency);
        lfo.start();
        this.ambientOscillators.push(lfo);

        // Fade in
        this.fadeAmbient('in');

        console.log('🌌 Ambient sound started');
    }

    // Stop ambient sound
    stopAmbient() {
        if (!this.isAmbientPlaying) return;

        this.fadeAmbient('out', () => {
            this.ambientOscillators.forEach(osc => {
                try {
                    osc.stop();
                } catch (e) {
                    // Already stopped
                }
            });
            this.ambientOscillators = [];
            this.isAmbientPlaying = false;
        });
    }

    // Fade ambient volume
    fadeAmbient(direction, callback) {
        if (!this.ambientGain) return;

        const duration = 2; // 2 seconds fade
        const currentTime = this.audioContext.currentTime;
        const targetVolume = direction === 'in' ? this.ambientVolume : 0;

        this.ambientGain.gain.cancelScheduledValues(currentTime);
        this.ambientGain.gain.setValueAtTime(this.ambientGain.gain.value, currentTime);
        this.ambientGain.gain.linearRampToValueAtTime(targetVolume, currentTime + duration);

        if (callback) {
            setTimeout(callback, duration * 1000);
        }
    }

    // Play hover sound (modern beep)
    playHover() {
        // Debounce - only play if enough time has passed
        const now = Date.now();
        if (now - this.lastHoverTime < 100) return;
        this.lastHoverTime = now;

        if (!this.audioContext || this.isMuted) return;

        const now2 = this.audioContext.currentTime;

        // Create modern beep sound
        const duration = 0.08;

        // Single clean beep
        const osc = this.audioContext.createOscillator();
        const oscGain = this.audioContext.createGain();

        osc.frequency.value = 1200; // Higher pitch for modern feel
        osc.type = 'triangle'; // Softer than square, sharper than sine

        oscGain.gain.setValueAtTime(0.4, now2);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now2 + duration);

        osc.connect(oscGain);
        oscGain.connect(this.effectsGain);

        osc.start(now2);
        osc.stop(now2 + duration);
    }

    // Play click sound (rising chime)
    playClick() {
        if (!this.audioContext || this.isMuted) return;

        const now = this.audioContext.currentTime;
        const duration = 0.12;

        // Rising three-note chime
        [800, 1000, 1200].forEach((freq, index) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.frequency.value = freq;
            osc.type = 'sine';

            const delay = index * 0.04;
            gain.gain.setValueAtTime(0.3, now + delay);
            gain.gain.exponentialRampToValueAtTime(0.01, now + delay + duration);

            osc.connect(gain);
            gain.connect(this.effectsGain);

            osc.start(now + delay);
            osc.stop(now + delay + duration);
        });
    }

    // Play scroll transition sound (optional)
    playTransition() {
        if (!this.audioContext || this.isMuted) return;

        const now = this.audioContext.currentTime;
        const duration = 0.2;

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.frequency.setValueAtTime(1000, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + duration);
        osc.type = 'sine';

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        osc.connect(gain);
        gain.connect(this.effectsGain);

        osc.start(now);
        osc.stop(now + duration);
    }

    // Toggle mute/unmute
    toggleMute() {
        this.isMuted = !this.isMuted;
        localStorage.setItem('audioMuted', this.isMuted);

        if (!this.audioContext) return;

        const currentTime = this.audioContext.currentTime;
        const duration = 0.3;

        if (this.isMuted) {
            // Fade out
            this.ambientGain.gain.linearRampToValueAtTime(0, currentTime + duration);
            this.effectsGain.gain.linearRampToValueAtTime(0, currentTime + duration);
            console.log('🔇 Audio muted');
        } else {
            // Fade in
            this.ambientGain.gain.linearRampToValueAtTime(this.ambientVolume, currentTime + duration);
            this.effectsGain.gain.linearRampToValueAtTime(this.effectVolume, currentTime + duration);

            // Start ambient if not playing
            if (!this.isAmbientPlaying) {
                this.startAmbient();
            }
            console.log('🔊 Audio unmuted');
        }

        return this.isMuted;
    }

    // Get mute state
    getMuted() {
        return this.isMuted;
    }
}

// Export singleton instance
const audioManager = new AudioManager();
