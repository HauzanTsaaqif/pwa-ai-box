import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

const PACKAGES = [
  {
    name: "Basic",
    price: 15000,
    photoCount: 3,
    printCount: 1,
    hasEmail: true,
    hasFilter: false,
    isActive: true,
  },
  {
    name: "Standard",
    price: 25000,
    photoCount: 5,
    printCount: 2,
    hasEmail: true,
    hasFilter: false,
    isActive: true,
  },
  {
    name: "Premium",
    price: 40000,
    photoCount: 8,
    printCount: 3,
    hasEmail: true,
    hasFilter: true,
    isActive: true,
  },
];

export async function GET() {
  try {
    const results: string[] = [];

    // Create admin document
    await adminDb.collection("admin").doc("admin").set({
      password: "aibox2026",
      role: "admin",
      createdAt: new Date(),
    });
    results.push("✅ Admin user created");

    // Create packages
    for (const pkg of PACKAGES) {
      const id = pkg.name.toLowerCase();
      await adminDb.collection("packages").doc(id).set({
        ...pkg,
        createdAt: new Date(),
      });
      results.push(`✅ Package created: ${pkg.name}`);
    }

    return NextResponse.json({
      success: true,
      message: "Database initialized successfully",
      results,
    });
  } catch (error) {
    console.error("Init DB error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to initialize database" },
      { status: 500 }
    );
  }
}
