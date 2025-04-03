'use client'
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Head from 'next/head';

export default function Home() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragX, setDragX] = useState(0);
  const constraintsRef = useRef(null);
  
  // Cards data
  const cards = [
    { id: 1, title: "Card One", color: "bg-blue-500", content: "This is the first card content" },
    { id: 2, title: "Card Two", color: "bg-purple-500", content: "This is the second card content" }
  ];
  
  // Check if device is mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);
  
  const getNextIndex = (current) => (current + 1) % cards.length;
  const getPrevIndex = (current) => (current - 1 + cards.length) % cards.length;
  
  const handleDragStart = () => {
    setIsDragging(true);
  };
  
  const handleDrag = (e, info) => {
    setDragX(info.offset.x);
  };
  
  const handleDragEnd = (e, info) => {
    setIsDragging(false);
    const threshold = 50; // minimum distance required for a swipe
    
    if (info.offset.x < -threshold) {
      // Swiped left, go to next card
      setCurrentIndex(getNextIndex(currentIndex));
    } else if (info.offset.x > threshold) {
      // Swiped right, go to previous card
      setCurrentIndex(getPrevIndex(currentIndex));
    }
    
    setDragX(0);
  };

  // Calculate positions based on drag
  const calculateCardPosition = (index) => {
    if (index === currentIndex) {
      return dragX;
    } else if (cards.length > 2) {
      if (index === getNextIndex(currentIndex)) {
        return window.innerWidth + dragX;
      } else if (index === getPrevIndex(currentIndex)) {
        return -window.innerWidth + dragX;
      }
    } else if (cards.length === 2) {
      return (dragX > 0 ? -1 : 1) * window.innerWidth + dragX;
    }
    return 0;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Head>
        <title>Swipeable Cards</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* Title */}
      <h1 className="text-3xl font-bold text-center p-6">
        Interactive Cards
      </h1>

      {/* Mobile View */}
      {isMobile ? (
        <div 
          className="flex-grow relative overflow-hidden" 
          ref={constraintsRef}
        >
          <motion.div
            className="absolute inset-0"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }} // Limit right drag to 0
            dragElastic={0.2} // Reduced elasticity
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            style={{ touchAction: "pan-y" }}
          >
            {/* Card Container */}
            <div className="w-full h-full relative">
              {/* All cards are rendered together */}
              {cards.map((card, index) => {
                const isCurrentCard = index === currentIndex;
                const isNextCard = index === getNextIndex(currentIndex);
                const isPrevCard = index === getPrevIndex(currentIndex);
                
                if (!isCurrentCard && !isNextCard && !isPrevCard) return null;
                
                return (
                  <motion.div
                    key={card.id}
                    className="absolute top-0 left-0 w-full h-full flex items-center justify-center px-4"
                    initial={false}
                    animate={{
                      x: isDragging 
                        ? calculateCardPosition(index) 
                        : (isCurrentCard ? 0 : (isNextCard ? window.innerWidth : -window.innerWidth)),
                      opacity: isCurrentCard || isDragging ? 1 : 0.8,
                      scale: isCurrentCard || isDragging ? 1 : 0.95,
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
                    style={{ zIndex: isCurrentCard ? 10 : 5 }}
                  >
                    <div 
                      className={`w-full max-w-md rounded-lg shadow-lg ${card.color} p-8 text-white`}
                      style={{ height: "60vh" }}
                    >
                      <h2 className="text-2xl font-bold mb-4">{card.title}</h2>
                      <p>{card.content}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Indicators */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2 z-20">
            {cards.map((_, index) => (
              <div 
                key={index} 
                className={`h-2 w-2 rounded-full ${index === currentIndex ? 'bg-white' : 'bg-white/40'}`} 
              />
            ))}
          </div>
        </div>
      ) : (
        /* Desktop View */
        <div className="flex-grow flex items-center justify-center">
          <div className="flex space-x-8 px-8">
            {cards.map((card) => (
              <motion.div
                key={card.id}
                whileHover={{ scale: 1.05 }}
                className={`w-64 h-96 rounded-lg shadow-lg ${card.color} p-6 text-white`}
              >
                <h2 className="text-xl font-bold mb-4">{card.title}</h2>
                <p>{card.content}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}