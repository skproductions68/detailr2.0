// App.jsx — root shell
// Welcome screen (default) → sidebar nav → routes to Book, Track, Admin.
// Admin is gated by Supabase Auth (per-staff email/password login).
// Global atmosphere (Backdrop) + toast feedback live in fx.jsx.

import { useState, useEffect } from "react";
import {
  Menu, X, ArrowRight, Home, Calendar, Search, Lock, Shield,
  CheckCircle2, Printer, MapPin,
} from "lucide-react";
import { supabase } from "./supabase";
import { useShopData } from "./useShopData";
import { formatMoney } from "./currency";
import { Backdrop, Toaster, toast } from "./fx";
import BookingFlow from "./BookingFlow";
import TrackingView from "./TrackingView";
import AdminPanel from "./AdminPanel";

// ═══════════════════════════════════════════════════════════
// GLOBAL MOTION / ACCENT SYSTEM
// ═══════════════════════════════════════════════════════════

const ACCENT = "#2e7dff";

const StyleBlock = () => (
  <style>{`
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(18px); }
      to   { opacity: 1; transform: none; }
    }
    @keyframes glossSweep {
      0%   { background-position: 200% center; }
      100% { background-position: -200% center; }
    }
    @keyframes marqueeScroll {
      from { transform: translateX(0); }
      to   { transform: translateX(-50%); }
    }
    @keyframes livePulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(46,125,255,0.55); }
      70%      { box-shadow: 0 0 0 7px rgba(46,125,255,0); }
    }
    @keyframes gridDrift {
      from { background-position: 0 0; }
      to   { background-position: 60px 60px; }
    }
    @keyframes ringDraw {
      from { stroke-dashoffset: 260; }
      to   { stroke-dashoffset: 0; }
    }
    .anim-fadeup { animation: fadeUp .7s cubic-bezier(.2,.7,.2,1) both; }
    .d1 { animation-delay: .05s; } .d2 { animation-delay: .18s; }
    .d3 { animation-delay: .32s; } .d4 { animation-delay: .48s; }
    .d5 { animation-delay: .64s; } .d6 { animation-delay: .8s; }
    .gloss-title {
      background-image: linear-gradient(105deg,
        #ffffff 38%, #d7e6ff 46%, ${ACCENT} 50%, #d7e6ff 54%, #ffffff 62%);
      background-size: 220% auto;
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      animation: glossSweep 6s linear infinite;
    }
    .live-dot { animation: livePulse 2.2s ease-out infinite; }
    .grid-drift { animation: gridDrift 14s linear infinite; }
    .marquee-track {
      display: inline-flex;
      white-space: nowrap;
      animation: marqueeScroll 30s linear infinite;
    }
    .step-anim { animation: fadeUp .35s ease both; }
    .ring-draw { stroke-dasharray: 260; animation: ringDraw 1s .2s cubic-bezier(.2,.7,.2,1) both; }
    /* CTA sheen */
    .cta-sheen { position: relative; overflow: hidden; }
    .cta-sheen::after {
      content: ""; position: absolute; inset: 0;
      background: linear-gradient(110deg, transparent 30%, rgba(0,0,0,0.08) 50%, transparent 70%);
      transform: translateX(-120%);
      transition: transform .7s ease;
    }
    .cta-sheen:hover::after { transform: translateX(120%); }
    @media (prefers-reduced-motion: reduce) {
      .anim-fadeup, .gloss-title, .live-dot, .grid-drift,
      .marquee-track, .step-anim, .ring-draw { animation: none !important; }
      .gloss-title { color: #fff; background: none; }
      .cta-sheen::after { display: none; }
    }
  `}</style>
);

// ═══════════════════════════════════════════════════════════
// WELCOME SCREEN
// ═══════════════════════════════════════════════════════════

const WelcomeScreen = ({ settings, packages, onBook, onTrack }) => {
  const marqueeItems = [
    ...(packages || []).map((p) => `${p.brand} ${p.name}`),
    "Live Job Tracking",
    "Stage-by-Stage Photos",
    "Online Booking",
    settings?.city ? `${settings.city}` : null,
  ].filter(Boolean);
  const ticker = marqueeItems.length ? [...marqueeItems, ...marqueeItems] : [];

  return (
    <div className="relative min-h-screen text-white overflow-hidden">
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 pb-20">
        {/* Eyebrow */}
        <div className="anim-fadeup d1 flex items-center gap-2.5 text-[10px] font-mono text-gray-400 tracking-[0.4em] uppercase mb-9 glass px-3.5 py-2">
          <span
            className="live-dot inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: ACCENT }}
          />
          STUDIO OPEN{settings?.city ? ` · ${settings.city}` : ""}
        </div>

        {/* Title with gloss sweep */}
        <h1 className="anim-fadeup d2 gloss-title display tracking-tight text-[clamp(3.2rem,11vw,8.5rem)] leading-[0.88] text-center mb-4">
          {(settings?.shop_name || "Detailr").toUpperCase()}
        </h1>

        <p className="anim-fadeup d3 text-gray-400 text-xs md:text-sm font-mono tracking-[0.32em] uppercase mb-16 text-center">
          {settings?.tagline || "Paint Protection Film"}
        </p>

        {/* Big CTA */}
        <button
          onClick={onBook}
          className="anim-fadeup d4 cta-sheen group relative bg-white text-black px-12 md:px-16 py-6 md:py-7 text-base md:text-lg font-bold tracking-[0.25em] uppercase hover:bg-gray-100 transition-all flex items-center gap-6 shadow-[0_0_60px_rgba(255,255,255,0.08)]"
        >
          <span>Book Now</span>
          <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          <span className="absolute -top-1 -left-1 w-3 h-3 border-t border-l border-white transition-colors group-hover:border-[#2e7dff]" />
          <span className="absolute -top-1 -right-1 w-3 h-3 border-t border-r border-white transition-colors group-hover:border-[#2e7dff]" />
          <span className="absolute -bottom-1 -left-1 w-3 h-3 border-b border-l border-white transition-colors group-hover:border-[#2e7dff]" />
          <span className="absolute -bottom-1 -right-1 w-3 h-3 border-b border-r border-white transition-colors group-hover:border-[#2e7dff]" />
        </button>

        {/* Secondary action */}
        <button
          onClick={onTrack}
          className="anim-fadeup d5 mt-10 text-gray-400 hover:text-white text-xs uppercase tracking-widest border-b border-transparent hover:border-white/40 pb-1 transition-colors flex items-center gap-2"
        >
          <Search size={12} /> Track an existing booking
        </button>
      </div>

      {/* Services marquee */}
      {ticker.length > 0 && (
        <div className="anim-fadeup d6 absolute bottom-0 inset-x-0 border-t border-white/10 py-3 overflow-hidden bg-black/55 backdrop-blur-sm">
          <div className="marquee-track">
            {ticker.map((item, i) => (
              <span
                key={i}
                className="text-[10px] font-mono text-gray-500 tracking-[0.3em] uppercase px-6 flex items-center gap-6"
              >
                {item}
                <span style={{ color: ACCENT }}>✦</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// BOOKING CONFIRMATION (replaces the old alert())
// ═══════════════════════════════════════════════════════════

const ConfirmationScreen = ({ data, settings, onTrack, onHome }) => {
  const { booking, packageLabel } = data;
  const fmt = (n) => formatMoney(n, settings?.currency);

  return (
    <div className="relative z-10 min-h-screen flex items-center justify-center px-5 py-16">
      <div className="anim-fadeup w-full max-w-lg glass p-8 md:p-10 relative">
        <span className="absolute -top-1 -left-1 w-3 h-3 border-t border-l border-white/60" />
        <span className="absolute -top-1 -right-1 w-3 h-3 border-t border-r border-white/60" />
        <span className="absolute -bottom-1 -left-1 w-3 h-3 border-b border-l border-white/60" />
        <span className="absolute -bottom-1 -right-1 w-3 h-3 border-b border-r border-white/60" />

        {/* Animated check */}
        <div className="flex justify-center mb-6">
          <svg width="74" height="74" viewBox="0 0 74 74" fill="none" aria-hidden="true">
            <circle cx="37" cy="37" r="34" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
            <circle cx="37" cy="37" r="34" stroke={ACCENT} strokeWidth="1.5" className="ring-draw"
              strokeLinecap="round" transform="rotate(-90 37 37)" />
            <path d="M24 38.5 L33 47 L51 28" stroke="#fff" strokeWidth="3"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="text-center mb-8">
          <div className="text-[10px] font-mono text-gray-500 tracking-[0.35em] uppercase mb-2">
            Booking Confirmed
          </div>
          <h2 className="display text-3xl text-white">YOU'RE IN.</h2>
          <p className="text-gray-400 text-sm mt-2">
            We'll have the bay ready, {booking.customer_name?.split(" ")[0] || "driver"}.
          </p>
        </div>

        {/* Summary */}
        <div className="border border-white/10 divide-y divide-white/8 text-sm mb-8">
          {[
            ["Reference",  <span className="font-mono text-white tracking-widest">{booking.vehicle_reg}</span>],
            ["Vehicle",    <span className="text-white">{booking.vehicle_make} {booking.vehicle_model}</span>],
            ["Package",    <span className="text-white">{packageLabel}</span>],
            ["Date",       <span className="font-mono text-white">{booking.booking_date}</span>],
            ["Total",      <span className="text-white text-base">{fmt(booking.total_price)}</span>],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between items-center px-4 py-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500">{k}</span>
              {v}
            </div>
          ))}
        </div>

        <p className="text-[11px] text-gray-500 mb-6 leading-relaxed text-center">
          Track your car any time with your plate number — including photos of
          each stage as our team works on it.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            onClick={onTrack}
            className="px-5 py-3.5 bg-white text-black text-xs font-bold uppercase tracking-[0.2em] hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
          >
            <MapPin size={14} /> Track My Car
          </button>
          <button
            onClick={() => window.print()}
            className="px-5 py-3.5 border border-white/20 text-white text-xs uppercase tracking-[0.2em] hover:border-white transition-colors flex items-center justify-center gap-2"
          >
            <Printer size={14} /> Save Receipt
          </button>
        </div>
        <button
          onClick={onHome}
          className="w-full mt-3 py-2 text-gray-500 hover:text-white text-[11px] uppercase tracking-widest transition-colors"
        >
          Back to home
        </button>
      </div>

      {/* Print-only receipt */}
      <div id="print-receipt">
        <div style={{ borderBottom: "2px solid #000", paddingBottom: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1 }}>
            {(settings?.shop_name || "Detailr").toUpperCase()}
          </div>
          <div style={{ fontSize: 11, color: "#555" }}>
            {settings?.tagline}{settings?.city ? ` · ${settings.city}` : ""}
            {settings?.contact_phone ? ` · ${settings.contact_phone}` : ""}
          </div>
        </div>
        <div style={{ fontSize: 13, lineHeight: 2 }}>
          <strong>Booking receipt</strong><br />
          Reference: {booking.vehicle_reg}<br />
          Customer: {booking.customer_name} · {booking.customer_phone}<br />
          Vehicle: {booking.vehicle_make} {booking.vehicle_model} ({booking.vehicle_year})<br />
          Package: {packageLabel}<br />
          Appointment: {booking.booking_date}<br />
          <span style={{ fontSize: 16 }}>Total: {fmt(booking.total_price)}</span>
        </div>
        <div style={{ marginTop: 18, fontSize: 10, color: "#777" }}>
          Track your vehicle online using your registration number.
          Issued {new Date().toLocaleDateString()}.
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════════════

const Sidebar = ({ open, onClose, view, onNavigate, shopName }) => {
  const items = [
    ["home",  "Home",         <Home size={16} />],
    ["book",  "Book Now",     <Calendar size={16} />],
    ["track", "Track My Car", <Search size={16} />],
    ["admin", "Studio Admin", <Shield size={16} />],
  ];

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-80 max-w-[85vw] bg-[#0a0a0c]/95 backdrop-blur-xl border-r border-white/10 transform transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="display tracking-tight text-white text-sm">
            {(shopName || "DETAILR").toUpperCase()}
            <span className="text-gray-600 font-normal text-xs tracking-normal ml-1.5" style={{ fontVariationSettings: '"wdth" 100', fontWeight: 400 }}>Menu</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <nav className="p-3" key={String(open)}>
          {items.map(([key, label, icon], i) => (
            <button
              key={key}
              style={open ? { animationDelay: `${80 + i * 55}ms` } : undefined}
              onClick={() => { onNavigate(key); onClose(); }}
              className={`${open ? "anim-fadeup" : ""} w-full text-left px-4 py-3.5 text-sm uppercase tracking-wider flex items-center gap-3 border-l-2 transition-all ${
                view === key
                  ? "border-[#2e7dff] text-white bg-white/5"
                  : "border-transparent text-gray-500 hover:text-white hover:border-white/30 hover:bg-white/[0.03]"
              }`}
            >
              <span className="opacity-70">{icon}</span>
              {label}
              {key === "admin" && <Lock size={11} className="ml-auto opacity-50" />}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-white/10 text-[10px] font-mono text-gray-700 tracking-widest">
          DETAILR · v1.1
        </div>
      </aside>
    </>
  );
};

// ═══════════════════════════════════════════════════════════
// ADMIN LOGIN (Supabase Auth)
// ═══════════════════════════════════════════════════════════

const AdminLogin = ({ onCancel }) => {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email || !pw) return;
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
    setBusy(false);
    if (error) setError(error.message || "Sign-in failed");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center px-6">
      <div className="anim-fadeup w-full max-w-md glass p-8 relative">
        <span className="absolute -top-1 -left-1 w-3 h-3 border-t border-l border-white" />
        <span className="absolute -top-1 -right-1 w-3 h-3 border-t border-r border-white" />
        <span className="absolute -bottom-1 -left-1 w-3 h-3 border-b border-l border-white" />
        <span className="absolute -bottom-1 -right-1 w-3 h-3 border-b border-r border-white" />

        <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500 tracking-widest mb-2">
          <Lock size={11} /> STAFF LOGIN
        </div>
        <h2 className="text-2xl text-white font-light mb-1">Studio Admin</h2>
        <p className="text-gray-500 text-sm mb-8">Sign in with your staff account</p>

        <label className="text-[10px] uppercase text-gray-500 tracking-wider font-mono">Email</label>
        <input
          type="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="you@studio.com"
          className="w-full bg-transparent border-b border-white/20 focus:border-white text-white py-3 text-base focus:outline-none transition-colors mb-5"
        />

        <label className="text-[10px] uppercase text-gray-500 tracking-wider font-mono">Password</label>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="••••••••"
          className={`w-full bg-transparent border-b text-white py-3 text-base focus:outline-none transition-colors font-mono tracking-widest ${
            error ? "border-red-500" : "border-white/20 focus:border-white"
          }`}
        />
        {error && (
          <p className="text-red-500 text-xs mt-2 font-mono uppercase tracking-wider">✕ {error}</p>
        )}

        <div className="flex gap-2 mt-8">
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-3 text-sm uppercase tracking-wider border border-white/20 text-white hover:border-white transition-all"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="flex-1 px-6 py-3 text-sm uppercase tracking-wider bg-white text-black hover:bg-gray-200 transition-all font-bold disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════

export default function App() {
  const shop = useShopData();

  const [view, setView] = useState("home"); // home | book | track | admin | done
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [adminPrompt, setAdminPrompt] = useState(false);
  const [confirmation, setConfirmation] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (sess) {
        setAdminPrompt(false);
        setView("admin");
      } else {
        setView((v) => (v === "admin" ? "home" : v));
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const navigate = (key) => {
    if (key === "admin") {
      if (session) setView("admin");
      else setAdminPrompt(true);
      return;
    }
    setView(key);
  };

  const lockAdmin = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setView("home");
    toast("Admin locked");
  };

  // Booking submit — write to bookings table, then show confirmation
  const submitBooking = async (form) => {
    const pkg = shop.packages.find((p) => p.id === form.packageId);
    const mult = shop.settings?.size_multipliers?.[form.vehicle.size] || 1;
    const addonsTotal = form.addons.reduce(
      (acc, id) => acc + (shop.addons.find((a) => a.id === id)?.price || 0),
      0
    );
    const total = Math.round((pkg?.base_price || 0) * mult + addonsTotal);

    const firstStage =
      shop.stages.find((s) => !s.is_final)?.name || shop.stages[0]?.name || "Decontamination";

    const { data, error } = await supabase.from("bookings").insert({
      customer_name:  form.customer.name,
      customer_phone: form.customer.phone,
      vehicle_make:   form.vehicle.make,
      vehicle_model:  form.vehicle.model,
      vehicle_year:   form.vehicle.year,
      vehicle_reg:    form.vehicle.reg,
      vehicle_size:   form.vehicle.size,
      package_id:     form.packageId,
      panels:         form.panels,
      addons:         form.addons,
      booking_date:   form.date,
      status:         firstStage,
      credits:        pkg?.credits || { wash: 0, towel: 0, shampoo: 0 },
      total_price:    total,
    }).select().single();

    if (error) {
      toast("Booking failed: " + error.message, "err");
      return false;
    }

    setConfirmation({
      booking: data,
      packageLabel: pkg ? `${pkg.brand} ${pkg.name}` : "—",
    });
    setView("done");
    return true;
  };

  // Loading state
  if (shop.loading) {
    return (
      <div className="min-h-screen bg-[#060607] text-white flex items-center justify-center">
        <StyleBlock />
        <Backdrop />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2.5 text-[10px] font-mono text-gray-400 tracking-[0.35em] uppercase">
            <span className="live-dot inline-block w-1.5 h-1.5 rounded-full" style={{ background: "#2e7dff" }} />
            Connecting to studio
          </div>
          <div className="w-40 h-px bg-white/10 overflow-hidden">
            <div className="h-full w-1/3 bg-white/60 grid-drift" style={{ animation: "marqueeScroll 1.2s linear infinite" }} />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (shop.error) {
    return (
      <div className="min-h-screen bg-[#060607] text-white flex items-center justify-center px-6">
        <div className="max-w-lg border border-red-900/50 bg-red-950/20 p-6">
          <div className="text-[10px] font-mono text-red-500 tracking-widest uppercase mb-2">
            ✕ DATABASE ERROR
          </div>
          <p className="text-white text-sm mb-2">Couldn't load studio data.</p>
          <p className="text-gray-500 text-xs font-mono break-all">{String(shop.error.message || shop.error)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060607] text-gray-100">
      <StyleBlock />
      <Backdrop />
      <Toaster />

      {/* Floating hamburger */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-5 left-5 z-30 p-2.5 glass hover:border-white/40 text-white transition-colors print:hidden"
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      {/* Home indicator */}
      {view !== "home" && (
        <button
          onClick={() => setView("home")}
          className="fixed top-5 right-5 z-30 px-3 py-2 glass hover:border-white/40 text-white text-[10px] font-mono uppercase tracking-widest transition-colors print:hidden"
        >
          {(shop.settings?.shop_name || "Detailr").toUpperCase()}
        </button>
      )}

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        view={view}
        onNavigate={navigate}
        shopName={shop.settings?.shop_name}
      />

      {adminPrompt && !session && (
        <AdminLogin onCancel={() => setAdminPrompt(false)} />
      )}

      {/* Views */}
      {view === "home" && (
        <WelcomeScreen
          settings={shop.settings}
          packages={shop.packages}
          onBook={() => setView("book")}
          onTrack={() => setView("track")}
        />
      )}
      {view === "book" && (
        <div className="relative z-10">
          <BookingFlow shop={shop} onSubmit={submitBooking} />
        </div>
      )}
      {view === "track" && (
        <div className="relative z-10">
          <TrackingView
            bookings={shop.bookings}
            packages={shop.packages}
            stages={shop.stages}
          />
        </div>
      )}
      {view === "done" && confirmation && (
        <ConfirmationScreen
          data={confirmation}
          settings={shop.settings}
          onTrack={() => setView("track")}
          onHome={() => setView("home")}
        />
      )}
      {view === "admin" && session && (
        <div className="relative z-10">
          <AdminPanel shop={shop} onLock={lockAdmin} />
        </div>
      )}
    </div>
  );
}
