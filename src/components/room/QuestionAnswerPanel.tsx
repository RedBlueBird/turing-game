import { motion } from 'framer-motion';
import { ErrorMessage } from '@/components/ErrorMessage';
import { QuestionData } from '@/configs/interfaces';

interface QuestionAnswerPanelProps {
  currentQuestion: QuestionData | undefined;
  answer: string;
  isSubmitting: boolean;
  error: string;
  hasAnsweredCurrentQuestion: boolean;
  allQuestionsAnsweredOrSubmitted: boolean;
  onAnswerChange: (value: string) => void;
  onSubmit: () => void;
  className?: string;
}

export function QuestionAnswerPanel({
  currentQuestion,
  answer,
  isSubmitting,
  error,
  hasAnsweredCurrentQuestion,
  allQuestionsAnsweredOrSubmitted,
  onAnswerChange,
  onSubmit,
  className = ''
}: QuestionAnswerPanelProps) {
  return (
    <div className={`p-4 md:p-6 flex flex-col h-full overflow-y-auto ${className}`}>
      {/* Question Content */}
      <div className="mb-2 md:mb-4 flex-shrink-0">
        {currentQuestion ? (
          <h2 className="text-3xl md:text-4xl font-bold mb-2 md:mb-4 text-gray-900">
            {currentQuestion.content}
          </h2>
        ) : (
          <div className="text-center text-gray-500 py-4">Loading questions...</div>
        )}
        <ErrorMessage message={error} />
      </div>

      {/* Answer Area */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0">
        {currentQuestion ? (
          <div className="w-full max-w-md">
            {!hasAnsweredCurrentQuestion ? (
              <div className="flex flex-col items-center mx-auto w-full">
                <motion.div
                  className="w-full rounded-lg shadow-md overflow-hidden bg-white border border-gray-200"
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="flex items-center w-full bg-gray-200 px-4 py-2">
                    <span className="text-gray-500">Your answer:</span>
                  </div>
                  <div className="w-full">
                    <textarea
                      rows={3}
                      className="w-full p-3 text-gray-800 border-none focus:outline-none focus:ring-0 resize-none"
                      placeholder="Type your answer here..."
                      value={answer}
                      onChange={(e) => onAnswerChange(e.target.value)}
                      maxLength={200}
                    />
                    <div className="flex justify-between items-center w-full px-3 py-2 bg-white">
                      <p className="text-sm text-gray-500">
                        {answer.length}/200 characters
                      </p>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onSubmit}
                        disabled={isSubmitting || !answer.trim()}
                        className={`px-4 py-1 rounded-full font-medium ${
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
              </div>
            ) : (
              <div className="text-center py-4 bg-yellow-50 rounded-lg border border-yellow-200 shadow-sm">
                <h3 className="text-lg md:text-xl font-bold text-yellow-600 mb-2">
                  You've already answered this question
                </h3>
                <p className="text-sm md:text-base text-gray-700">
                  Use the navigation below the answers to move to another question or wait for other players.
                </p>
              </div>
            )}
          </div>
        ) : allQuestionsAnsweredOrSubmitted ? (
          <div className="text-center py-4 md:py-8 bg-white rounded-lg shadow-md p-4 md:p-6 max-w-md w-full">
            <h3 className="text-xl md:text-2xl font-bold text-green-600 mb-2 md:mb-4">
              All questions answered!
            </h3>
            <p className="text-sm md:text-base text-gray-700 mb-4 md:mb-6">
              Waiting for other players to finish or the timer to run out.
            </p>
            <div className="flex justify-center">
              <div className="bg-gray-200 rounded-full h-3 md:h-4 w-full max-w-xs overflow-hidden">
                <div className="bg-green-500 h-full rounded-full w-full animate-pulse"></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-6">Loading...</div>
        )}
      </div>
    </div>
  );
} 