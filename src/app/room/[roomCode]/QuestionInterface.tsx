'use client'
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { pageTransitions, containerTransitions, itemTransitions } from '@/configs/animations';
import { PlayerData, RoomData } from '@/configs/interfaces';

interface QuestionInterfaceProps {
  roomData: RoomData;
  playerData: PlayerData;
  onAnswerSubmit: (questionId: number, answer: string) => Promise<void>;
  onTimeUp?: () => void;
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
      {/* Title Section */}
      <div className="w-full text-center mb-8 mt-8">
        <h1 className="text-6xl font-bold mb-4 text-gray-900">
          Turing Game
        </h1>
        <p className="text-2xl text-gray-700 mb-4">
          Round {roomData.roomRound} • Time Remaining: <span className="text-red-500 font-medium">{formatTime(remainingTime)}</span>
        </p>
      </div>
      
      {/* Two-panel layout with adjusted width ratio */}
      <div className="flex flex-col md:flex-row w-full max-w-6xl gap-6 flex-grow" style={{ height: "calc(100vh - 220px)" }}>
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
                  No answers yet
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
        
        {/* Right Panel - Questions and input (60% width) */}
        <div className="w-full md:w-3/5 flex flex-col h-full">
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
            {error && (
              <motion.div 
                className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {error}
              </motion.div>
            )}
            
            {/* Content positioned in the vertical center */}
            <div className="flex-grow flex items-center justify-center">
              {/* Answer input or already answered message */}
              {questions.length > 0 && !allQuestionsAnswered ? (
                <div className="w-full max-w-md">
                  {!hasAnsweredCurrentQuestion ? (
                    <motion.div
                      className="flex flex-col items-center mx-auto"
                      animate={{
                        width: isFocused || answer.length > 0 ? '100%' : '80%',
                      }}
                    >
                      <motion.div 
                        className={`w-full rounded-lg shadow-md overflow-hidden bg-white border border-gray-200`}
                        whileHover={{ scale: 1.02 }}
                      >
                        {/* Fixed search bar that doesn't duplicate text */}
                        <div className="flex items-center w-full bg-gray-200 px-4 py-3">
                          <svg className="w-6 h-6 text-gray-500 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <path d="M21 21l-4.35-4.35" />
                          </svg>
                          <span className="text-gray-500">
                            {isFocused || answer.length > 0 ? 'Your answer:' : 'Type your answer here...'}
                          </span>
                        </div>
                        
                        {/* Expanded textarea */}
                        <div className={`w-full transition-all duration-300 ${isFocused || answer.length > 0 ? 'max-h-64' : 'max-h-0'} overflow-hidden`}>
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
                        
                        {/* Clickable area when collapsed */}
                        {!isFocused && answer.length === 0 && (
                          <div 
                            className="w-full h-10 cursor-text"
                            onClick={() => setIsFocused(true)}
                          />
                        )}
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