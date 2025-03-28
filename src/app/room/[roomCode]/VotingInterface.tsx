'use client'
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { pageTransitions, containerTransitions, itemTransitions } from '@/configs/animations';
import { PlayerData, RoomData, InterfaceState } from '@/configs/interfaces';
import { GameHeader } from '@/components/room/GameHeader';
import { AnswersPanel } from '@/components/room/AnswersPanel';
import { ErrorMessage } from '@/components/ErrorMessage';
import { Tooltip } from '@/components/Tooltip';

interface VotingInterfaceProps {
  roomData: RoomData;
  playerData: PlayerData;
  onVoteSubmit: (votedPlayerId: number) => Promise<void>;
  onNextRound?: () => void;
}

interface QuestionData {
  id: number;
  content: string;
  playerAnswers: PlayerAnswer[];
}

interface PlayerAnswer {
  playerId: number;
  playerName: string;
  content: string;
  timestamp: string;
}

interface VoteData {
  voterId: number;
  voterName: string;
  votedPlayerId: number;
}

export default function VotingInterface({ 
  roomData, 
  playerData, 
  onVoteSubmit,
  onNextRound
}: VotingInterfaceProps) {
  const router = useRouter();
  
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [remainingTime, setRemainingTime] = useState<number>(120);
  const [votedPlayerId, setVotedPlayerId] = useState<number | null>(null);
  const [votes, setVotes] = useState<VoteData[]>([]);
  const [roundComplete, setRoundComplete] = useState(false);
  const [eliminatedPlayer, setEliminatedPlayer] = useState<number>(0);

  useEffect(() => {
    // Fetch questions and answers for the current round
    const fetchQuestionsAndVotes = async () => {
      try {
        // Fetch questions and answers
        const questionsResponse = await fetch(`/api/rooms/${roomData.roomCode}/questions?round=${roomData.roomRound}`);
        
        if (!questionsResponse.ok) {
          const errorData = await questionsResponse.json();
          throw new Error(errorData.message || 'Failed to load questions');
        }
        
        const questionsData = await questionsResponse.json();
        setQuestions(questionsData.questions);
        
        // Fetch votes for current round
        const votesResponse = await fetch(`/api/rooms/${roomData.roomCode}/votes?round=${roomData.roomRound}`);
        
        if (votesResponse.ok) {
          const votesData = await votesResponse.json();
          setVotes(votesData.votes);
          
          // Check if player has already voted
          const playerVote = votesData.votes.find((vote: VoteData) => vote.voterId === playerData.id);
          if (playerVote) {
            setVotedPlayerId(playerVote.votedPlayerId);
          }
          
          // Check if round is complete
          setRoundComplete(votesData.roundComplete || false);
          
          // Set eliminated players
          if (votesData.eliminatedPlayer) {
            setEliminatedPlayer(votesData.eliminatedPlayer);
          }
        }
        
        // Calculate remaining time
        if (roomData.roundStartTime) {
          const startTime = new Date(roomData.roundStartTime).getTime();
          const currentTime = new Date().getTime();
          const timePerVote = (roomData.settings.timePerRound + roomData.settings.timePerVote) * 1000; // Convert to milliseconds
          const endTime = startTime + timePerVote;
          setRemainingTime(Math.max(0, Math.floor((endTime - currentTime) / 1000)));
        }
      } catch (err) {
        const errorMsg = "Failed to load voting data" + (err.message? (": " + err.message) : "");
        console.error(errorMsg);
        setError(errorMsg);
      }
    };

    fetchQuestionsAndVotes();
    
    // Set up polling to refresh votes
    const intervalId = setInterval(fetchQuestionsAndVotes, 3000);
    
    // Set up timer countdown
    const timerId = setInterval(() => {
      setRemainingTime(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timerId);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
    
    // Clean up intervals on unmount
    return () => {
      clearInterval(intervalId);
      clearInterval(timerId);
    };
  }, [roomData.roomCode, roomData.roomRound, roomData.roundStartTime, roomData.settings.timePerVote]);

  // Check if round is complete and timer is up
  useEffect(() => {
    if (roundComplete && remainingTime === 0) {
      // Check if AI player is not eliminated
      const aiPlayer = roomData.players?.find(player => player.isLost === false && player.fakeName === 'AI');

      // Proceed anyway for debugging purposes for now

      // if (aiPlayer && !eliminatedPlayers.includes(aiPlayer.id)) {
      if (true) {
        const nextRoundTimer = setTimeout(() => {
          if (onNextRound) {
            onNextRound();
          }
        }, 5000);
        
        return () => {
          clearTimeout(nextRoundTimer);
        };
      }
    }
  }, [roundComplete, remainingTime]);

  const handleVote = async (playerId: number) => {
    if (votedPlayerId !== null || isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      setError('');
      
      await onVoteSubmit(playerId);
      
      // Update local state
      setVotedPlayerId(playerId);
      
      // Add vote to the votes array
      const newVote: VoteData = {
        voterId: playerData.id,
        voterName: playerData.fakeName || 'Unknown',
        votedPlayerId: playerId
      };
      
      setVotes(prevVotes => [...prevVotes, newVote]);
    } catch (err) {
      setError('Failed to submit vote');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const hasMultipleQuestions = questions.length > 1;
  const getVotesForPlayer = (playerId: number) => {
    return votes.filter(vote => vote.votedPlayerId === playerId);
  };

  return (
    <motion.div 
      key="question-interface"
      initial="initial"
      animate="enter"
      exit="exit"
      variants={pageTransitions}
      className="flex flex-col items-center w-full min-h-screen bg-gray-100 p-4"
    >      
      <GameHeader 
        title="Voting Time"
        round={roomData.roomRound}
        remainingTime={remainingTime}
        subtitle="Vote for the player you think is the AI"
      />
      
      <div className="flex flex-col-reverse md:flex-row w-full max-w-6xl gap-6 flex-grow mb-4" style={{ minHeight: "calc(100vh - 260px)", height: "auto" }}>
        <AnswersPanel
          questions={questions}
          currentQuestionIndex={currentQuestionIndex}
          playerData={playerData}
          onPrevQuestion={handlePrevQuestion}
          onNextQuestion={handleNextQuestion}
          className="flex-shrink-0"
        />
        
        {/* Right Panel - Voting area */}
        <div className="w-full md:w-3/5 flex flex-col">
          <div className="p-6 flex flex-col bg-white rounded-lg shadow-md h-full">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              {roundComplete ? "Voting Results" : "Vote Who Is AI"}
            </h2>
            
            <ErrorMessage message={error} />
            
            {/* Voting area */}
            <div className="flex-grow overflow-y-auto">
              {roomData.players && roomData.players.length > 0 ? (
                <div className="space-y-4">
                  {roomData.players
                    .filter(player => !player.isLost) // Only show players still in the game
                    .sort((a, b) => (a.fakeName || '').localeCompare(b.fakeName || '')) // Sort alphabetically by fakeName
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
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                            <div className="flex items-center mb-2 md:mb-0">
                              <span className="font-medium text-gray-800 mr-2">
                                {player.fakeName || 'Unknown'}
                                {isCurrentPlayer && " (You)"}
                              </span>
                              {isEliminated && (
                                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                  Eliminated
                                </span>
                              )}
                            </div>
                            
                            <div className="flex flex-col md:flex-row items-start md:items-center">
                              {/* Votes display */}
                              {playerVotes.length > 0 && (
                                <div className="flex flex-wrap gap-1 mr-4 mb-2 md:mb-0">
                                  {playerVotes.length <= 2 ? (
                                    // Show individual votes if 2 or fewer
                                    playerVotes.map((vote, voteIndex) => (
                                      <span 
                                        key={voteIndex}
                                        className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full"
                                      >
                                        {vote.voterName}
                                      </span>
                                    ))
                                  ) : (
                                    // Show compact version with tooltip if more than 2
                                    <Tooltip 
                                      content={
                                        <div className="p-2">
                                          <p className="font-semibold mb-1">Voters:</p>
                                          <ul className="space-y-1">
                                            {playerVotes.map((vote, idx) => (
                                              <li key={idx}>{vote.voterName}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      }
                                    >
                                      <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full cursor-help">
                                        +{playerVotes.length}
                                      </span>
                                    </Tooltip>
                                  )}
                                </div>
                              )}
                              
                              {/* Vote button - now shown for all players, but disabled for current player */}
                              {!roundComplete && (
                                <motion.button
                                  whileHover={{ scale: isCurrentPlayer ? 1 : 1.05 }}
                                  whileTap={{ scale: isCurrentPlayer ? 1 : 0.95 }}
                                  onClick={() => handleVote(player.id)}
                                  disabled={isCurrentPlayer || votedPlayerId !== null || isSubmitting}
                                  className={`px-6 py-2 rounded-full font-medium ${
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
                {eliminatedPlayer != 0 ? (
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
                  <p className="text-gray-700">No players were eliminated this round.</p>
                )}
                
                {/* Next round info */}
                {remainingTime === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 text-center"
                  >
                    <p className="text-gray-700 mb-2">
                      {remainingTime === 0 ? "Preparing for next round..." : `Next round in ${remainingTime} seconds...`}
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
        </div>
      </div>
    </motion.div>
  );
}