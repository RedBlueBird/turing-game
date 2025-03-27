import { motion } from "framer-motion";

interface ErrorMessageProps {
  message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  return message ? (
    <motion.div 
      className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {message}
    </motion.div>
  ) : null;
} 