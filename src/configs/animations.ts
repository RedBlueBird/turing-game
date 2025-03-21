// styles/animations.ts

// For page variants
export const pageTransitions = {
  initial: { 
    opacity: 0, 
    x: 100, 
    scale: 0.95 
  },
  enter: { 
    opacity: 1, 
    x: 0, 
    scale: 1,
    transition: { duration: 0.2, ease: [0.61, 1, 0.88, 1] }
  },
  exit: { 
    opacity: 0, 
    x: -100,
    transition: { duration: 0.2, ease: [0.61, 1, 0.88, 1] }
  }
};

// For list variants
export const containerTransitions = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

export const itemTransitions = {
  hidden: { 
    opacity: 0, 
    y: 20 
  },
  show: { 
    opacity: 1, 
    y: 0 
  }
};

// For popup variants
export const backdropTransitions = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 }
};

export const popupTransitions = {
  hidden: { 
    opacity: 0,
    scale: 0.8,
    y: 20
  },
  visible: { 
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.2, ease: [0.61, 1, 0.88, 1] }
  }
};