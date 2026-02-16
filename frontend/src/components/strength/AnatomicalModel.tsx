import React, { useState, useCallback, useMemo } from 'react';
import {
  MuscleGroup,
  MuscleGroupScore,
  MUSCLE_GROUP_NAMES,
  getClassificationColor,
  Classification,
} from '../../types/strength';
import {
  MUSCLE_PATHS,
  SVG_VIEWBOX,
  FRONT_VIEW_MUSCLES,
  BACK_VIEW_MUSCLES,
  hexToRgba,
} from '../../assets/muscle-model';

// Import images directly for Vite bundling
import frontImage from '../../assets/muscle-model-front.jpg';
import backImage from '../../assets/muscle-model-back.jpg';

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

// Unscored muscle appearance
const UNSCORED_FILL = 'rgba(100, 116, 139, 0.25)';
const UNSCORED_STROKE = 'rgba(71, 85, 105, 0.4)';

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
  const scoreMap = useMemo(() => {
    const map = new Map<MuscleGroup, MuscleGroupScore>();
    muscleScores.forEach((score) => {
      map.set(score.muscleGroup, score);
    });
    return map;
  }, [muscleScores]);

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
    if (!score) return UNSCORED_FILL;
    return getClassificationColor(score.classification);
  }, [scoreMap]);

  // Render a single body view (front or back)
  const renderBodyView = (view: 'front' | 'back', label: string) => {
    const musclesForView = view === 'front' ? FRONT_VIEW_MUSCLES : BACK_VIEW_MUSCLES;
    const imageSrc = view === 'front' ? frontImage : backImage;
    const viewBox = SVG_VIEWBOX[view]; // Use correct viewBox for each view

    return (
      <div className="flex flex-col items-center flex-1">
        <div className="text-sm font-semibold text-gray-600 mb-2 tracking-wide">{label}</div>

        {/* Container with relative positioning for image + SVG overlay */}
        <div
          className="relative"
          style={{
            maxHeight: showBothViews ? '480px' : '550px',
            maxWidth: showBothViews ? '200px' : '300px',
            aspectRatio: `${viewBox.width} / ${viewBox.height}`,
          }}
        >
          {/* Background anatomical image */}
          <img
            src={imageSrc}
            alt={`${view} view anatomical model`}
            className="w-full h-full object-contain"
            style={{
              filter: 'brightness(1.05) contrast(1.02)',
            }}
          />

          {/* SVG overlay for interactive muscle regions */}
          <svg
            viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
            className="absolute inset-0 w-full h-full"
            style={{ pointerEvents: 'none' }}
          >
            {/* Filter definitions */}
            <defs>
              {/* Glow filter for hover effect */}
              <filter id={`muscleGlow-${view}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feFlood floodColor="#fff" floodOpacity="0.6" result="glowColor" />
                <feComposite in="glowColor" in2="blur" operator="in" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Drop shadow for depth */}
              <filter id={`muscleShadow-${view}`} x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.3"/>
              </filter>
            </defs>

            {/* Muscle overlay paths */}
            {musclesForView.map((muscleGroup) => {
              const pathData = MUSCLE_PATHS[muscleGroup];
              const score = scoreMap.get(muscleGroup);
              const hasData = !!score;
              const muscleColor = getMuscleColor(muscleGroup);
              const isHovered = hoveredMuscle === muscleGroup;

              return (
                <g key={muscleGroup} style={{ pointerEvents: 'auto' }}>
                  {/* Base muscle overlay with classification color */}
                  <path
                    d={pathData.path}
                    fill={hasData ? hexToRgba(muscleColor, 0.55) : UNSCORED_FILL}
                    fillRule="evenodd"
                    stroke={hasData ? hexToRgba(muscleColor, 0.8) : UNSCORED_STROKE}
                    strokeWidth={isHovered ? 2.5 : 1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter={isHovered ? `url(#muscleGlow-${view})` : undefined}
                    style={{
                      mixBlendMode: hasData ? 'multiply' : 'normal',
                      transition: 'all 0.15s ease-out',
                      cursor: hasData ? 'pointer' : 'default',
                    }}
                    className={isHovered ? 'opacity-90' : 'opacity-100'}
                  />

                  {/* Hover highlight overlay */}
                  {isHovered && (
                    <path
                      d={pathData.path}
                      fill="rgba(255,255,255,0.25)"
                      fillRule="evenodd"
                      stroke="rgba(255,255,255,0.9)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="pointer-events-none"
                    />
                  )}

                  {/* Interactive overlay (transparent hit area) */}
                  <path
                    d={pathData.path}
                    fill="transparent"
                    fillRule="evenodd"
                    className="cursor-pointer"
                    onMouseEnter={(e) => handleMouseEnter(e, muscleGroup)}
                    onMouseLeave={handleMouseLeave}
                  />

                  {/* Score label on muscle */}
                  {hasData && (
                    <>
                      {/* Text shadow for readability */}
                      <text
                        x={pathData.labelPosition.x}
                        y={pathData.labelPosition.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={showBothViews ? "11" : "14"}
                        fontWeight="bold"
                        fill="rgba(0,0,0,0.7)"
                        className="pointer-events-none select-none"
                        style={{ transform: 'translate(0.8px, 0.8px)' }}
                      >
                        {Math.round(score.score)}
                      </text>
                      {/* Main score text */}
                      <text
                        x={pathData.labelPosition.x}
                        y={pathData.labelPosition.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={showBothViews ? "11" : "14"}
                        fontWeight="bold"
                        fill="#fff"
                        className="pointer-events-none select-none"
                        style={{
                          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                        }}
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
