'use client'
// pages/create.js
import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AnimatePresence } from 'framer-motion';

export default function CreateRoom() {
  const router = useRouter();
  const [isUiVisible, setIsUiVisible] = useState(true);
  
  const [roomSettings, setRoomSettings] = useState({
    maxPlayers: 4,
    questionsPerRound: 3,
    timePerRound: 60,
    theme: 'general'
  });

  const themes = [
    { id: 'general', label: 'General' },
    { id: 'quirky', label: 'Quirky' },
    { id: 'hypotheticals', label: 'Hypothetical' },
    { id: 'experiences', label: 'Experiences' },
    { id: 'philosophical', label: 'Philosophical' },
    { id: 'romantic', label: 'Romantic' },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setRoomSettings({
      ...roomSettings,
      [name]: value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Here you would typically handle room creation
    console.log('Creating room with settings:', roomSettings);
    // For demo purposes, redirect to a hypothetical room page
    setTimeout(() => {
      router.push('/room/new-room-id');
    }, 200);
  };

  const handleGoBack = () => {
    setIsUiVisible(false);
    // Add a small delay to allow the animation to play
    setTimeout(() => {
      router.push('/');
    }, 200);
  };

  // Animation variants
  const pageVariants = {
    initial: {
      opacity: 0,
      x: 100,
      scale: 0.95,
    },
    enter: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        duration: 0.2,
        ease: [0.61, 1, 0.88, 1],
      }
    },
    exit: {
      opacity: 0,
      x: 100,
      transition: {
        duration: 0.2,
        ease: [0.61, 1, 0.88, 1],
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
    <AnimatePresence>
    {isUiVisible && <motion.div
      key="ui"
      initial="initial"
      animate="enter"
      exit="exit"
      variants={pageVariants}
      className="flex flex-col items-center justify-center min-h-screen bg-gray-100"
    >
      <Head>
        <title>Create New Room | Turing Game</title>
        <meta name="description" content="Create a new Turing Game room" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex flex-col items-center justify-center w-full flex-1 px-4 sm:px-20">
        <h1 className="text-4xl font-bold mb-8 text-gray-900">
          Create New Room
        </h1>

        <motion.div 
          className="bg-white rounded-lg shadow-md p-6 w-full max-w-md mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="maxPlayers" className="block text-gray-700 text-lg font-medium mb-2">Max Players</label>
              <select
                id="maxPlayers"
                name="maxPlayers"
                value={roomSettings.maxPlayers}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                {[2, 3, 4, 5, 6, 7, 8].map(num => (
                  <option key={num} value={num}>{num} players</option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label htmlFor="questionsPerRound" className="block text-gray-700 text-lg font-medium mb-2">Questions/Round</label>
              <select
                id="questionsPerRound"
                name="questionsPerRound"
                value={roomSettings.questionsPerRound}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                {[1, 2, 3, 4, 5].map(num => (
                  <option key={num} value={num}>{num} questions</option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label htmlFor="timePerRound" className="block text-gray-700 text-lg font-medium mb-2">Time/Round</label>
              <select
                id="timePerRound"
                name="timePerRound"
                value={roomSettings.timePerRound}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="15">15 seconds</option>
                <option value="30">30 seconds</option>
                <option value="45">45 seconds</option>
                <option value="60">60 seconds</option>
                <option value="90">90 seconds</option>
                <option value="120">120 seconds</option>
              </select>
            </div>

            <div className="mb-6">
              <label htmlFor="theme" className="block text-gray-700 text-lg font-medium mb-2">Theme</label>
              <select
                id="theme"
                name="theme"
                value={roomSettings.theme}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                {themes.map(theme => (
                  <option key={theme.id} value={theme.id}>
                    {theme.label}
                  </option>
                ))}
              </select>
            </div>
          </form>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 w-full max-w-md">
          <motion.button 
            onClick={handleSubmit}
            className="flex items-center justify-center bg-yellow-400 rounded-lg py-4 px-8 hover:bg-yellow-500 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="text-2xl font-medium text-gray-800">Create Room</span>
          </motion.button>
          
          <motion.button 
            onClick={handleGoBack}
            className="flex items-center justify-center bg-gray-200 rounded-lg py-4 px-8 hover:bg-gray-300 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="text-2xl font-medium text-gray-800">Go Back</span>
          </motion.button>
        </div>
      </main>
    </motion.div>}
    </AnimatePresence>
    </div>
  );
}