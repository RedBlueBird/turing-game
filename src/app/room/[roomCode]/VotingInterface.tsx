'use client'
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { pageTransitions, containerTransitions, itemTransitions } from '@/configs/animations';
import { PlayerData, RoomData, InterfaceState } from '@/configs/interfaces';

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
          if (votesData.eliminatedPlaye) {
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
      key="voting-interface"
      initial="initial"
      animate="enter"
      exit="exit"
      variants={pageTransitions}
      className="flex flex-col items-center w-full min-h-screen bg-gray-100 p-4"
    >
      {/* Title Section */}
      <div className="w-full text-center mb-8 mt-8">
        <h1 className="text-6xl font-bold mb-4 text-gray-900">
          Voting Time
        </h1>
        <p className="text-2xl text-gray-700 mb-4">
          Round {roomData.roomRound} • Time Remaining: <span className="text-red-500 font-medium">{formatTime(remainingTime)}</span>
        </p>
        <p className="text-xl text-gray-700">
          Vote for the player you think is the AI
        </p>
      </div>
      
      {/* Two-panel layout with adjusted width ratio */}
      <div className="flex flex-col md:flex-row w-full max-w-6xl gap-6 flex-grow" style={{ height: "calc(100vh - 260px)" }}>
        {/* Left Panel - Everyone's answers (40% width) */}
        <div className="w-full md:w-2/5 mb-6 md:mb-0">
          <div className="bg-white rounded-lg shadow-md p-6 h-full flex flex-col">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Everyone's Answers
            </h2>
            
            {/* Scrollable answers container */}
            <div className="flex-grow overflow-y-auto">
              {questions.length > 0 && questions[currentQuestionIndex]?.playerAnswers.length > 0 ? (
                <div className="space-y-4">
                  {questions[currentQuestionIndex].playerAnswers.map((playerAnswer, index) => {
                    const isCurrentPlayer = playerAnswer.playerId === playerData.id;
                    return (
                      <motion.div
                        key={`${playerAnswer.playerId}-${index}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`${isCurrentPlayer ? 'bg-yellow-100 border-l-4 border-yellow-400' : 'bg-gray-50'} rounded-lg p-4 shadow-sm`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-gray-800">
                            {playerAnswer.playerName}
                            {isCurrentPlayer && " (You)"}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(playerAnswer.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-gray-700">{playerAnswer.content}</p>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  No answers available
                </div>
              )}
            </div>
            
            {/* Question navigation arrows */}
            {hasMultipleQuestions && (
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                <motion.button
                  onClick={handlePrevQuestion}
                  disabled={currentQuestionIndex === 0}
                  className={`p-2 rounded-full ${
                    currentQuestionIndex === 0 
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                      : 'bg-yellow-400 text-gray-800 hover:bg-yellow-500'
                  }`}
                  whileHover={currentQuestionIndex !== 0 ? { scale: 1.1 } : {}}
                  whileTap={currentQuestionIndex !== 0 ? { scale: 0.9 } : {}}
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </motion.button>
                
                <span className="text-gray-700 font-medium">
                  Question {currentQuestionIndex + 1} / {questions.length}
                </span>
                
                <motion.button
                  onClick={handleNextQuestion}
                  disabled={currentQuestionIndex === questions.length - 1}
                  className={`p-2 rounded-full ${
                    currentQuestionIndex === questions.length - 1 
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                      : 'bg-yellow-400 text-gray-800 hover:bg-yellow-500'
                  }`}
                  whileHover={currentQuestionIndex !== questions.length - 1 ? { scale: 1.1 } : {}}
                  whileTap={currentQuestionIndex !== questions.length - 1 ? { scale: 0.9 } : {}}
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </motion.button>
              </div>
            )}
          </div>
        </div>
        
        {/* Right Panel - Voting area (60% width) */}
        <div className="w-full md:w-3/5 flex flex-col h-full">
          <div className="p-6 bg-white rounded-lg shadow-md flex flex-col h-full">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              {roundComplete ? "Voting Results" : "Vote Who Is AI"}
            </h2>
            
            {/* Error message */}
            {error && (
              <motion.div 
                className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {error}
              </motion.div>
            )}
            
            {/* Voting area */}
            <div className="flex-grow overflow-y-auto">
              {roomData.players && roomData.players.length > 0 ? (
                <div className="space-y-4">
                  {roomData.players
                    .filter(player => !player.isLost) // Only show players still in the game
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
                                  {playerVotes.map((vote, voteIndex) => (
                                    <span 
                                      key={voteIndex}
                                      className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full"
                                    >
                                      {vote.voterName}
                                    </span>
                                  ))}
                                </div>
                              )}
                              
                              {/* Vote button */}
                              {!isCurrentPlayer && !roundComplete && (
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleVote(player.id)}
                                  disabled={votedPlayerId !== null || isSubmitting}
                                  className={`px-6 py-2 rounded-full font-medium ${
                                    votedPlayerId !== null || isSubmitting
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