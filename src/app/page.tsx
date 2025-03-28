'use client'
// app/page.tsx
import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AnimatePresence } from 'framer-motion';

import { pageTransitions } from '@/configs/animations';
import ChangeLogPopup from '@/components/ChangeLogPopup';
import ActionButton from '@/components/ActionButton';
import changeLogData from '@/data/changelog.json';

export default function Home() {
  const router = useRouter();
  const [isUiVisible, setIsUiVisible] = useState(true);
  const [showChangeLog, setShowChangeLog] = useState(false);

  const handleCreate = () => {
    setIsUiVisible(false);
    setTimeout(() => {
      router.push('/create');
    }, 200);
  };
  
  const handleJoin = () => {
    setIsUiVisible(false);
    setTimeout(() => {
      router.push('/join');
    }, 200);
  };

  const handleOpenChangeLog = () => {
    setShowChangeLog(true);
  };

  const handleCloseChangeLog = () => {
    setShowChangeLog(false);
  };

  const handleHowToPlay = () => {
    // Add your how to play logic here
    console.log('How to play clicked');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <ChangeLogPopup 
        isOpen={showChangeLog} 
        onClose={handleCloseChangeLog} 
        changeLog={changeLogData} 
      />
      
      <AnimatePresence>
        {isUiVisible && <motion.div
          key="ui"
          initial="initial"
          animate="enter"
          exit="exit"
          variants={pageTransitions}
        >
          <Head>
            <title>Turing Game</title>
            <meta name="description" content="An online multiplayer game for human who want to see if they are a NPC." />
            <link rel="icon" href="/logo.ico" />
          </Head>
          <main className="flex flex-col items-center justify-center w-full flex-1 px-4 sm:px-20 text-center">
            <h1 className="text-6xl font-bold mb-4 mt-8 text-gray-900">
              Turing Game
            </h1>
            <p className="text-2xl text-gray-700 mb-12">
              Social deduction between human & AI
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6 w-full max-w-md">
              <motion.button 
                onClick={handleJoin}
                className="flex flex-col items-center justify-center bg-yellow-400 rounded-lg py-8 px-4 hover:bg-yellow-500 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="bg-orange-400 p-4 rounded-lg mb-4">
                  <svg className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                </div>
                <span className="text-3xl font-medium text-gray-800">Play</span>
              </motion.button>
              
              <motion.button 
                onClick={handleCreate}
                className="flex flex-col items-center justify-center bg-gray-200 rounded-lg py-8 px-4 hover:bg-gray-300 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="bg-gray-500 p-4 rounded-lg mb-4">
                  <svg className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19,13h-6v6h-2v-6H5v-2h6V5h2v6h6V13z" />
                  </svg>
                </div>
                <span className="text-3xl font-medium text-gray-800">Create</span>
              </motion.button>
            </div>

            <div className="flex flex-col gap-4 w-full max-w-md">
              <ActionButton 
                text="How To Play"
                onClick={handleHowToPlay}
              />
              
              <ActionButton 
                text="Recent Changes"
                onClick={handleOpenChangeLog}
              />
            </div>
          </main>
        </motion.div>}
      </AnimatePresence>
    </div>
  );
}