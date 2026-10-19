/**
 * Wedding Website Configuration for Kerollos & Mariam
 * 
 * Central configuration module defining Firebase credentials, 
 * event schedule, venues, and media settings.
 */

// Official Firebase configuration for Kerollos & Mariam
export const firebaseConfig = {
  apiKey: "AIzaSyAHo3HbWj7A2-wVX4y5PlBb_nKptHKAcvU",
  authDomain: "kero-mariam.firebaseapp.com",
  projectId: "kero-mariam",
  storageBucket: "kero-mariam.firebasestorage.app",
  messagingSenderId: "504713719061",
  appId: "1:504713719061:web:556886d1c2b0194e34cd1c",
  measurementId: "G-JXJ4HY2RB4"
};

// Firestore & LocalStorage separation keys
export const FIRESTORE_COLLECTION = "kerollos_mariam_wishes";
export const LOCAL_STORAGE_KEY = "kerollos_mariam_wishes_v1";

// Couple & Wedding Event Configuration
// (Any unconfirmed venue addresses or times can be customized here in one place)
export const EVENT_DETAILS = {
  couple: {
    groom: "Kerollos",
    bride: "Mariam",
    monogram: "K & M",
    fullName: "Kerollos & Mariam"
  },
  dateText: "Wednesday, October 28, 2026",
  targetDateIso: "2026-10-28T17:00:00+03:00", // Target countdown timestamp (5:00 PM Egypt Time)
  timezone: "GMT+3 (Cairo Time)",
  ceremony: {
    title: "Holy Matrimony Ceremony",
    venue: "Saint Mary & Saint George Coptic Orthodox Church",
    address: "Heliopolis, Cairo, Egypt",
    time: "5:00 PM",
    note: "Doors open at 4:30 PM. Please arrive early to be seated for the Holy Service."
  },
  reception: {
    title: "Wedding Dinner & Reception",
    venue: "The Grand Victorian Ballroom",
    address: "Cairo, Egypt",
    time: "7:30 PM",
    note: "Join us for an evening of music, dining, and celebration."
  }
};

// Form Validation Limits
export const FORM_LIMITS = {
  nameMaxLength: 80,
  messageMaxLength: 1000
};

// Media assets
export const MEDIA = {
  introVideo: "assets/imgs/overlay.mp4",
  heroImage: "assets/imgs/KM.jpeg",
  backgroundMusic: "assets/audio/music.mp3",
  musicVolume: 0.3
};
