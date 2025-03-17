'use client'
// pages/room/[roomCode]/page.tsx
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { AnimatePresence } from 'framer-motion';
import ActionButton from '@/components/ActionButton'; // Import the ActionButton component

// Import the confirmation popup component
import ConfirmationPopup from '@/components/ConfirmationPopup';

type Player = {
  id: string;
  fake_name: string;
  real_name: string;
  join_time: string;
  score: number;
};

type Room = {
  players: Player[];
  room: {
    roomId: string;
    roomState: string;
    maxPlayers: number;
    questionsPerRound: number;
    timePerRound: number;
    timePerVote: number;
    theme: string;
    hostId: string;
    createdAt: string;
    expiresAt: string;
  }
};

export default function RoomPage() {
  const router = useRouter();
  const params = useParams();
  const roomCode = params?.roomCode as string;
  
  const [isUiVisible, setIsUiVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [roomData, setRoomData] = useState<Room | null>(null);
  const [playerInfo, setPlayerInfo] = useState<{
    id: string;
    name: string;
    isHost: boolean;
    roomId: string;
    roomCode: string;
  } | null>(null);
  
  // Add state for the confirmation popup
  const [showConfirmationPopup, setShowConfirmationPopup] = useState(false);

  useEffect(() => {
    // Load player info from localStorage
    const storedPlayerInfo = localStorage.getItem('turingGame_player');
    if (storedPlayerInfo) {
      const parsedPlayerInfo = JSON.parse(storedPlayerInfo);
      setPlayerInfo(parsedPlayerInfo);
      
      // Redirect if player is already in a room and different from the url entered
      if (roomCode !== parsedPlayerInfo.roomCode) {
        router.push('/');
        return;
      }
    } else {
      // Redirect if no player info found
      router.push('/');
      return;
    }

    // Load room data
    const fetchRoomData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/rooms/${roomCode}`);
        
        if (!response.ok) {
          throw new Error('Failed to load room information');
        }
        
        const roomData = await response.json();
        setRoomData(roomData);
      } catch (err) {
        const errorMsg = "Failed to load room" + (err.message? (": " + err.message) : "");
        // console.error(errorMsg);
        setError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoomData();
    
    // Set up polling to refresh room data
    const intervalId = setInterval(fetchRoomData, 3000);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [roomCode, router]);

  const handleStartGame = async () => {
    if (!playerInfo?.isHost) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/rooms/${roomCode}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId: playerInfo.id
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start game');
      }
      
      // Game started successfully, will be handled by the polling
    } catch (err) {
      const errorMsg = "Failed to start game" + (err.message? (": " + err.message) : "");
      // console.error(errorMsg);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Modified to show the confirmation popup instead of performing the action directly
  const handleLeaveButtonClick = () => {
    setShowConfirmationPopup(true);
  };

  // Handle closing the confirmation popup
  const handleCloseConfirmationPopup = () => {
    setShowConfirmationPopup(false);
  };

  // Function to handle leaving or deleting a room (only called after confirmation)
  const handleLeaveRoom = async () => {
    // Close the popup first
    setShowConfirmationPopup(false);
    
    try {
      setIsLoading(true);
      
      if (!playerInfo) {
        throw new Error('Player information not found');
      }
      
      const response = await fetch(`/api/rooms/${roomCode}/leave`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId: playerInfo.id
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to leave room');
      }
      
      // Clear player info from localStorage
      localStorage.removeItem('turingGame_player');
      
      // Navigate back to home
      setIsUiVisible(false);
      setTimeout(() => {
        router.push('/');
      }, 200);
    } catch (err) {
      const errorMsg = "Failed to " + (roomData?.room.hostId === playerInfo?.id ? "delete" : "leave") + " room" + (err.message ? (": " + err.message) : "");
      // console.error(errorMsg);
      setError(errorMsg);

      // Allow non-host player to be able to leave the room anyway
      if (playerInfo?.id !== roomData?.room.hostId){
        setIsUiVisible(false);
        setTimeout(() => {
          router.push('/');
        }, 200);
      }
    } finally {
      setIsLoading(false);
    }
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
      x: -100,
      transition: {
        duration: 0.2,
        ease: [0.61, 1, 0.88, 1],
      }
    }
  };

  // Player card animation
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  const playerVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  if (isLoading && !roomData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <div className="text-2xl font-medium text-gray-800">Loading room...</div>
      </div>
    );
  }

  const canStartGame = playerInfo?.isHost && (roomData?.players.length >= 2);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      {/* Confirmation Popup */}
      <ConfirmationPopup
        isOpen={showConfirmationPopup}
        onClose={handleCloseConfirmationPopup}
        onConfirm={handleLeaveRoom}
        isHost={playerInfo?.isHost || false}
      />
      
      <AnimatePresence>
        {isUiVisible && (
          <motion.div
            key="room-ui"
            initial="initial"
            animate="enter"
            exit="exit"
            variants={pageVariants}
          >
            <Head>
              <title>Room {roomCode} | Turing Game</title>
              <meta name="description" content="Turing Game Room" />
              <link rel="icon" href="/favicon.ico" />
            </Head>

            <main className="flex flex-col items-center justify-center w-full flex-1 px-4 sm:px-20">
              <div className="flex items-center justify-center mb-2">
                <h1 className="text-4xl font-bold text-gray-900">Room Code:</h1>
                <div className="ml-4 bg-gray-200 px-4 py-2 rounded-lg">
                  <span className="text-2xl font-mono font-bold text-gray-800">{roomCode}</span>
                </div>
              </div>
              
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
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-800">Players</h2>
                  <div className="text-gray-500">
                    {roomData?.players.length || 0}/{roomData?.room.maxPlayers || '?'}
                  </div>
                </div>
                
                <motion.div 
                  className="space-y-3"
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                >
                  {roomData?.players.map((player, index) => (
                    <motion.div 
                      key={player.id}
                      className={`flex items-center p-3 rounded-lg ${
                        playerInfo?.id === player.id ? 'bg-yellow-100' : 'bg-gray-100'
                      }`}
                      variants={playerVariants}
                    >
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                        {index + 1}
                      </div>
                      <div className="flex-grow font-medium">
                        {player.real_name}
                        {player.id === roomData.room.hostId && (
                          <span className="ml-2 text-xs bg-yellow-400 px-2 py-1 rounded text-gray-800">
                            Host
                          </span>
                        )}
                      </div>
                      {playerInfo?.id === player.id && (
                        <div className="text-sm text-gray-500">(You)</div>
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>

              <div className="grid grid-cols-1 gap-4 w-full max-w-md">
                {playerInfo?.isHost ? (
                  <ActionButton 
                    text="Start Game"
                    onClick={handleStartGame}
                    variant={canStartGame ? "primary" : "disabled"}
                    disabled={!canStartGame}
                    customDisabledText="Need at least 2 players"
                  />
                ) : (
                  <div className="flex items-center justify-center bg-gray-300 rounded-lg py-4 px-8">
                    <span className="text-2xl font-medium text-gray-600">Waiting for host to start...</span>
                  </div>
                )}
                
                <ActionButton 
                  text={playerInfo?.isHost ? "Delete Room" : "Leave"}
                  onClick={handleLeaveButtonClick}
                  variant="default"
                  disabled={isLoading}
                />
              </div>
            </main>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}