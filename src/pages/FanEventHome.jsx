import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function FanEventHome() {
  const navigate = useNavigate();

  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [radius, setRadius] = useState(25);

  const canSearch = useMemo(() => {
    return Boolean(state) && Boolean(city);
  }, [state, city]);

  const onSearch = (e) => {
    e.preventDefault();
    if (!canSearch) return;

    const params = new URLSearchParams({
      state,
      city,
      radius: String(radius),
    });

    navigate(`/fans/results?${params.toString()}`);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0b0b0f", color: "white" }}>
      {/* HERO */}
      <div
        style={{
          width: "100%",
          maxHeight: "420px",
          overflow: "hidden",
          background: "black",
        }}
      >
        {/* Replace src with whatever your logo path is */}
        <img
          src="/blacklabel-entertainment.jpg"
          alt="Black Label Entertainment"
          style={{
            width: "100%",
            height: "420px",
            objectFit: "cover",
            display: "block",
          }}
          onError={(e) => {
            // fallback if image missing
            e.currentTarget.style.display = "none";
          }}
        />
      </div>

      {/* CONTENT */}
      <div
        style={{
          maxWidth: "980px",
          margin: "0 auto",
          padding: "24px",
        }}
      >
        <h1 style={{ fontSize: "24px", marginBottom: "6px" }}>Find Shows Near You</h1>
        <p style={{ opacity: 0.8, marginBottom: "18px" }}>
          Discover live concerts and events in your area.
        </p>

        <div
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "16px",
            padding: "16px",
          }}
        >
          <form onSubmit={onSearch} style={{ display: "grid", gap: "12px" }}>
            <label style={{ display: "grid", gap: "6px" }}>
              <span style={{ fontSize: "12px", opacity: 0.85 }}>State</span>
              <input
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g. IL"
                style={{
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "rgba(0,0,0,0.35)",
                  color: "white",
                }}
              />
            </label>

            <label style={{ display: "grid", gap: "6px" }}>
              <span style={{ fontSize: "12px", opacity: 0.85 }}>City</span>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. St. Louis"
                style={{
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "rgba(0,0,0,0.35)",
                  color: "white",
                }}
              />
            </label>

            <label style={{ display: "grid", gap: "6px" }}>
              <span style={{ fontSize: "12px", opacity: 0.85 }}>Search radius</span>
              <select
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                style={{
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "rgba(0,0,0,0.35)",
                  color: "white",
                }}
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
              style={{
                marginTop: "6px",
                padding: "12px 14px",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.18)",
                background: canSearch ? "#6d28d9" : "rgba(255,255,255,0.12)",
                color: "white",
                fontWeight: 600,
                cursor: canSearch ? "pointer" : "not-allowed",
              }}
            >
              Find Events
            </button>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <a href="/fans/submit" style={{ color: "white", opacity: 0.9 }}>
                Submit a show
              </a>
              <span style={{ opacity: 0.5 }}>•</span>
              <a href="/fans/submit" style={{ color: "white", opacity: 0.9 }}>
                I’m a venue/promoter
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
