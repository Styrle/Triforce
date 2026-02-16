import React from 'react';

interface AnatomicalModelFiltersProps {
  viewId: string;
}

/**
 * SVG Filter Definitions for Realistic Anatomical Model
 *
 * Provides advanced filters and gradients for 3D-like muscle visualization:
 * - Multi-stop body gradient for realistic skin tone
 * - Inner shadow for muscle definition and separation
 * - Radial depth gradient for 3D muscle bulge effect
 * - Enhanced glow effect for hover interactions
 * - Specular highlight for light reflection
 */
export const AnatomicalModelFilters: React.FC<AnatomicalModelFiltersProps> = ({ viewId }) => (
  <defs>
    {/* Enhanced 5-stop body gradient for realistic skin/gray tone */}
    <linearGradient id={`bodyGradient3D-${viewId}`} x1="30%" y1="0%" x2="70%" y2="100%">
      <stop offset="0%" stopColor="#E0E4E8" />
      <stop offset="20%" stopColor="#D0D4D9" />
      <stop offset="45%" stopColor="#B8BDC5" />
      <stop offset="70%" stopColor="#A0A5AD" />
      <stop offset="100%" stopColor="#888D95" />
    </linearGradient>

    {/* Subtle ambient gradient for body depth */}
    <radialGradient id={`bodyAmbient-${viewId}`} cx="50%" cy="30%" r="60%">
      <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
      <stop offset="100%" stopColor="rgba(0,0,0,0.1)" />
    </radialGradient>

    {/* Radial gradient for 3D muscle depth/bulge effect - MORE PRONOUNCED */}
    <radialGradient id={`muscleDepth-${viewId}`} cx="30%" cy="25%" r="70%">
      <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
      <stop offset="25%" stopColor="rgba(255,255,255,0.30)" />
      <stop offset="50%" stopColor="rgba(0,0,0,0)" />
      <stop offset="80%" stopColor="rgba(0,0,0,0.25)" />
      <stop offset="100%" stopColor="rgba(0,0,0,0.40)" />
    </radialGradient>

    {/* Alternative depth gradient for variety */}
    <radialGradient id={`muscleDepthAlt-${viewId}`} cx="65%" cy="35%" r="60%">
      <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
      <stop offset="40%" stopColor="rgba(255,255,255,0.1)" />
      <stop offset="100%" stopColor="rgba(0,0,0,0.15)" />
    </radialGradient>

    {/* Inner shadow filter for muscle definition and separation - MORE VISIBLE */}
    <filter id={`innerShadow-${viewId}`} x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
      <feOffset dx="2" dy="3" result="offsetBlur" />
      <feComposite operator="out" in="SourceAlpha" in2="offsetBlur" result="inverse" />
      <feFlood floodColor="#000" floodOpacity="0.5" result="color" />
      <feComposite operator="in" in="color" in2="inverse" result="shadow" />
      <feMerge>
        <feMergeNode in="shadow" />
      </feMerge>
    </filter>

    {/* Bevel/emboss effect for 3D muscle appearance */}
    <filter id={`muscleBevel-${viewId}`} x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="blur"/>
      <feOffset dx="-1" dy="-1" result="offsetLight"/>
      <feOffset in="blur" dx="1" dy="1" result="offsetDark"/>
      <feFlood floodColor="#fff" floodOpacity="0.4" result="lightColor"/>
      <feFlood floodColor="#000" floodOpacity="0.3" result="darkColor"/>
      <feComposite in="lightColor" in2="offsetLight" operator="in" result="lightBevel"/>
      <feComposite in="darkColor" in2="offsetDark" operator="in" result="darkBevel"/>
      <feComposite in="lightBevel" in2="SourceAlpha" operator="in" result="lightInside"/>
      <feComposite in="darkBevel" in2="SourceAlpha" operator="in" result="darkInside"/>
      <feMerge>
        <feMergeNode in="SourceGraphic"/>
        <feMergeNode in="lightInside"/>
        <feMergeNode in="darkInside"/>
      </feMerge>
    </filter>

    {/* Enhanced outer glow for hover effect */}
    <filter id={`muscleGlow-${viewId}`} x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="4" result="blur" />
      <feFlood floodColor="#fff" floodOpacity="0.4" result="glowColor" />
      <feComposite in="glowColor" in2="blur" operator="in" result="glow" />
      <feMerge>
        <feMergeNode in="glow" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    {/* Specular highlight filter for 3D light reflection */}
    <filter id={`specularHighlight-${viewId}`} x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
      <feSpecularLighting
        surfaceScale="4"
        specularConstant="0.8"
        specularExponent="25"
        lightingColor="#ffffff"
        in="blur"
        result="light"
      >
        <fePointLight x="-3000" y="-8000" z="15000" />
      </feSpecularLighting>
      <feComposite operator="in" in="light" in2="SourceAlpha" result="litArea" />
      <feComposite operator="arithmetic" k1="0" k2="1" k3="1" k4="0" in="SourceGraphic" in2="litArea" />
    </filter>

    {/* Enhanced drop shadow for overall body depth */}
    <filter id={`dropShadow-${viewId}`} x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="3" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.25"/>
    </filter>

    {/* Soft inner glow for muscle highlight on hover */}
    <filter id={`innerGlow-${viewId}`} x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
      <feFlood floodColor="#fff" floodOpacity="0.5" result="glowColor" />
      <feComposite in="glowColor" in2="blur" operator="in" result="glow" />
      <feComposite operator="in" in="glow" in2="SourceAlpha" result="innerGlow" />
      <feMerge>
        <feMergeNode in="SourceGraphic" />
        <feMergeNode in="innerGlow" />
      </feMerge>
    </filter>

    {/* Muscle contour/edge enhancement filter */}
    <filter id={`muscleContour-${viewId}`} x="-10%" y="-10%" width="120%" height="120%">
      <feMorphology operator="dilate" radius="0.5" in="SourceAlpha" result="dilated" />
      <feFlood floodColor="rgba(0,0,0,0.4)" result="edgeColor" />
      <feComposite in="edgeColor" in2="dilated" operator="in" result="edge" />
      <feMerge>
        <feMergeNode in="edge" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    {/* Subtle texture pattern for muscle fiber effect */}
    <pattern id={`muscleTexture-${viewId}`} patternUnits="userSpaceOnUse" width="6" height="6">
      <line x1="0" y1="3" x2="6" y2="3" stroke="rgba(0,0,0,0.06)" strokeWidth="0.5" />
      <line x1="3" y1="0" x2="3" y2="6" stroke="rgba(0,0,0,0.03)" strokeWidth="0.3" />
    </pattern>

    {/* Gradient mask for smooth muscle edges */}
    <linearGradient id={`edgeFade-${viewId}`} x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="rgba(0,0,0,0.4)" />
      <stop offset="50%" stopColor="rgba(0,0,0,0.1)" />
      <stop offset="100%" stopColor="rgba(0,0,0,0.4)" />
    </linearGradient>
  </defs>
);

export default AnatomicalModelFilters;
