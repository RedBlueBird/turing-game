'use client'
// app/join/page.tsx
import { useState, useRef, createRef, RefObject, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AnimatePresence } from 'framer-motion';

import ActionButton from '@/components/ActionButton';
import { pageTransitions } from '@/configs/animations';
import { StoredData } from '@/configs/interfaces';
import { ErrorMessage } from '@/components/ErrorMessage';

export default function JoinRoom() {
  const router = useRouter();
  const [isUiVisible, setIsUiVisible] = useState(true);
  const [code, setCode] = useState<string[]>(['', '', '', '']);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    
    const roomCode = code.join('');
    if (roomCode.length !== 4) {
      setError('Please enter a complete 4-character room code');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      // Check if the player is already in a room
      const storedPlayerInfo = localStorage.getItem('turingGame_player');
      if (storedPlayerInfo) {
        const currRoomCode = JSON.parse(storedPlayerInfo).roomCode;
        if (currRoomCode != roomCode){
          throw new Error("Player already in a room [" + JSON.parse(storedPlayerInfo).roomCode + "]");
        } 
        else {
          router.push(`/room/${roomCode}`);
          return;
        }
      }

      // Check if the room exists and is available
      const checkResponse = await fetch(`/api/rooms/${roomCode}`);
      
      if (!checkResponse.ok) {
        const errorMessage = await checkResponse.json();
        throw new Error(errorMessage.message);
      }
      
      const roomData = await checkResponse.json();
      
      // If room exists, try to join
      const joinResponse = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomCode
        }),
      });
      
      if (!joinResponse.ok) {
        const errorData = await joinResponse.json();
        throw new Error(errorData.message || 'Failed to join room');
      }
      
      const joinData = await joinResponse.json();
      
      // Store player data in localStorage
      const storedData: StoredData = {
        id: joinData.playerData.id,
        realName: joinData.playerData.realName,
        isHost: false,
        roomId: joinData.roomData.roomId,
        roomCode: joinData.roomData.roomCode
      };
      localStorage.setItem('turingGame_player', JSON.stringify(storedData));
      
      // Navigate to room
      setIsUiVisible(false);
      setTimeout(() => {
        router.push(`/room/${roomCode}`);
      }, 200);
    } catch (err) {
      const errorMsg = "Failed to join room" + (err.message? (": " + err.message) : "");
      // console.error(errorMsg);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    setIsUiVisible(false);
    setTimeout(() => {
      router.push('/');
    }, 200);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
    <AnimatePresence>
    {isUiVisible && <motion.div
      key="ui"
      initial="initial"
      animate="enter"
      exit="exit"
      variants={pageTransitions}
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

        <ErrorMessage message={error} />        

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
                  value={char || ''}
                  onChange={(e) => {
                    if (index === activeIndex) {
                      handleInputChange(e);
                    } else {
                      setActiveIndex(index);
                    }
                  }}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setActiveIndex(index)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className={`w-16 h-16 text-center text-3xl font-bold border-b-4 text-gray-800
                  ${activeIndex === index ? 'border-yellow-400' : 'border-gray-300'} 
                  focus:outline-none focus:border-yellow-400 bg-transparent`}
                  style={{ 
                    borderTop: 'none',
                    borderLeft: 'none', 
                    borderRight: 'none',
                    borderBottom: activeIndex === index ? '4px solid #facc15' : '4px solid #d1d5db',
                    lineHeight: 'normal',
                    paddingTop: '12px',
                    paddingBottom: '12px',
                    boxSizing: 'border-box',
                    WebkitAppearance: 'none'
                  }}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  whileFocus={{ scale: 1.05 }}
                />
              ))}
            </div>
            
            <ActionButton 
              text="Join Room"
              onClick={() => {}} // Form will handle submission
              variant="primary"
              disabled={!code.every(c => c !== '')}
              type="submit"
              className="py-4 text-2xl"
            />
          </form>
        </motion.div>

        <ActionButton
          text="Back"
          onClick={handleGoBack}
          variant="default"
          className="py-4 text-2xl"
        />
      </main>
    </motion.div>}
    </AnimatePresence>
    </div>
  );
}