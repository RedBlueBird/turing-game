import React from 'react';
import { motion } from 'framer-motion';
import ActionButton from './ActionButton';
import { backdropTransitions, popupTransitions } from '@/configs/animations';

type ConfirmationPopupProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isHost: boolean;
};

const ConfirmationPopup: React.FC<ConfirmationPopupProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isHost
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking the backdrop itself, not its children
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
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md"
        variants={popupTransitions}
        initial="hidden"
        animate="visible"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-2xl font-bold text-gray-800 mb-4">
          {isHost ? 'Delete Room?' : 'Leave Room?'}
        </div>
        
        <p className="text-gray-600 mb-6">
          {isHost 
            ? 'Are you sure you want to delete this room? This action cannot be undone and all players will be removed.'
            : 'Are you sure you want to leave this room? You can rejoin later with the same room code.'}
        </p>
        
        <div className="grid grid-cols-2 gap-4">
          <ActionButton
            text="Cancel"
            onClick={onClose}
            variant="default"
          />
          
          <ActionButton
            text={isHost ? 'Delete' : 'Leave'}
            onClick={onConfirm}
            variant="danger"
          />
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ConfirmationPopup;