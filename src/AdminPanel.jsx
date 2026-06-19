// AdminPanel.jsx
// Studio admin: pipeline (kanban), credits, and editors for every
// admin-configurable table — vehicles, packages, addons, stages,
// panels, and shop settings.

import { useState, useMemo, useEffect, lazy, Suspense } from "react";
import {
  LogOut, Droplets, Wind, Sparkles, Trash2, Plus, Save, X, ArrowUp, ArrowDown,
  Car, Package, Tag, ListOrdered, Layers, SlidersHorizontal, LayoutGrid, Settings as Cog,
  CalendarDays, ChevronLeft, ChevronRight, Camera, ImagePlus, Loader2,
} from "lucide-react";
import { supabase } from "./supabase";
import { formatMoney, CURRENCIES } from "./currency";
import { toast, Lightbox } from "./fx";
const Car3D = lazy(() => import("./Car3D"));

// ── Small UI primitives ────────────────────────────────────
const Badge = ({ children, type = "neutral" }) => {
  const s = {
    neutral: "bg-white/10 text-gray-300",
    success: "bg-green-900/40 text-green-400 border border-green-800",
    process: "bg-blue-900/40 text-blue-400 border border-blue-800",
  };
  return <span className={`px-2 py-0.5 text-xs font-mono rounded-sm ${s[type]}`}>{children}</span>;
};

const Field = ({ label, children }) => (
  <div className="space-y-1.5">
    <label className="text-[10px] uppercase text-gray-500 tracking-wider font-mono">{label}</label>
    {children}
  </div>
);

const TextInput = (props) => (
  <input
    {...props}
    className={`w-full bg-black border border-white/15 text-white px-3 py-2 text-sm focus:outline-none focus:border-white transition-colors ${props.className || ""}`}
  />
);

const NumInput = (props) => <TextInput type="number" {...props} />;

const Btn = ({ children, primary, onClick, danger, className = "", disabled, icon: Icon }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 text-xs uppercase tracking-wider font-medium flex items-center gap-1.5 transition-all ${
      danger
        ? "border border-red-800 text-red-400 hover:bg-red-950/30"
        : primary
        ? "bg-white text-black hover:bg-gray-200 disabled:bg-gray-600 disabled:cursor-not-allowed"
        : "border border-white/20 text-white hover:border-white disabled:opacity-40"
    } ${className}`}
  >
    {Icon && <Icon size={13} />}
    {children}
  </button>
);

// ═══════════════════════════════════════════════════════════
// PIPELINE TAB (Kanban)
// ═══════════════════════════════════════════════════════════

const PipelineTab = ({ bookings, stages, packages, settings }) => {
  const [dropZone, setDropZone] = useState(null);

  const stageNames = stages.map((s) => s.name);

  const stats = useMemo(() => {
    const finalName = stages.find((s) => s.is_final)?.name;
    return {
      active: bookings.filter((b) => b.status !== finalName).length,
      ready:  bookings.filter((b) => b.status === finalName).length,
    };
  }, [bookings, stages]);

  const grouped = useMemo(() => {
    const g = {};
    stageNames.forEach((s) => (g[s] = []));
    bookings.forEach((b) => { if (g[b.status]) g[b.status].push(b); });
    return g;
  }, [bookings, stageNames]);

  const moveBooking = async (id, newStatus) => {
    const { error } = await supabase.from("bookings").update({ status: newStatus }).eq("id", id);
    if (error) toast("Failed to update: " + error.message, "err");
  };

  const deleteBooking = async (id) => {
    if (!confirm("Delete this booking? This cannot be undone.")) return;
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error) toast("Failed to delete: " + error.message, "err");
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          ["Active Bays",       `${stats.active} / ${settings.bay_limit}`, "text-white"],
          ["Ready for Pickup",  stats.ready,                                "text-green-400"],
          ["Total in System",   bookings.length,                            "text-white"],
        ].map(([label, val, cls]) => (
          <div key={label} className="bg-black border border-white/8 p-6">
            <div className="text-[11px] text-gray-500 uppercase mb-1 tracking-wider">{label}</div>
            <div className={`text-3xl font-light ${cls}`}>{val}</div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {stages.map((stage) => (
            <div
              key={stage.id}
              className={`w-72 flex-shrink-0 p-2 transition-colors ${
                dropZone === stage.name ? "border border-dashed border-white/30 bg-white/3" : "border border-transparent"
              }`}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("bookingId");
                if (id) moveBooking(Number(id), stage.name);
                setDropZone(null);
              }}
              onDragEnter={() => setDropZone(stage.name)}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDropZone(null); }}
            >
              <div className="text-[11px] font-bold text-gray-500 uppercase mb-4 pl-1 border-l-2 border-white/20 select-none">
                {stage.name} <span className="text-gray-700">({grouped[stage.name]?.length || 0})</span>
              </div>
              <div className="space-y-3">
                {grouped[stage.name]?.map((b) => {
                  const pkg = packages.find((p) => p.id === b.package_id);
                  return (
                    <div
                      key={b.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("bookingId", b.id.toString())}
                      className="bg-black border border-white/5 p-4 hover:border-white/25 transition-all cursor-grab active:cursor-grabbing group"
                    >
                      <div className="flex justify-between items-start mb-1.5">
                        <span className="text-white font-medium text-sm font-mono">{b.vehicle_reg}</span>
                        <button
                          onClick={() => deleteBooking(b.id)}
                          className="text-gray-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete booking"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <div className="text-xs text-gray-400 mb-1">{b.vehicle_make} {b.vehicle_model}</div>
                      {b.customer_name && <div className="text-[10px] text-gray-600 mb-2">{b.customer_name}</div>}
                      <div className="text-[10px] text-gray-700 font-mono mb-2">{b.booking_date}</div>
                      {pkg && <Badge type="neutral">{pkg.name}</Badge>}
                    </div>
                  );
                })}
                {(!grouped[stage.name] || grouped[stage.name].length === 0) && (
                  <div className="h-20 border border-dashed border-white/5 flex items-center justify-center text-gray-800 text-xs select-none">
                    Empty
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

// ═══════════════════════════════════════════════════════════
// CREDITS TAB
// ═══════════════════════════════════════════════════════════

const CreditsTab = ({ bookings, packages }) => {
  const updateCredit = async (id, currentCredits, type, delta) => {
    const newVal = Math.max(0, (currentCredits[type] || 0) + delta);
    const newCredits = { ...currentCredits, [type]: newVal };
    const { error } = await supabase.from("bookings").update({ credits: newCredits }).eq("id", id);
    if (error) toast("Failed: " + error.message, "err");
  };

  if (bookings.length === 0) {
    return <div className="text-center py-20 text-gray-700 text-sm">No active clients.</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {bookings.map((b) => {
        const pkg = packages.find((p) => p.id === b.package_id);
        const credits = b.credits || { wash: 0, towel: 0, shampoo: 0 };
        return (
          <div key={b.id} className="bg-black border border-white/8 p-6">
            <div className="flex justify-between items-start mb-4 border-b border-white/8 pb-4">
              <div>
                <h4 className="text-white font-mono">{b.vehicle_reg}</h4>
                <p className="text-gray-500 text-sm">{b.vehicle_make} {b.vehicle_model}</p>
                {b.customer_name && <p className="text-gray-600 text-xs mt-0.5">{b.customer_name}</p>}
              </div>
              {pkg && <Badge type="process">{pkg.name}</Badge>}
            </div>
            <div className="space-y-4">
              {[
                ["wash",    <Droplets size={15} />, "Maintenance Wash"],
                ["towel",   <Wind size={15} />,     "Towel Service"],
                ["shampoo", <Sparkles size={15} />, "Shampoo Extract"],
              ].map(([type, icon, label]) => (
                <div key={type} className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-gray-400 text-sm">{icon} {label}</div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-white text-lg">{credits[type] || 0}</span>
                    <button
                      onClick={() => updateCredit(b.id, credits, type, -1)}
                      disabled={(credits[type] || 0) <= 0}
                      className="w-6 h-6 flex items-center justify-center border border-white/20 text-white hover:bg-white hover:text-black disabled:opacity-20 transition-colors text-sm"
                    >−</button>
                    <button
                      onClick={() => updateCredit(b.id, credits, type, 1)}
                      className="w-6 h-6 flex items-center justify-center border border-white/20 text-white hover:bg-white hover:text-black transition-colors text-sm"
                    >+</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// VEHICLES EDITOR
// ═══════════════════════════════════════════════════════════

const BODY_TYPES = ["sedan", "suv", "coupe", "hatchback", "pickup", "van"];

const VehiclesTab = ({ vehicles, settings }) => {
  const [draft, setDraft] = useState({ make: "", model: "", size: "Sedan", body_type: "sedan" });
  const sizeOptions = Object.keys(settings.size_multipliers || { Sedan: 1 });

  const add = async () => {
    if (!draft.make || !draft.model) return;
    const { error } = await supabase.from("vehicles").insert(draft);
    if (error) toast(error.message, "err"); else setDraft({ make: "", model: "", size: "Sedan", body_type: "sedan" });
  };

  const update = async (id, patch) => {
    const { error } = await supabase.from("vehicles").update(patch).eq("id", id);
    if (error) toast(error.message, "err");
  };

  const remove = async (id) => {
    if (!confirm("Remove this vehicle from the catalogue?")) return;
    const { error } = await supabase.from("vehicles").delete().eq("id", id);
    if (error) toast(error.message, "err");
  };

  const selectCls = "w-full bg-black border border-white/15 text-white px-3 py-2 text-sm focus:outline-none focus:border-white capitalize";

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">
        <span className="text-gray-400">Size</span> sets the price multiplier. <span className="text-gray-400">Body type</span> picks which 3D model the customer sees.
      </p>

      {/* Add row */}
      <div className="bg-black border border-white/10 p-4 mb-6 grid grid-cols-1 md:grid-cols-[1fr,1fr,1fr,1fr,auto] gap-3 items-end">
        <Field label="Make">
          <TextInput value={draft.make} onChange={(e) => setDraft({ ...draft, make: e.target.value })} placeholder="Toyota" />
        </Field>
        <Field label="Model">
          <TextInput value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })} placeholder="Corolla" />
        </Field>
        <Field label="Size (price)">
          <select value={draft.size} onChange={(e) => setDraft({ ...draft, size: e.target.value })} className={selectCls}>
            {sizeOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Body (3D)">
          <select value={draft.body_type} onChange={(e) => setDraft({ ...draft, body_type: e.target.value })} className={selectCls}>
            {BODY_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </Field>
        <Btn primary onClick={add} icon={Plus}>Add</Btn>
      </div>

      {/* Table */}
      <div className="border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5">
            <tr className="text-[10px] uppercase tracking-widest text-gray-500">
              <th className="p-3 text-left font-normal">Make</th>
              <th className="p-3 text-left font-normal">Model</th>
              <th className="p-3 text-left font-normal">Size</th>
              <th className="p-3 text-left font-normal">Body Type</th>
              <th className="p-3 text-right font-normal w-24"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {vehicles.map((v) => (
              <tr key={v.id} className="hover:bg-white/[0.02]">
                <td className="p-3">
                  <TextInput defaultValue={v.make} onBlur={(e) => e.target.value !== v.make && update(v.id, { make: e.target.value })} />
                </td>
                <td className="p-3">
                  <TextInput defaultValue={v.model} onBlur={(e) => e.target.value !== v.model && update(v.id, { model: e.target.value })} />
                </td>
                <td className="p-3">
                  <select defaultValue={v.size} onChange={(e) => update(v.id, { size: e.target.value })} className={selectCls}>
                    {sizeOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="p-3">
                  <select defaultValue={v.body_type || "sedan"} onChange={(e) => update(v.id, { body_type: e.target.value })} className={selectCls}>
                    {BODY_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => remove(v.id)} className="text-gray-600 hover:text-red-500 transition-colors p-1">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {vehicles.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-gray-600 text-sm">No vehicles yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// PACKAGES EDITOR
// ═══════════════════════════════════════════════════════════

const PackageRow = ({ p, currency, onSave, onDelete }) => {
  const [edit, setEdit] = useState(p);
  const [open, setOpen]  = useState(false);

  const set = (k, v) => setEdit({ ...edit, [k]: v });
  const setRating = (k, v) => setEdit({ ...edit, ratings: { ...edit.ratings, [k]: Number(v) } });
  const setCredit = (k, v) => setEdit({ ...edit, credits: { ...edit.credits, [k]: Number(v) } });

  return (
    <div className="border border-white/10 mb-3">
      <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02]" onClick={() => setOpen(!open)}>
        <div>
          <div className="text-[10px] font-mono text-gray-600">{p.brand} · ID: {p.id}</div>
          <div className="text-white font-medium">{p.name}</div>
          <div className="text-xs text-gray-500">{formatMoney(p.base_price, currency)} · {p.microns}µm · {p.durability}</div>
        </div>
        <div className="text-xs text-gray-500 uppercase tracking-wider">{open ? "Collapse" : "Edit"}</div>
      </div>

      {open && (
        <div className="p-5 border-t border-white/10 bg-white/[0.015]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
            <Field label="ID (no spaces)"><TextInput value={edit.id} onChange={(e) => set("id", e.target.value)} /></Field>
            <Field label="Brand"><TextInput value={edit.brand} onChange={(e) => set("brand", e.target.value)} /></Field>
            <Field label="Name"><TextInput value={edit.name} onChange={(e) => set("name", e.target.value)} /></Field>
            <Field label="Film Type"><TextInput value={edit.film_type || ""} onChange={(e) => set("film_type", e.target.value)} /></Field>
            <Field label="Material"><TextInput value={edit.material || ""} onChange={(e) => set("material", e.target.value)} /></Field>
            <Field label={`Base Price (${currency || "AED"})`}><NumInput value={edit.base_price} onChange={(e) => set("base_price", Number(e.target.value))} /></Field>
            <Field label="Microns"><NumInput value={edit.microns || ""} onChange={(e) => set("microns", Number(e.target.value))} /></Field>
            <Field label="Durability"><TextInput value={edit.durability || ""} onChange={(e) => set("durability", e.target.value)} /></Field>
            <Field label="Warranty"><TextInput value={edit.warranty || ""} onChange={(e) => set("warranty", e.target.value)} /></Field>
          </div>

          <Field label="Features (one per line)">
            <textarea
              value={(edit.features || []).join("\n")}
              onChange={(e) => set("features", e.target.value.split("\n").filter(Boolean))}
              rows={4}
              className="w-full bg-black border border-white/15 text-white px-3 py-2 text-sm focus:outline-none focus:border-white"
            />
          </Field>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {["selfHealing", "chemResistance", "scratchResistance", "hydrophobic"].map((k) => (
              <Field key={k} label={`${k} (0–3)`}>
                <NumInput min={0} max={3} value={edit.ratings?.[k] ?? 0} onChange={(e) => setRating(k, e.target.value)} />
              </Field>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4">
            {["wash", "towel", "shampoo"].map((k) => (
              <Field key={k} label={`Credits: ${k}`}>
                <NumInput min={0} value={edit.credits?.[k] ?? 0} onChange={(e) => setCredit(k, e.target.value)} />
              </Field>
            ))}
          </div>

          <div className="flex justify-between mt-6">
            <Btn danger onClick={() => onDelete(p.id)} icon={Trash2}>Delete</Btn>
            <div className="flex gap-2">
              <Btn onClick={() => { setEdit(p); setOpen(false); }} icon={X}>Cancel</Btn>
              <Btn primary onClick={() => { onSave(p.id, edit); setOpen(false); }} icon={Save}>Save</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PackagesTab = ({ packages, currency }) => {
  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState({
    id: "", brand: "", name: "", base_price: 0, microns: 150, material: "TPU",
    durability: "", warranty: "", features: [], ratings: {}, credits: {},
  });

  const save = async (id, patch) => {
    // If id changed, that's an insert+delete dance. Keep simple: only allow id change on create.
    const { error } = await supabase.from("packages").update(patch).eq("id", id);
    if (error) toast(error.message, "err");
  };

  const create = async () => {
    if (!draft.id || !draft.name) { toast("ID and name are required.", "err"); return; }
    const { error } = await supabase.from("packages").insert(draft);
    if (error) toast(error.message, "err");
    else {
      setDraft({ id: "", brand: "", name: "", base_price: 0, microns: 150, material: "TPU", durability: "", warranty: "", features: [], ratings: {}, credits: {} });
      setShowNew(false);
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this package? Existing bookings using it will keep their data but won't render the package details.")) return;
    const { error } = await supabase.from("packages").delete().eq("id", id);
    if (error) toast(error.message, "err");
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Btn primary icon={Plus} onClick={() => setShowNew(!showNew)}>{showNew ? "Close" : "New Package"}</Btn>
      </div>

      {showNew && (
        <div className="border border-white/20 p-5 mb-6 bg-white/[0.02]">
          <h4 className="text-white text-sm uppercase tracking-wider mb-4">New Package</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <Field label="ID (no spaces, lowercase)">
              <TextInput value={draft.id} onChange={(e) => setDraft({ ...draft, id: e.target.value.toLowerCase().replace(/\s+/g, "_") })} placeholder="my_package" />
            </Field>
            <Field label="Brand"><TextInput value={draft.brand} onChange={(e) => setDraft({ ...draft, brand: e.target.value })} /></Field>
            <Field label="Name"><TextInput value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
            <Field label={`Base Price (${currency || "AED"})`}><NumInput value={draft.base_price} onChange={(e) => setDraft({ ...draft, base_price: Number(e.target.value) })} /></Field>
            <Field label="Microns"><NumInput value={draft.microns} onChange={(e) => setDraft({ ...draft, microns: Number(e.target.value) })} /></Field>
            <Field label="Material"><TextInput value={draft.material} onChange={(e) => setDraft({ ...draft, material: e.target.value })} /></Field>
          </div>
          <p className="text-xs text-gray-500 mb-3">Create now with basics, then expand the row below to fill features, ratings, and credits.</p>
          <Btn primary icon={Save} onClick={create}>Create</Btn>
        </div>
      )}

      {packages.map((p) => <PackageRow key={p.id} p={p} currency={currency} onSave={save} onDelete={remove} />)}
      {packages.length === 0 && <div className="text-center py-12 text-gray-600 text-sm">No packages yet.</div>}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// ADDONS EDITOR
// ═══════════════════════════════════════════════════════════

const AddonsTab = ({ addons, currency }) => {
  const [draft, setDraft] = useState({ id: "", name: "", price: 0 });

  const add = async () => {
    if (!draft.id || !draft.name) return;
    const { error } = await supabase.from("addons").insert(draft);
    if (error) toast(error.message, "err"); else setDraft({ id: "", name: "", price: 0 });
  };

  const update = async (id, patch) => {
    const { error } = await supabase.from("addons").update(patch).eq("id", id);
    if (error) toast(error.message, "err");
  };

  const remove = async (id) => {
    if (!confirm("Remove this add-on?")) return;
    const { error } = await supabase.from("addons").delete().eq("id", id);
    if (error) toast(error.message, "err");
  };

  return (
    <div>
      <div className="bg-black border border-white/10 p-4 mb-6 grid grid-cols-1 md:grid-cols-[1fr,2fr,1fr,auto] gap-3 items-end">
        <Field label="ID (lowercase)">
          <TextInput value={draft.id} onChange={(e) => setDraft({ ...draft, id: e.target.value.toLowerCase().replace(/\s+/g, "_") })} placeholder="new_addon" />
        </Field>
        <Field label="Name"><TextInput value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
        <Field label={`Price (${currency || "AED"})`}><NumInput value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} /></Field>
        <Btn primary onClick={add} icon={Plus}>Add</Btn>
      </div>

      <div className="border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5">
            <tr className="text-[10px] uppercase tracking-widest text-gray-500">
              <th className="p-3 text-left font-normal w-1/4">ID</th>
              <th className="p-3 text-left font-normal">Name</th>
              <th className="p-3 text-left font-normal w-1/6">Price</th>
              <th className="p-3 text-right font-normal w-24"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {addons.map((a) => (
              <tr key={a.id} className="hover:bg-white/[0.02]">
                <td className="p-3 font-mono text-xs text-gray-500">{a.id}</td>
                <td className="p-3">
                  <TextInput defaultValue={a.name} onBlur={(e) => e.target.value !== a.name && update(a.id, { name: e.target.value })} />
                </td>
                <td className="p-3">
                  <NumInput defaultValue={a.price} onBlur={(e) => Number(e.target.value) !== a.price && update(a.id, { price: Number(e.target.value) })} />
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => remove(a.id)} className="text-gray-600 hover:text-red-500 p-1">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {addons.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-600 text-sm">No add-ons yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// STAGES EDITOR
// ═══════════════════════════════════════════════════════════

const StagesTab = ({ stages }) => {
  const [draft, setDraft] = useState({ name: "", is_final: false });

  const add = async () => {
    if (!draft.name) return;
    const nextOrder = (stages[stages.length - 1]?.sort_order || 0) + 1;
    const { error } = await supabase.from("stages").insert({ ...draft, sort_order: nextOrder });
    if (error) toast(error.message, "err"); else setDraft({ name: "", is_final: false });
  };

  const update = async (id, patch) => {
    const { error } = await supabase.from("stages").update(patch).eq("id", id);
    if (error) toast(error.message, "err");
  };

  const remove = async (id) => {
    if (!confirm("Delete this stage? Bookings with this stage will appear off-pipeline.")) return;
    const { error } = await supabase.from("stages").delete().eq("id", id);
    if (error) toast(error.message, "err");
  };

  const move = async (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= stages.length) return;
    const a = stages[idx], b = stages[target];
    await supabase.from("stages").update({ sort_order: b.sort_order }).eq("id", a.id);
    await supabase.from("stages").update({ sort_order: a.sort_order }).eq("id", b.id);
  };

  return (
    <div>
      <div className="bg-black border border-white/10 p-4 mb-6 grid grid-cols-1 md:grid-cols-[2fr,auto,auto] gap-3 items-end">
        <Field label="Stage name">
          <TextInput value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Detailing" />
        </Field>
        <label className="flex items-center gap-2 text-xs text-gray-400 uppercase tracking-wider pb-2.5">
          <input type="checkbox" checked={draft.is_final} onChange={(e) => setDraft({ ...draft, is_final: e.target.checked })} />
          Final stage
        </label>
        <Btn primary onClick={add} icon={Plus}>Add</Btn>
      </div>

      <p className="text-xs text-gray-500 mb-3">Use ↑ ↓ to reorder. The final stage marks bookings as ready for pickup.</p>

      <div className="border border-white/10">
        {stages.map((s, idx) => (
          <div key={s.id} className="flex items-center gap-3 p-3 border-b border-white/5 last:border-b-0 hover:bg-white/[0.02]">
            <span className="text-[10px] font-mono text-gray-600 w-6">{idx + 1}</span>
            <div className="flex flex-col gap-0.5">
              <button disabled={idx === 0} onClick={() => move(idx, -1)} className="text-gray-600 hover:text-white disabled:opacity-20">
                <ArrowUp size={11} />
              </button>
              <button disabled={idx === stages.length - 1} onClick={() => move(idx, 1)} className="text-gray-600 hover:text-white disabled:opacity-20">
                <ArrowDown size={11} />
              </button>
            </div>
            <TextInput
              defaultValue={s.name}
              onBlur={(e) => e.target.value !== s.name && update(s.id, { name: e.target.value })}
              className="flex-1"
            />
            <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-gray-500">
              <input type="checkbox" checked={s.is_final} onChange={(e) => update(s.id, { is_final: e.target.checked })} />
              Final
            </label>
            <button onClick={() => remove(s.id)} className="text-gray-600 hover:text-red-500 p-1">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {stages.length === 0 && <div className="p-8 text-center text-gray-600 text-sm">No stages — your pipeline is empty.</div>}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// PANELS EDITOR (rename + reorder only; SVG path is fixed)
// ═══════════════════════════════════════════════════════════

const PanelsTab = ({ panels }) => {
  const move = async (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= panels.length) return;
    const a = panels[idx], b = panels[target];
    await supabase.from("panels").update({ sort_order: b.sort_order }).eq("id", a.id);
    await supabase.from("panels").update({ sort_order: a.sort_order }).eq("id", b.id);
  };

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">
        The car diagram is fixed art — you can rename and reorder the zones, but their shape on the diagram doesn't change.
      </p>

      <div className="border border-white/10">
        {panels.map((p, idx) => (
          <div key={p.id} className="flex items-center gap-3 p-3 border-b border-white/5 last:border-b-0 hover:bg-white/[0.02]">
            <span className="text-[10px] font-mono text-gray-600 w-6">{idx + 1}</span>
            <div className="flex flex-col gap-0.5">
              <button disabled={idx === 0} onClick={() => move(idx, -1)} className="text-gray-600 hover:text-white disabled:opacity-20">
                <ArrowUp size={11} />
              </button>
              <button disabled={idx === panels.length - 1} onClick={() => move(idx, 1)} className="text-gray-600 hover:text-white disabled:opacity-20">
                <ArrowDown size={11} />
              </button>
            </div>
            <span className="font-mono text-xs text-gray-500 w-32 truncate">{p.id}</span>
            <code className="text-[10px] text-gray-700 font-mono flex-1 truncate">{p.svg_path}</code>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-600 mt-3 italic">
        Note: panel renaming would also require updating the booking history. For now the IDs are locked.
      </p>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// SETTINGS TAB
// ═══════════════════════════════════════════════════════════

const SettingsTab = ({ settings }) => {
  const [edit, setEdit] = useState(settings);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("shop_settings")
      .update({
        shop_name: edit.shop_name,
        tagline: edit.tagline,
        city: edit.city,
        contact_phone: edit.contact_phone,
        contact_email: edit.contact_email,
        currency: edit.currency,
        bay_limit: edit.bay_limit,
        size_multipliers: edit.size_multipliers,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    setSaving(false);
    if (error) toast(error.message, "err");
    else toast("Settings saved");
  };

  const setMult = (key, val) => {
    setEdit({
      ...edit,
      size_multipliers: { ...edit.size_multipliers, [key]: Number(val) || 0 },
    });
  };

  const addSize = () => {
    const name = prompt("Size class name (e.g. XL):");
    if (!name) return;
    setEdit({ ...edit, size_multipliers: { ...edit.size_multipliers, [name]: 1.0 } });
  };

  const removeSize = (key) => {
    if (!confirm(`Remove size class "${key}"? Vehicles using it will keep the label but lose pricing.`)) return;
    const m = { ...edit.size_multipliers };
    delete m[key];
    setEdit({ ...edit, size_multipliers: m });
  };

  return (
    <div className="max-w-3xl">
      <div className="border border-white/10 p-5 mb-5">
        <h4 className="text-white text-sm uppercase tracking-wider mb-4">Shop Identity</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Shop Name"><TextInput value={edit.shop_name || ""} onChange={(e) => setEdit({ ...edit, shop_name: e.target.value })} /></Field>
          <Field label="City"><TextInput value={edit.city || ""} onChange={(e) => setEdit({ ...edit, city: e.target.value })} /></Field>
          <Field label="Tagline"><TextInput value={edit.tagline || ""} onChange={(e) => setEdit({ ...edit, tagline: e.target.value })} className="md:col-span-2" /></Field>
          <Field label="Contact Phone"><TextInput value={edit.contact_phone || ""} onChange={(e) => setEdit({ ...edit, contact_phone: e.target.value })} /></Field>
          <Field label="Contact Email"><TextInput value={edit.contact_email || ""} onChange={(e) => setEdit({ ...edit, contact_email: e.target.value })} /></Field>
        </div>
      </div>

      <div className="border border-white/10 p-5 mb-5">
        <h4 className="text-white text-sm uppercase tracking-wider mb-4">Currency</h4>
        <Field label="Display currency (applies across the whole app)">
          <select
            value={edit.currency || "AED"}
            onChange={(e) => setEdit({ ...edit, currency: e.target.value })}
            className="w-full bg-black border border-white/15 text-white px-3 py-2 text-sm focus:outline-none focus:border-white md:w-80"
          >
            {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </Field>
        <p className="text-[10px] text-gray-600 mt-2">
          Prices are stored as plain numbers; changing this only changes how they're displayed.
        </p>
      </div>

      <div className="border border-white/10 p-5 mb-5">
        <h4 className="text-white text-sm uppercase tracking-wider mb-4">Capacity</h4>
        <Field label="Bay Limit (max bookings per day)">
          <NumInput value={edit.bay_limit} onChange={(e) => setEdit({ ...edit, bay_limit: Number(e.target.value) })} className="md:w-32" />
        </Field>
      </div>

      <div className="border border-white/10 p-5 mb-5">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-white text-sm uppercase tracking-wider">Size Multipliers</h4>
          <Btn icon={Plus} onClick={addSize}>Add Size</Btn>
        </div>
        <p className="text-xs text-gray-500 mb-3">Price multiplier per vehicle size class. 1.0 = base. 1.2 = 20% more.</p>
        <div className="space-y-2">
          {Object.entries(edit.size_multipliers || {}).map(([k, v]) => (
            <div key={k} className="flex items-center gap-3">
              <span className="text-white font-mono text-sm w-24">{k}</span>
              <NumInput step="0.05" value={v} onChange={(e) => setMult(k, e.target.value)} className="w-32" />
              <span className="text-gray-500 text-xs">× base</span>
              <button onClick={() => removeSize(k)} className="text-gray-600 hover:text-red-500 p-1 ml-auto">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-white/10 p-5 mb-5">
        <h4 className="text-white text-sm uppercase tracking-wider mb-4">Staff Access</h4>
        <p className="text-gray-400 text-sm">
          Admin access uses secure staff logins (email + password). Each staff member signs in with their own account.
        </p>
        <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">
          To add or remove staff: open your Supabase dashboard → <span className="text-gray-300 font-mono">Authentication → Users</span> →
          <span className="text-gray-300"> "Add user"</span>. Passwords are stored securely (hashed) by Supabase and can be reset there.
        </p>
      </div>

      <div className="flex justify-end">
        <Btn primary icon={Save} onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Settings"}</Btn>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// CALENDAR TAB — month grid + day editor
// ═══════════════════════════════════════════════════════════

// Local YYYY-MM-DD (avoids UTC off-by-one from toISOString)
const ymd = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];


// Per-stage photo uploads — staff documents the car as it moves through
// the pipeline; customers see these live on the tracking page.
const PhotosSection = ({ booking, stages }) => {
  const [photos, setPhotos] = useState([]);
  const [stage, setStage] = useState(booking.status);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);

  const load = async () => {
    const { data } = await supabase
      .from("booking_photos")
      .select("*")
      .eq("booking_id", booking.id)
      .order("created_at");
    setPhotos(data || []);
  };
  useEffect(() => { load(); }, [booking.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const upload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast("Please choose an image file", "err"); return; }
    if (file.size > 8 * 1024 * 1024) { toast("Image too large (max 8 MB)", "err"); return; }
    setUploading(true);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${booking.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("stage-photos").upload(path, file, { contentType: file.type });
    if (upErr) { setUploading(false); toast("Upload failed: " + upErr.message, "err"); return; }
    const { data: pub } = supabase.storage.from("stage-photos").getPublicUrl(path);
    const { error: dbErr } = await supabase.from("booking_photos").insert({
      booking_id: booking.id, stage, url: pub.publicUrl, storage_path: path,
    });
    setUploading(false);
    if (dbErr) { toast("Save failed: " + dbErr.message, "err"); return; }
    toast(`Photo added to ${stage}`);
    load();
  };

  const removePhoto = async (p) => {
    if (!confirm("Delete this photo?")) return;
    await supabase.storage.from("stage-photos").remove([p.storage_path]);
    const { error } = await supabase.from("booking_photos").delete().eq("id", p.id);
    if (error) toast(error.message, "err");
    else { toast("Photo deleted"); load(); }
  };

  return (
    <div className="mt-6 pt-5 border-t border-white/10">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-mono text-gray-600 tracking-widest uppercase flex items-center gap-1.5">
          <Camera size={11} /> Stage Photos · {photos.length}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className="bg-black border border-white/15 text-white px-2 py-1.5 text-xs focus:outline-none focus:border-white"
          >
            {stages.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
          <label className={`flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase tracking-wider cursor-pointer transition-all ${
            uploading ? "bg-white/10 text-gray-500" : "bg-white text-black hover:bg-gray-200"
          }`}>
            {uploading ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
            {uploading ? "Uploading…" : "Add Photo"}
            <input
              type="file" accept="image/*" capture="environment" className="hidden"
              disabled={uploading}
              onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }}
            />
          </label>
        </div>
      </div>
      <p className="text-[11px] text-gray-600 mb-3">
        Photos appear instantly on the customer's tracking page under the selected stage.
      </p>
      {photos.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
          {photos.map((p) => (
            <div key={p.id} className="relative group aspect-square border border-white/10 overflow-hidden">
              <img
                src={p.url} alt={p.stage} loading="lazy"
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setPreview(p)}
              />
              <button
                onClick={() => removePhoto(p)}
                className="absolute top-1 right-1 p-1 bg-black/70 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Delete photo"
              >
                <Trash2 size={11} />
              </button>
              <div className="absolute bottom-0 inset-x-0 bg-black/70 px-1 py-0.5 text-[8px] font-mono text-gray-400 truncate">
                {p.stage}
              </div>
            </div>
          ))}
        </div>
      )}
      <Lightbox photo={preview} onClose={() => setPreview(null)} />
    </div>
  );
};

// Edit modal for a single booking
const BookingEditor = ({ booking, stages, packages, panels = [], vehicles = [], onClose }) => {
  const [edit, setEdit] = useState(booking);
  const [saving, setSaving] = useState(false);

  // Resolve body type for the 3D car from the vehicle catalogue
  const matchedVehicle = vehicles.find(
    (v) => v.make === edit.vehicle_make && v.model === edit.vehicle_model
  );
  const bodyType = matchedVehicle?.body_type || "sedan";

  const set = (k, v) => setEdit({ ...edit, [k]: v });

  const togglePanel = (id) =>
    setEdit((e) => {
      const cur = e.panels || [];
      return { ...e, panels: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] };
    });

  const allPanelsSelected = panels.length > 0 && (edit.panels || []).length >= panels.length;
  const toggleAllPanels = () =>
    setEdit((e) => ({ ...e, panels: allPanelsSelected ? [] : panels.map((pn) => pn.id) }));

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("bookings")
      .update({
        customer_name:  edit.customer_name,
        customer_phone: edit.customer_phone,
        vehicle_make:   edit.vehicle_make,
        vehicle_model:  edit.vehicle_model,
        vehicle_reg:    edit.vehicle_reg,
        booking_date:   edit.booking_date,
        status:         edit.status,
        panels:         edit.panels || [],
      })
      .eq("id", booking.id);
    setSaving(false);
    if (error) toast(error.message, "err");
    else onClose();
  };

  const remove = async () => {
    if (!confirm("Delete this booking permanently?")) return;
    const { error } = await supabase.from("bookings").delete().eq("id", booking.id);
    if (error) toast(error.message, "err"); else onClose();
  };

  const pkg = packages.find((p) => p.id === edit.package_id);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center px-6 py-10 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-2xl border border-white/15 bg-black p-6 relative" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-5">
          <div>
            <div className="text-[10px] font-mono text-gray-600 tracking-widest uppercase mb-1">Edit Appointment</div>
            <h3 className="text-xl text-white font-light font-mono">{edit.vehicle_reg}</h3>
            {pkg && <div className="text-xs text-gray-500 mt-0.5">{pkg.brand} {pkg.name}</div>}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Customer Name">
            <TextInput value={edit.customer_name || ""} onChange={(e) => set("customer_name", e.target.value)} />
          </Field>
          <Field label="Phone">
            <TextInput value={edit.customer_phone || ""} onChange={(e) => set("customer_phone", e.target.value)} />
          </Field>
          <Field label="Make">
            <TextInput value={edit.vehicle_make || ""} onChange={(e) => set("vehicle_make", e.target.value)} />
          </Field>
          <Field label="Model">
            <TextInput value={edit.vehicle_model || ""} onChange={(e) => set("vehicle_model", e.target.value)} />
          </Field>
          <Field label="Registration">
            <TextInput value={edit.vehicle_reg || ""} onChange={(e) => set("vehicle_reg", e.target.value.toUpperCase())} className="font-mono uppercase" />
          </Field>
          <Field label="Appointment Date">
            <TextInput type="date" value={edit.booking_date || ""} onChange={(e) => set("booking_date", e.target.value)} />
          </Field>
          <Field label="Stage">
            <select
              value={edit.status}
              onChange={(e) => set("status", e.target.value)}
              className="w-full bg-black border border-white/15 text-white px-3 py-2 text-sm focus:outline-none focus:border-white"
            >
              {stages.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </Field>
        </div>

        {/* Protected panels — 3D picker */}
        <div className="mt-6 pt-5 border-t border-white/10">
          <div className="text-[10px] font-mono text-gray-600 tracking-widest uppercase mb-3">
            Protected Panels · {(edit.panels || []).length} selected
          </div>
          <Suspense fallback={<div className="bg-black border border-white/5 h-[420px] flex items-center justify-center text-[10px] font-mono text-gray-600 uppercase tracking-widest">Loading 3D model…</div>}>
            <Car3D
              bodyType={bodyType}
              selectedPanels={edit.panels || []}
              onToggle={togglePanel}
              availableIds={panels.map((p) => p.id)}
            />
          </Suspense>
          <div className="mt-3 flex flex-wrap gap-1.5">
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
                  (edit.panels || []).includes(panel.id)
                    ? "bg-white text-black border-white"
                    : "border-white/10 text-gray-500 hover:border-white/25"
                }`}
              >
                {panel.id}
              </button>
            ))}
          </div>
        </div>

        <PhotosSection booking={booking} stages={stages} />

        <div className="flex justify-between mt-6 pt-5 border-t border-white/10">
          <Btn danger icon={Trash2} onClick={remove}>Delete</Btn>
          <div className="flex gap-2">
            <Btn icon={X} onClick={onClose}>Cancel</Btn>
            <Btn primary icon={Save} onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Btn>
          </div>
        </div>
      </div>
    </div>
  );
};

const CalendarTab = ({ bookings, stages, packages, panels, vehicles }) => {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [editing, setEditing] = useState(null);

  const finalName = stages.find((s) => s.is_final)?.name;

  // Group bookings by date string
  const byDate = useMemo(() => {
    const m = {};
    bookings.forEach((b) => {
      if (!b.booking_date) return;
      (m[b.booking_date] = m[b.booking_date] || []).push(b);
    });
    return m;
  }, [bookings]);

  // Build the grid: array of {date, inMonth} for the visible weeks
  const cells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const startPad = first.getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const out = [];
    // leading padding from prev month
    for (let i = 0; i < startPad; i++) {
      const d = new Date(year, month, 1 - (startPad - i));
      out.push({ date: d, inMonth: false });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      out.push({ date: new Date(year, month, day), inMonth: true });
    }
    // trailing padding to complete the last week
    while (out.length % 7 !== 0) {
      const last = out[out.length - 1].date;
      const d = new Date(last);
      d.setDate(d.getDate() + 1);
      out.push({ date: d, inMonth: false });
    }
    return out;
  }, [cursor]);

  const todayStr = ymd(today);

  const shiftMonth = (delta) =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl text-white font-light">
          {MONTHS[cursor.getMonth()]} <span className="text-gray-500">{cursor.getFullYear()}</span>
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={() => shiftMonth(-1)} className="p-2 border border-white/15 text-white hover:border-white transition-colors">
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
            className="px-4 py-2 border border-white/15 text-white hover:border-white text-xs uppercase tracking-wider transition-colors"
          >
            Today
          </button>
          <button onClick={() => shiftMonth(1)} className="p-2 border border-white/15 text-white hover:border-white transition-colors">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Horizontally scrollable on phones so the month stays readable */}
      <div className="overflow-x-auto -mx-1 px-1">
      <div className="min-w-[720px]">

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 mb-2">
        {DOW.map((d) => (
          <div key={d} className="text-[11px] uppercase tracking-wider text-gray-500 text-center pb-2 font-medium">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map(({ date, inMonth }, i) => {
          const ds = ymd(date);
          const dayBookings = byDate[ds] || [];
          const isToday = ds === todayStr;
          return (
            <div
              key={i}
              className={`min-h-[120px] p-2 border transition-colors ${
                inMonth ? "border-white/10 bg-white/[0.015]" : "border-transparent bg-transparent"
              } ${isToday ? "border-white/40" : ""}`}
            >
              {/* Date number — today gets a filled circle like Google */}
              <div className="flex justify-end mb-1.5">
                <span
                  className={`text-xs flex items-center justify-center w-6 h-6 rounded-full ${
                    isToday
                      ? "bg-white text-black font-bold"
                      : inMonth ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  {date.getDate()}
                </span>
              </div>

              <div className="space-y-1">
                {dayBookings.slice(0, 3).map((b) => {
                  const isReady = b.status === finalName;
                  return (
                    <button
                      key={b.id}
                      onClick={() => setEditing(b)}
                      className={`w-full text-left px-2 py-1 text-[11px] rounded-sm truncate transition-colors ${
                        isReady
                          ? "bg-green-600/20 text-green-300 hover:bg-green-600/30"
                          : "bg-white/10 text-gray-200 hover:bg-white/20"
                      }`}
                      title={`${b.vehicle_reg} · ${b.vehicle_make} ${b.vehicle_model} · ${b.status}`}
                    >
                      {b.vehicle_reg}
                    </button>
                  );
                })}
                {dayBookings.length > 3 && (
                  <button
                    onClick={() => setEditing(dayBookings[3])}
                    className="w-full text-left px-2 text-[10px] text-gray-500 hover:text-white"
                  >
                    +{dayBookings.length - 3} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      </div>
      </div>

      <p className="text-[11px] text-gray-600 mt-4 italic">Click any appointment to view or edit it.</p>

      {editing && (
        <BookingEditor
          booking={editing}
          stages={stages}
          packages={packages}
          panels={panels}
          vehicles={vehicles}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// ROOT ADMIN PANEL
// ═══════════════════════════════════════════════════════════

export default function AdminPanel({ shop, onLock }) {
  const [tab, setTab] = useState("pipeline");

  const tabs = [
    ["pipeline", "Pipeline", LayoutGrid],
    ["calendar", "Calendar", CalendarDays],
    ["credits",  "Credits",  ListOrdered],
    ["vehicles", "Vehicles", Car],
    ["packages", "Packages", Package],
    ["addons",   "Add-ons",  Tag],
    ["stages",   "Stages",   Layers],
    ["panels",   "Panels",   SlidersHorizontal],
    ["settings", "Settings", Cog],
  ];

  return (
    <div className="min-h-screen bg-neutral-950 pt-16">
      {/* Topbar */}
      <div className="fixed top-0 left-0 right-0 z-20 border-b border-white/10 px-16 md:px-20 py-3 flex items-center justify-between bg-black">
        <div className="flex items-center gap-2 text-white font-bold tracking-tighter text-sm">
          <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse" />
          ADMIN CONSOLE · {(shop.settings?.shop_name || "Detailr").toUpperCase()}
        </div>
        <button
          onClick={onLock}
          className="text-gray-500 hover:text-white text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors"
        >
          <LogOut size={13} /> Lock
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/10 bg-black overflow-x-auto sticky top-12 z-10">
        <div className="flex min-w-max">
          {tabs.map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-5 py-3 text-xs uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                tab === key
                  ? "border-white text-white bg-white/[0.03]"
                  : "border-transparent text-gray-500 hover:text-white"
              }`}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 md:p-8">
        {tab === "pipeline" && <PipelineTab bookings={shop.bookings} stages={shop.stages} packages={shop.packages} settings={shop.settings} />}
        {tab === "calendar" && <CalendarTab bookings={shop.bookings} stages={shop.stages} packages={shop.packages} panels={shop.panels} vehicles={shop.vehicles} />}
        {tab === "credits"  && <CreditsTab  bookings={shop.bookings} packages={shop.packages} />}
        {tab === "vehicles" && <VehiclesTab vehicles={shop.vehicles} settings={shop.settings} />}
        {tab === "packages" && <PackagesTab packages={shop.packages} currency={shop.settings?.currency} />}
        {tab === "addons"   && <AddonsTab   addons={shop.addons} currency={shop.settings?.currency} />}
        {tab === "stages"   && <StagesTab   stages={shop.stages} />}
        {tab === "panels"   && <PanelsTab   panels={shop.panels} />}
        {tab === "settings" && <SettingsTab key={shop.settings?.updated_at || "settings"} settings={shop.settings} />}
      </div>
    </div>
  );
}
