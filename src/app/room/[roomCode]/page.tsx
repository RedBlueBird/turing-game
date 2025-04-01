'use client'
// app/room/[roomCode]/page.tsx
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import ConfirmationPopup from '@/components/ConfirmationPopup';
import WaitingInterface from './WaitingInterface';
import { InterfaceState, PlayerData, RoomData } from '@/configs/interfaces';
import QuestionInterface from './QuestionInterface';
import VotingInterface from './VotingInterface';
import gameoverMessages from '@/data/gameover-message.json';
import ActionButton from '@/components/ActionButton';

export default function RoomPage() {
  const router = useRouter();
  const params = useParams();
  const roomCode = params?.roomCode as string;
  
  const [isUiVisible, setIsUiVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [interfaceState, setInterfaceState] = useState<InterfaceState>(InterfaceState.Waiting);
  const [error, setError] = useState('');
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [showConfirmationPopup, setShowConfirmationPopup] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [gameResults, setGameResults] = useState<{ 
    aiEliminated: boolean
  } | null>(null);
  const [gameOverMessage, setGameOverMessage] = useState<string>('');

  useEffect(() => {
    // Load player info from localStorage
    const storedPlayerData = localStorage.getItem('turingGame_player');
    if (storedPlayerData) {
      const parsedPlayerData = JSON.parse(storedPlayerData);
      // TODO: Address the possible game integrity compromise here
      setPlayerData(parsedPlayerData);
      
      // Redirect if player is already in a room and different from the url entered
      if (roomCode !== parsedPlayerData.roomCode) {
        router.push('/');
        return;
      }
    } else if (!gameComplete) {
      // Redirect if no player info found
      router.push('/');
      return;
    }

    // Load room data
    const fetchRoomData = async () => {
      try {
        setIsLoading(true);

        const params = new URLSearchParams();
        if (interfaceState === InterfaceState.Voting) {
          params.set('includeAI', 'true');
        }
        if (interfaceState === InterfaceState.Waiting) {
          params.set('nameType', 'real');
        }
        const url = `/api/rooms/${roomCode}${params.toString() ? `?${params.toString()}` : ''}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          throw new Error('Failed to load room information');
        }
        
        const roomData = await response.json();
        setRoomData(roomData);
        
        // Handle game completion state
        if (roomData.roomState === 'completed') {
          setGameComplete(true);
          setGameResults({
            aiEliminated: roomData.aiEliminated
          });
          localStorage.removeItem('turingGame_player');
          return;
        }
        
        // Determine the interface state based on room state
        if (roomData.roomState === 'waiting') {
          setInterfaceState(InterfaceState.Waiting);
        } else {
          // Check if it's question time or voting time based on the round start time
          if (roomData.roundStartTime) {
            const startTime = new Date(roomData.roundStartTime).getTime();
            const currentTime = new Date().getTime();
            const timePerRound = roomData.settings.timePerRound * 1000; // Convert to milliseconds

            // If current time is within the question time window
            if (currentTime < startTime + timePerRound) {
              setInterfaceState(InterfaceState.Question);
            } else {
              setInterfaceState(InterfaceState.Voting);
            }
          }
        }
      } catch (err) {
        const errorMsg = "Failed to load room" + (err.message? (": " + err.message) : "");
        // console.error(errorMsg);
        setError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };

    // Only set up polling if game is not complete
    if (!gameComplete) {
      fetchRoomData();
      const intervalId = setInterval(fetchRoomData, 3000);
      return () => clearInterval(intervalId);
    }
  }, [roomCode, router, interfaceState, gameComplete]);

  // Set the game over message based on the game results
  useEffect(() => {
    if (gameComplete) {
      setGameOverMessage(
        gameResults?.aiEliminated 
          ? gameoverMessages.human[Math.floor(Math.random() * gameoverMessages.human.length)]
          : gameoverMessages.ai[Math.floor(Math.random() * gameoverMessages.ai.length)] 
      );
    }
  }, [gameResults, gameComplete]);

  const handleStartGame = async () => {
    if (!(playerData?.id === roomData?.hostId)) return;
    
    try {
      setIsLoading(true);
      setIsStartingGame(true);
      const response = await fetch(`/api/rooms/${roomCode}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId: playerData.id
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start game');
      }
      
      // Game started successfully, will be handled by the polling
      setInterfaceState(InterfaceState.Question);
    } catch (err) {
      const errorMsg = "Failed to start game" + (err.message? (": " + err.message) : "");
      // console.error(errorMsg);
      setError(errorMsg);
      setIsStartingGame(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Modified to show the confirmation popup instead of performing the action directly
  const handleOpenConfirmationPopup = () => {
    setShowConfirmationPopup(true);
  };

  // Handle closing the confirmation popup
  const handleCloseConfirmationPopup = () => {
    setShowConfirmationPopup(false);
  };

  // Function to handle leaving or deleting a room (only called after confirmation)
  const handleLeaveRoom = async () => {
    setShowConfirmationPopup(false);
    
    try {
      setIsLoading(true);
      
      if (!playerData) {
        throw new Error('Player information not found');
      }
      
      const response = await fetch(`/api/rooms/${roomCode}/leave`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId: playerData.id
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
      const errorMsg = "Failed to " + ((roomData?.hostId === playerData?.id) ? "delete" : "leave") + " room" + (err.message ? (": " + err.message) : "");
      // console.error(errorMsg);
      setError(errorMsg);

      // Allow non-host player to be able to leave the room anyway
      if (playerData?.id !== roomData?.hostId){
        localStorage.removeItem('turingGame_player');
        setIsUiVisible(false);
        setTimeout(() => {
          router.push('/');
        }, 200);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSubmit = async (questionId: number, answer: string) => {
    if (!playerData) {
      throw new Error('Player data not found');
    }
    
    const response = await fetch(`/api/rooms/${roomCode}/answers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playerId: playerData.id,
        questionId,
        answer
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to submit answer');
    }
    
    return response.json();
  };

  const handleVoteSubmit = async (votedPlayerId: number) => {
    if (!playerData) {
      throw new Error('Player data not found');
    }
    
    const response = await fetch(`/api/rooms/${roomCode}/votes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playerId: playerData.id,
        votedPlayerId
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to submit vote');
    }
    
    return response.json();
  };

  const handleNextRound = async () => {
    if (playerData?.id !== roomData?.hostId) return;
    
    try {
      setIsLoading(true);
      console.log("--------------------------ffff--");

      const response = await fetch(`/api/rooms/${roomCode}/next-round`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId: playerData.id
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start next round');
      }
      
      // Next round started successfully, switch to question interface
      setInterfaceState(InterfaceState.Question);
      console.log("--------------------------/////--");

    } catch (err) {
      const errorMsg = "Failed to start next round" + (err.message? (": " + err.message) : "");
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Create a function to handle automatic transition to voting interface
  const handleTransitionToVoting = () => {
    setInterfaceState(InterfaceState.Voting);
  };

  if (isLoading && !roomData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <div className="text-2xl font-medium text-gray-800">Loading room...</div>
      </div>
    );
  }

  // Show game results when game is complete
  if (gameComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center mx-4">
          <h1 className="text-3xl font-bold mb-6">Game Over!</h1>
          
          {gameResults?.aiEliminated ? (
            <div>
              <div className="text-2xl mb-4 text-green-600 font-semibold">Humans Win!</div>
              <p className="text-lg mb-6">
                The AI player was successfully identified and eliminated. {" "}
                {gameOverMessage}
              </p>
            </div>
          ) : (
            <div>
              <div className="text-2xl mb-4 text-red-600 font-semibold">AI Wins!</div>
              <p className="text-lg mb-6">
                Only one human player remains. {" "}
                {gameOverMessage}
              </p>
            </div>
          )}
          
          <ActionButton
            text="Return to Home"
            onClick={() => router.push('/')}
            variant="primary"
          />
        </div>
      </div>
    );
  }

  const canStartGame = (playerData?.id === roomData?.hostId) && (roomData?.players?.length >= 2);

  console.log(interfaceState);
  console.log("----------------------------");

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <ConfirmationPopup
        isOpen={showConfirmationPopup}
        onClose={handleCloseConfirmationPopup}
        onConfirm={handleLeaveRoom}
        isHost={(playerData?.id === roomData?.hostId) || false}
      />
      
      <AnimatePresence mode="wait">
        {(interfaceState === InterfaceState.Waiting) && isUiVisible && (
          <WaitingInterface 
            error={error} 
            roomData={roomData} 
            playerData={playerData} 
            canStartGame={canStartGame} 
            isStartingGame={isStartingGame}
            handleOpenConfirmationPopup={handleOpenConfirmationPopup}
            handleStartGame={handleStartGame}
          />
        )}
        {(interfaceState === InterfaceState.Question) && isUiVisible && (
          <QuestionInterface 
            roomData={roomData} 
            playerData={playerData}
            onAnswerSubmit={handleAnswerSubmit}
            onTimeUp={handleTransitionToVoting}
          />
        )}
        {(interfaceState === InterfaceState.Voting) && isUiVisible && (
          <VotingInterface
            roomData={roomData}
            playerData={playerData}
            onVoteSubmit={handleVoteSubmit}
            onNextRound={handleNextRound}
          />
        )}
      </AnimatePresence>
    </div>
  );
}