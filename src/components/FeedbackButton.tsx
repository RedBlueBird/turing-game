'use client'
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [feedback, setFeedback] = useState('');
  const componentRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null); // Ref for the textarea
  const [keyboardOffset, setKeyboardOffset] = useState(0); // State to hold the offset needed

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (componentRef.current && !componentRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    // Only add listener if the component is open
    if (isOpen) {
       document.addEventListener('mousedown', handleClickOutside);
    } else {
       document.removeEventListener('mousedown', handleClickOutside); // Clean up immediately if closed
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]); // Re-run when isOpen changes


  // Keyboard handling effect - runs only when the form is open
  useEffect(() => {
    const visualViewport = window.visualViewport;
    if (!visualViewport || !isOpen) return; // Exit if API not supported or form closed

    let initialViewportHeight = visualViewport.height;

    const handleViewportResize = () => {
      const currentViewportHeight = visualViewport.height;
      // Calculate difference (keyboard height approximation)
      const heightDifference = window.innerHeight - currentViewportHeight;

      // Only apply offset if keyboard is likely open (significant height difference)
      // and the textarea is the active element
      if (heightDifference > 100 && document.activeElement === textareaRef.current) {
         setKeyboardOffset(heightDifference);
         // Optional: Scroll textarea into view if needed after position change
         // setTimeout(() => textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
      } else {
         // Reset offset if keyboard seems closed or textarea isn't focused
         setKeyboardOffset(0);
      }
    };

    // Check immediately in case keyboard is already open when component mounts/opens
    // handleViewportResize();

    visualViewport.addEventListener('resize', handleViewportResize);

    return () => {
      visualViewport.removeEventListener('resize', handleViewportResize);
      setKeyboardOffset(0); // Ensure reset when component closes or effect cleans up
    };
  }, [isOpen]); // Dependency: only run/re-run when isOpen changes


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
      setKeyboardOffset(0); // Reset offset on submission
      setTimeout(() => {
        setIsOpen(false);
        setIsSubmitted(false);
        setFeedback('');
      }, 2000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  // Handlers to clear offset when textarea loses focus (optional but good practice)
  const handleTextareaBlur = () => {
      // Small delay because blur might fire just before keyboard hides/resizes
      setTimeout(() => {
          // Check if still focused; sometimes focus shifts rapidly
          if (document.activeElement !== textareaRef.current) {
            setKeyboardOffset(0);
          }
      }, 100);
  };


  // Dynamic style for the main container
  const componentStyle: React.CSSProperties = {
      position: 'fixed',
      right: '1rem', // 1rem = 16px (equiv. to right-4)
      bottom: `calc(1rem + ${keyboardOffset}px)`, // Apply dynamic offset
      zIndex: 50,
      transition: 'bottom 0.2s ease-out', // Smooth transition for position change
  };

  return (
    // Apply the dynamic style here
    <motion.div
      ref={componentRef}
      style={componentStyle}
      // Removed fixed positioning from className, handled by style now
      className="z-50" // Keep z-index if needed, remove bottom-4, right-4
      // Initial animation can remain if desired
      // initial={{ y: 100 }}
      // animate={{ y: 0 }}
      // exit={{ y: 100 }}
    >
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            className="mb-2" // Margin bottom between form and potential button below
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="bg-white rounded-lg shadow-lg p-4 w-72">
              {!isSubmitted ? (
                <>
                  <textarea
                    ref={textareaRef} // Add ref here
                    className="w-full h-32 p-2 border rounded-lg mb-2 text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    placeholder="Share your suggestions or report bugs/glitches..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    // onFocus={handleTextareaFocus} // Trigger initial check/listener setup (handled by useEffect[isOpen])
                    onBlur={handleTextareaBlur}   // Trigger cleanup/reset
                    autoFocus // Keep autofocus if desired
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
            className="bg-yellow-400 text-gray-800 rounded-lg px-6 py-3 shadow-lg hover:bg-yellow-500 transition-colors flex items-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsOpen(true)}
            style={{ position: 'relative', zIndex: 1 }} // Ensure button is clickable over the adjusted div spot when closed
          >
            <span className="text-xl">💭</span>
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}