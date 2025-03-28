import { QuestionData, PlayerData } from "@/configs/interfaces";
import { motion } from "framer-motion";

interface AnswersPanelProps {
  questions: QuestionData[];
  currentQuestionIndex: number;
  playerData: PlayerData;
  className?: string;
  onPrevQuestion?: () => void;
  onNextQuestion?: () => void;
}

export function AnswersPanel({ 
  questions, 
  currentQuestionIndex, 
  playerData,
  className,
  onPrevQuestion,
  onNextQuestion 
}: AnswersPanelProps) {
  const hasMultipleQuestions = questions.length > 1;

  return (
    <div className={`w-full md:w-2/5 mb-6 md:mb-0 h-screen ${className}`}>
      <div className="bg-white rounded-lg shadow-md p-6 h-full flex flex-col">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Everyone's Answers
        </h2>
        
        {/* Answers list */}
        <div className="flex-grow overflow-y-auto min-h-0">
          {questions.length > 0 && questions[currentQuestionIndex] && questions[currentQuestionIndex].playerAnswers?.length > 0 ? (
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

        {/* Navigation arrows */}
        {hasMultipleQuestions && (
          <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
            <motion.button
              onClick={onPrevQuestion}
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
              onClick={onNextQuestion}
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
  );
} 