'use client'
// pages/create.js
import { useState, ChangeEvent, MouseEvent } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AnimatePresence } from 'framer-motion';
import ActionButton from '@/components/ActionButton'; // Import the ActionButton component

export default function CreateRoom() {
  const router = useRouter();
  const [isUiVisible, setIsUiVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [roomSettings, setRoomSettings] = useState({
    maxPlayers: 4,
    questionsPerRound: 3,
    timePerRound: 60,
    timePerVote: 60,
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

  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setRoomSettings({
      ...roomSettings
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Check if the player is already in a room
      const storedPlayerInfo = localStorage.getItem('turingGame_player');
      if (storedPlayerInfo) {
        throw new Error("Player already in a room [" + JSON.parse(storedPlayerInfo).roomCode + "]")
      }

      const response = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...roomSettings
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }

      // Store user data in localStorage for persistence
      localStorage.setItem('turingGame_player', JSON.stringify({
        id: data.player.playerId,
        name: data.player.playerName,
        isHost: true,
        roomId: data.room.roomId,
        roomCode: data.room.roomCode
      }));

      // Navigate to the room
      setIsUiVisible(false);
      setTimeout(() => {
        router.push(`/room/${data.room.roomCode}`);
      }, 200);
    } catch (err) {
      const errorMsg = "Failed to create room" + (err.message? (": " + err.message) : "");
      // console.error(errorMsg);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    setIsUiVisible(false);
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

        {error && (
          <motion.div 
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6 w-full max-w-md"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error}
          </motion.div>
        )}

        <motion.div 
          className="bg-white rounded-lg shadow-md p-6 w-full max-w-md mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <form>
            <div className="mb-3">
              <label htmlFor="maxPlayers" className="block text-gray-700 text-lg font-medium mb-1">Max Players</label>
              <select
                id="maxPlayers"
                name="maxPlayers"
                defaultValue={roomSettings.maxPlayers}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                {[2, 3, 4, 5, 6, 7, 8].map(num => (
                  <option key={num} value={num}>{num} players</option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label htmlFor="questionsPerRound" className="block text-gray-700 text-lg font-medium mb-1">Questions/Round</label>
              <select
                id="questionsPerRound"
                name="questionsPerRound"
                defaultValue={roomSettings.questionsPerRound}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                {[1, 2, 3, 4, 5].map(num => (
                  <option key={num} value={num}>{num} questions</option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label htmlFor="timePerRound" className="block text-gray-700 text-lg font-medium mb-1">Time/Round</label>
              <select
                id="timePerRound"
                name="timePerRound"
                defaultValue={roomSettings.timePerRound}
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

            <div className="mb-3">
              <label htmlFor="timePerVote" className="block text-gray-700 text-lg font-medium mb-1">Time/Vote</label>
              <select
                id="timePerVote"
                name="timePerVote"
                defaultValue={roomSettings.timePerVote}
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

            <div className="mb-3">
              <label htmlFor="theme" className="block text-gray-700 text-lg font-medium mb-1">Theme</label>
              <select
                id="theme"
                name="theme"
                defaultValue={roomSettings.theme}
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
          <ActionButton 
            text="Create Room"
            onClick={handleSubmit}
            variant="primary"
            disabled={isLoading}
          />
          
          <ActionButton 
            text="Go Back"
            onClick={handleGoBack}
            variant="default"
            disabled={isLoading}
          />
        </div>
      </main>
    </motion.div>}
    </AnimatePresence>
    </div>
  );
}