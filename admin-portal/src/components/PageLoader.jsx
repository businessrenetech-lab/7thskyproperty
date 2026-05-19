import React from 'react';

/**
 * PageLoader — Sleek linear gradient progress bar at the top edge.
 * Dynamically animates left-to-right with a glowing gradient trail.
 * No text, no spinners — just a clean YouTube/GitHub-style top bar.
 */
const PageLoader = () => {
  return (
    <div className="top-loader" aria-label="Loading" role="progressbar">
      <div className="top-loader__bar" />
      <div className="top-loader__glow" />
    </div>
  );
};

export default PageLoader;
