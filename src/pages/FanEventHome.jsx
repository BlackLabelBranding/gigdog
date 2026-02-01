import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/customSupabaseClient";

const US_STATES = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"],
  ["CA", "California"], ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"],
  ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"], ["ID", "Idaho"],
  ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"],
  ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"], ["MD", "Maryland"],
  ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"], ["MS", "Mississippi"],
  ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"], ["NV", "Nevada"],
  ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"], ["NY", "New York"],
  ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"],
  ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"], ["SC", "South Carolina"],
  ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"],
  ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"], ["WV", "West Virginia"],
  ["WI", "Wisconsin"], ["WY", "Wyoming"],
];

export default function FanEventHome() {
  const navigate = useNavigate();

  const [stateCode, setStateCode] = useState("");
  const [city, setCity] = useState("");
  const [radius, setRadius] = useState(25);

  const [cities, setCities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [citiesError, setCitiesError] = useState(null);

  const canSearch = useMemo(() => Boolean(stateCode) && Boolean(city), [stateCode, city]);

  useEffect(() => {
    let cancelled = false;

    async function loadCities() {
      setCities([]);
      setCity("");
      setCitiesError(null);

      if (!stateCode) return;

      setCitiesLoading(true);
      try {
        const { data, error } = await supabase
          .from("cities")
          .select("city_name")
          .eq("state", stateCode)
          .order("city_name", { ascending: true })
          .limit(5000);

        if (error) throw error;

        const list = Array.isArray(data)
          ? data.map((r) => r.city_name).filter(Boolean)
          : [];

        // de-dupe
        const unique = Array.from(new Set(list));

        if (!cancelled) setCities(unique);
      } catch (e) {
        if (!cancelled) {
          setCitiesError(e?.message || "Could not load cities");
          setCities([]);
        }
      } finally {
        if (!cancelled) setCitiesLoading(false);
      }
    }

    loadCities();
    return () => {
      cancelled = true;
    };
  }, [stateCode]);

  const onSearch = (e) => {
    e.preventDefault();
    if (!canSearch) return;

    const params = new URLSearchParams({
      state: stateCode,
      city,
      radius: String(radius),
    });

    navigate(`/fans/results?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto w-full max-w-4xl px-6 py-10">
        <div className="mb-8">
          <div className="text-xs uppercase tracking-[0.25em] text-white/50">
            Black Label Entertainment
          </div>
          <h1 className="mt-2 text-3xl font-semibold">Find Shows Near You</h1>
          <p className="mt-2 text-white/70">
            Discover live concerts and events in your area.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_0_60px_rgba(0,0,0,0.65)]">
          <form onSubmit={onSearch} className="grid gap-4">
            {/* State */}
            <label className="grid gap-2">
              <span className="text-sm text-white/80">State</span>
              <select
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
                className="h-11 rounded-xl border border-white/10 bg-black/30 px-3 outline-none focus:border-white/25"
              >
                <option value="">Select a state</option>
                {US_STATES.map(([code, name]) => (
                  <option key={code} value={code}>
                    {name} ({code})
                  </option>
                ))}
              </select>
            </label>

            {/* City */}
            <label className="grid gap-2">
              <span className="text-sm text-white/80">City</span>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={!stateCode || citiesLoading || cities.length === 0}
                className="h-11 rounded-xl border border-white/10 bg-black/30 px-3 outline-none focus:border-white/25 disabled:opacity-60"
              >
                {!stateCode ? (
                  <option value="">Select a state first</option>
                ) : citiesLoading ? (
                  <option value="">Loading cities…</option>
                ) : cities.length === 0 ? (
                  <option value="">
                    {citiesError ? "Cities unavailable" : "No cities found"}
                  </option>
                ) : (
                  <>
                    <option value="">Select a city</option>
                    {cities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </>
                )}
              </select>

              {citiesError ? (
                <div className="text-xs text-red-300">
                  {citiesError} (check Supabase RLS on `cities`)
                </div>
              ) : null}
            </label>

            {/* Radius */}
            <label className="grid gap-2">
              <span className="text-sm text-white/80">Search radius</span>
              <select
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="h-11 rounded-xl border border-white/10 bg-black/30 px-3 outline-none focus:border-white/25"
              >
                <option value={5}>5 mi</option>
                <option value={10}>10 mi</option>
                <option value={25}>25 mi</option>
                <option value={50}>50 mi</option>
                <option value={100}>100 mi</option>
              </select>
            </label>

            <button
              type="submit"
              disabled={!canSearch}
              className="mt-2 h-12 rounded-xl border border-white/15 bg-white/10 font-semibold hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Find Events
            </button>

            <div className="mt-2 flex flex-wrap gap-3 text-sm text-white/75">
              <Link className="hover:text-white" to="/fans/submit">
                Submit a show
              </Link>
              <span className="text-white/30">•</span>
              <Link className="hover:text-white" to="/fans/submit">
                I’m a venue/promoter
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
