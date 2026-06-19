// fx.jsx — shared atmosphere + feedback layer
// 1) <Backdrop/>  : the signature "inspection bay" background — soft LED
//    light bars sweeping diagonally over dark paint (the thing a PPF
//    installer's rig does), plus drifting grid, metallic-flake noise and
//    a faint accent under-glow. Pure CSS transforms = cheap on mobile.
// 2) toast()/<Toaster/> : tiny event-based toast system replacing alert().
// 3) <Lightbox/> : full-screen photo viewer for stage photos.

import { useState, useEffect } from "react";
import { X, CheckCircle2, AlertTriangle } from "lucide-react";

// ── Backdrop ────────────────────────────────────────────────
export function Backdrop() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {/* drifting alignment grid */}
      <div
        className="absolute inset-0 opacity-[0.04] grid-drift"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      {/* inspection-light beams */}
      <div className="beam beam-a" />
      <div className="beam beam-b" />
      {/* accent under-glow, bottom of bay */}
      <div
        className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-[120vw] h-[50vh] opacity-60"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(46,125,255,0.07) 0%, transparent 65%)",
        }}
      />
      {/* metallic-flake noise */}
      <div className="absolute inset-0 noise" />
      {/* vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </div>
  );
}

// ── Toasts ──────────────────────────────────────────────────
export const toast = (msg, type = "ok") =>
  window.dispatchEvent(
    new CustomEvent("detailr:toast", {
      detail: { msg: String(msg), type, id: Date.now() + Math.random() },
    })
  );

export function Toaster() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const h = (e) => {
      const item = e.detail;
      setItems((s) => [...s.slice(-3), item]);
      setTimeout(() => setItems((s) => s.filter((x) => x.id !== item.id)), 4200);
    };
    window.addEventListener("detailr:toast", h);
    return () => window.removeEventListener("detailr:toast", h);
  }, []);

  return (
    <div className="fixed bottom-5 inset-x-0 z-[90] flex flex-col items-center gap-2 px-4 pointer-events-none print:hidden">
      {items.map((t) => (
        <div
          key={t.id}
          className={`toast-in pointer-events-auto flex items-center gap-2.5 max-w-md w-full sm:w-auto px-4 py-3 text-sm border backdrop-blur-md ${
            t.type === "err"
              ? "bg-red-950/70 border-red-700/60 text-red-200"
              : "bg-black/80 border-white/15 text-white"
          }`}
        >
          {t.type === "err" ? (
            <AlertTriangle size={15} className="flex-shrink-0 text-red-400" />
          ) : (
            <CheckCircle2 size={15} className="flex-shrink-0 text-green-400" />
          )}
          <span className="leading-snug">{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

// ── Lightbox ────────────────────────────────────────────────
export function Lightbox({ photo, onClose }) {
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  if (!photo) return null;
  return (
    <div
      className="fixed inset-0 z-[80] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-5 right-5 p-2 border border-white/15 text-gray-400 hover:text-white hover:border-white/50 transition-colors"
        aria-label="Close photo"
      >
        <X size={18} />
      </button>
      <figure className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
        <img
          src={photo.url}
          alt={photo.caption || photo.stage}
          className="w-full max-h-[78vh] object-contain"
        />
        <figcaption className="mt-3 flex items-center justify-between text-[11px] font-mono uppercase tracking-widest text-gray-500">
          <span className="text-white">{photo.stage}</span>
          <span>{new Date(photo.created_at).toLocaleString()}</span>
        </figcaption>
        {photo.caption && <p className="text-gray-400 text-sm mt-1">{photo.caption}</p>}
      </figure>
    </div>
  );
}
