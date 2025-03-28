'use client'
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [feedback, setFeedback] = useState('');
  const componentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (componentRef.current && !componentRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSubmit = async () => {
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: feedback }),
      });
      setIsSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsSubmitted(false);
        setFeedback('');
      }, 2000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  return (
    <motion.div
      ref={componentRef}
      className="fixed bottom-4 right-4 z-50"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      exit={{ y: 100 }}
    >
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            className="mb-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="bg-white rounded-lg shadow-lg p-4 w-72">
              {!isSubmitted ? (
                <>
                  <textarea
                    className="w-full h-32 p-2 border rounded-lg mb-2 resize-none focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    placeholder="Share your suggestions or report issues..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    onClick={(e) => e.currentTarget.placeholder = ''}
                    autoFocus
                  />
                  <motion.button
                    className="w-full bg-yellow-400 text-gray-800 rounded-lg py-2 font-medium hover:bg-yellow-500 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubmit}
                    disabled={!feedback.trim()}
                  >
                    Submit Feedback
                  </motion.button>
                </>
              ) : (
                <div className="text-center text-green-600 py-4">
                  Your feedback is received!
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.button
            className="bg-yellow-400 text-gray-800 rounded-lg px-6 py-3 shadow-lg hover:bg-yellow-500 transition-colors flex items-center gap-2 opacity-75 hover:opacity-100"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsOpen(true)}
          >
            <span className="text-xl">💭</span>
            {/* <span className="font-medium">Feedback</span> */}
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
} 