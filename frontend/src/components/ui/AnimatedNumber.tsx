import React, { useEffect, useRef, useState } from 'react';
import { useSpring, useTransform } from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  format?: (val: number) => string;
  className?: string;
  duration?: number;
}

export default function AnimatedNumber({ 
  value, 
  format = (val) => val.toString(), 
  className = '',
  duration = 1.5 
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  const spring = useSpring(0, {
    stiffness: 40,
    damping: 15,
    mass: 1
  });

  const display = useTransform(spring, (current) => format(current));

  useEffect(() => {
    if (isClient) {
      spring.set(value);
    }
  }, [spring, value, isClient]);

  useEffect(() => {
    // For framer-motion v11/v12
    const unsubscribe = display.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = latest;
      }
    });
    return () => unsubscribe();
  }, [display]);

  return <span ref={ref} className={className}>{format(isClient ? 0 : value)}</span>;
}
