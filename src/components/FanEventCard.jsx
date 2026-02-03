import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Navigation, Music } from 'lucide-react';
import { formatEventDate } from '@/utils/dateHelpers';
import { supabase } from '@/lib/customSupabaseClient';

function FanEventCard({ event, index }) {
  const navigate = useNavigate();

  // Prefer display_image_url (from your view), fallback to image_url (table)
  const rawImage = event?.display_image_url || event?.image_url || null;

  // Convert storage path -> public URL when needed
  const imageSrc = useMemo(() => {
    if (!rawImage) return null;

    // Already a full URL
    if (typeof rawImage === 'string' && rawImage.startsWith('http')) return rawImage;

    // Likely a Supabase Storage path (e.g. "profile_photos/klincher.jpg")
    try {
      const { data } = supabase.storage
        .from('artists') // ✅ CHANGE THIS if your bucket name is different
        .getPublicUrl(rawImage);

      return data?.publicUrl || null;
    } catch (e) {
      console.error('Failed to build public image URL:', e);
      return null;
    }
  }, [rawImage]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      onClick={() => navigate(`/fans/event/${event.id}`)}
      className="group cursor-pointer bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-lg rounded-xl overflow-hidden border border-[#D4AF37]/20 hover:border-[#D4AF37]/60 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105"
    >
      {imageSrc ? (
        <div className="relative h-48 overflow-hidden">
          <img
            src={imageSrc}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        </div>
      ) : (
        // Optional: keep a consistent card layout even without an image
        <div className="relative h-48 overflow-hidden bg-black/30 flex items-center justify-center">
          <Music className="w-12 h-12 text-white/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        </div>
      )}

      <div className="p-6">
        <h3 className="text-xl font-bold text-white mb-3 line-clamp-2 group-hover:text-[#D4AF37] transition-colors">
          {event.title}
        </h3>

        <div className="space-y-2 text-sm text-gray-400">
          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-[#D4AF37] mt-0.5 flex-shrink-0" />
            <span>{formatEventDate(event.start_datetime)}</span>
          </div>

          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-[#D4AF37] mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium text-white">{event.venue_name}</div>
              <div>{event.city}, {event.state}</div>
            </div>
          </div>

          {event.distance && (
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
