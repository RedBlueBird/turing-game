import { motion } from 'framer-motion';
import { Tooltip } from 'react-tooltip';
import { ErrorMessage } from '@/components/ErrorMessage';
import { PlayerData, RoomData } from '@/configs/interfaces';

interface VoteData {
  voterId: number;
  voterName: string;
  votedPlayerId: number;
}

interface VotingPanelProps {
  roomData: RoomData;
  playerData: PlayerData;
  votes: VoteData[];
  votedPlayerId: number | null;
  isSubmitting: boolean;
  error: string;
  remainingTime: number;
  roundComplete: boolean;
  eliminatedPlayer: number | null;
  onVote: (playerId: number) => void;
  className?: string;
}

export function VotingPanel({
  roomData,
  playerData,
  votes,
  votedPlayerId,
  isSubmitting,
  error,
  remainingTime,
  roundComplete,
  eliminatedPlayer,
  onVote,
  className = ''
}: VotingPanelProps) {
  const getVotesForPlayer = (playerId: number) => {
    return votes.filter(vote => vote.votedPlayerId === playerId);
  };

  return (
    <div className={`p-4 md:p-6 flex flex-col h-full bg-white rounded-lg shadow-md pt-8 ${className}`}>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {roundComplete ? "Voting Results" : "Vote Who Is AI"}
      </h2>
      
      <ErrorMessage message={error} />
      
      {/* Voting area */}
      <div className="flex-grow">
        {roomData.players && roomData.players.length > 0 ? (
          <div className="space-y-4">
            {roomData.players
              .filter(player => !player.isLost)
              .sort((a, b) => (a.fakeName || '').localeCompare(b.fakeName || ''))
              .map((player, index) => {
                const playerVotes = getVotesForPlayer(player.id);
                const isCurrentPlayer = (player.id === playerData.id);
                const isEliminated = (eliminatedPlayer === player.id);
                
                return (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`${
                      isCurrentPlayer ? 'bg-yellow-100' : 
                      isEliminated ? 'bg-red-100' : 'bg-gray-50'
                    } rounded-lg p-4 shadow-sm`}
                  >
                    <div className="flex flex-row justify-between items-center">
                      <div className="flex items-center min-w-0">
                        <span className="font-medium text-gray-800 mr-2 truncate">
                          {player.fakeName || 'Unknown'}
                          {isCurrentPlayer && " (You)"}
                        </span>
                        {isEliminated && (
                          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full flex-shrink-0">
                            Eliminated
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Votes display */}
                        {playerVotes.length > 0 && (
                          <>
                            <span 
                              className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full cursor-help"
                              data-tooltip-id={`votes-tooltip-${player.id}`}
                              data-tooltip-content={`Voters: ${playerVotes.map(vote => vote.voterName).join(', ')}`}
                            >
                              +{playerVotes.length}
                            </span>
                            <Tooltip 
                              id={`votes-tooltip-${player.id}`}
                              style={{ maxWidth: '200px', whiteSpace: 'normal' }}
                            />
                          </>
                        )}
                        
                        {/* Vote button */}
                        {!roundComplete && (
                          <motion.button
                            whileHover={{ scale: isCurrentPlayer ? 1 : 1.05 }}
                            whileTap={{ scale: isCurrentPlayer ? 1 : 0.95 }}
                            onClick={() => onVote(player.id)}
                            disabled={isCurrentPlayer || votedPlayerId !== null || isSubmitting}
                            className={`px-6 py-2 rounded-full font-medium flex-shrink-0 ${
                              isCurrentPlayer || votedPlayerId !== null || isSubmitting
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-yellow-400 text-gray-800 hover:bg-yellow-500'
                            }`}
                          >
                            {votedPlayerId === player.id ? "Voted" : "Vote"}
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-12">
            Loading players...
          </div>
        )}
      </div>
      
      {/* Round results */}
      {roundComplete && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            Round Results
          </h3>
          {eliminatedPlayer !== null ? (
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-red-700">
                The player eliminated this round:
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span key={eliminatedPlayer} className="bg-red-200 text-red-800 px-3 py-1 rounded-full">
                  {roomData.players?.find(p => p.id === eliminatedPlayer)?.fakeName || 'Unknown'}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-gray-700">Waiting for voting results...</p>
          )}
          
          {/* Next round info */}
          {remainingTime === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 text-center"
            >
              <p className="text-gray-700 mb-2">
                Preparing for next round...
              </p>
              <div className="bg-gray-200 rounded-full h-2 w-full overflow-hidden">
                <motion.div
                  className="bg-yellow-400 h-2"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 5 }}
                />
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
} 