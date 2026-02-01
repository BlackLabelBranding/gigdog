import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Edit, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { formatEventDate } from '@/utils/dateHelpers';

function AdminModerationQueue() {
  const { toast } = useToast();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchPendingEvents();
  }, []);

  const fetchPendingEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching pending events:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load pending events'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (eventId) => {
    try {
      setActionLoading(eventId);
      const { error } = await supabase
        .from('events')
        .update({ status: 'approved' })
        .eq('id', eventId);

      if (error) throw error;

      setEvents(events.filter(e => e.id !== eventId));
      toast({
        title: 'Event Approved',
        description: 'The event has been approved and is now visible to users.'
      });
    } catch (error) {
      console.error('Error approving event:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to approve event'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (eventId) => {
    try {
      setActionLoading(eventId);
      const { error } = await supabase
        .from('events')
        .update({ status: 'rejected' })
        .eq('id', eventId);

      if (error) throw error;

      setEvents(events.filter(e => e.id !== eventId));
      toast({
        title: 'Event Rejected',
        description: 'The event has been rejected.'
      });
    } catch (error) {
      console.error('Error rejecting event:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to reject event'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    const startDate = event.start_datetime ? event.start_datetime.split('T')[0] : '';
    const startTime = event.start_datetime ? event.start_datetime.split('T')[1]?.substring(0, 5) : '';
    
    setEditFormData({
      title: event.title || '',
      start_date: startDate,
      start_time: startTime,
      venue_name: event.venue_name || '',
      address: event.address || '',
      city: event.city || '',
      state: event.state || '',
      postal_code: event.postal_code || '',
      description: event.description || '',
      ticket_url: event.ticket_url || '',
      image_url: event.image_url || ''
    });
  };

  const handleSaveEdit = async () => {
    try {
      const startDatetime = editFormData.start_time
        ? `${editFormData.start_date}T${editFormData.start_time}:00`
        : `${editFormData.start_date}T00:00:00`;

      const { error } = await supabase
        .from('events')
        .update({
          title: editFormData.title,
          start_datetime: startDatetime,
          venue_name: editFormData.venue_name,
          address: editFormData.address || null,
          city: editFormData.city,
          state: editFormData.state,
          postal_code: editFormData.postal_code || null,
          description: editFormData.description || null,
          ticket_url: editFormData.ticket_url || null,
          image_url: editFormData.image_url || null
        })
        .eq('id', editingEvent.id);

      if (error) throw error;

      toast({
        title: 'Event Updated',
        description: 'Event details have been saved.'
      });

      setEditingEvent(null);
      fetchPendingEvents();
    } catch (error) {
      console.error('Error updating event:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update event'
      });
    }
  };

  return (
    <>
      <Helmet>
        <title>Admin Moderation Queue - Black Label Entertainment</title>
        <meta name="description" content="Review and moderate pending event submissions" />
      </Helmet>
      <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] via-[#2a2a2a] to-[#1a1a1a]">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-[#D4AF37] to-[#f4d03f] bg-clip-text text-transparent">
              Moderation Queue
            </h1>
            <p className="text-gray-400 mb-8">
              {events.length} {events.length === 1 ? 'event' : 'events'} pending review
            </p>
          </motion.div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
            </div>
          ) : events.length === 0 ? (
            <motion.div
              className="text-center py-20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-12 border border-[#D4AF37]/20 max-w-md mx-auto">
                <AlertCircle className="w-16 h-16 text-[#D4AF37] mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">All Clear!</h3>
                <p className="text-gray-400">No pending events to review</p>
              </div>
            </motion.div>
          ) : (
            <div className="space-y-6">
              {events.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-[#D4AF37]/20"
                >
                  <div className="flex flex-col lg:flex-row gap-6">
                    {event.image_url && (
                      <img
                        src={event.image_url}
                        alt={event.title}
                        className="w-full lg:w-48 h-48 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">{event.title}</h3>
                      <div className="space-y-1 text-sm text-gray-400 mb-4">
                        <p>{formatEventDate(event.start_datetime)}</p>
                        <p>{event.venue_name}</p>
                        <p>{event.city}, {event.state}</p>
                        {event.description && (
                          <p className="mt-2 text-gray-300 line-clamp-2">{event.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`px-2 py-1 rounded ${
                          event.source_type === 'manual' ? 'bg-blue-500/20 text-blue-300' :
                          event.source_type === 'bandsintown' ? 'bg-purple-500/20 text-purple-300' :
                          event.source_type === 'ticketmaster' ? 'bg-green-500/20 text-green-300' :
                          'bg-orange-500/20 text-orange-300'
                        }`}>
                          {event.source_type}
                        </span>
                        <span className="text-gray-500">
                          Submitted {new Date(event.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex lg:flex-col gap-2">
                      <Button
                        onClick={() => handleApprove(event.id)}
                        disabled={actionLoading === event.id}
                        className="flex-1 lg:flex-none bg-green-600 hover:bg-green-700 text-white"
                      >
                        {actionLoading === event.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => handleReject(event.id)}
                        disabled={actionLoading === event.id}
                        variant="destructive"
                        className="flex-1 lg:flex-none"
                      >
                        {actionLoading === event.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => handleEdit(event)}
                        variant="outline"
                        className="flex-1 lg:flex-none border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!editingEvent} onOpenChange={() => setEditingEvent(null)}>
        <DialogContent className="bg-[#1a1a1a] border-[#D4AF37]/20 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#D4AF37]">Edit Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <input
                type="text"
                value={editFormData.title || ''}
                onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Date</label>
                <input
                  type="date"
                  value={editFormData.start_date || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, start_date: e.target.value })}
                  className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Time</label>
                <input
                  type="time"
                  value={editFormData.start_time || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, start_time: e.target.value })}
                  className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Venue</label>
              <input
                type="text"
                value={editFormData.venue_name || ''}
                onChange={(e) => setEditFormData({ ...editFormData, venue_name: e.target.value })}
                className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">City</label>
                <input
                  type="text"
                  value={editFormData.city || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                  className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">State</label>
                <input
                  type="text"
                  value={editFormData.state || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                  className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={editFormData.description || ''}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                rows={3}
                className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37] resize-none"
              />
            </div>
            <Button
              onClick={handleSaveEdit}
              className="w-full bg-gradient-to-r from-[#D4AF37] to-[#f4d03f] hover:from-[#f4d03f] hover:to-[#D4AF37] text-black font-bold"
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AdminModerationQueue;
