import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, MapPin, ExternalLink, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ShareButtons from '@/components/ShareButtons';
import ReportInfoModal from '@/components/ReportInfoModal';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { formatEventDate } from '@/utils/dateHelpers';

const SOURCE_BADGES = {
  manual: { label: 'Manual', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  bandsintown: { label: 'Bandsintown', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  ticketmaster: { label: 'Ticketmaster', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
  link: { label: 'Link', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' }
};

function FanEventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .eq('status', 'approved')
        .single();

      if (error) throw error;
      setEvent(data);
    } catch (error) {
      console.error('Error fetching event:', error);
      toast({
        variant: 'destructive',
        title: 'Event Not Found',
        description: 'This event could not be found or is no longer available.'
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleBackNavigation = () => {
    // Explicitly navigate to home/search page instead of history back (-1)
    // to prevent getting stuck or going to a blank page if opened in new tab
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] via-[#2a2a2a] to-[#1a1a1a] flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-4xl px-6">
          <div className="h-96 bg-white/10 rounded-xl" />
          <div className="h-8 bg-white/10 rounded w-3/4" />
          <div className="h-4 bg-white/10 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!event) return null;

  const badge = SOURCE_BADGES[event.source_type] || SOURCE_BADGES.manual;
  const fullAddress = [event.address, event.city, event.state, event.postal_code]
    .filter(Boolean)
    .join(', ');

  return (
    <>
      <Helmet>
        <title>{event.title} - Black Label Entertainment</title>
        <meta
          name="description"
          content={event.description || `${event.title} at ${event.venue_name} in ${event.city}, ${event.state}`}
        />
      </Helmet>
      <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] via-[#2a2a2a] to-[#1a1a1a]">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Button
              onClick={handleBackNavigation}
              variant="ghost"
              className="mb-6 text-[#D4AF37] hover:text-[#f4d03f] hover:bg-[#D4AF37]/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Search
            </Button>
          </motion.div>

          {event.image_url && (
            <motion.div
              className="relative h-96 rounded-2xl overflow-hidden mb-8 shadow-2xl"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <img
                src={event.image_url}
                alt={event.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
              <div className="absolute top-4 right-4">
                <span className={`px-4 py-2 rounded-full text-sm font-medium border ${badge.color}`}>
                  {badge.label}
                </span>
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-[#D4AF37] to-[#f4d03f] bg-clip-text text-transparent">
              {event.title}
            </h1>

            <div className="bg-white/5 backdrop-blur-lg rounded-xl p-8 mb-6 border border-[#D4AF37]/20 space-y-6">
              <div className="flex items-start gap-3">
                <Calendar className="w-6 h-6 text-[#D4AF37] mt-1 flex-shrink-0" />
                <div>
                  <div className="text-sm text-gray-400 mb-1">Date & Time</div>
                  <div className="text-xl font-semibold text-white">
                    {formatEventDate(event.start_datetime)}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-6 h-6 text-[#D4AF37] mt-1 flex-shrink-0" />
                <div>
                  <div className="text-sm text-gray-400 mb-1">Venue</div>
                  <div className="text-xl font-semibold text-white mb-1">
                    {event.venue_name}
                  </div>
                  {fullAddress && (
                    <div className="text-gray-400">{fullAddress}</div>
                  )}
                </div>
              </div>

              {event.description && (
                <div>
                  <div className="text-sm text-gray-400 mb-2">About</div>
                  <p className="text-white leading-relaxed whitespace-pre-line">
                    {event.description}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              {event.ticket_url && (
                <Button
                  onClick={() => window.open(event.ticket_url, '_blank')}
                  className="flex-1 bg-gradient-to-r from-[#D4AF37] to-[#f4d03f] hover:from-[#f4d03f] hover:to-[#D4AF37] text-black font-bold py-4 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105"
                >
                  <ExternalLink className="w-5 h-5 mr-2" />
                  Get Tickets
                </Button>
              )}
              <ShareButtons eventId={event.id} eventTitle={event.title} />
            </div>

            <button
              onClick={() => setShowReportModal(true)}
              className="flex items-center gap-2 text-gray-400 hover:text-[#D4AF37] transition-colors"
            >
              <Flag className="w-4 h-4" />
              Report incorrect info
            </button>
          </motion.div>
        </div>
      </div>

      <ReportInfoModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        eventId={event.id}
      />
    </>
  );
}

export default FanEventDetails;
