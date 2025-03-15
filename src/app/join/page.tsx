'use client'
// pages/join.tsx
import { useState, useRef, createRef, RefObject, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AnimatePresence } from 'framer-motion';

export default function JoinRoom() {
  const router = useRouter();
  const [isUiVisible, setIsUiVisible] = useState(true);
  const [code, setCode] = useState<string[]>(['', '', '', '']);
  const [activeIndex, setActiveIndex] = useState<number>(0);

  // Create refs array with the correct type
  const inputRefs = useRef<Array<RefObject<HTMLInputElement> | null>>([]);
  
  // Initialize refs if they don't exist
  if (inputRefs.current.length === 0) {
    inputRefs.current = Array(4).fill(null).map(() => createRef<HTMLInputElement>());
  }

  // Focus the first input on component mount
  useEffect(() => {
    const firstInput = inputRefs.current[0]?.current;
    if (firstInput) {
      firstInput.focus();
    }
  }, []);

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>): void => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').toUpperCase();
    
    // Filter to only allow alphanumeric characters
    const filteredText = pastedText.replace(/[^a-zA-Z0-9]/g, '');
    
    // Take only the first 4 characters (or fewer if less are pasted)
    const characters = filteredText.slice(0, 4).split('');
    
    // Fill the code array with the pasted characters
    const newCode = [...code];
    characters.forEach((char, index) => {
      if (index < 4) newCode[index] = char;
    });
    
    setCode(newCode);
    
    // Focus the appropriate input after pasting
    const focusIndex = Math.min(characters.length, 3);
    setActiveIndex(focusIndex);
    const inputToFocus = inputRefs.current[focusIndex]?.current;
    if (inputToFocus) {
      inputToFocus.focus();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value.toUpperCase();
    
    // Handle case when typing multiple characters at once
    if (value.length > 1) {
      // Create a new array with the characters
      const characters = value.split('').slice(0, 4);
      const newCode = [...code];
      
      // Fill the code array starting from activeIndex
      let currentIndex = activeIndex;
      for (let i = 0; i < characters.length && currentIndex < 4; i++) {
        // Skip non-alphanumeric characters
        if (!characters[i].match(/^[a-zA-Z0-9]$/)) continue;
        
        newCode[currentIndex] = characters[i];
        currentIndex++;
      }
      
      setCode(newCode);
      
      // Set focus to the appropriate field
      if (currentIndex < 4) {
        setActiveIndex(currentIndex);
        const nextInput = inputRefs.current[currentIndex]?.current;
        if (nextInput) {
          nextInput.focus();
        }
      } else {
        setActiveIndex(3);
        const lastInput = inputRefs.current[3]?.current;
        if (lastInput) {
          lastInput.focus();
        }
      }
      return;
    }
    
    // Single character input handling
    if (value && !value.match(/^[a-zA-Z0-9]$/)) return;
    
    const newCode = [...code];
    newCode[activeIndex] = value;
    setCode(newCode);
    
    // Auto-advance to next input if current one is filled
    if (value && activeIndex < 3) {
      setActiveIndex(activeIndex + 1);
      const nextInput = inputRefs.current[activeIndex + 1]?.current;
      if (nextInput) {
        nextInput.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    // Current index is needed for key handling
    const index = activeIndex;
    
    // Handle backspace: clear current field and move to previous if empty
    if (e.key === 'Backspace') {
      const newCode = [...code];
      
      if (newCode[index] === '') {
        // If current field is empty, go to previous field
        if (index > 0) {
          setActiveIndex(index - 1);
          newCode[index - 1] = '';
          setCode(newCode);
          const prevInput = inputRefs.current[index - 1]?.current;
          if (prevInput) {
            prevInput.focus();
          }
        }
      } else {
        // If current field has a value, just clear it
        newCode[index] = '';
        setCode(newCode);
      }
    }
    
    // Handle arrow keys for navigation
    if (e.key === 'ArrowLeft' && index > 0) {
      setActiveIndex(index - 1);
      const prevInput = inputRefs.current[index - 1]?.current;
      if (prevInput) {
        prevInput.focus();
      }
    }
    
    if (e.key === 'ArrowRight' && index < 3) {
      setActiveIndex(index + 1);
      const nextInput = inputRefs.current[index + 1]?.current;
      if (nextInput) {
        nextInput.focus();
      }
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    
    const roomCode = code.join('');
    if (roomCode.length === 4) {
      console.log('Joining room with code:', roomCode);
      // Add a small delay to allow the exit animation to play
      setTimeout(() => {
        router.push(`/room/${roomCode}`);
      }, 200);
    } else {
      alert('Please enter a complete 4-character room code');
    }
  };

  const handleGoBack = () => {
    setIsUiVisible(false);
    // Add a small delay to allow the animation to play
    setTimeout(() => {
      router.push('/');
    }, 200);
  };

  // Animation variants
  const pageVariants = {
    initial: {
      opacity: 0,
      x: 100,
      scale: 0.95,
    },
    enter: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        duration: 0.2,
        ease: [0.61, 1, 0.88, 1],
      }
    },
    exit: {
      opacity: 0,
      x: 100,
      transition: {
        duration: 0.2,
        ease: [0.61, 1, 0.88, 1],
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
    <AnimatePresence>
    {isUiVisible && <motion.div
      key="ui"
      initial="initial"
      animate="enter"
      exit="exit"
      variants={pageVariants}
    >
      <Head>
        <title>Join Room | Turing Game</title>
        <meta name="description" content="Join a Turing Game room" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex flex-col items-center justify-center w-full flex-1 px-4 sm:px-20">
        <h1 className="text-4xl font-bold mb-8 text-gray-900">
          Join Room Code
        </h1>

        <motion.div 
          className="bg-white rounded-lg shadow-md p-6 w-full max-w-md mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <form onSubmit={handleSubmit} className="flex flex-col items-center">
            <div className="flex justify-center space-x-4 mb-8">
              {code.map((char, index) => (
                <motion.input
                  key={index}
                  ref={inputRefs.current[index]}
                  type="text"
                  maxLength={index === activeIndex ? 4 : 1}
                  defaultValue={char}
                  onChange={index === activeIndex ? handleInputChange : undefined}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setActiveIndex(index)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className={`w-16 h-16 text-center text-3xl font-bold border-b-4 
                  ${activeIndex === index ? 'border-yellow-400' : 'border-gray-300'} 
                  focus:outline-none focus:border-yellow-400 bg-transparent`}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  whileFocus={{ scale: 1.05 }}
                />
              ))}
            </div>
            
            <motion.button 
              type="submit"
              className={`w-full py-4 px-8 rounded-lg text-2xl font-medium transition-colors
              ${code.every(c => c !== '') 
                ? 'bg-yellow-400 hover:bg-yellow-500 text-gray-800' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
              disabled={!code.every(c => c !== '')}
              whileHover={code.every(c => c !== '') ? { scale: 1.03 } : {}}
              whileTap={code.every(c => c !== '') ? { scale: 0.97 } : {}}
            >
              Join Room
            </motion.button>
          </form>
        </motion.div>

        <motion.button
          onClick={handleGoBack}
          className="flex items-center justify-center bg-gray-200 rounded-lg py-4 px-8 w-full max-w-md hover:bg-gray-300 transition-colors"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <span className="text-2xl font-medium text-gray-800">Back</span>
        </motion.button>
      </main>
    </motion.div>}
    </AnimatePresence>
    </div>
  );
}