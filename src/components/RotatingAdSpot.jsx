import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const RotatingAdSpot = ({ ads = [], interval = 7000, className }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (ads.length <= 1 || isHovered) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ads.length);
    }, interval);

    return () => clearInterval(timer);
  }, [ads.length, interval, isHovered]);

  if (!ads.length) return null;

  const currentAd = ads[currentIndex];

  return (
    <div 
      className={cn("relative flex flex-col items-center w-full max-w-2xl mx-auto", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative h-24 w-full flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentAd.id}
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.5 }}
          >
            {currentAd.link ? (
              <a
                href={currentAd.link}
                target={currentAd.link.startsWith('/') ? "_self" : "_blank"}
                rel={currentAd.link.startsWith('/') ? "" : "noopener noreferrer"}
                className="h-full w-full flex items-center justify-center cursor-pointer"
              >
                <img
                  src={currentAd.imageUrl}
                  alt={currentAd.altText}
                  className="h-full w-auto object-contain hover:opacity-90 transition-opacity"
                />
              </a>
            ) : (
              <img
                src={currentAd.imageUrl}
                alt={currentAd.altText}
                className="h-full w-auto object-contain"
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {ads.length > 1 && (
        <div className="flex gap-2 mt-4 z-10">
          {ads.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                idx === currentIndex 
                  ? "bg-[#D4AF37] w-6" 
                  : "bg-gray-700 hover:bg-gray-500 w-1.5"
              )}
              aria-label={`View ad ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default RotatingAdSpot;
