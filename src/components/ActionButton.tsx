'use client'
import React from 'react';
import { motion } from 'framer-motion';

interface ActionButtonProps {
  icon?: React.ReactNode;
  text: string;
  onClick?: (e:any) => void;
  variant?: 'default' | 'primary' | 'danger' | 'success' | 'disabled';
  className?: string;
  fullWidth?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  customDisabledText?: string;
}

export default function ActionButton({ 
  icon, 
  text, 
  onClick, 
  variant = 'default',
  className = "", 
  fullWidth = true,
  disabled = false,
  type = 'button',
  customDisabledText
}: ActionButtonProps) {
  // Define variant styles
  const variantStyles = {
    default: "bg-gray-200 hover:bg-gray-300 text-gray-800",
    primary: "bg-yellow-400 hover:bg-yellow-500 text-gray-800",
    danger: "bg-red-500 hover:bg-red-600 text-white",
    success: "bg-green-500 hover:bg-green-600 text-white",
    disabled: "bg-gray-300 text-gray-500"
  };

  // Handle disabled state styles
  const disabledStyle = disabled 
    ? "opacity-70 cursor-not-allowed bg-gray-300 text-gray-500 hover:bg-gray-300" 
    : variantStyles[variant];

  return (
    <motion.button 
      type={type}
      onClick={disabled ? undefined : onClick}
      className={`flex items-center justify-center rounded-lg py-4 px-8 transition-colors ${disabledStyle} ${fullWidth ? 'w-full' : ''} ${className}`}
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      disabled={disabled}
    >
      {icon && <span className={`text-2xl ${text || customDisabledText ? 'mr-4' : ''}`}>{icon}</span>}
      <span className="text-2xl font-medium">{disabled && customDisabledText ? customDisabledText : text}</span>
    </motion.button>
  );
}