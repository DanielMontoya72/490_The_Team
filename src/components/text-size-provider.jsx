import React, { createContext, useContext, useEffect, useState } from 'react';

const TextSizeContext = createContext();

export function TextSizeProvider({ children }) {
  const [textSize, setTextSizeState] = useState('medium');

  useEffect(() => {
    // Load text size from localStorage on mount
    const savedTextSize = localStorage.getItem('textSize');
    if (savedTextSize && ['small', 'medium', 'large'].includes(savedTextSize)) {
      setTextSizeState(savedTextSize);
      document.documentElement.className = document.documentElement.className.replace(
        /text-size-\w+/g, 
        ''
      ) + ` text-size-${savedTextSize}`;
    } else if (savedTextSize === 'extra-large') {
      // Migrate users from removed extra-large to large
      setTextSizeState('large');
      localStorage.setItem('textSize', 'large');
      document.documentElement.className = document.documentElement.className.replace(
        /text-size-\w+/g, 
        ''
      ) + ` text-size-large`;
    } else {
      // Default to medium if no saved preference
      setTextSizeState('medium');
      document.documentElement.className = document.documentElement.className.replace(
        /text-size-\w+/g, 
        ''
      ) + ` text-size-medium`;
    }
  }, []);

  const setTextSize = (size) => {
    setTextSizeState(size);
    localStorage.setItem('textSize', size);
    
    // Update document class for CSS targeting
    document.documentElement.className = document.documentElement.className.replace(
      /text-size-\w+/g, 
      ''
    ) + ` text-size-${size}`;
  };

  return (
    <TextSizeContext.Provider value={{ textSize, setTextSize }}>
      {children}
    </TextSizeContext.Provider>
  );
}

export function useTextSize() {
  const context = useContext(TextSizeContext);
  if (context === undefined) {
    throw new Error('useTextSize must be used within a TextSizeProvider');
  }
  return context;
}