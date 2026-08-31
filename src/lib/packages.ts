"use client";

import { getFirestoreDB } from "./firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

export interface PhotoPackage {
  id: string;
  name: string;
  price: number;
  photoCount: number;
  printCount: number;
  hasEmail: boolean;
  hasFilter: boolean;
  isActive: boolean;
}

export async function getPackages(): Promise<PhotoPackage[]> {
  try {
    const db = getFirestoreDB();
    const snapshot = await getDocs(collection(db, "packages"));
    const packages: PhotoPackage[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as Omit<PhotoPackage, "id">;
      packages.push({ id: doc.id, ...data });
    });
    return packages.filter((p) => p.isActive).sort((a, b) => a.price - b.price);
  } catch {
    // Fallback packages if Firestore is not available
    return [
      {
        id: "basic",
        name: "Basic",
        price: 15000,
        photoCount: 3,
        printCount: 1,
        hasEmail: true,
        hasFilter: false,
        isActive: true,
      },
      {
        id: "standard",
        name: "Standard",
        price: 25000,
        photoCount: 5,
        printCount: 2,
        hasEmail: true,
        hasFilter: false,
        isActive: true,
      },
      {
        id: "premium",
        name: "Premium",
        price: 40000,
        photoCount: 8,
        printCount: 3,
        hasEmail: true,
        hasFilter: true,
        isActive: true,
      },
    ];
  }
}

export async function getPackageById(
  packageId: string
): Promise<PhotoPackage | null> {
  try {
    const db = getFirestoreDB();
    const docRef = await getDoc(doc(db, "packages", packageId));
    if (!docRef.exists()) return null;
    return { id: docRef.id, ...(docRef.data() as Omit<PhotoPackage, "id">) };
  } catch {
    return null;
  }
}
