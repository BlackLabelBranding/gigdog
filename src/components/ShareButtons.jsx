import React from 'react';
import { Share2, Facebook, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

function ShareButtons({ eventId, eventTitle }) {
  const { toast } = useToast();

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/fans/event/${eventId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: 'Link Copied!',
        description: 'Event link has been copied to clipboard'
      });
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to Copy',
        description: 'Could not copy link to clipboard'
      });
    }
  };

  const handleFacebookShare = () => {
    const url = `${window.location.origin}/fans/event/${eventId}`;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
  };

  return (
    <div className="flex gap-3">
      <Button
        onClick={handleCopyLink}
        variant="outline"
        className="flex-1 border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10"
      >
        <Copy className="w-4 h-4 mr-2" />
        Copy Link
      </Button>
      <Button
        onClick={handleFacebookShare}
        variant="outline"
        className="flex-1 border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10"
      >
        <Facebook className="w-4 h-4 mr-2" />
        Share
      </Button>
    </div>
  );
}

export default ShareButtons;
