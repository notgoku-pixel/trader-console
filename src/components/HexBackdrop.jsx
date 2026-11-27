import React from 'react';

// Pure-CSS/SVG backdrop inspired by the dark hexagon reference image.
export default function HexBackdrop() {
  return (
    <div className="hex-backdrop" aria-hidden="true">
      <div className="hex-grid" />
      <div className="glow glow-left" />
      <div className="glow glow-right" />
      <div className="glow glow-center" />
      <div className="vignette" />
    </div>
  );
}
