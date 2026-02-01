import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Filter, Calendar, MapPin, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FanEventCard from '@/components/FanEventCard';
import EventSkeleton from '@/components/EventSkeleton';
import { useEventSearch } from '@/hooks/useEventSearch';

function FanEventResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const state = searchParams.get('state') || '';
  const city = searchParams.get('city') || '';

  // IMPORTANT: keep this as a string for the UI control, convert to number for hook
  const radiusParam = searchParams.get('radius') || '25';
  const radius = useMemo(() => {
    const n = Number(radiusParam);
    return Number.isFinite(n) ? n : 25;
  }, [radiusParam]);

  // Optional: User might have come from "Use my location" which provides specific coords
  const paramLat = searchParams.get('lat');
  const paramLng = searchParams.get('lng');
  const userLat = paramLat ? parseFloat(paramLat) : null;
  const userLng = paramLng ? parseFloat(paramLng) : null;

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Use the hook for fetching and filtering
  const { events, loading, error } = useEventSearch(state, city, radius, userLat, userLng);

  // Client-side date filtering on top of the geo-filtered results
  const filteredEvents = events.filter((event) => {
    const eventTs = new Date(event.start_datetime || event.date).getTime();

    if (startDate) {
      const filterStart = new Date(startDate);
      filterStart.setHours(0, 0, 0, 0);
      if (Number.isFinite(eventTs) && eventTs < filterStart.getTime()) return false;
    }

    if (endDate) {
      const filterEnd = new Date(endDate);
      filterEnd.setHours(23, 59, 59, 999);
      if (Number.isFinite(eventTs) && eventTs > filterEnd.getTime()) return false;
    }

    return true;
  });

  // Radius options (miles)
  const radiusOptions = [10, 25, 50, 75, 100, 150, 200];

  // When radius changes, update URL query params (triggers hook rerun)
  const updateRadius = (nextRadius) => {
    const next = new URLSearchParams(searchParams);
    next.set('radius', String(nextRadius));
    setSearchParams(next, { replace: true });
  };

  return (
    <>
      <Helmet>
        <title>Events in {city}, {state} - Black Label Entertainment</title>
        <meta name="description" content={`Discover live events and concerts in ${city}, ${state}`} />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] via-[#2a2a2a] to-[#1a1a1a]">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Button
              onClick={() => navigate('/fans')}
              variant="ghost"
              className="mb-6 text-[#D4AF37] hover:text-[#f4d03f] hover:bg-[#D4AF37]/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Search
            </Button>

            <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-[#D4AF37] to-[#f4d03f] bg-clip-text text-transparent">
              Events in {city}, {state}
            </h1>

            <p className="text-gray-400 mb-8 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#D4AF37]" />
              Searching within {radius} miles
              {loading ? '...' : ` • ${filteredEvents.length} found`}
            </p>
          </motion.div>

          {/* Filters Section */}
          <motion.div
            className="bg-white/5 backdrop-blur-lg rounded-xl p-6 mb-8 border border-[#D4AF37]/20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-[#D4AF37]" />
              <h2 className="text-lg font-semibold text-white">Filters</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Radius control */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#D4AF37]" />
                  Radius (miles)
                </label>

                <select
                  value={String(radius)}
                  onChange={(e) => updateRadius(e.target.value)}
                  className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                >
                  {radiusOptions.map((opt) => (
                    <option key={opt} value={String(opt)}>
                      {opt} miles
                    </option>
                  ))}
                </select>

                <p className="text-xs text-gray-500 mt-2">
                  Changing radius updates the URL and refreshes results automatically.
                </p>
              </div>

              {/* Start date */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#D4AF37]" />
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                />
              </div>

              {/* End date */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#D4AF37]" />
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                />
              </div>
            </div>
          </motion.div>

          {/* Results Section */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <EventSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="bg-red-900/20 border border-red-900/50 p-6 rounded-xl text-center">
              <h3 className="text-xl font-bold text-red-400 mb-2">Error loading events</h3>
              <p className="text-gray-400">{error.message}</p>
              <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">
                Try Again
              </Button>
            </div>
          ) : filteredEvents.length === 0 ? (
            <motion.div
              className="text-center py-20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-12 border border-[#D4AF37]/20 max-w-md mx-auto">
                <Calendar className="w-16 h-16 text-[#D4AF37] mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">No Events Found</h3>
                <p className="text-gray-400 mb-6">
                  We couldn't find any events matching your search criteria.
                </p>
                <div className="flex flex-col gap-3">
                  <Button
                    onClick={() => navigate('/fans')}
                    variant="outline"
                    className="border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10"
                  >
                    Try another search
                  </Button>
                  <Button
                    onClick={() => navigate('/fans/submit')}
                    className="bg-gradient-to-r from-[#D4AF37] to-[#f4d03f] hover:from-[#f4d03f] hover:to-[#D4AF37] text-black"
                  >
                    Submit an Event
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {filteredEvents.map((event, index) => (
                <FanEventCard key={event.id} event={event} index={index} />
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </>
  );
}

export default FanEventResults;
