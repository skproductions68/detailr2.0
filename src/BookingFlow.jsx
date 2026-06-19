// BookingFlow.jsx
// 4-step booking wizard. Ported from the legacy single-tenant version
// but reads its config (vehicles / packages / addons / panels / multipliers)
// from props (i.e. the DB) instead of hardcoded constants.

import { useState, useMemo, useRef, useEffect, lazy, Suspense } from "react";
import {
  Car, CheckCircle, Droplets, Wind, Sparkles, Search, ChevronDown,
  AlertTriangle, Info, Phone, User,
} from "lucide-react";
import { formatMoney } from "./currency";
const Car3D = lazy(() => import("./Car3D"));

// ── Utilities ──────────────────────────────────────────────
const formatPct = (v) => `+${((v - 1) * 100).toFixed(0)}%`;

// Group flat vehicles array into { Make: [{model,size,body_type},...] }
const groupVehicles = (vehicles) =>
  vehicles.reduce((acc, v) => {
    (acc[v.make] = acc[v.make] || []).push({ model: v.model, size: v.size, body_type: v.body_type || "sedan" });
    return acc;
  }, {});

// ── Shared UI bits ─────────────────────────────────────────
const Card = ({ children, className = "", onClick, selected }) => (
  <div
    onClick={onClick}
    className={`p-6 rounded-none border transition-all duration-300 ${
      selected
        ? "bg-white text-black border-white shadow-[0_0_28px_rgba(255,255,255,0.14)]"
        : "glass text-gray-300 hover:border-white/30 hover:bg-white/5 hover:-translate-y-0.5"
    } ${className}`}
  >
    {children}
  </div>
);

const Btn = ({ children, primary, onClick, className = "", disabled, danger }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-6 py-3 font-medium text-sm tracking-wider uppercase transition-all ${
      danger
        ? "bg-red-900/20 border border-red-800 text-red-500 cursor-not-allowed"
        : primary
        ? "bg-white text-black hover:bg-gray-200 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
        : "bg-transparent border border-white/20 text-white hover:border-white disabled:opacity-40 disabled:cursor-not-allowed"
    } ${className}`}
  >
    {children}
  </button>
);

const RatingBar = ({ value, max = 3, inverted = false }) => (
  <div className="flex gap-1">
    {Array.from({ length: max }).map((_, i) => (
      <div
        key={i}
        className={`h-1 flex-1 rounded-full ${
          i < value
            ? inverted ? "bg-black/60" : "bg-white"
            : inverted ? "bg-black/10" : "bg-white/10"
        }`}
      />
    ))}
  </div>
);

const SearchableDropdown = ({ options, value, onChange, placeholder, disabled }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = options.filter((o) => o.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="relative" ref={ref}>
      <div
        onClick={() => !disabled && setOpen(!open)}
        className={`w-full bg-black border-b ${
          disabled ? "border-white/5 text-gray-600 cursor-not-allowed" : "border-white/20 text-white cursor-pointer hover:border-white"
        } py-3 flex justify-between items-center text-lg transition-colors`}
      >
        <span className={value ? "text-white" : "text-gray-500"}>{value || placeholder}</span>
        <ChevronDown size={16} className={`transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`} />
      </div>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-neutral-900 border border-white/20 shadow-2xl max-h-60 overflow-y-auto">
          <div className="p-2 sticky top-0 bg-neutral-900 border-b border-white/10">
            <div className="flex items-center gap-2 px-2 py-1 bg-black border border-white/10">
              <Search size={14} className="text-gray-500 flex-shrink-0" />
              <input
                autoFocus
                className="w-full bg-transparent text-white text-sm focus:outline-none placeholder-gray-600"
                placeholder="Search..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>
          {filtered.length > 0 ? (
            filtered.map((o) => (
              <div
                key={o}
                onClick={() => { onChange(o); setQ(""); setOpen(false); }}
                className="px-4 py-3 text-sm text-gray-300 hover:bg-white hover:text-black cursor-pointer transition-colors"
              >
                {o}
              </div>
            ))
          ) : (
            <div className="px-4 py-3 text-xs text-gray-500">No results found</div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Car blueprint with DB-driven panels ────────────────────
const CarBlueprintViewer = ({ panels, selectedPanels, onToggle }) => (
  <div className="bg-black p-4 border border-white/5 relative">
    <div className="absolute top-3 left-3 z-10 pointer-events-none">
      <span className="text-[10px] text-gray-600 font-mono border border-white/8 px-2 py-0.5">
        TOP-DOWN SCHEMATIC
      </span>
    </div>
    <svg width="0" height="0">
      <defs>
        <radialGradient id="selGrad" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="#ccc" stopOpacity="0.9" />
        </radialGradient>
      </defs>
    </svg>
    <svg viewBox="60 40 790 460" className="w-full h-auto">
      {/* Decorative chassis lines */}
      <rect x="370" y="48" width="160" height="20" fill="#0d0d0d" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
      <rect x="372" y="472" width="156" height="18" fill="#0d0d0d" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
      <line x1="310" y1="68" x2="310" y2="478" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
      <line x1="590" y1="68" x2="590" y2="478" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
      {panels.map((panel) => {
        const sel = selectedPanels.includes(panel.id);
        return (
          <path
            key={panel.id}
            d={panel.svg_path}
            onClick={() => onToggle(panel.id)}
            style={{
              fill: sel ? "url(#selGrad)" : "#111",
              stroke: sel ? "white" : "rgba(255,255,255,0.13)",
              strokeWidth: sel ? 1 : 0.5,
              cursor: "pointer",
              transition: "fill 0.25s ease",
            }}
          />
        );
      })}
    </svg>
    <p className="text-[10px] text-gray-700 text-center mt-1 uppercase tracking-widest">
      {selectedPanels.length} zone{selectedPanels.length !== 1 ? "s" : ""} selected
    </p>
  </div>
);

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function BookingFlow({ shop, onSubmit }) {
  const { packages, addons, vehicles, panels, bookings, settings } = shop;
  const sizeMultipliers = useMemo(
    () => settings?.size_multipliers || { Sedan: 1 },
    [settings]
  );
  const bayLimit = settings?.bay_limit || 6;
  const fmt = (n) => formatMoney(n, settings?.currency);

  const vehicleDB = useMemo(() => groupVehicles(vehicles), [vehicles]);

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [carView, setCarView] = useState("3d"); // "3d" | "2d"
  const [form, setForm] = useState({
    customer: { name: "", phone: "" },
    vehicle: { make: "", model: "", year: "", reg: "", size: "Sedan", body_type: "sedan" },
    packageId: null,
    panels: [],
    addons: [],
    date: "",
  });

  const setVehicleField = (field, value) => {
    const nv = { ...form.vehicle, [field]: value };
    if (field === "make")  { nv.model = ""; nv.size = "Sedan"; nv.body_type = "sedan"; }
    if (field === "model") {
      const v = vehicleDB[nv.make]?.find((x) => x.model === value);
      if (v) { nv.size = v.size; nv.body_type = v.body_type || "sedan"; }
    }
    setForm({ ...form, vehicle: nv });
  };

  const togglePanel = (p) =>
    setForm((f) => ({
      ...f,
      panels: f.panels.includes(p) ? f.panels.filter((x) => x !== p) : [...f.panels, p],
    }));

  const allPanelsSelected = panels.length > 0 && form.panels.length >= panels.length;
  const toggleAllPanels = () =>
    setForm((f) => ({
      ...f,
      panels: allPanelsSelected ? [] : panels.map((p) => p.id),
    }));

  const toggleAddon = (id) =>
    setForm((f) => ({
      ...f,
      addons: f.addons.includes(id) ? f.addons.filter((x) => x !== id) : [...f.addons, id],
    }));

  const pkg = packages.find((p) => p.id === form.packageId);

  const pricing = useMemo(() => {
    if (!pkg) return { base: 0, multiplier: 1, adjustment: 0, addons: 0, total: 0 };
    const base = pkg.base_price;
    const mult = sizeMultipliers[form.vehicle.size] || 1;
    const adj = base * mult - base;
    const add = form.addons.reduce(
      (acc, id) => acc + (addons.find((a) => a.id === id)?.price || 0),
      0
    );
    return { base, multiplier: mult, adjustment: adj, addons: add, total: base * mult + add };
  }, [pkg, form.vehicle.size, form.addons, addons, sizeMultipliers]);

  const isFull = useMemo(() => {
    if (!form.date) return false;
    return bookings.filter((b) => b.booking_date === form.date).length >= bayLimit;
  }, [bookings, form.date, bayLimit]);

  const canGo2 = form.vehicle.make && form.vehicle.model && form.vehicle.reg;
  const canSubmit = form.date && form.packageId && !isFull && form.customer.name && form.customer.phone;

  // Each step should start at its heading, not wherever the Next button was.
  useEffect(() => { window.scrollTo(0, 0); }, [step]);

  return (
    <div className="max-w-4xl mx-auto pt-20 px-6 pb-24">
      {/* Header */}
      <div className="flex justify-between items-end mb-12">
        <div>
          <h1 className="display text-3xl text-white mb-1">BOOK A STUDIO SESSION</h1>
          <p className="text-gray-500 text-[11px] tracking-widest uppercase">
            {settings?.tagline || "Paint Protection Film"}
          </p>
        </div>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={`h-0.5 w-10 transition-all ${s === step ? "bg-[#2e7dff]" : s < step ? "bg-white" : "bg-white/10"}`} />
          ))}
        </div>
      </div>

      {/* Animated step container — remounts (and fades) on step change */}
      <div key={step} className="step-anim">

      {/* STEP 1: Vehicle */}
      {step === 1 && (
        <div>
          <h2 className="text-lg text-white mb-6 font-light">Vehicle Identity</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="space-y-2">
              <label className="text-[11px] uppercase text-gray-500 tracking-wider">Manufacturer</label>
              <SearchableDropdown
                placeholder="Select Make"
                options={Object.keys(vehicleDB)}
                value={form.vehicle.make}
                onChange={(v) => setVehicleField("make", v)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] uppercase text-gray-500 tracking-wider">Model</label>
              <SearchableDropdown
                placeholder="Select Model"
                disabled={!form.vehicle.make}
                options={form.vehicle.make ? vehicleDB[form.vehicle.make].map((v) => v.model) : []}
                value={form.vehicle.model}
                onChange={(v) => setVehicleField("model", v)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] uppercase text-gray-500 tracking-wider">Year</label>
              <input
                value={form.vehicle.year}
                onChange={(e) => setVehicleField("year", e.target.value)}
                type="number"
                placeholder="YYYY"
                className="w-full bg-transparent border-b border-white/20 text-white py-3 focus:outline-none focus:border-white transition-colors text-lg"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] uppercase text-gray-500 tracking-wider">Registration Number</label>
              <input
                value={form.vehicle.reg}
                onChange={(e) => setVehicleField("reg", e.target.value.toUpperCase())}
                placeholder="ABC-123"
                className="w-full bg-transparent border-b border-white/20 text-white py-3 focus:outline-none focus:border-white transition-colors text-lg uppercase font-mono"
              />
            </div>
          </div>

          {form.vehicle.model && (
            <div className="p-4 bg-white/5 border border-white/8 flex items-center justify-between mb-8">
              <div className="text-sm text-gray-400 flex items-center gap-2">
                <Car size={14} /> Detected size class
              </div>
              <span className="text-white font-mono text-sm">
                {form.vehicle.size} · {sizeMultipliers[form.vehicle.size] || 1}× rate
              </span>
            </div>
          )}

          <div className="flex justify-end">
            <Btn primary disabled={!canGo2} onClick={() => setStep(2)}>Next →</Btn>
          </div>
        </div>
      )}

      {/* STEP 2: Package */}
      {step === 2 && (
        <div>
          <h2 className="text-lg text-white mb-6 font-light">Protection Package</h2>

          {packages.length === 0 ? (
            <div className="border border-white/10 p-12 text-center text-gray-500 mb-8">
              No packages configured yet. Ask the studio admin to add packages in Studio Admin → Packages.
            </div>
          ) : (
            <>
              {/* Spec table */}
              <div className="overflow-x-auto mb-8 glass">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="p-4 text-[11px] text-gray-500 uppercase tracking-wider font-normal">Specification</th>
                      {packages.map((p) => (
                        <th key={p.id} className="p-4">
                          <div className="text-[10px] text-gray-600 mb-0.5">{p.brand}</div>
                          <div className="text-white text-xs uppercase tracking-wider">{p.name}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-400">
                    {[
                      ["Film Type",     (p) => <span className="text-white">{p.material}</span>],
                      ["Thickness",     (p) => <span className="text-white">{p.microns}µm</span>],
                      ["Durability",    (p) => <span className="text-white">{p.durability}</span>],
                      ["Warranty",      (p) => <span className="text-white">{p.warranty}</span>],
                      ["Self-Healing",  (p) => <RatingBar value={p.ratings?.selfHealing || 0} />],
                      ["Chemical Res.", (p) => <RatingBar value={p.ratings?.chemResistance || 0} />],
                      ["Scratch Res.",  (p) => <RatingBar value={p.ratings?.scratchResistance || 0} />],
                      ["Hydrophobic",   (p) => <RatingBar value={p.ratings?.hydrophobic || 0} />],
                    ].map(([label, cell]) => (
                      <tr key={label}>
                        <td className="p-4 text-[11px] font-mono text-gray-600">{label}</td>
                        {packages.map((p) => <td key={p.id} className="p-4">{cell(p)}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                {packages.map((p) => {
                  const sel = form.packageId === p.id;
                  const mult = sizeMultipliers[form.vehicle.size] || 1;
                  return (
                    <Card
                      key={p.id}
                      selected={sel}
                      onClick={() => setForm({ ...form, packageId: p.id })}
                      className="cursor-pointer flex flex-col"
                    >
                      <div className={`text-[10px] font-bold tracking-widest mb-0.5 ${sel ? "text-black/40" : "text-gray-600"}`}>
                        {p.brand}
                      </div>
                      <h3 className="text-lg font-medium mb-1">{p.name}</h3>
                      <div className="text-2xl font-light mb-0.5">{fmt(p.base_price * mult)}</div>
                      <div className={`text-[11px] mb-4 ${sel ? "text-black/40" : "text-gray-600"}`}>
                        Est. for {form.vehicle.size}
                      </div>
                      <ul className="space-y-1.5 mb-4 flex-1">
                        {(p.features || []).map((f, i) => (
                          <li key={i} className={`text-xs flex items-start gap-2 ${sel ? "text-black/70" : "text-gray-400"}`}>
                            <CheckCircle size={11} className="mt-0.5 flex-shrink-0" />{f}
                          </li>
                        ))}
                      </ul>
                      <div className="space-y-2 mt-2">
                        <RatingBar value={p.ratings?.selfHealing || 0} inverted={sel} />
                        <div className={`text-[10px] ${sel ? "text-black/40" : "text-gray-600"}`}>
                          Self-healing intensity
                        </div>
                      </div>
                      {p.credits && (
                        <div className={`text-[10px] font-mono border-t pt-3 mt-3 ${sel ? "border-black/10 text-black/40" : "border-white/10 text-gray-600"}`}>
                          Wash ×{p.credits.wash || 0} · Towel ×{p.credits.towel || 0} · Shampoo ×{p.credits.shampoo || 0}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </>
          )}

          <div className="flex justify-between">
            <Btn onClick={() => setStep(1)}>← Back</Btn>
            <Btn primary disabled={!form.packageId} onClick={() => setStep(3)}>Next →</Btn>
          </div>
        </div>
      )}

      {/* STEP 3: Panels + Add-ons */}
      {step === 3 && (
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg text-white font-light">Panel Selection</h2>
                <div className="flex border border-white/15">
                  {["3d", "2d"].map((m) => (
                    <button
                      key={m}
                      onClick={() => setCarView(m)}
                      className={`px-3 py-1 text-[10px] uppercase tracking-widest font-mono transition-colors ${
                        carView === m ? "bg-white text-black" : "text-gray-500 hover:text-white"
                      }`}
                    >
                      {m === "3d" ? "3D" : "Top"}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-gray-500 mb-4 uppercase tracking-wider">
                {carView === "3d" ? "Drag to rotate · click a surface" : "Click zones on the diagram"} · or use buttons below
              </p>
              {carView === "3d" ? (
                <>
                  <Suspense fallback={<div className="bg-black border border-white/5 h-[300px] md:h-[420px] flex items-center justify-center text-[10px] font-mono text-gray-600 uppercase tracking-widest">Loading 3D model…</div>}>
                    <Car3D
                      bodyType={form.vehicle.body_type || "sedan"}
                      selectedPanels={form.panels}
                      onToggle={togglePanel}
                      availableIds={panels.map((p) => p.id)}
                    />
                  </Suspense>
                  <p className="text-[10px] text-gray-600 mt-2 italic">
                    Tip: drag the car to rotate. Click a surface to add or remove protection. Use the chips below if you prefer.
                  </p>
                </>
              ) : (
                <CarBlueprintViewer
                  panels={panels}
                  selectedPanels={form.panels}
                  onToggle={togglePanel}
                />
              )}
              <div className="mt-4 flex flex-wrap gap-1.5">
                <button
                  onClick={toggleAllPanels}
                  className={`text-[11px] px-2.5 py-1 font-mono border transition-all ${
                    allPanelsSelected
                      ? "bg-white/10 text-white border-white/40 hover:border-white"
                      : "bg-white text-black border-white hover:bg-gray-200"
                  }`}
                >
                  {allPanelsSelected ? "✕ Clear All" : "✓ Select All"}
                </button>
                {panels.map((panel) => (
                  <button
                    key={panel.id}
                    onClick={() => togglePanel(panel.id)}
                    className={`text-[11px] px-2.5 py-1 font-mono border transition-all ${
                      form.panels.includes(panel.id)
                        ? "bg-white text-black border-white"
                        : "border-white/10 text-gray-500 hover:border-white/25"
                    }`}
                  >
                    {panel.id}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-lg text-white mb-1 font-light">Added Services</h2>
              <p className="text-[11px] text-gray-500 mb-4 uppercase tracking-wider">Extras</p>
              <div className="space-y-2.5">
                {addons.length === 0 && (
                  <div className="text-gray-500 text-sm border border-white/10 p-6 text-center">
                    No add-ons available.
                  </div>
                )}
                {addons.map((addon) => (
                  <div
                    key={addon.id}
                    onClick={() => toggleAddon(addon.id)}
                    className={`p-4 border cursor-pointer flex justify-between items-center transition-all ${
                      form.addons.includes(addon.id)
                        ? "bg-white/8 border-white text-white"
                        : "border-white/8 text-gray-500 hover:border-white/25 hover:text-gray-400"
                    }`}
                  >
                    <span className="text-sm">{addon.name}</span>
                    <span className={`font-mono text-xs ml-4 flex-shrink-0 ${form.addons.includes(addon.id) ? "text-white" : "text-gray-600"}`}>
                      {fmt(addon.price)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10 flex justify-between">
            <Btn onClick={() => setStep(2)}>← Back</Btn>
            <Btn primary onClick={() => setStep(4)}>Review →</Btn>
          </div>
        </div>
      )}

      {/* STEP 4: Confirm */}
      {step === 4 && (
        <div>
          <h2 className="text-lg text-white mb-6 font-light">Confirm Reservation</h2>

          <div className="glass p-6 sm:p-8 mb-6">
            {/* Vehicle + date */}
            <div className="flex flex-col md:flex-row justify-between gap-6 pb-8 border-b border-white/8 mb-8">
              <div>
                <h3 className="text-2xl text-white font-light">{form.vehicle.make} {form.vehicle.model}</h3>
                <p className="text-gray-400 font-mono text-sm mt-1">{form.vehicle.year} · {form.vehicle.reg}</p>
                <div className="mt-2 inline-block px-2 py-0.5 bg-white/8 text-[11px] font-mono text-gray-400">
                  {form.vehicle.size} · {sizeMultipliers[form.vehicle.size] || 1}× Rate
                </div>
              </div>
              <div className="md:w-56">
                <label className="text-[11px] uppercase text-gray-500 tracking-wider block mb-2">Appointment Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className={`bg-black border p-3 w-full focus:outline-none text-sm transition-colors ${
                    isFull ? "border-red-500 text-red-500" : "border-white/20 text-white focus:border-white"
                  }`}
                />
                {isFull && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-red-500">
                    <AlertTriangle size={12} />
                    <p className="text-xs">Fully booked — choose another date.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Customer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8 border-b border-white/8 mb-8">
              <div className="space-y-2">
                <label className="text-[11px] uppercase text-gray-500 tracking-wider flex items-center gap-1.5">
                  <User size={11} /> Full Name
                </label>
                <input
                  value={form.customer.name}
                  onChange={(e) => setForm({ ...form, customer: { ...form.customer, name: e.target.value } })}
                  placeholder="Your name"
                  className="w-full bg-transparent border-b border-white/20 text-white py-3 focus:outline-none focus:border-white transition-colors placeholder-gray-700"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] uppercase text-gray-500 tracking-wider flex items-center gap-1.5">
                  <Phone size={11} /> Phone / WhatsApp
                </label>
                <input
                  value={form.customer.phone}
                  onChange={(e) => setForm({ ...form, customer: { ...form.customer, phone: e.target.value } })}
                  placeholder="03XX-XXXXXXX"
                  className="w-full bg-transparent border-b border-white/20 text-white py-3 focus:outline-none focus:border-white transition-colors font-mono placeholder-gray-700"
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-black/40 border border-white/8 p-5 mb-8">
              <h4 className="text-white text-[11px] uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Info size={12} /> Pricing Summary
              </h4>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Base — {pkg?.brand} {pkg?.name}</span>
                  <span>{fmt(pricing.base)}</span>
                </div>
                {pricing.adjustment > 0 && (
                  <div className="flex justify-between text-blue-400">
                    <span>Size adjustment ({form.vehicle.size} {formatPct(pricing.multiplier)})</span>
                    <span>+ {fmt(pricing.adjustment)}</span>
                  </div>
                )}
                {pricing.addons > 0 && (
                  <div className="flex justify-between text-gray-400">
                    <span>Add-ons ({form.addons.length} selected)</span>
                    <span>+ {fmt(pricing.addons)}</span>
                  </div>
                )}
                <div className="border-t border-white/10 pt-3 flex justify-between text-white text-xl font-light">
                  <span>Total</span>
                  <span>{fmt(pricing.total)}</span>
                </div>
              </div>
            </div>

            {/* Package + credits */}
            {pkg && (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <span className="text-[11px] text-gray-500 uppercase tracking-wider block mb-1">Package</span>
                  <span className="text-white text-sm">{pkg.brand} {pkg.name} · {pkg.durability}</span>
                </div>
                <div>
                  <span className="text-[11px] text-gray-500 uppercase tracking-wider block mb-1">Service Credits</span>
                  <div className="flex gap-4 text-gray-300 text-sm">
                    <div className="flex items-center gap-1.5"><Droplets size={12} /> {pkg.credits?.wash || 0} Wash</div>
                    <div className="flex items-center gap-1.5"><Wind size={12} /> {pkg.credits?.towel || 0} Towel</div>
                    <div className="flex items-center gap-1.5"><Sparkles size={12} /> {pkg.credits?.shampoo || 0} Shampoo</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <Btn onClick={() => setStep(3)}>← Back</Btn>
            <Btn
              primary
              danger={isFull}
              disabled={!canSubmit || submitting}
              onClick={async () => {
                if (!canSubmit || submitting) return;
                setSubmitting(true);
                await onSubmit(form);
                setSubmitting(false);
              }}
            >
              {isFull ? "Fully Booked" : submitting ? "Confirming…" : "Confirm Booking"}
            </Btn>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
