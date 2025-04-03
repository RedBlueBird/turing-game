'use client'
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { pageTransitions } from '@/configs/animations';
import { PlayerData, QuestionData, RoomData } from '@/configs/interfaces';
import { GameHeader } from '@/components/room/GameHeader';
import { AnswersPanel } from '@/components/room/AnswersPanel';
import { ErrorMessage } from '@/components/ErrorMessage';
import { QuestionAnswerPanel } from '@/components/room/QuestionAnswerPanel';

interface QuestionInterfaceProps {
  roomData: RoomData;
  playerData: PlayerData;
  onAnswerSubmit: (questionId: number, answer: string) => Promise<void>;
  onTimeUp?: () => void;
}

export default function QuestionInterface({
  roomData,
  playerData,
  onAnswerSubmit,
  onTimeUp
}: QuestionInterfaceProps) {
  const router = useRouter();

  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [remainingTime, setRemainingTime] = useState<number>(120);
  const [answeredQuestions, setAnsweredQuestions] = useState<number[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  
  // Mobile swipe mechanics
  const [isMobile, setIsMobile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [activePanelIndex, setActivePanelIndex] = useState(0); // 0 = Question Panel, 1 = Answers Panel
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

  // Fetch questions useEffect
  useEffect(() => {
    // Fetch questions for the current round
    const fetchQuestions = async () => {
      try {
        const response = await fetch(`/api/rooms/${roomData.roomCode}/questions?round=${roomData.roomRound}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to load questions');
        }

        const data = await response.json();
        // Ensure playerAnswers is always an array
        const questionsWithAnswers = data.questions.map((q: QuestionData) => ({
            ...q,
            playerAnswers: q.playerAnswers || []
        }));
        setQuestions(questionsWithAnswers);

        // Calculate remaining time
        if (roomData.roundStartTime) {
          const startTime = new Date(roomData.roundStartTime).getTime();
          const timePerRound = roomData.settings.timePerRound * 1000; // Convert to milliseconds
          const endTime = startTime + timePerRound;
          const currentTime = new Date().getTime();
          setRemainingTime(Math.max(0, Math.floor((endTime - currentTime) / 1000)));
        }
      } catch (err: any) {
        const errorMsg = "Failed to load questions" + (err.message ? (": " + err.message) : "");
        console.error(errorMsg);
        setError(errorMsg);
      }
    };

    fetchQuestions();

    // Set up polling to refresh questions and answers
    const intervalId = setInterval(fetchQuestions, 3000);

    // Clean up intervals on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [roomData.roomCode, roomData.roomRound, roomData.roundStartTime, roomData.settings.timePerRound]);

  // Timer countdown useEffect
  useEffect(() => {
    let timerId: NodeJS.Timeout | null = null;
    if (remainingTime > 0) {
        timerId = setInterval(() => {
          setRemainingTime(prevTime => {
            if (prevTime <= 1) {
              if (timerId) clearInterval(timerId);
              return 0;
            }
            return prevTime - 1;
          });
        }, 1000);
    } else {
        setRemainingTime(0);
    }

    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [remainingTime]);

  // Handle time up callback
  useEffect(() => {
    if (remainingTime === 0 && onTimeUp) {
      onTimeUp();
    }
  }, [remainingTime, onTimeUp]);

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
      // Swiped right, go to question panel
      setActivePanelIndex(0);
    }
    
    setDragX(0);
  };

  const handleSubmit = async () => {
    if (!answer.trim()) {
      setError('Please enter an answer');
      return;
    }

    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError('');

      if (!questions[currentQuestionIndex]) {
        throw new Error('Question not found');
      }

      await onAnswerSubmit(questions[currentQuestionIndex].id, answer);

      // Add to answered questions
      setAnsweredQuestions(prev => [...prev, questions[currentQuestionIndex].id]);

      // Clear answer
      setAnswer('');
      setIsFocused(false);

      // Find the next unanswered question index
      let nextIndex = -1;
      for (let i = 0; i < questions.length; i++) {
          const questionId = questions[i].id;
          if (!answeredQuestions.includes(questionId) && !(questions[i].playerAnswers?.some(a => a.playerId === playerData.id))) {
              nextIndex = i;
              break;
          }
      }

      // Move to the next unanswered question if available
      if (nextIndex !== -1) {
          setCurrentQuestionIndex(nextIndex);
      }
    } catch (err: any) {
      setError('Failed to submit answer: ' + err.message);
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
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

  const currentQuestion = questions[currentQuestionIndex];
  const allQuestionsAnsweredOrSubmitted = questions.every(q =>
      answeredQuestions.includes(q.id) || q.playerAnswers?.some(a => a.playerId === playerData.id)
  );
  const hasAnsweredCurrentQuestion = currentQuestion?.playerAnswers?.some(a => a.playerId === playerData.id) || answeredQuestions.includes(currentQuestion?.id);

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

  return (
    <motion.div
      key="question-interface"
      initial="initial"
      animate="enter"
      exit="exit"
      variants={pageTransitions}
      className="flex flex-col w-full h-screen bg-gray-100 p-4 overflow-hidden"
    >
      {/* Game Header */}
      <div className="flex-shrink-0">
        <GameHeader
          title="Turing Game"
          round={roomData.roomRound}
          remainingTime={remainingTime}
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
              {/* Question Panel */}
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
                {/* Question Panel Content */}
                <div className="w-full h-full md:h-full flex flex-col p-4 overflow-y-auto">
                  <QuestionAnswerPanel
                    currentQuestion={currentQuestion}
                    answer={answer}
                    isSubmitting={isSubmitting}
                    error={error}
                    hasAnsweredCurrentQuestion={hasAnsweredCurrentQuestion}
                    allQuestionsAnsweredOrSubmitted={allQuestionsAnsweredOrSubmitted}
                    onAnswerChange={(value) => setAnswer(value)}
                    onSubmit={handleSubmit}
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
          <div className="w-full md:w-2/5 flex-shrink-0 md:h-full min-h-0">
            <AnswersPanel
              questions={questions}
              currentQuestionIndex={currentQuestionIndex}
              playerData={playerData}
              onPrevQuestion={handlePrevQuestion}
              onNextQuestion={handleNextQuestion}
              className="h-full"
            />
          </div>

          {/* Right Panel (Question Interface Details) */}
          <div className="w-full md:w-3/5 md:h-full flex flex-col min-h-0">
            <QuestionAnswerPanel
              currentQuestion={currentQuestion}
              answer={answer}
              isSubmitting={isSubmitting}
              error={error}
              hasAnsweredCurrentQuestion={hasAnsweredCurrentQuestion}
              allQuestionsAnsweredOrSubmitted={allQuestionsAnsweredOrSubmitted}
              onAnswerChange={(value) => setAnswer(value)}
              onSubmit={handleSubmit}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}