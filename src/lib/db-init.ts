/**
 * Firestore Database Init Script
 * Jalankan script ini sekali untuk membuat collections awal
 *
 * Cara menjalankan: npx ts-node src/lib/db-init.ts
 * Atau jalankan via API route: GET /api/init-db
 */

import { adminDb } from "./firebase-admin";

const PACKAGES = [
  {
    id: "basic",
    name: "Basic",
    price: 15000,
    photoCount: 3,
    printCount: 1,
    hasEmail: true,
    hasFilter: false,
    isActive: true,
    createdAt: new Date(),
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
    createdAt: new Date(),
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
    createdAt: new Date(),
  },
];

const DEFAULT_ADMIN = {
  username: "admin",
  password: "aibox2026",
  role: "admin",
  createdAt: new Date(),
};

async function initDatabase(): Promise<void> {
  console.log("⏳ Initializing Firestore collections...");

  // Create admin document
  await adminDb.collection("admin").doc(DEFAULT_ADMIN.username).set({
    password: DEFAULT_ADMIN.password,
    role: DEFAULT_ADMIN.role,
    createdAt: DEFAULT_ADMIN.createdAt,
  });
  console.log("✅ Admin user created:", DEFAULT_ADMIN.username);

  // Create packages
  for (const pkg of PACKAGES) {
    await adminDb.collection("packages").doc(pkg.id).set(pkg);
    console.log(`✅ Package created: ${pkg.name} (Rp ${pkg.price})`);
  }

  console.log("🎉 Database initialization complete!");
}

initDatabase().catch(console.error);
