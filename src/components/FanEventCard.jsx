import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Navigation } from 'lucide-react';
import { formatEventDate } from '@/utils/dateHelpers';

function FanEventCard({ event, index }) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      onClick={() => navigate(`/fans/event/${event.id}`)}
      className="group cursor-pointer bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-lg rounded-xl overflow-hidden border border-[#D4AF37]/20 hover:border-[#D4AF37]/60 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105"
    >
      {event.image_url && (
        <div className="relative h-48 overflow-hidden">
          <img
            src={event.image_url}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            loading="lazy"
          />
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
