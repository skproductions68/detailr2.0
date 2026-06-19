// TrackingView.jsx
// Customer plate lookup. Reads bookings + stages from props.
// NEW: per-stage photos — staff upload shots as they work; the customer
// sees them appear live under each stage (Supabase realtime).

import { useState, useMemo, useEffect } from "react";
import { Camera, Search } from "lucide-react";
import { supabase } from "./supabase";
import { Lightbox } from "./fx";

const cleanPlate = (s) => (s || "").toUpperCase().replace(/[\s-]/g, "");

export default function TrackingView({ bookings, packages, stages }) {
  const [plate, setPlate] = useState("");
  const [searched, setSearched] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [lightbox, setLightbox] = useState(null);

  const booking = useMemo(() => {
    if (!searched || !plate.trim()) return null;
    return bookings.find((b) => cleanPlate(b.vehicle_reg) === cleanPlate(plate));
  }, [searched, plate, bookings]);

  // Load this booking's photos + keep them live
  useEffect(() => {
    if (!booking) { setPhotos([]); return; }
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("booking_photos")
        .select("*")
        .eq("booking_id", booking.id)
        .order("created_at");
      if (active) setPhotos(data || []);
    };
    load();
    const ch = supabase
      .channel(`photos-${booking.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "booking_photos", filter: `booking_id=eq.${booking.id}` },
        () => load())
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [booking]);

  const photosByStage = useMemo(() => {
    const m = {};
    photos.forEach((p) => { (m[p.stage] = m[p.stage] || []).push(p); });
    return m;
  }, [photos]);

  const stageNames = stages.map((s) => s.name);
  const stageIndex = booking ? stageNames.indexOf(booking.status) : -1;
  const pkg = booking ? packages.find((p) => p.id === booking.package_id) : null;
  const finalStageName = stages.find((s) => s.is_final)?.name;

  return (
    <div className="max-w-xl mx-auto px-5 sm:px-6 py-20">
      <div className="mb-10">
        <div className="text-[10px] text-gray-500 uppercase tracking-[0.35em] mb-2 font-mono">Live Status</div>
        <h1 className="display text-3xl text-white">TRACK YOUR VEHICLE</h1>
        <p className="text-gray-400 text-sm mt-2">Enter your registration plate to see real-time progress — with photos from the bay.</p>
      </div>

      {/* Search */}
      <div className="flex mb-10">
        <input
          value={plate}
          onChange={(e) => { setPlate(e.target.value); setSearched(false); }}
          onKeyDown={(e) => e.key === "Enter" && setSearched(true)}
          placeholder="e.g. BHP-999"
          className="flex-1 min-w-0 glass border-r-0 text-white text-xl px-5 py-4 focus:outline-none focus:border-white/50 uppercase tracking-widest placeholder-gray-700 font-mono transition-colors"
        />
        <button
          onClick={() => setSearched(true)}
          className="bg-white text-black px-6 sm:px-7 py-4 text-sm font-bold tracking-widest uppercase hover:bg-gray-100 transition-colors flex items-center gap-2"
        >
          <Search size={14} /> Find
        </button>
      </div>

      {/* Not found */}
      {searched && !booking && plate.trim() && (
        <div className="glass p-8 text-center">
          <div className="text-gray-500 text-[10px] font-mono tracking-widest mb-2">NO RECORD FOUND</div>
          <p className="text-gray-400 text-sm">
            Plate <span className="font-mono text-white">{plate.toUpperCase()}</span> has no active booking.
            <br />Please verify your number or contact the studio.
          </p>
        </div>
      )}

      {/* Found */}
      {booking && (
        <div className="glass step-anim">
          <div className="p-6 border-b border-white/8 flex justify-between items-start gap-4">
            <div>
              <h2 className="text-xl text-white font-light">{booking.vehicle_make} {booking.vehicle_model}</h2>
              <p className="text-gray-500 font-mono text-sm mt-1">{booking.vehicle_reg} · {booking.vehicle_year}</p>
            </div>
            {pkg && (
              <div className="text-right flex-shrink-0">
                <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-0.5">Package</div>
                <div className="text-xs font-mono text-gray-300">{pkg.brand} {pkg.name}</div>
              </div>
            )}
          </div>

          {/* Pipeline */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="text-[10px] text-gray-500 uppercase tracking-[0.3em] font-mono">Service Pipeline</div>
              {photos.length > 0 && (
                <div className="text-[10px] text-gray-500 uppercase tracking-widest font-mono flex items-center gap-1.5">
                  <Camera size={11} /> {photos.length} photo{photos.length !== 1 ? "s" : ""}
                </div>
              )}
            </div>
            <div>
              {stages.map((stage, i) => {
                const done = i < stageIndex;
                const active = i === stageIndex;
                const last = i === stages.length - 1;
                const stagePhotos = photosByStage[stage.name] || [];
                return (
                  <div key={stage.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 flex-shrink-0 transition-all ${
                        done   ? "bg-white border-white text-black"
                             : active ? "border-[#2e7dff] text-white live-dot"
                             : "border-white/10 text-gray-700"
                      }`}>
                        {done ? "✓" : i + 1}
                      </div>
                      {!last && (
                        <div className={`w-px flex-1 my-1 min-h-[28px] ${done ? "bg-white/40" : "bg-white/8"}`} />
                      )}
                    </div>
                    <div className="pb-7 flex-1 min-w-0">
                      <div className={`text-sm font-medium pt-0.5 ${
                        done ? "text-gray-500" : active ? "text-white" : "text-gray-700"
                      }`}>
                        {stage.name}
                      </div>
                      {active && <div className="text-[10px] font-mono text-[#2e7dff] mt-0.5 tracking-widest">IN PROGRESS</div>}
                      {done   && <div className="text-[10px] font-mono text-green-500/70 mt-0.5 tracking-widest">COMPLETE</div>}

                      {/* Stage photos */}
                      {stagePhotos.length > 0 && (
                        <div className="mt-3 grid grid-cols-3 gap-1.5 max-w-xs">
                          {stagePhotos.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => setLightbox(p)}
                              className="relative aspect-square overflow-hidden border border-white/10 hover:border-white/50 transition-colors group"
                              aria-label={`View ${stage.name} photo`}
                            >
                              <img
                                src={p.url}
                                alt={p.caption || stage.name}
                                loading="lazy"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {booking.status === finalStageName && (
              <div className="mt-2 p-4 bg-green-900/20 border border-green-800/50 text-green-400 text-sm text-center tracking-wide">
                ✓ Your vehicle is ready for collection
              </div>
            )}
          </div>

          <div className="px-6 py-3 border-t border-white/5 flex justify-between text-[10px] text-gray-600 font-mono">
            <span>Booked: {booking.booking_date}</span>
            {booking.customer_name && <span>{booking.customer_name} · {booking.customer_phone}</span>}
          </div>
        </div>
      )}

      <Lightbox photo={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}
