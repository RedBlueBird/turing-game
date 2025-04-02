'use client'
// app/create/page.tsx
import { useState, ChangeEvent, MouseEvent } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AnimatePresence } from 'framer-motion';
import { Tooltip } from 'react-tooltip';

import ActionButton from '@/components/ActionButton';
import { pageTransitions } from '@/configs/animations';
import { PlayerData, RoomSettings, StoredData } from '@/configs/interfaces';
import { ErrorMessage } from '@/components/ErrorMessage';
import { 
  PLAYER_COUNT_OPTIONS, 
  QUESTIONS_PER_ROUND_OPTIONS, 
  TIME_OPTIONS, 
  THEMES 
} from '@/configs/consts';
import rolesData from '@/data/roles.json';

export default function CreateRoom() {
  const router = useRouter();
  const [isUiVisible, setIsUiVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [roomSettings, setRoomSettings] = useState<RoomSettings>({
    maxPlayers: 8,
    questionsPerRound: 1,
    timePerRound: 45,
    timePerVote: 30,
    theme: 'general',
    mimicRole: 'Undergraduate student'
  });

  const handleChange = (e: ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setRoomSettings({
      ...roomSettings,
      [name]: name === 'theme' ? value : 
              name === 'mimicRole' ? value :
              parseInt(value)
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
      const storedData: StoredData = {
        id: data.playerData.id,
        realName: data.playerData.realName,
        isHost: true,
        roomId: data.roomData.roomId,
        roomCode: data.roomData.roomCode
      }
      localStorage.setItem('turingGame_player', JSON.stringify(storedData));

      // Navigate to the room
      setIsUiVisible(false);
      setTimeout(() => {
        router.push(`/room/${data.roomData.roomCode}`);
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

  const getRandomRole = () => {
    const roles = rolesData.roles;
    const currentRole = roomSettings.mimicRole;
    
    // Filter out the current role
    const availableRoles = roles.filter(role => role !== currentRole);
    
    // Get random role from remaining options
    const randomIndex = Math.floor(Math.random() * availableRoles.length);
    setRoomSettings({
      ...roomSettings,
      mimicRole: availableRoles[randomIndex]
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
    <AnimatePresence>
    {isUiVisible && <motion.div
      key="ui"
      initial="initial"
      animate="enter"
      exit="exit"
      variants={pageTransitions}
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

        <ErrorMessage message={error} />

        <motion.div 
          className="bg-white rounded-lg shadow-md p-6 w-full max-w-md mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <form>
            {/* Keep Max Players for future use */}
            {/* <div className="mb-3">
              <label htmlFor="maxPlayers" className="block text-gray-700 text-lg font-medium mb-1">Max Players</label>
              <select
                id="maxPlayers"
                name="maxPlayers"
                defaultValue={roomSettings.maxPlayers}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                {PLAYER_COUNT_OPTIONS.map(num => (
                  <option key={num} value={num}>{num} players</option>
                ))}
              </select>
            </div> */}

            <div className="mb-3">
              <label htmlFor="questionsPerRound" className="block text-gray-700 text-lg font-medium mb-1">Questions/Round</label>
              <select
                id="questionsPerRound"
                name="questionsPerRound"
                defaultValue={roomSettings.questionsPerRound}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                {QUESTIONS_PER_ROUND_OPTIONS.map(num => (
                  <option key={num} value={num}>{num} question{num === 1 ? '' : 's'}</option>
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
                {TIME_OPTIONS.map(seconds => (
                  <option key={seconds} value={seconds}>{seconds} seconds</option>
                ))}
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
                {TIME_OPTIONS.map(seconds => (
                  <option key={seconds} value={seconds}>{seconds} seconds</option>
                ))}
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
                {THEMES.map(theme => (
                  <option key={theme.id} value={theme.id}>
                    {theme.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center">
                  <label htmlFor="mimicRole" className="text-gray-700 text-lg font-medium">
                    Mimic Role
                  </label>
                  <div className="ml-2 h-5 text-gray-400 text-sm">
                    ({roomSettings.mimicRole.length}/100 characters)
                  </div>
                </div>
                <div 
                  className="bg-gray-200 rounded-full w-5 h-5 flex items-center justify-center text-gray-800 text-xs cursor-help"
                  data-tooltip-id="mimic-role-tooltip"
                  data-tooltip-content="Type any role you want the AI to act as, or click the dice to get a random suggestion!"
                >
                  ?
                </div>
                <Tooltip 
                  id="mimic-role-tooltip" 
                  style={{ maxWidth: '200px', whiteSpace: 'normal' }}
                />
              </div>
              <div className="flex">
                <input
                  id="mimicRole"
                  name="mimicRole"
                  type="text"
                  value={roomSettings.mimicRole}
                  onChange={(e) => setRoomSettings({
                    ...roomSettings,
                    mimicRole: e.target.value.slice(0, 100)
                  })}
                  placeholder="Type here"
                  className="flex-grow px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 placeholder-gray-400"
                  maxLength={100}
                />
                <ActionButton 
                  text=""
                  icon="🎲"
                  onClick={getRandomRole}
                  variant="default"
                  fullWidth={false}
                  className="ml-2 h-10 w-10 p-0"
                />
              </div>
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