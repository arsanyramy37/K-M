/**
 * Kerollos & Mariam — Engagement Website
 * All-In-One Consolidated Application Module
 *
 * Includes:
 * 1. Configuration (Firebase, Event schedule, Map links, Limits, Media)
 * 2. Firebase Database Service (Strictly kero-mariam project & kerollos_mariam_wishes)
 * 3. Audio Controller (Background music playback & accessible toggles)
 * 4. Intro Video Overlay Dismissal  (+ robust iOS autoplay handling)
 * 5. Navigation & Mobile Drawer
 * 6. Live Countdown Timer
 * 7. Send Your Wishes Form (Validation, Firestore write, Toast feedback)
 * 8. Guest Wishes Panel (Live onSnapshot listener, Safe plain-text rendering)
 * 9. Bidirectional Scroll Reveal Animation System (Up & Down scrolling)
 */

import {
  initializeApp,
  getApps,
} from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  limit,
} from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js';

/* ==========================================================================
   SECTION 1: CONFIGURATION
   ========================================================================== */
export const firebaseConfig = {
  apiKey: 'AIzaSyAHo3HbWj7A2-wVX4y5PlBb_nKptHKAcvU',
  authDomain: 'kero-mariam.firebaseapp.com',
  projectId: 'kero-mariam',
  storageBucket: 'kero-mariam.firebasestorage.app',
  messagingSenderId: '504713719061',
  appId: '1:504713719061:web:556886d1c2b0194e34cd1c',
  measurementId: 'G-JXJ4HY2RB4',
};

export const FIRESTORE_COLLECTION = 'kerollos_mariam_wishes';
export const LOCAL_STORAGE_KEY = 'kerollos_mariam_wishes_v1';

export const EVENT_DETAILS = {
  couple: {
    fullName: 'Kerollos & Mariam',
    groom: 'Kerollos',
    bride: 'Mariam',
  },
  dateText: 'Thursday, October 29, 2026',
  targetDateIso: '2026-10-29T17:00:00+03:00', // 5:00 PM Cairo Time (Thursday, Oct 29, 2026)
  ceremony: {
    title: 'Engagement Blessing Ceremony',
    venue: 'St. Mary & Archangel Michael Coptic Orthodox Cathedral',
    address: 'El-Seka El-Gedida, Mansoura, Egypt',
    time: '6:00 PM',
    mapsUrl:
      'https://www.google.com/maps/search/?api=1&query=29WM%2BG7M%2C+Mansoura',
  },
  reception: {
    title: 'Engagement Celebration & Reception',
    venue: 'Flora Garden',
    address: 'Mansoura, Egypt',
    time: '7:30 PM',
    mapsUrl: 'https://maps.app.goo.gl/xjRopmPXtgAwiEHGA?g_st=ic',
  },
};

export const FORM_LIMITS = {
  nameMaxLength: 80,
  messageMaxLength: 1000,
};

export const MEDIA = {
  introVideo: 'assets/imgs/overlay.mp4',
  heroImage: 'assets/imgs/KM.jpeg',
  backgroundMusic: 'assets/audio/music.mp3',
  musicVolume: 0.3,
};

/* ==========================================================================
   SECTION 2: FIREBASE DATABASE SERVICE
   ========================================================================== */
let app = null;
let db = null;
let unsubscribeWishes = null;

export function initFirebase() {
  if (db) return db;

  if (firebaseConfig.projectId !== 'kero-mariam') {
    throw new Error(
      `Security validation failed: Invalid project ID "${firebaseConfig.projectId}". Expected "kero-mariam".`,
    );
  }

  try {
    const existingApps = getApps();
    if (existingApps.length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = existingApps[0];
    }

    db = getFirestore(app);
    return db;
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    throw error;
  }
}

export async function submitWish({ name, message }) {
  const trimmedName = (name || '').trim();
  const trimmedMessage = (message || '').trim();

  if (!trimmedName) {
    throw new Error('Please enter your name.');
  }
  if (!trimmedMessage) {
    throw new Error('Please enter your wish message.');
  }
  if (trimmedName.length > FORM_LIMITS.nameMaxLength) {
    throw new Error(
      `Name must be under ${FORM_LIMITS.nameMaxLength} characters.`,
    );
  }
  if (trimmedMessage.length > FORM_LIMITS.messageMaxLength) {
    throw new Error(
      `Message must be under ${FORM_LIMITS.messageMaxLength} characters.`,
    );
  }

  const firestoreDb = initFirebase();
  const wishesRef = collection(firestoreDb, FIRESTORE_COLLECTION);

  const newDoc = {
    name: trimmedName,
    message: trimmedMessage,
    createdAt: serverTimestamp(),
  };

  try {
    const docRef = await addDoc(wishesRef, newDoc);

    try {
      const localBackup = JSON.parse(
        localStorage.getItem(LOCAL_STORAGE_KEY) || '[]',
      );
      localBackup.unshift({
        id: docRef.id,
        name: trimmedName,
        message: trimmedMessage,
        createdAt: new Date().toISOString(),
      });
      if (localBackup.length > 50) localBackup.length = 50;
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localBackup));
    } catch (e) {
      // Non-critical local storage fallback
    }

    return { success: true, id: docRef.id };
  } catch (err) {
    console.error('Failed to save wish to Firestore:', err);
    throw new Error(
      'Unable to save your wish right now. Please check your internet connection and try again.',
    );
  }
}

export function subscribeToWishes(onWishesUpdate, onError) {
  try {
    const firestoreDb = initFirebase();
    const wishesRef = collection(firestoreDb, FIRESTORE_COLLECTION);
    const wishesQuery = query(
      wishesRef,
      orderBy('createdAt', 'desc'),
      limit(100),
    );

    if (unsubscribeWishes) {
      unsubscribeWishes();
      unsubscribeWishes = null;
    }

    unsubscribeWishes = onSnapshot(
      wishesQuery,
      (snapshot) => {
        const wishes = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          wishes.push({
            id: doc.id,
            name: data.name || 'A Dear Friend',
            message: data.message || '',
            createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
          });
        });

        try {
          if (wishes.length > 0) {
            localStorage.setItem(
              LOCAL_STORAGE_KEY,
              JSON.stringify(wishes.slice(0, 50)),
            );
          }
        } catch (e) {
          // ignore
        }

        onWishesUpdate(wishes);
      },
      (error) => {
        console.error('Firestore onSnapshot error:', error);
        if (onError) onError(error);
      },
    );

    return unsubscribeWishes;
  } catch (err) {
    console.error('Failed to subscribe to wishes:', err);
    if (onError) onError(err);
    return () => {};
  }
}

export function getCachedWishes() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed.map((item) => ({
      ...item,
      createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
    }));
  } catch (e) {
    return [];
  }
}

/* ==========================================================================
   SECTION 3: AUDIO CONTROLLER
   ========================================================================== */
class AudioController {
  constructor() {
    this.audio = null;
    this.toggleBtn = null;
    this.isPlaying = false;
    this.isInitialized = false;
  }

  init(toggleButtonId = 'music-toggle-btn') {
    if (this.isInitialized) return;

    this.toggleBtn = document.getElementById(toggleButtonId);

    this.audio = new Audio(MEDIA.backgroundMusic);
    this.audio.loop = true;
    this.audio.volume = MEDIA.musicVolume;
    this.audio.preload = 'auto';

    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      this.updateUI(true);
    });

    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.updateUI(false);
    });

    this.audio.addEventListener('error', (e) => {
      console.warn('Background audio could not play:', e);
      this.isPlaying = false;
      this.updateUI(false);
    });

    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', () => this.toggle());
    }

    this.isInitialized = true;
  }

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
      console.info('Autoplay postponed until user manual toggle:', err.message);
      this.isPlaying = false;
      this.updateUI(false);
    }
  }

  async toggle() {
    if (!this.audio) this.init();

    if (this.audio.paused) {
      try {
        await this.audio.play();
      } catch (err) {
        console.warn('Play blocked:', err);
      }
    } else {
      this.audio.pause();
    }
  }

  updateUI(playing) {
    if (!this.toggleBtn) return;

    this.toggleBtn.setAttribute('aria-pressed', playing ? 'true' : 'false');
    this.toggleBtn.setAttribute(
      'aria-label',
      playing ? 'Pause background music' : 'Play background music',
    );

    if (playing) {
      this.toggleBtn.classList.add('is-playing');
      this.toggleBtn.classList.remove('is-paused');
    } else {
      this.toggleBtn.classList.remove('is-playing');
      this.toggleBtn.classList.add('is-paused');
    }
  }
}

export const audioController = new AudioController();

/* ==========================================================================
   SECTION 4: INTRO VIDEO OVERLAY
   ========================================================================== */
function setupIntroOverlay() {
  const overlay = document.getElementById('intro-overlay');
  const joinBtn = document.getElementById('join-us-btn');
  const introVideo = document.getElementById('intro-video');
  const mainContent = document.getElementById('main-content');

  if (!overlay || !joinBtn) return;

  let overlayOpen = true;

  /* ------------------------------------------------------------------
     FIX: Robust mobile autoplay for the intro video.
     iOS Safari requires ALL of the following for inline autoplay:
       muted (property + attribute) + playsInline (property + BOTH
       `playsinline` and `webkit-playsinline` attributes).
     Additionally, some iOS builds (Low Power Mode / strict autoplay
     policies) refuse autoplay until the first user gesture, so we:
       1. Attempt playback at every readiness milestone.
       2. Recover from stalled / suspended states.
       3. Nudge playback on the very first touch/click anywhere.
       4. Keep retrying on an interval until playback truly starts.
     ------------------------------------------------------------------ */
  if (introVideo) {
    // Property-level flags (must be set as PROPERTIES for iOS, not only attributes)
    introVideo.muted = true;
    introVideo.defaultMuted = true;
    introVideo.playsInline = true;
    introVideo.loop = true;
    // Attribute-level flags (older WebKit builds read the attributes)
    introVideo.setAttribute('muted', '');
    introVideo.setAttribute('playsinline', '');
    introVideo.setAttribute('webkit-playsinline', 'webkit-playsinline');

    const tryPlayVideo = () => {
      if (!overlayOpen || !introVideo) return;
      const playPromise = introVideo.play();
      if (
        playPromise !== undefined &&
        typeof playPromise.catch === 'function'
      ) {
        playPromise.catch((err) => {
          // NotAllowedError (Low Power Mode / autoplay policy) — retried on first gesture
          console.info(
            'Intro video autoplay deferred:',
            err && err.message ? err.message : err,
          );
        });
      }
    };

    // 1) Attempt playback at every readiness milestone
    [
      'loadedmetadata',
      'loadeddata',
      'canplay',
      'canplaythrough',
      'playing',
      'seeked',
    ].forEach((evt) => introVideo.addEventListener(evt, tryPlayVideo));

    // 2) Recover from stalls / suspension
    ['stalled', 'suspend', 'waiting'].forEach((evt) =>
      introVideo.addEventListener(evt, () => setTimeout(tryPlayVideo, 300)),
    );

    introVideo.addEventListener('error', (e) => {
      console.warn(
        'Intro video could not be loaded, continuing gracefully:',
        e,
      );
    });

    // 3) Nudge playback on the first user gesture (required by some iOS autoplay policies)
    const onFirstGesture = () => tryPlayVideo();
    document.addEventListener('touchstart', onFirstGesture, { passive: true });
    document.addEventListener('pointerdown', onFirstGesture, { passive: true });
    document.addEventListener('click', onFirstGesture);

    // 4) Keep retrying while the overlay is up and playback has not actually started
    let nudgeAttempts = 0;
    const nudgeTimer = setInterval(() => {
      nudgeAttempts++;
      const isPlaying =
        introVideo &&
        !introVideo.paused &&
        introVideo.currentTime > 0 &&
        !introVideo.ended;
      if (!overlayOpen || nudgeAttempts > 25 || isPlaying) {
        clearInterval(nudgeTimer);
        return;
      }
      tryPlayVideo();
    }, 1000);

    tryPlayVideo();
  }

  const handleEnterWebsite = () => {
    overlayOpen = false;

    // Pause the video
    if (introVideo) {
      try {
        introVideo.pause();
      } catch (e) {
        /* ignore */
      }
    }

    // Start fade-out + unlock scroll
    overlay.classList.add('fade-out');
    document.body.classList.remove('no-scroll');

    // Scroll to very top so the page starts from Hero section
    window.scrollTo({ top: 0, behavior: 'instant' });

    // Start music
    audioController.startAfterGesture();

    // Reveal ALL elements currently in the viewport right away
    // (hero portrait, title, verse, etc.) — prevents the "frozen" appearance
    setTimeout(() => {
      const allReveal = document.querySelectorAll('.reveal-on-scroll');
      allReveal.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          el.classList.add('is-revealed');
        }
      });
    }, 80);

    // Remove overlay from DOM flow after transition finishes
    setTimeout(() => {
      overlay.classList.add('hidden');
      overlay.setAttribute('aria-hidden', 'true');
      if (mainContent) mainContent.focus({ preventScroll: true });
    }, 750);
  };

  joinBtn.addEventListener('click', handleEnterWebsite);
  joinBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleEnterWebsite();
    }
  });
}

/* ==========================================================================
   SECTION 5: NAVIGATION & MOBILE MENU
   ========================================================================== */
function setupNavigation() {
  const navToggle = document.getElementById('nav-toggle');
  const navClose = document.getElementById('nav-close');
  const mobileMenu = document.getElementById('mobile-menu');
  const backdrop = document.getElementById('mobile-menu-backdrop');
  const mobileLinks = document.querySelectorAll('.mobile-nav-link');
  const desktopLinks = document.querySelectorAll('.nav-link');

  const openMobileMenu = () => {
    if (!mobileMenu) return;
    mobileMenu.classList.add('is-open');
    mobileMenu.setAttribute('aria-hidden', 'false');
    if (navToggle) navToggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('no-scroll');
  };

  const closeMobileMenu = () => {
    if (!mobileMenu) return;
    mobileMenu.classList.remove('is-open');
    mobileMenu.setAttribute('aria-hidden', 'true');
    if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('no-scroll');
  };

  if (navToggle) {
    navToggle.addEventListener('click', openMobileMenu);
  }

  if (navClose) {
    navClose.addEventListener('click', closeMobileMenu);
  }

  if (backdrop) {
    backdrop.addEventListener('click', closeMobileMenu);
  }

  document.addEventListener('keydown', (e) => {
    if (
      e.key === 'Escape' &&
      mobileMenu &&
      mobileMenu.classList.contains('is-open')
    ) {
      closeMobileMenu();
    }
  });

  mobileLinks.forEach((link) => {
    link.addEventListener('click', closeMobileMenu);
  });

  const sections = document.querySelectorAll('section[id]');
  const updateActiveLink = () => {
    const scrollY = window.pageYOffset;
    sections.forEach((current) => {
      const sectionHeight = current.offsetHeight;
      const sectionTop = current.offsetTop - 120;
      const sectionId = current.getAttribute('id');

      if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
        desktopLinks.forEach((link) => {
          if (link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        });
      }
    });
  };

  window.addEventListener('scroll', updateActiveLink, { passive: true });
}

/* ==========================================================================
   SECTION 6: COUNTDOWN TIMER
   ========================================================================== */
function setupCountdown() {
  const cdDays = document.getElementById('cd-days');
  const cdHours = document.getElementById('cd-hours');
  const cdMinutes = document.getElementById('cd-minutes');
  const cdSeconds = document.getElementById('cd-seconds');
  const expiredBox = document.getElementById('countdown-expired');
  const countdownGrid = document.getElementById('countdown-grid');

  const targetDate = new Date(EVENT_DETAILS.targetDateIso).getTime();

  function update() {
    const now = new Date().getTime();
    const distance = targetDate - now;

    if (distance <= 0) {
      if (countdownGrid) countdownGrid.classList.add('hidden');
      if (expiredBox) expiredBox.classList.remove('hidden');
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
    );
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    if (cdDays) cdDays.textContent = String(days).padStart(2, '0');
    if (cdHours) cdHours.textContent = String(hours).padStart(2, '0');
    if (cdMinutes) cdMinutes.textContent = String(minutes).padStart(2, '0');
    if (cdSeconds) cdSeconds.textContent = String(seconds).padStart(2, '0');
  }

  update();
  const timerInterval = setInterval(update, 1000);

  window.addEventListener('beforeunload', () => {
    clearInterval(timerInterval);
  });
}

/* ==========================================================================
   SECTION 7: SEND YOUR WISHES FORM
   ========================================================================== */
function setupWishForm() {
  const form = document.getElementById('wish-form');
  const nameInput = document.getElementById('wish-name');
  const messageInput = document.getElementById('wish-message');
  const nameCount = document.getElementById('name-count');
  const messageCount = document.getElementById('message-count');
  const submitBtn = document.getElementById('wish-submit-btn');
  const feedback = document.getElementById('form-feedback');

  if (!form || !nameInput || !messageInput) return;

  nameInput.addEventListener('input', () => {
    nameCount.textContent = `${nameInput.value.length} / ${FORM_LIMITS.nameMaxLength}`;
  });

  messageInput.addEventListener('input', () => {
    messageCount.textContent = `${messageInput.value.length} / ${FORM_LIMITS.messageMaxLength}`;
  });

  const showFeedback = (type, message) => {
    feedback.className = `form-feedback ${type}`;
    feedback.textContent = message;
    feedback.classList.remove('hidden');
  };

  const clearFeedback = () => {
    feedback.className = 'form-feedback hidden';
    feedback.textContent = '';
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFeedback();

    const name = nameInput.value.trim();
    const message = messageInput.value.trim();

    if (!name) {
      showFeedback('error', 'Please enter your name.');
      nameInput.focus();
      return;
    }

    if (!message) {
      showFeedback('error', 'Please enter a warm wish or blessing message.');
      messageInput.focus();
      return;
    }

    if (name.length > FORM_LIMITS.nameMaxLength) {
      showFeedback(
        'error',
        `Name cannot exceed ${FORM_LIMITS.nameMaxLength} characters.`,
      );
      nameInput.focus();
      return;
    }

    if (message.length > FORM_LIMITS.messageMaxLength) {
      showFeedback(
        'error',
        `Message cannot exceed ${FORM_LIMITS.messageMaxLength} characters.`,
      );
      messageInput.focus();
      return;
    }

    submitBtn.disabled = true;
    nameInput.disabled = true;
    messageInput.disabled = true;
    const submitText = submitBtn.querySelector('.submit-text');
    const spinner = submitBtn.querySelector('.submit-spinner');
    if (submitText) submitText.textContent = 'Sending Your Blessing...';
    if (spinner) spinner.classList.remove('hidden');

    try {
      await submitWish({ name, message });
      showFeedback(
        'success',
        'Your wish has been sent successfully! Thank you for blessing Kerollos & Mariam.',
      );

      form.reset();
      nameCount.textContent = `0 / ${FORM_LIMITS.nameMaxLength}`;
      messageCount.textContent = `0 / ${FORM_LIMITS.messageMaxLength}`;
    } catch (err) {
      console.error('Form submission error:', err);
      showFeedback(
        'error',
        err.message ||
          'Something went wrong while sending your wish. Please try again.',
      );
    } finally {
      submitBtn.disabled = false;
      nameInput.disabled = false;
      messageInput.disabled = false;
      if (submitText) submitText.textContent = 'Send Your Wish';
      if (spinner) spinner.classList.add('hidden');
    }
  });
}

/* ==========================================================================
   SECTION 8: GUEST WISHES PANEL
   ========================================================================== */
function setupGuestWishes() {
  const wishesGrid = document.getElementById('wishes-grid');
  const loadingState = document.getElementById('wishes-loading');
  const emptyState = document.getElementById('wishes-empty');
  const errorState = document.getElementById('wishes-error');

  if (!wishesGrid) return;

  function renderWishes(wishes) {
    if (loadingState) loadingState.classList.add('hidden');

    if (!wishes || wishes.length === 0) {
      if (emptyState) emptyState.classList.remove('hidden');
      if (errorState) errorState.classList.add('hidden');
      wishesGrid.innerHTML = '';
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    if (errorState) errorState.classList.add('hidden');

    wishesGrid.innerHTML = '';
    const fragment = document.createDocumentFragment();

    wishes.forEach((wish) => {
      const card = document.createElement('article');
      card.className = 'wish-card';

      const header = document.createElement('div');
      header.className = 'wish-card-header';

      const author = document.createElement('h3');
      author.className = 'wish-author';
      author.textContent = wish.name || 'A Warm Friend';

      const dateSpan = document.createElement('time');
      dateSpan.className = 'wish-date';
      dateSpan.textContent = formatReadableDate(wish.createdAt);

      header.appendChild(author);
      header.appendChild(dateSpan);

      const body = document.createElement('p');
      body.className = 'wish-body';
      body.textContent = wish.message || '';

      card.appendChild(header);
      card.appendChild(body);
      fragment.appendChild(card);
    });

    wishesGrid.appendChild(fragment);
  }

  function formatReadableDate(dateObj) {
    if (!dateObj) return '';
    try {
      const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
      if (isNaN(d.getTime())) return '';

      const options = {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      };
      return d.toLocaleDateString(undefined, options);
    } catch (e) {
      return '';
    }
  }

  const unsubscribe = subscribeToWishes(
    (wishes) => {
      renderWishes(wishes);
    },
    (error) => {
      console.warn(
        'Live wishes subscription encountered error, checking cache:',
        error,
      );
      const cached = getCachedWishes();
      if (cached && cached.length > 0) {
        renderWishes(cached);
      } else {
        if (loadingState) loadingState.classList.add('hidden');
        if (emptyState) emptyState.classList.add('hidden');
        if (errorState) errorState.classList.remove('hidden');
      }
    },
  );

  window.addEventListener('beforeunload', () => {
    if (typeof unsubscribe === 'function') {
      unsubscribe();
    }
  });
}

/* ==========================================================================
   SECTION 9: BIDIRECTIONAL SCROLL REVEAL ANIMATIONS (UP & DOWN SCROLL)
   ========================================================================== */
function setupScrollReveal() {
  const revealElements = document.querySelectorAll('.reveal-on-scroll');
  if (!revealElements.length) return;

  // If IntersectionObserver not supported, reveal everything immediately
  if (!('IntersectionObserver' in window)) {
    revealElements.forEach((el) => el.classList.add('is-revealed'));
    return;
  }

  let lastScrollY = window.pageYOffset;

  const observer = new IntersectionObserver(
    (entries) => {
      const currentScrollY = window.pageYOffset;
      lastScrollY = currentScrollY;

      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
        } else {
          // Re-hide only elements that have fully exited the viewport
          // so they can re-animate when scrolled back into view
          const rect = entry.boundingClientRect;
          const vh =
            window.innerHeight || document.documentElement.clientHeight;
          if (rect.bottom < 0 || rect.top > vh) {
            entry.target.classList.remove('is-revealed');
          }
        }
      });
    },
    {
      threshold: 0.08,
      rootMargin: '0px 0px -20px 0px',
    },
  );

  revealElements.forEach((el) => observer.observe(el));
}

/* ==========================================================================
   SECTION 10: INITIALIZATION
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  audioController.init('music-toggle-btn');
  setupIntroOverlay();
  setupNavigation();
  setupCountdown();
  setupWishForm();
  setupGuestWishes();
  setupScrollReveal();
});
