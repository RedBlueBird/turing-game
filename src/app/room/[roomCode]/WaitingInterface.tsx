'use client'
import Head from 'next/head';
import { motion } from 'framer-motion';
import ActionButton from '@/components/ActionButton';
import { pageTransitions, containerTransitions,  itemTransitions} from '@/configs/animations';
import { PlayerData, RoomData } from '@/configs/interfaces';
import { ErrorMessage } from '@/components/ErrorMessage';

interface WaitingInterfaceProps {
  error: string;
  roomData: RoomData;
  playerData: PlayerData;
  canStartGame: boolean;
  isStartingGame: boolean;
  handleOpenConfirmationPopup: (e:any) => void;
  handleStartGame: (e:any) => void;
}

export default function WaitingInterface({ 
  error,
  roomData,
  playerData,
  canStartGame,
  isStartingGame,
  handleOpenConfirmationPopup,
  handleStartGame,
}: WaitingInterfaceProps) {

  return (
    <motion.div
      key="waiting-interface"
      initial="initial"
      animate="enter"
      exit="exit"
      variants={pageTransitions}
    >
      <Head>
        <title>Room {roomData.roomCode} | Turing Game</title>
        <meta name="description" content="Turing Game Room" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex flex-col items-center justify-center w-full flex-1 px-4 sm:px-20">
        <div className="flex items-center justify-center mb-2">
          <h1 className="text-4xl font-bold text-gray-900">Room Code:</h1>
          <div className="ml-4 bg-gray-200 px-4 py-2 rounded-lg">
            <span className="text-2xl font-mono font-bold text-gray-800">{roomData.roomCode}</span>
          </div>
        </div>
        
        <ErrorMessage message={error} />

        <motion.div 
          className="bg-white rounded-lg shadow-md p-6 w-full max-w-md mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Players</h2>
            <div className="text-gray-500">
              {roomData?.players.length || 0}/{roomData?.settings.maxPlayers || '?'}
            </div>
          </div>
          
          <motion.div 
            className="space-y-3"
            variants={containerTransitions}
            initial="hidden"
            animate="show"
          >
            {roomData?.players.map((player, index) => (
              <motion.div 
                key={player.id}
                className={`flex items-center p-3 rounded-lg ${
                  playerData?.id === player.id ? 'bg-yellow-100' : 'bg-gray-100'
                }`}
                variants={itemTransitions}
              >
                <div className="w-8 h-8 bg-gray-300 text-gray-800 rounded-full flex items-center justify-center mr-3">
                  {index + 1}
                </div>
                <div className="flex-grow font-medium text-gray-800">
                  {player.realName}
                  {player.id === roomData?.hostId && (
                    <span className="ml-2 text-xs bg-yellow-400 px-2 py-1 rounded text-gray-800">
                      Host
                    </span>
                  )}
                </div>
                {playerData?.id === player.id && (
                  <div className="text-sm text-gray-500">(You)</div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 w-full max-w-md">
          {(playerData?.id === roomData?.hostId) ? (
            isStartingGame ? (
              <ActionButton 
                text="Start Game"
                onClick={() => {}}
                variant="disabled"
                disabled={true}
              />
            ) : (
              <ActionButton 
                text="Start Game"
                onClick={handleStartGame}
                variant={canStartGame ? "primary" : "disabled"}
                disabled={!canStartGame}
                customDisabledText="Need at least 2 players"
              />
            )
          ) : (
            <div className="flex items-center justify-center bg-gray-300 rounded-lg py-4 px-8">
              <span className="text-2xl font-medium text-gray-600">Waiting for host to start...</span>
            </div>
          )}
          
          <ActionButton 
            text={(playerData?.id === roomData?.hostId) ? "Delete Room" : "Leave"}
            onClick={handleOpenConfirmationPopup}
            variant="default"
            disabled={isStartingGame}
          />
        </div>
      </main>
    </motion.div>
  );
}