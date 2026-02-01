import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const ISSUE_TYPES = [
  { value: 'wrong_date', label: 'Wrong date/time' },
  { value: 'wrong_venue', label: 'Wrong venue' },
  { value: 'duplicate', label: 'Duplicate event' },
  { value: 'other', label: 'Other' }
];

function ReportInfoModal({ isOpen, onClose, eventId }) {
  const { toast } = useToast();
  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!issueType || !description) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please select an issue type and provide a description'
      });
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await supabase
        .from('event_reports')
        .insert([{
          event_id: eventId,
          issue_type: issueType,
          description,
          email: email || null
        }]);

      if (error) throw error;

      toast({
        title: 'Report Submitted',
        description: 'Thank you for reporting this issue. We will review it shortly.'
      });

      setIssueType('');
      setDescription('');
      setEmail('');
      onClose();
    } catch (error) {
      console.error('Error submitting report:', error);
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: 'Failed to submit report. Please try again.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1a1a] border-[#D4AF37]/20 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#D4AF37]">
            Report Incorrect Information
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium mb-2">Issue Type *</label>
            <select
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
              required
              className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
            >
              <option value="" className="bg-[#1a1a1a]">Select issue type</option>
              {ISSUE_TYPES.map(type => (
                <option key={type.value} value={type.value} className="bg-[#1a1a1a]">
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              placeholder="Please describe the issue..."
              className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email (optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
            />
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-[#D4AF37] to-[#f4d03f] hover:from-[#f4d03f] hover:to-[#D4AF37] text-black font-bold"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Report'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ReportInfoModal;
