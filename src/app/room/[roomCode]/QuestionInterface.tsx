'use client'
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { pageTransitions } from '@/configs/animations';
import { PlayerData, QuestionData, RoomData } from '@/configs/interfaces';
import { GameHeader } from '@/components/room/GameHeader';
import { AnswersPanel } from '@/components/room/AnswersPanel';
import { ErrorMessage } from '@/components/ErrorMessage';

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
        setQuestions(data.questions);
        
        // Calculate remaining time
        if (roomData.roundStartTime) {
          const startTime = new Date(roomData.roundStartTime).getTime();
          const timePerRound = roomData.settings.timePerRound * 1000; // Convert to milliseconds
          const endTime = startTime + timePerRound;
          const currentTime = new Date().getTime();
          setRemainingTime(Math.max(0, Math.floor((endTime - currentTime) / 1000)));
        }
      } catch (err) {
        const errorMsg = "Failed to load questions" + (err.message? (": " + err.message) : "");
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

  // Separate useEffect for the timer countdown
  useEffect(() => {
    const timerId = setInterval(() => {
      setRemainingTime(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timerId);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
    
    return () => {
      clearInterval(timerId);
    };
  }, [roomData.roundStartTime, roomData.settings.timePerRound]);

  // Separate useEffect to handle the onTimeUp callback
  useEffect(() => {
    if (remainingTime === 0 && onTimeUp) {
      onTimeUp();
    }
  }, [remainingTime, onTimeUp]);

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
      
      // Move to next question if available
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }
    } catch (err) {
      setError('Failed to submit answer');
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

  const allQuestionsAnswered = answeredQuestions.length === questions.length;
  const hasMultipleQuestions = questions.length > 1;
  const hasAnsweredCurrentQuestion = questions.length > 0 && 
    questions[currentQuestionIndex]?.playerAnswers.some(a => a.playerId === playerData.id);

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
        title="Turing Game"
        round={roomData.roomRound}
        remainingTime={remainingTime}
      />
      
      <div className="flex flex-col-reverse md:flex-row w-full max-w-6xl gap-6 flex-grow mb-4" style={{ minHeight: "calc(100vh - 220px)", height: "auto" }}>
        <AnswersPanel
          questions={questions}
          currentQuestionIndex={currentQuestionIndex}
          playerData={playerData}
          onPrevQuestion={handlePrevQuestion}
          onNextQuestion={handleNextQuestion}
          className="flex-shrink-0"
        />
        
        {/* Right panel specific to QuestionInterface */}
        <div className="w-full md:w-3/5 flex flex-col">
          <div className="p-6 flex flex-col h-full">
            {questions.length > 0 ? (
              <div className="mb-auto">
                <h2 className="text-4xl font-bold mb-4 text-gray-900">
                  {questions[currentQuestionIndex]?.content || 'Loading question...'}
                </h2>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">Loading questions...</div>
            )}
            
            {/* Error message */}
            <ErrorMessage message={error} />
            
            {/* Content positioned in the vertical center */}
            <div className="flex-grow flex items-center justify-center">
              {/* Answer input or already answered message */}
              {questions.length > 0 && !allQuestionsAnswered ? (
                <div className="w-full max-w-md">
                  {!hasAnsweredCurrentQuestion ? (
                    <motion.div className="flex flex-col items-center mx-auto w-full">
                      <motion.div 
                        className="w-full rounded-lg shadow-md overflow-hidden bg-white border border-gray-200"
                        whileHover={{ scale: 1.02 }}
                      >
                        {/* Search bar */}
                        <div className="flex items-center w-full bg-gray-200 px-4 py-3">
                          <svg className="w-6 h-6 text-gray-500 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <path d="M21 21l-4.35-4.35" />
                          </svg>
                          <span className="text-gray-500">Your answer:</span>
                        </div>
                        
                        {/* Always expanded textarea */}
                        <div className="w-full">
                          <textarea
                            rows={4}
                            className="w-full p-4 border-none focus:outline-none focus:ring-0 resize-none"
                            placeholder="Type your answer here..."
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            onFocus={() => setIsFocused(true)}
                            maxLength={200}
                          />
                          <div className="flex justify-between items-center w-full px-4 py-2 bg-white">
                            <p className="text-sm text-gray-500">
                              {answer.length}/200 characters
                            </p>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={handleSubmit}
                              disabled={isSubmitting || !answer.trim()}
                              className={`px-6 py-2 rounded-full font-medium ${
                                isSubmitting || !answer.trim() 
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                  : 'bg-yellow-400 text-gray-800 hover:bg-yellow-500'
                              }`}
                            >
                              {isSubmitting ? "Submitting..." : "Submit"}
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  ) : (
                    <div className="text-center py-6 bg-yellow-50 rounded-lg border border-yellow-200 shadow-sm">
                      <h3 className="text-xl font-bold text-yellow-600 mb-2">
                        You've already answered this question
                      </h3>
                      <p className="text-gray-700">
                        Use the navigation below to move to another question or wait for other players.
                      </p>
                    </div>
                  )}
                </div>
              ) : allQuestionsAnswered ? (
                <div className="text-center py-8 bg-white rounded-lg shadow-md p-6 max-w-md w-full">
                  <h3 className="text-2xl font-bold text-green-600 mb-4">
                    All questions answered!
                  </h3>
                  <p className="text-gray-700 mb-6">
                    Waiting for other players to finish or the timer to run out.
                  </p>
                  <div className="flex justify-center">
                    <div className="bg-gray-200 rounded-full h-4 w-full max-w-md overflow-hidden">
                      <div className="bg-green-500 h-4 rounded-full w-full"></div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}