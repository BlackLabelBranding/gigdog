import React from 'react';

function EventSkeleton() {
  return (
    <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-lg rounded-xl overflow-hidden border border-[#D4AF37]/20 shadow-lg animate-pulse">
      <div className="h-48 bg-white/10" />
      <div className="p-6 space-y-3">
        <div className="h-6 bg-white/10 rounded w-3/4" />
        <div className="h-4 bg-white/10 rounded w-1/2" />
        <div className="h-4 bg-white/10 rounded w-2/3" />
        <div className="h-4 bg-white/10 rounded w-1/3" />
      </div>
    </div>
  );
}

export default EventSkeleton;
