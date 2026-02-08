// src/components/FanEventCard.jsx
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, MapPin, Navigation, Music } from "lucide-react";
import { formatEventDate } from "@/utils/dateHelpers";
import { supabase } from "@/lib/customSupabaseClient";

function FanEventCard({ event, index }) {
  const navigate = useNavigate();

  /**
   * ✅ IMPORTANT:
   * Your DB view `v_gigdog_event_cards` returns `card_image_url` which is already a best-choice URL.
   * Priority is handled in SQL: band image first, venue second, etc.
   *
   * We still keep `display_image_url` as a legacy fallback just in case.
   */
  const rawImage =
    event?.card_image_url ||
    event?.display_image_url ||
    null;

  /**
   * Convert storage path -> public URL only if we received a path (not a full URL).
   * In your current view, `card_image_url` should already be a full URL most of the time,
   * so this will usually just return the same URL.
   */
  const imageSrc = useMemo(() => {
    if (!rawImage) return null;

    if (typeof rawImage === "string") {
      const s = rawImage.trim();
      if (!s) return null;

      // Already a usable absolute URL (Supabase public URL, CDN URL, etc.)
      if (s.startsWith("http://") || s.startsWith("https://")) return s;

      // Looks like a Supabase Storage path. We attempt buckets in a sane order.
      // NOTE: This only works if the path corresponds to a file in that bucket.
      const candidateBuckets = ["artists", "venues", "public", "images"];

      for (const bucket of candidateBuckets) {
        try {
          const { data } = supabase.storage.from(bucket).getPublicUrl(s);
          const url = data?.publicUrl;
          if (url && typeof url === "string" && url.startsWith("http")) return url;
        } catch {
          // ignore and try next bucket
        }
      }

      // If we couldn't build it, return null so UI uses placeholder.
      return null;
    }

    return null;
  }, [rawImage]);

  const onOpen = () => navigate(`/fans/event/${event.id}`);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      onClick={onOpen}
      className="group cursor-pointer bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-lg rounded-xl overflow-hidden border border-[#D4AF37]/20 hover:border-[#D4AF37]/60 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105"
    >
      {imageSrc ? (
        <div className="relative h-48 overflow-hidden">
          <img
            src={imageSrc}
            alt={event?.title || "Event"}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            loading="lazy"
            onError={(e) => {
              // If image fails to load, fall back to the placeholder block
              e.currentTarget.style.display = "none";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        </div>
      ) : (
        <div className="relative h-48 overflow-hidden bg-black/30 flex items-center justify-center">
          <Music className="w-12 h-12 text-white/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        </div>
      )}

      <div className="p-6">
        <h3 className="text-xl font-bold text-white mb-3 line-clamp-2 group-hover:text-[#D4AF37] transition-colors">
          {event?.title || "Untitled Event"}
        </h3>

        <div className="space-y-2 text-sm text-gray-400">
          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-[#D4AF37] mt-0.5 flex-shrink-0" />
            <span>{formatEventDate(event?.start_datetime || event?.date)}</span>
          </div>

          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-[#D4AF37] mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium text-white">
                {event?.venue_name || "Venue TBD"}
              </div>
              <div>
                {event?.city || "City"}, {event?.state || "State"}
              </div>
            </div>
          </div>

          {Number.isFinite(event?.distance) && (
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-[#D4AF37]" />
              <span>{event.distance.toFixed(1)} miles away</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default FanEventCard;
