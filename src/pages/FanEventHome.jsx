import React, { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, Search, Radio, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/customSupabaseClient";

// Matches the "gold" vibe used on your results page
const GOLD = "#D4AF37";
const GOLD_2 = "#f4d03f";

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
  ["WI", "Wisconsin"], ["WY", "Wyoming"], ["DC", "District of Columbia"],
];

const RADIUS_OPTIONS = [5, 10, 25, 50, 100];

export default function FanEventHome() {
  const navigate = useNavigate();

  const [stateCode, setStateCode] = useState("");
  const [city, setCity] = useState("");
  const [radius, setRadius] = useState(25);

  const [cities, setCities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [citiesError, setCitiesError] = useState("");

  const canSearch = useMemo(
    () => Boolean(stateCode) && Boolean(city),
    [stateCode, city]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadCities() {
      setCities([]);
      setCity("");
      setCitiesError("");

      if (!stateCode) return;

      setCitiesLoading(true);
      try {
        const { data, error } = await supabase
          .from("cities")
          .select("id, city_name, state")
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
        if (!cancelled) setCitiesError(e?.message || "Could not load cities.");
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
    <>
      <Helmet>
        <title>Find Live Events Near You - Black Label Entertainment</title>
        <meta
          name="description"
          content="Discover concerts, shows, and live entertainment events in your area."
        />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-[#121212] via-[#1a1a1a] to-[#121212] text-white flex items-center justify-center px-6 py-14">
        <div className="w-full max-w-3xl">
          {/* Top label */}
          <div className="text-xs uppercase tracking-[0.35em] text-white/45 mb-3">
            Black Label Entertainment
          </div>

          {/* Title */}
          <h1
            className="text-4xl md:text-5xl font-bold mb-3"
            style={{
              backgroundImage: `linear-gradient(90deg, ${GOLD}, ${GOLD_2})`,
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            Find Shows Near You
          </h1>

          <p className="text-white/65 text-lg mb-10">
            Discover live concerts and events in your area.
          </p>

          {/* Card */}
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-7 md:p-8 shadow-2xl border border-[#D4AF37]/20">
            {citiesError ? (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-200">
                  <p className="font-semibold">Unable to load city list</p>
                  <p className="opacity-90">{citiesError}</p>
                </div>
              </div>
            ) : null}

            <form onSubmit={onSearch} className="space-y-6">
              {/* State */}
              <div>
                <label className="block text-sm font-medium text-white/75 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" style={{ color: GOLD }} />
                  State
                </label>

                <div className="relative">
                  <select
                    value={stateCode}
                    onChange={(e) => setStateCode(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 transition-all appearance-none"
                    style={{ "--tw-ring-color": GOLD }}
                  >
                    <option value="" className="bg-[#1a1a1a]">
                      Select a state
                    </option>
                    {US_STATES.map(([code, name]) => (
                      <option key={code} value={code} className="bg-[#1a1a1a]">
                        {name} ({code})
                      </option>
                    ))}
                  </select>

                  {citiesLoading ? (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 animate-spin" style={{ color: GOLD }} />
                    </div>
                  ) : null}
                </div>
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-medium text-white/75 mb-2 flex items-center gap-2">
                  <Search className="w-4 h-4" style={{ color: GOLD }} />
                  City
                </label>

                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={!stateCode || citiesLoading || cities.length === 0}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ "--tw-ring-color": GOLD }}
                >
                  {!stateCode ? (
                    <option value="" className="bg-[#1a1a1a]">
                      Select a state first
                    </option>
                  ) : citiesLoading ? (
                    <option value="" className="bg-[#1a1a1a]">
                      Loading cities...
                    </option>
                  ) : cities.length === 0 ? (
                    <option value="" className="bg-[#1a1a1a]">
                      No cities found
                    </option>
                  ) : (
                    <>
                      <option value="" className="bg-[#1a1a1a]">
                        Select a city
                      </option>
                      {cities.map((c) => (
                        <option key={c} value={c} className="bg-[#1a1a1a]">
                          {c}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              {/* Radius */}
              <div>
                <label className="block text-sm font-medium text-white/75 mb-3 flex items-center gap-2">
                  <Radio className="w-4 h-4" style={{ color: GOLD }} />
                  Search Radius
                </label>

                <div className="flex flex-wrap gap-3">
                  {RADIUS_OPTIONS.map((r) => (
                    <button
                      type="button"
                      key={r}
                      onClick={() => setRadius(r)}
                      className={`px-6 py-2 rounded-xl font-medium transition-all ${
                        radius === r
                          ? "text-black shadow-lg scale-[1.03]"
                          : "bg-black/40 text-white/75 hover:text-white border border-white/10 hover:border-white/20"
                      }`}
                      style={
                        radius === r
                          ? {
                              backgroundImage: `linear-gradient(90deg, ${GOLD}, ${GOLD_2})`,
                            }
                          : undefined
                      }
                    >
                      {r} mi
                    </button>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <button
                type="submit"
                disabled={!canSearch}
                className="w-full font-bold py-4 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  backgroundImage: `linear-gradient(90deg, ${GOLD}, ${GOLD_2})`,
                  color: "#111",
                }}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <Search className="w-5 h-5" />
                  Find Events
                </span>
              </button>

              {/* Footer link: ONLY ONE (removed venue/promoter) */}
              <div className="pt-2 flex justify-center">
                <Link
                  to="/fans/submit"
                  className="font-medium transition-colors underline-offset-4 hover:underline"
                  style={{ color: GOLD }}
                >
                  Submit a show
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
