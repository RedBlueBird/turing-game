import React from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import ActionButton from './ActionButton';

type ChangeLogItem = {
  version: string;
  date: string;
  changes: string; // Markdown content
};

type ChangeLogPopupProps = {
  isOpen: boolean;
  onClose: () => void;
  changeLog: ChangeLogItem[];
};

const ChangeLogPopup: React.FC<ChangeLogPopupProps> = ({
  isOpen,
  onClose,
  changeLog
}) => {
  if (!isOpen) return null;

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  const popupVariants = {
    hidden: { 
      opacity: 0,
      scale: 0.8,
      y: 20
    },
    visible: { 
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.2,
        ease: [0.61, 1, 0.88, 1]
      }
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking the backdrop itself, not its children
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-gray-50/50 backdrop-blur-xs flex items-center justify-center z-50"
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      onClick={handleBackdropClick}
    >
      <motion.div
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[80vh] flex flex-col"
        variants={popupVariants}
        initial="hidden"
        animate="visible"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-3xl font-bold text-gray-800 mb-4 flex items-center">
          <span className="mr-3 text-3xl">🏆</span>
          Recent Changes
        </div>
        
        <div className="overflow-y-auto flex-grow mb-6 pr-2">
          {changeLog.map((item, index) => (
            <div key={index} className={`mb-6 pt-6 ${index !== 0 ? 'border-t' : ''}`}>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xl font-bold text-gray-800">Version {item.version}</h3>
                <span className="text-sm text-gray-500">{item.date}</span>
              </div>
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                >
                  {item.changes}
                </ReactMarkdown>
              </div>
            </div>
          ))}
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

export default ChangeLogPopup;