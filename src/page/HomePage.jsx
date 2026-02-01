import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import HeroImage from '@/components/HeroImage';
import WelcomeMessage from '@/components/WelcomeMessage';
import CallToAction from '@/components/CallToAction';

function HomePage() {
  return (
    <>
      <Helmet>
        <title>Black Label Entertainment - Your Entertainment Hub</title>
        <meta
          name="description"
          content="Discover live events, concerts, and entertainment near you with Black Label Entertainment"
        />
      </Helmet>
      <div
        className="min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden relative"
        style={{
          background: `radial-gradient(100% 100% at 50% 100%, var(--Gradients-Main-Color-4, #FF9875) 0%, var(--Gradients-Main-Color-3, #B452FF) 15%, var(--Gradients-Main-Color-2, #673DE6) 30%, var(--neutral--800, #1a1b1e) 80%)`
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="flex flex-col items-center gap-4 w-full max-w-[448px]"
        >
          <HeroImage />
          <div className="flex flex-col gap-1 w-full text-center">
            <CallToAction />
            <WelcomeMessage />
          </div>
        </motion.div>
      </div>
    </>
  );
}

export default HomePage;
