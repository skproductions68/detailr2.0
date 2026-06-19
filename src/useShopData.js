// useShopData.js
// One hook that loads ALL shop data (config + bookings) and keeps it
// fresh via Supabase realtime. Used by every top-level component.

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabase";

const DEFAULT_SETTINGS = {
  id: 1,
  shop_name: "Detailr Studio",
  tagline: "Paint Protection Film",
  city: "",
  contact_phone: "",
  contact_email: "",
  currency: "AED",
  bay_limit: 6,
  size_multipliers: { Hatch: 1.0, Sedan: 1.0, Mid: 1.2, Large: 1.4 },
  admin_password: "changeme",
};

export function useShopData() {
  const [state, setState] = useState({
    packages: [],
    addons: [],
    vehicles: [],
    panels: [],
    stages: [],
    bookings: [],
    settings: DEFAULT_SETTINGS,
    loading: true,
    error: null,
  });

  // Guard against state updates after unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const load = useCallback(async () => {
    try {
      const [pkgs, ads, vhs, pns, stgs, bks, set] = await Promise.all([
        supabase.from("packages").select("*").order("sort_order"),
        supabase.from("addons").select("*").order("sort_order"),
        supabase.from("vehicles").select("*").order("make").order("model"),
        supabase.from("panels").select("*").order("sort_order"),
        supabase.from("stages").select("*").order("sort_order"),
        supabase.from("bookings").select("*").order("created_at", { ascending: false }),
        supabase.from("shop_settings").select("*").eq("id", 1).maybeSingle(),
      ]);

      if (!mountedRef.current) return;

      setState({
        packages: pkgs.data || [],
        addons: ads.data || [],
        vehicles: vhs.data || [],
        panels: pns.data || [],
        stages: stgs.data || [],
        bookings: bks.data || [],
        settings: set.data || DEFAULT_SETTINGS,
        loading: false,
        error: pkgs.error || ads.error || vhs.error || pns.error || stgs.error || bks.error || set.error || null,
      });
    } catch (e) {
      if (!mountedRef.current) return;
      setState((s) => ({ ...s, loading: false, error: e }));
    }
  }, []);

  useEffect(() => {
    load();
    const ch = supabase.channel("detailr-all");
    ["packages","addons","vehicles","panels","stages","bookings","shop_settings"].forEach((t) =>
      ch.on("postgres_changes", { event: "*", schema: "public", table: t }, () => load())
    );
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  return { ...state, refresh: load };
}
