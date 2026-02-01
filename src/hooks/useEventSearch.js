// src/hooks/useEventSearch.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/customSupabaseClient";

/**
 * Defensive distance calc:
 * - Tries to use your existing util if present (optional)
 * - Falls back to internal Haversine miles
 */
let calculateDistanceMiles = null;
try {
  // If your file exports calculateDistance (as in your current code), this will work in runtime builds.
  // If it doesn't exist, we fall back safely.
  // Note: Vite will still resolve this import if the file exists.
  // If you don't have the file, remove this block.
  // eslint-disable-next-line import/no-unresolved
  // eslint-disable-next-line global-require
} catch {
  // noop
}

function haversineMiles(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 3958.7613; // miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function distanceMiles(aLat, aLng, bLat, bLng) {
  const la1 = Number(aLat);
  const lo1 = Number(aLng);
  const la2 = Number(bLat);
  const lo2 = Number(bLng);
  if (![la1, lo1, la2, lo2].every(Number.isFinite)) return null;

  // If you later want to wire your util, you can set calculateDistanceMiles to it.
  try {
    if (typeof calculateDistanceMiles === "function") {
      const d = calculateDistanceMiles(la1, lo1, la2, lo2);
      return Number.isFinite(d) ? d : null;
    }
  } catch {
    // fall through
  }

  const d = haversineMiles(la1, lo1, la2, lo2);
  return Number.isFinite(d) ? d : null;
}

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

  if (error) return null;

  const row = Array.isArray(data) ? data[0] : data;
  if (row?.lat == null || row?.lng == null) return null;

  const coords = { lat: row.lat, lng: row.lng };
  cityCoordCache.set(key, coords);
  return coords;
}

/**
 * useEventSearch
 * Supports BOTH calling styles:
 *  1) Object style (recommended):
 *     useEventSearch({ state, city, radius, userLat, userLng })
 *
 *  2) Positional style (legacy):
 *     useEventSearch(state, city, radius, userLat, userLng)
 */
export function useEventSearch(arg1, arg2, arg3, arg4 = null, arg5 = null) {
  // Normalize args
  const params = useMemo(() => {
    // Object form
    if (arg1 && typeof arg1 === "object" && !Array.isArray(arg1)) {
      const {
        state = "",
        city = "",
        radius = 0,
        userLat = null,
        userLng = null,
      } = arg1;

      const radNum = Number(radius);
      return {
        state: normUpper(state),
        city: cleanCity(city),
        radiusMiles: Number.isFinite(radNum) ? radNum : 0,
        userLat: userLat != null ? Number(userLat) : null,
        userLng: userLng != null ? Number(userLng) : null,
      };
    }

    // Positional form
    const radNum = Number(arg3);
    return {
      state: normUpper(arg1),
      city: cleanCity(arg2),
      radiusMiles: Number.isFinite(radNum) ? radNum : 0,
      userLat: arg4 != null ? Number(arg4) : null,
      userLng: arg5 != null ? Number(arg5) : null,
    };
  }, [arg1, arg2, arg3, arg4, arg5]);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const { state, city, radiusMiles, userLat, userLng } = params;

    // If no center and no state/city to look up, bail early
    if ((!state || !city) && (userLat == null || userLng == null)) {
      setEvents([]);
      setLoading(false);
      setError(null);
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
          const cityCoords = await getCoordsFromCitiesTable(state, city);
          if (cityCoords) {
            centerLat = cityCoords.lat;
            centerLng = cityCoords.lng;
          }
        }

        const haveCenter = centerLat != null && centerLng != null;

        // 2) Fetch ONLY approved events
        let query = supabase
          .from("events")
          .select("*")
          .eq("status", "approved")
          .order("start_datetime", { ascending: true, nullsFirst: false });

        if (state) query = query.eq("state", state);

        const { data, error: fetchError } = await query;
        if (fetchError) throw fetchError;

        // 3) upcoming filter by calendar date
        const upcoming = (data || []).filter(isUpcomingByDate);

        // 4) attach distance (best-effort)
        const withDistance = await Promise.all(
          upcoming.map(async (ev) => {
            let evLat = ev.lat ?? ev.latitude ?? null;
            let evLng = ev.lng ?? ev.longitude ?? null;

            // Try city table if event missing coords
            if (evLat == null || evLng == null) {
              const evCoords = await getCoordsFromCitiesTable(
                normUpper(ev.state || state),
                cleanCity(ev.city || "")
              );
              if (evCoords) {
                evLat = evCoords.lat;
                evLng = evCoords.lng;
              }
            }

            let distance = null;
            if (haveCenter && evLat != null && evLng != null) {
              distance = distanceMiles(centerLat, centerLng, evLat, evLng);
            }

            return { ...ev, distance };
          })
        );

        // 5) filter by radius (if provided) else exact city/state
        const finalEvents = withDistance
          .filter((ev) => {
            const evCity = normLower(cleanCity(ev.city || ""));
            const wantCity = normLower(city);
            const evState = normUpper(ev.state || "");
            const wantState = state;

            if (radiusMiles > 0) {
              if (haveCenter) return ev.distance != null && ev.distance <= radiusMiles;
              // If no center, fall back to exact city/state
              return evCity === wantCity && evState === wantState;
            }

            return evCity === wantCity && evState === wantState;
          })
          .sort((a, b) => {
            const ta = new Date(a.start_datetime || 0).getTime() || 0;
            const tb = new Date(b.start_datetime || 0).getTime() || 0;
            if (ta !== tb) return ta - tb;
            return (a.distance ?? 0) - (b.distance ?? 0);
          });

        if (!cancelled) setEvents(finalEvents);
      } catch (err) {
        if (!cancelled) {
          setEvents([]);
          setError(err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchEvents();

    return () => {
      cancelled = true;
    };
  }, [params]);

  return useMemo(() => ({ events, loading, error }), [events, loading, error]);
}
