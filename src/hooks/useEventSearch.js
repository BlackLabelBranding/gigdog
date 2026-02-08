// src/hooks/useEventSearch.js
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/customSupabaseClient";
import { calculateDistance } from "@/utils/haversine";

const cityCoordCache = new Map();
const norm = (s = "") => String(s ?? "").trim();
const normUpper = (s = "") => norm(s).toUpperCase();
const normLower = (s = "") => norm(s).toLowerCase();

function cleanCity(input = "") {
  const s = String(input ?? "").trim();
  if (!s) return "";
  const base = s.split(",")[0].trim();
  const noState = base.replace(/\s+[A-Z]{2}$/, "").trim();
  return noState.replace(/\s+/g, " ");
}

function yyyyMmDdUTC(d) {
  try {
    const dt = d instanceof Date ? d : new Date(d);
    if (!Number.isFinite(dt.getTime())) return null;
    const y = dt.getUTCFullYear();
    const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const day = String(dt.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return null;
  }
}

function isUpcomingByDate(event) {
  const ts = event?.start_datetime || event?.date;
  if (!ts) return true;
  const evDay = yyyyMmDdUTC(ts);
  if (!evDay) return true;
  const today = yyyyMmDdUTC(new Date());
  return evDay >= today;
}

async function getCoordsFromCitiesTable(state, city) {
  const st = normUpper(state);
  const ct = cleanCity(city);
  if (!st || !ct) return null;

  const key = `${st}|${normLower(ct)}`;
  const cached = cityCoordCache.get(key);
  if (cached) return cached;

  const { data, error } = await supabase
    .from("cities")
    .select("lat,lng,city_name,state")
    .eq("state", st)
    .ilike("city_name", `%${ct}%`)
    .limit(1);

  if (error) {
    console.error("[useEventSearch] cities lookup error:", error);
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (row?.lat == null || row?.lng == null) return null;

  const coords = { lat: row.lat, lng: row.lng };
  cityCoordCache.set(key, coords);
  return coords;
}

export function useEventSearch(state, city, radius, userLat = null, userLng = null) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const st = normUpper(state);
    const ct = cleanCity(city);
    const radNum = Number(radius);
    const radiusMiles = Number.isFinite(radNum) ? radNum : 0;

    if ((!st || !ct) && (userLat == null || userLng == null)) {
      setEvents([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchEvents = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1) Determine center point
        let centerLat = userLat;
        let centerLng = userLng;

        if (centerLat == null || centerLng == null) {
          const cityCoords = await getCoordsFromCitiesTable(st, ct);
          if (cityCoords) {
            centerLat = cityCoords.lat;
            centerLng = cityCoords.lng;
          }
        }

        const haveCenter = centerLat != null && centerLng != null;

        // 2) Fetch approved events
        // KEY CHANGE:
        // - Use the GigDog event cards VIEW so we always receive card_image_url
        // - If radiusMiles > 0 and we have a center, do NOT filter by state (cross-state allowed)
        let query = supabase
          .from("v_gigdog_event_cards")
          .select("*")
          .eq("status", "approved")
          .order("start_datetime", { ascending: true, nullsFirst: false });

        if (!(radiusMiles > 0 && haveCenter)) {
          // only apply state filter for exact matching mode
          if (st) query = query.eq("state", st);
        }

        const { data, error: fetchError } = await query;
        if (fetchError) throw fetchError;

        // 3) upcoming filter by calendar date
        const upcoming = (data || []).filter(isUpcomingByDate);

        // 4) attach distance
        const withDistance = await Promise.all(
          upcoming.map(async (ev) => {
            let evLat = ev.lat ?? null;
            let evLng = ev.lng ?? null;

            if (evLat == null || evLng == null) {
              // If event has no coords, try to resolve from cities table
              const evSt = normUpper(ev.state || "");
              const evCt = cleanCity(ev.city || "");
              if (evSt && evCt) {
                const evCoords = await getCoordsFromCitiesTable(evSt, evCt);
                if (evCoords) {
                  evLat = evCoords.lat;
                  evLng = evCoords.lng;
                }
              }
            }

            let distance = null;
            if (haveCenter && evLat != null && evLng != null) {
              const d = calculateDistance(centerLat, centerLng, evLat, evLng);
              distance = Number.isFinite(d) ? d : null;
            }

            return { ...ev, distance };
          })
        );

        // 5) filter results
        let finalEvents = [];

        if (radiusMiles > 0 && haveCenter) {
          // Radius mode: cross-state allowed
          finalEvents = withDistance
            .filter((ev) => ev.distance != null && ev.distance <= radiusMiles)
            .sort((a, b) => {
              const ta = new Date(a.start_datetime || 0).getTime() || 0;
              const tb = new Date(b.start_datetime || 0).getTime() || 0;
              if (ta !== tb) return ta - tb;
              return (a.distance ?? 0) - (b.distance ?? 0);
            });
        } else {
          // Exact mode: match city + state
          finalEvents = withDistance
            .filter(
              (ev) =>
                normLower(cleanCity(ev.city)) === normLower(ct) &&
                normUpper(ev.state) === st
            )
            .sort((a, b) => {
              const ta = new Date(a.start_datetime || 0).getTime() || 0;
              const tb = new Date(b.start_datetime || 0).getTime() || 0;
              if (ta !== tb) return ta - tb;
              return (a.distance ?? 0) - (b.distance ?? 0);
            });
        }

        if (!cancelled) setEvents(finalEvents);
      } catch (err) {
        console.error("[useEventSearch] Error:", err);
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchEvents();
    return () => {
      cancelled = true;
    };
  }, [state, city, radius, userLat, userLng]);

  return useMemo(() => ({ events, loading, error }), [events, loading, error]);
}
