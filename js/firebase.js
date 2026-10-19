/**
 * Firebase Service for Kerollos & Mariam Wedding Website
 * 
 * Strictly connects to Firebase Project: "kero-mariam"
 * Collection: "kerollos_mariam_wishes"
 */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  getDocs,
  limit
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

import { firebaseConfig, FIRESTORE_COLLECTION, LOCAL_STORAGE_KEY, FORM_LIMITS } from "./config.js";

let app = null;
let db = null;
let unsubscribeWishes = null;

/**
 * Initializes Firebase instance strictly for kero-mariam
 */
export function initFirebase() {
  if (db) return db;

  if (firebaseConfig.projectId !== "kero-mariam") {
    throw new Error(`Security validation failed: Invalid project ID "${firebaseConfig.projectId}". Expected "kero-mariam".`);
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
    console.error("Firebase initialization failed:", error);
    throw error;
  }
}

/**
 * Submits a new wish to kerollos_mariam_wishes
 * @param {Object} wishData - { name: string, message: string }
 * @returns {Promise<{success: boolean, id: string}>}
 */
export async function submitWish({ name, message }) {
  const trimmedName = (name || "").trim();
  const trimmedMessage = (message || "").trim();

  // Validation
  if (!trimmedName) {
    throw new Error("Please enter your name.");
  }
  if (!trimmedMessage) {
    throw new Error("Please enter your wish message.");
  }
  if (trimmedName.length > FORM_LIMITS.nameMaxLength) {
    throw new Error(`Name must be under ${FORM_LIMITS.nameMaxLength} characters.`);
  }
  if (trimmedMessage.length > FORM_LIMITS.messageMaxLength) {
    throw new Error(`Message must be under ${FORM_LIMITS.messageMaxLength} characters.`);
  }

  const firestoreDb = initFirebase();
  const wishesRef = collection(firestoreDb, FIRESTORE_COLLECTION);

  const newDoc = {
    name: trimmedName,
    message: trimmedMessage,
    createdAt: serverTimestamp()
  };

  try {
    const docRef = await addDoc(wishesRef, newDoc);

    // Save to local backup cache so submitted wish is locally preserved
    try {
      const localBackup = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
      localBackup.unshift({
        id: docRef.id,
        name: trimmedName,
        message: trimmedMessage,
        createdAt: new Date().toISOString()
      });
      // keep max 50 in local cache
      if (localBackup.length > 50) localBackup.length = 50;
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localBackup));
    } catch (e) {
      // LocalStorage error non-critical
    }

    return { success: true, id: docRef.id };
  } catch (err) {
    console.error("Failed to save wish to Firestore:", err);
    throw new Error("Unable to save your wish right now. Please check your internet connection and try again.");
  }
}

/**
 * Subscribes to real-time updates from kerollos_mariam_wishes collection
 * @param {Function} onWishesUpdate - Callback receiving array of wish items
 * @param {Function} onError - Callback receiving error object
 * @returns {Function} Unsubscribe function
 */
export function subscribeToWishes(onWishesUpdate, onError) {
  try {
    const firestoreDb = initFirebase();
    const wishesRef = collection(firestoreDb, FIRESTORE_COLLECTION);
    
    // Order newest first
    const wishesQuery = query(wishesRef, orderBy("createdAt", "desc"), limit(100));

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
            name: data.name || "Anonymous Friend",
            message: data.message || "",
            createdAt: data.createdAt ? data.createdAt.toDate() : new Date()
          });
        });

        // Also update local cache for graceful offline view
        try {
          if (wishes.length > 0) {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(wishes.slice(0, 50)));
          }
        } catch (e) {
          // ignore storage quota issues
        }

        onWishesUpdate(wishes);
      },
      (error) => {
        console.error("Firestore onSnapshot error:", error);
        if (onError) onError(error);
      }
    );

    return unsubscribeWishes;
  } catch (err) {
    console.error("Failed to subscribe to wishes:", err);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Returns any locally cached wishes (fallback in case of network issue)
 */
export function getCachedWishes() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed.map((item) => ({
      ...item,
      createdAt: item.createdAt ? new Date(item.createdAt) : new Date()
    }));
  } catch (e) {
    return [];
  }
}
