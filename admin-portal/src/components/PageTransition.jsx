import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * PageTransition — wraps route content with smooth enter/exit animations.
 * Uses pure CSS keyframes for GPU-accelerated performance.
 * No heavy animation libraries needed.
 */
const PageTransition = ({ children }) => {
  const location = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitionStage, setTransitionStage] = useState('enter');
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname !== prevPathRef.current) {
      // Route changed — trigger exit, then swap
      setTransitionStage('exit');
      prevPathRef.current = location.pathname;

      const timer = setTimeout(() => {
        setDisplayChildren(children);
        setTransitionStage('enter');
      }, 150); // Fast exit for snappy feel

      return () => clearTimeout(timer);
    } else {
      // Same route or first mount — just show
      setDisplayChildren(children);
    }
  }, [location.pathname, children]);

  return (
    <div
      className={`page-transition page-transition--${transitionStage}`}
      style={{ minHeight: '100%', position: 'relative' }}
    >
      {displayChildren}
    </div>
  );
};

export default PageTransition;
