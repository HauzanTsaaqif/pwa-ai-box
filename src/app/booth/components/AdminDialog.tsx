"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import type { BoothController } from "../hooks/useBooth";
/** Dialog admin tersembunyi (muncul setelah 5 ketukan di pojok kanan atas) */
export default function AdminDialog({ booth }: { booth: BoothController }) {
  const {
    showAdminDialog, setShowAdminDialog, adminPassword, setAdminPassword, adminError, handleAdminLogout,
  } = booth;

  return (
    <>
      {/* ========================================================================= */}
      {/* ===== HIDDEN ADMIN DIALOG =============================================== */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showAdminDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          >
            <div className="bg-[#10111c] rounded-2xl p-6 max-w-xs w-full border border-[#292b3b] text-center shadow-2xl">
              <ShieldCheck className="w-8 h-8 text-[#f0a25c] mx-auto mb-2" />
              <h3 className="text-lg font-bold text-white mb-3">Admin Console Exit</h3>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Masukkan Password"
                className="w-full px-3 py-2 bg-[#090a12] border border-[#292b3b] rounded-xl text-white text-sm mb-3 text-center focus:outline-none focus:border-[#246cff]"
              />
              {adminError && <p className="text-xs text-rose-400 mb-2">{adminError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowAdminDialog(false);
                    setAdminPassword("");
                  }}
                  className="flex-1 py-2 bg-[#171927] text-[#9b9eaf] rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  onClick={handleAdminLogout}
                  className="flex-1 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold"
                >
                  Logout
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
