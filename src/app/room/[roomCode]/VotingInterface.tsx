'use client'
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { pageTransitions, containerTransitions, itemTransitions } from '@/configs/animations';
import { PlayerData, RoomData, InterfaceState } from '@/configs/interfaces';
import { GameHeader } from '@/components/room/GameHeader';
import { AnswersPanel } from '@/components/room/AnswersPanel';
import { VotingPanel } from '@/components/room/VotingPanel';

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
  
  // Mobile swipe mechanics
  const [isMobile, setIsMobile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [activePanelIndex, setActivePanelIndex] = useState(0); // 0 = Voting Panel, 1 = Answers Panel
  const constraintsRef = useRef(null);

  // Check if device is mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

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
      } catch (err: any) {
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

  // Swipe gesture handlers
  const handleDragStart = () => {
    setIsDragging(true);
  };
  
  const handleDrag = (e: any, info: any) => {
    setDragX(info.offset.x);
  };
  
  const handleDragEnd = (e: any, info: any) => {
    setIsDragging(false);
    const threshold = 50; // minimum distance required for a swipe
    
    if (info.offset.x < -threshold && activePanelIndex === 0) {
      // Swiped left, go to answers panel
      setActivePanelIndex(1);
    } else if (info.offset.x > threshold && activePanelIndex === 1) {
      // Swiped right, go to voting panel
      setActivePanelIndex(0);
    }
    
    setDragX(0);
  };

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

  // Calculate positions based on drag for mobile panels
  const calculatePanelPosition = (index: number) => {
    if (index === activePanelIndex) {
      return dragX;
    } else if (index === 0 && activePanelIndex === 1) {
      return -window.innerWidth + dragX;
    } else if (index === 1 && activePanelIndex === 0) {
      return window.innerWidth + dragX;
    }
    return 0;
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
      className="flex flex-col w-full h-screen bg-gray-100 p-4 overflow-hidden"
    >      
      {/* Game Header */}
      <div className="flex-shrink-0">
        <GameHeader 
          title="Voting Time"
          round={roomData.roomRound}
          remainingTime={remainingTime}
          isMobile={isMobile}
        />
      </div>
      
      {/* Main Content Area */}
      {isMobile ? (
        // Mobile View with Swipe
        <div className="flex-1 relative overflow-hidden" ref={constraintsRef}>
          <motion.div
            className="absolute inset-0"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            style={{ touchAction: "pan-y" }}
          >
            {/* Panel Container */}
            <div className="w-full h-full relative">
              {/* Voting Panel */}
              <motion.div
                className="absolute top-0 left-0 w-full h-full flex items-start justify-center"
                initial={false}
                animate={{
                  x: isDragging 
                    ? calculatePanelPosition(0)
                    : (activePanelIndex === 0 ? 0 : -window.innerWidth),
                  opacity: activePanelIndex === 0 || isDragging ? 1 : 0.8,
                  scale: activePanelIndex === 0 || isDragging ? 1 : 0.95,
                }}
                transition={{
                  x: { 
                    type: "spring", 
                    stiffness: 280, 
                    damping: 26,
                    duration: 0.7 
                  },
                  opacity: { duration: 0.4 },
                  scale: { duration: 0.4 }
                }}
                style={{ zIndex: activePanelIndex === 0 ? 10 : 5 }}
              >
                {/* Voting Panel Content */}
                <div className="w-full h-full md:h-full flex flex-col p-4 overflow-y-auto">
                  <VotingPanel
                    roomData={roomData}
                    playerData={playerData}
                    votes={votes}
                    votedPlayerId={votedPlayerId}
                    isSubmitting={isSubmitting}
                    error={error}
                    remainingTime={remainingTime}
                    roundComplete={roundComplete}
                    eliminatedPlayer={eliminatedPlayer}
                    onVote={handleVote}
                  />
                </div>
              </motion.div>

              {/* Answers Panel */}
              <motion.div
                className="absolute top-0 left-0 w-full h-full flex items-start justify-center"
                initial={false}
                animate={{
                  x: isDragging 
                    ? calculatePanelPosition(1)
                    : (activePanelIndex === 1 ? 0 : window.innerWidth),
                  opacity: activePanelIndex === 1 || isDragging ? 1 : 0.8,
                  scale: activePanelIndex === 1 || isDragging ? 1 : 0.95,
                }}
                transition={{
                  x: { 
                    type: "spring", 
                    stiffness: 280, 
                    damping: 26,
                    duration: 0.7 
                  },
                  opacity: { duration: 0.4 },
                  scale: { duration: 0.4 }
                }}
                style={{ zIndex: activePanelIndex === 1 ? 10 : 5 }}
              >
                {/* Answers Panel Content */}
                <div className="w-full h-full p-4">
                  <AnswersPanel
                    questions={questions}
                    currentQuestionIndex={currentQuestionIndex}
                    playerData={playerData}
                    onPrevQuestion={handlePrevQuestion}
                    onNextQuestion={handleNextQuestion}
                    className="h-full"
                  />
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Panel Indicators */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2 z-20">
            <div 
              className={`h-2 w-8 rounded-full ${activePanelIndex === 0 ? 'bg-yellow-400' : 'bg-gray-300'}`}
              onClick={() => setActivePanelIndex(0)}
            />
            <div 
              className={`h-2 w-8 rounded-full ${activePanelIndex === 1 ? 'bg-yellow-400' : 'bg-gray-300'}`}
              onClick={() => setActivePanelIndex(1)}
            />
          </div>
        </div>
      ) : (
        // Desktop View (Original Layout)
        <div className="flex flex-col-reverse md:flex-row w-full max-w-6xl mx-auto gap-4 flex-1 overflow-hidden min-h-0">
          {/* Left Panel (AnswersPanel) */}
          <div className="w-full md:w-2/5 flex-shrink-0 h-1/2 md:h-full min-h-0">
            <AnswersPanel
              questions={questions}
              currentQuestionIndex={currentQuestionIndex}
              playerData={playerData}
              onPrevQuestion={handlePrevQuestion}
              onNextQuestion={handleNextQuestion}
              className="h-full"
            />
          </div>
          
          {/* Right Panel - Voting area */}
          <div className="w-full md:w-3/5 h-1/2 md:h-full min-h-0">
            <VotingPanel
              roomData={roomData}
              playerData={playerData}
              votes={votes}
              votedPlayerId={votedPlayerId}
              isSubmitting={isSubmitting}
              error={error}
              remainingTime={remainingTime}
              roundComplete={roundComplete}
              eliminatedPlayer={eliminatedPlayer}
              onVote={handleVote}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}