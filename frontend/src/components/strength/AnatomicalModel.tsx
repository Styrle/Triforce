import React, { useState, useCallback } from 'react';
import {
  MuscleGroup,
  MuscleGroupScore,
  MUSCLE_GROUP_NAMES,
  getClassificationColor,
  Classification,
} from '../../types/strength';
import {
  MUSCLE_PATHS,
  BODY_FILL_PATHS,
  SVG_VIEWBOX,
  FRONT_VIEW_MUSCLES,
  BACK_VIEW_MUSCLES,
  BODY_COLORS,
} from '../../assets/muscle-model';

interface AnatomicalModelProps {
  muscleScores: MuscleGroupScore[];
  className?: string;
  showBothViews?: boolean;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  muscleGroup: MuscleGroup | null;
  score: number;
  classification: string;
}

// 9-tier classification colors for legend
const CLASSIFICATION_LEVELS: Classification[] = [
  'subpar',
  'untrained',
  'novice',
  'intermediate',
  'proficient',
  'advanced',
  'exceptional',
  'elite',
  'world_class',
];

export const AnatomicalModel: React.FC<AnatomicalModelProps> = ({
  muscleScores,
  className = '',
  showBothViews = true,
}) => {
  const [activeView, setActiveView] = useState<'front' | 'back'>('front');
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    muscleGroup: null,
    score: 0,
    classification: '',
  });
  const [hoveredMuscle, setHoveredMuscle] = useState<MuscleGroup | null>(null);

  // Create a map for quick score lookup
  const scoreMap = new Map<MuscleGroup, MuscleGroupScore>();
  muscleScores.forEach((score) => {
    scoreMap.set(score.muscleGroup, score);
  });

  // Handle mouse enter on muscle
  const handleMouseEnter = useCallback((
    e: React.MouseEvent<SVGPathElement>,
    muscleGroup: MuscleGroup
  ) => {
    const score = scoreMap.get(muscleGroup);
    const rect = (e.target as SVGPathElement).getBoundingClientRect();

    setHoveredMuscle(muscleGroup);
    setTooltip({
      visible: true,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      muscleGroup,
      score: score?.score ?? 0,
      classification: score?.classification ?? 'N/A',
    });
  }, [scoreMap]);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setHoveredMuscle(null);
    setTooltip(prev => ({ ...prev, visible: false }));
  }, []);

  // Get color for a muscle group
  const getMuscleColor = useCallback((muscleGroup: MuscleGroup): string => {
    const score = scoreMap.get(muscleGroup);
    if (!score) return BODY_COLORS.unscoredFill;
    return getClassificationColor(score.classification);
  }, [scoreMap]);

  // Render a single body view (front or back)
  const renderBodyView = (view: 'front' | 'back', label: string) => {
    const musclesForView = view === 'front' ? FRONT_VIEW_MUSCLES : BACK_VIEW_MUSCLES;

    return (
      <div className="flex flex-col items-center flex-1">
        <div className="text-sm font-semibold text-gray-600 mb-2 tracking-wide">{label}</div>
        <svg
          viewBox={`0 0 ${SVG_VIEWBOX.width} ${SVG_VIEWBOX.height}`}
          className="w-full h-auto"
          style={{
            maxHeight: showBothViews ? '480px' : '550px',
            maxWidth: showBothViews ? '180px' : '280px'
          }}
        >
          {/* Gradient and filter definitions */}
          <defs>
            {/* Body gradient - lighter silver tone like SS */}
            <linearGradient id={`bodyGradient-${view}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#C9CDD2" />
              <stop offset="50%" stopColor="#A8ADB5" />
              <stop offset="100%" stopColor="#8B929C" />
            </linearGradient>

            {/* Skin highlight gradient */}
            <linearGradient id={`skinHighlight-${view}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#D4D8DD" />
              <stop offset="100%" stopColor="#B8BDC5" />
            </linearGradient>

            {/* Muscle glow filter for hover effect */}
            <filter id={`muscleGlow-${view}`} x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>

            {/* Drop shadow for depth */}
            <filter id={`dropShadow-${view}`} x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="2" dy="3" stdDeviation="3" floodColor="#000" floodOpacity="0.2"/>
            </filter>

            {/* Muscle texture pattern */}
            <pattern id={`muscleTexture-${view}`} patternUnits="userSpaceOnUse" width="4" height="4">
              <path d="M 0 2 L 4 2" stroke="rgba(0,0,0,0.08)" strokeWidth="0.5"/>
            </pattern>
          </defs>

          {/* Base body silhouette (light gray/silver background) */}
          <path
            d={BODY_FILL_PATHS[view]}
            fill={`url(#bodyGradient-${view})`}
            stroke="#9CA3AF"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#dropShadow-${view})`}
          />

          {/* Muscle Groups */}
          {musclesForView.map((muscleGroup) => {
            const pathData = MUSCLE_PATHS[muscleGroup];
            const score = scoreMap.get(muscleGroup);
            const hasData = !!score;
            const muscleColor = getMuscleColor(muscleGroup);
            const isHovered = hoveredMuscle === muscleGroup;

            return (
              <g key={muscleGroup}>
                {/* Main muscle fill */}
                <path
                  d={pathData.path}
                  fill={muscleColor}
                  fillOpacity={hasData ? (isHovered ? 1 : 0.92) : 0.4}
                  fillRule="evenodd"
                  stroke={isHovered ? 'rgba(255,255,255,0.95)' : (hasData ? 'rgba(80,80,80,0.5)' : 'rgba(100,100,100,0.3)')}
                  strokeWidth={isHovered ? '1.5' : '0.8'}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter={isHovered ? `url(#muscleGlow-${view})` : undefined}
                  className={`transition-all duration-150 ${hasData ? 'cursor-pointer' : ''}`}
                  onMouseEnter={(e) => handleMouseEnter(e, muscleGroup)}
                  onMouseLeave={handleMouseLeave}
                />

                {/* Muscle fiber lines for texture effect - visible striations */}
                {hasData && pathData.fiberPaths && pathData.fiberPaths.map((fiberPath, i) => (
                  <path
                    key={i}
                    d={fiberPath}
                    fill="none"
                    stroke="rgba(40,60,40,0.15)"
                    strokeWidth="0.6"
                    strokeLinecap="round"
                    className="pointer-events-none"
                    opacity={isHovered ? 0.3 : 0.2}
                  />
                ))}

                {/* Additional fiber lines for more texture */}
                {hasData && pathData.fiberPaths && pathData.fiberPaths.map((fiberPath, i) => (
                  <path
                    key={`highlight-${i}`}
                    d={fiberPath}
                    fill="none"
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth="0.4"
                    strokeLinecap="round"
                    className="pointer-events-none"
                    style={{ transform: 'translate(0.5px, 0.5px)' }}
                    opacity={isHovered ? 0.25 : 0.15}
                  />
                ))}

                {/* Score label on muscle */}
                {hasData && (
                  <>
                    {/* Text shadow/outline for readability */}
                    <text
                      x={pathData.labelPosition.x}
                      y={pathData.labelPosition.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={showBothViews ? "9" : "11"}
                      fontWeight="bold"
                      fill="rgba(0,0,0,0.5)"
                      className="pointer-events-none select-none"
                      style={{ transform: 'translate(0.5px, 0.5px)' }}
                    >
                      {Math.round(score.score)}
                    </text>
                    <text
                      x={pathData.labelPosition.x}
                      y={pathData.labelPosition.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={showBothViews ? "9" : "11"}
                      fontWeight="bold"
                      fill="#fff"
                      className="pointer-events-none select-none"
                    >
                      {Math.round(score.score)}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <div className={`relative ${className}`}>
      {/* Side-by-side or Toggle Mode */}
      {showBothViews ? (
        // Side-by-side layout
        <div className="flex justify-center gap-4 md:gap-8">
          {renderBodyView('front', 'Front')}
          {renderBodyView('back', 'Back')}
        </div>
      ) : (
        // Toggle mode
        <>
          {/* View Toggle */}
          <div className="flex justify-center mb-4">
            <div className="inline-flex rounded-lg bg-gray-100 p-1">
              <button
                onClick={() => setActiveView('front')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeView === 'front'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Front
              </button>
              <button
                onClick={() => setActiveView('back')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeView === 'back'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Back
              </button>
            </div>
          </div>

          {/* Single View */}
          <div className="flex justify-center">
            {renderBodyView(activeView, activeView === 'front' ? 'Front View' : 'Back View')}
          </div>
        </>
      )}

      {/* Tooltip */}
      {tooltip.visible && tooltip.muscleGroup && (
        <div
          className="fixed z-50 px-3 py-2 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg shadow-xl text-sm pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="font-semibold text-white">
            {MUSCLE_GROUP_NAMES[tooltip.muscleGroup]}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0 ring-1 ring-white/20"
              style={{
                backgroundColor: getClassificationColor(
                  scoreMap.get(tooltip.muscleGroup)?.classification ?? null
                ),
              }}
            />
            <span className="text-gray-200">
              Score: <span className="font-bold text-white">{tooltip.score.toFixed(1)}</span>
            </span>
          </div>
          <div className="text-gray-400 capitalize text-xs mt-0.5">
            {tooltip.classification.replace('_', ' ')}
          </div>
        </div>
      )}

      {/* Legend - styled like SS */}
      <div className="mt-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-xs font-semibold text-gray-600 mb-2">Legend</div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {CLASSIFICATION_LEVELS.map((classification) => (
            <div key={classification} className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0 ring-1 ring-gray-300"
                style={{ backgroundColor: getClassificationColor(classification) }}
              />
              <span className="text-xs text-gray-600 capitalize">
                {classification.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnatomicalModel;
