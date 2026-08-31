"use client";

import { getFirestoreDB } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

const SESSION_KEY = "aibox_admin_session";
const SESSION_EXPIRY_DAYS = 7;

export interface AdminSession {
  username: string;
  loggedInAt: number;
  expiresAt: number;
}

export function saveSession(username: string): void {
  const now = Date.now();
  const session: AdminSession = {
    username,
    loggedInAt: now,
    expiresAt: now + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getSession(): AdminSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session: AdminSession = JSON.parse(raw);
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function isLoggedIn(): boolean {
  return getSession() !== null;
}

export async function validateAdmin(
  username: string,
  password: string
): Promise<boolean> {
  try {
    const db = getFirestoreDB();
    const adminDoc = await getDoc(doc(db, "admin", username));
    if (!adminDoc.exists()) return false;
    const data = adminDoc.data();
    return data.password === password;
  } catch {
    return false;
  }
}
