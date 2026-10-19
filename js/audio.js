/**
 * Audio Controller for Background Music
 * 
 * Kerollos & Mariam Wedding Website
 */

import { MEDIA } from "./config.js";

class AudioController {
  constructor() {
    this.audio = null;
    this.toggleBtn = null;
    this.isPlaying = false;
    this.isInitialized = false;
  }

  /**
   * Initializes the audio element and bind UI toggle controls
   */
  init(toggleButtonId = "music-toggle-btn") {
    if (this.isInitialized) return;

    this.toggleBtn = document.getElementById(toggleButtonId);

    this.audio = new Audio(MEDIA.backgroundMusic);
    this.audio.loop = true;
    this.audio.volume = MEDIA.musicVolume;
    this.audio.preload = "auto";

    // Audio event listeners
    this.audio.addEventListener("play", () => {
      this.isPlaying = true;
      this.updateUI(true);
    });

    this.audio.addEventListener("pause", () => {
      this.isPlaying = false;
      this.updateUI(false);
    });

    this.audio.addEventListener("error", (e) => {
      console.warn("Background audio encountered an error:", e);
      this.isPlaying = false;
      this.updateUI(false);
    });

    if (this.toggleBtn) {
      this.toggleBtn.addEventListener("click", () => this.toggle());
    }

    this.isInitialized = true;
  }

  /**
   * Starts playback after visitor gesture
   */
  async startAfterGesture() {
    if (!this.audio) this.init();
    try {
      this.audio.volume = MEDIA.musicVolume;
      const playPromise = this.audio.play();
      if (playPromise !== undefined) {
        await playPromise;
        this.isPlaying = true;
        this.updateUI(true);
      }
    } catch (err) {
      console.info("Autoplay restricted or postponed until manual toggle:", err.message);
      this.isPlaying = false;
      this.updateUI(false);
    }
  }

  /**
   * Toggles play / pause state
   */
  async toggle() {
    if (!this.audio) this.init();

    if (this.audio.paused) {
      try {
        await this.audio.play();
      } catch (err) {
        console.warn("Play request was blocked by browser:", err);
      }
    } else {
      this.audio.pause();
    }
  }

  /**
   * Updates toggle button accessibility attributes & appearance
   */
  updateUI(playing) {
    if (!this.toggleBtn) return;

    this.toggleBtn.setAttribute("aria-pressed", playing ? "true" : "false");
    this.toggleBtn.setAttribute(
      "aria-label", 
      playing ? "Pause background music" : "Play background music"
    );

    if (playing) {
      this.toggleBtn.classList.add("is-playing");
      this.toggleBtn.classList.remove("is-paused");
    } else {
      this.toggleBtn.classList.remove("is-playing");
      this.toggleBtn.classList.add("is-paused");
    }
  }
}

export const audioController = new AudioController();
