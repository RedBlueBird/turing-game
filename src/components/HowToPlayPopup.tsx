import React from 'react';
import { motion } from 'framer-motion';
import ActionButton from './ActionButton';
import { backdropTransitions, popupTransitions } from '@/configs/animations';

type HowToPlayPopupProps = {
  isOpen: boolean;
  onClose: () => void;
};

const HowToPlayPopup: React.FC<HowToPlayPopupProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-gray-50/50 backdrop-blur-xs flex items-center justify-center z-50"
      variants={backdropTransitions}
      initial="hidden"
      animate="visible"
      onClick={handleBackdropClick}
    >
      <motion.div
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[80vh] flex flex-col mx-4"
        variants={popupTransitions}
        initial="hidden"
        animate="visible"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
          How To Play
        </div>
        
        <div className="overflow-y-auto flex-grow mb-8">
          <ol className="list-decimal list-inside space-y-4 text-md text-gray-700">
            <li>Join/Create a game room</li>
            <li>Write funny responses to silly questions</li>
            <li>Vote the most sus player</li>
            <li>Repeat</li>
          </ol>
        </div>
        
        <ActionButton
          text="Got It"
          onClick={onClose}
          variant="primary"
        />
      </motion.div>
    </motion.div>
  );
};

export default HowToPlayPopup; 