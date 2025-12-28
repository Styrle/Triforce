import React from 'react';
import {
  Classification,
  CategoryScores,
  CLASSIFICATION_COLORS,
  CLASSIFICATION_DESCRIPTIONS,
  getClassificationFromScore,
  getClassificationColor,
} from '../../types/strength';

interface StrengthScoreCardProps {
  strengthScore: number | null;
  symmetryScore: number | null;
  totalScore: number | null;
  classification: Classification | null;
  categoryScores: CategoryScores;
  liftCount: number;
  className?: string;
}

export const StrengthScoreCard: React.FC<StrengthScoreCardProps> = ({
  strengthScore,
  symmetryScore,
  totalScore,
  classification,
  categoryScores,
  liftCount,
  className = '',
}) => {
  const hasData = strengthScore !== null;

  // Get classification color
  const classificationColor = classification
    ? CLASSIFICATION_COLORS[classification]
    : '#6B7280';

  // Format score display
  const formatScore = (score: number | null): string => {
    if (score === null) return '--';
    return score.toFixed(1);
  };

  // Get classification label
  const getClassificationLabel = (c: Classification | null): string => {
    if (!c) return 'No Data';
    return c.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className={`bg-gray-800 rounded-xl overflow-hidden ${className}`}>
      {/* Main Score Section */}
      <div
        className="p-6 text-center"
        style={{
          background: hasData
            ? `linear-gradient(135deg, ${classificationColor}40, ${classificationColor}20)`
            : undefined,
        }}
      >
        <div className="text-6xl font-bold text-white mb-2">
          {formatScore(totalScore)}
        </div>
        <div
          className="text-xl font-semibold capitalize mb-1"
          style={{ color: classificationColor }}
        >
          {getClassificationLabel(classification)}
        </div>
        {classification && (
          <div className="text-sm text-gray-400">
            {CLASSIFICATION_DESCRIPTIONS[classification]}
          </div>
        )}
      </div>

      {/* Score Breakdown */}
      <div className="p-4 border-t border-gray-700">
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Strength Score */}
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {formatScore(strengthScore)}
            </div>
            <div className="text-xs text-gray-400 uppercase tracking-wide">
              Strength Score
            </div>
          </div>

          {/* Symmetry Score */}
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {formatScore(symmetryScore)}
            </div>
            <div className="text-xs text-gray-400 uppercase tracking-wide">
              Balance Score
            </div>
          </div>
        </div>

        {/* Formula explanation */}
        <div className="text-xs text-gray-500 text-center mb-4">
          Total = (Strength x 0.7) + (Balance x 0.3)
        </div>

        {/* Lift count */}
        <div className="text-center text-sm text-gray-400">
          Based on {liftCount} recorded lift{liftCount !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="p-4 border-t border-gray-700">
        <h4 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wide">
          Movement Patterns
        </h4>
        <div className="space-y-3">
          {(Object.entries(categoryScores) as [keyof CategoryScores, number | null][]).map(
            ([category, score]) => {
              const categoryKey = category as 'squat' | 'floorPull' | 'horizPress' | 'vertPress' | 'pull';
              const categoryName =
                categoryKey === 'floorPull'
                  ? 'Floor Pull'
                  : categoryKey === 'horizPress'
                  ? 'Horizontal Press'
                  : categoryKey === 'vertPress'
                  ? 'Vertical Press'
                  : categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1);

              const categoryClassification = score !== null
                ? getClassificationFromScore(score)
                : null;
              const categoryColor = getClassificationColor(categoryClassification);

              return (
                <div key={category} className="flex items-center gap-3">
                  <div className="w-24 text-sm text-gray-400">{categoryName}</div>
                  <div className="flex-1">
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: score !== null ? `${Math.min(score, 100)}%` : '0%',
                          backgroundColor: categoryColor,
                        }}
                      />
                    </div>
                  </div>
                  <div
                    className="w-12 text-right text-sm font-medium"
                    style={{ color: categoryColor }}
                  >
                    {formatScore(score)}
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>

      {/* Classification Guide */}
      <div className="p-4 border-t border-gray-700">
        <h4 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wide">
          Classification Guide
        </h4>
        <div className="grid grid-cols-3 gap-1 text-xs">
          {(['subpar', 'untrained', 'novice', 'intermediate', 'proficient', 'advanced', 'exceptional', 'elite', 'world_class'] as Classification[]).map((c) => (
            <div
              key={c}
              className={`flex items-center gap-1 p-1 rounded ${
                c === classification ? 'bg-gray-700' : ''
              }`}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: CLASSIFICATION_COLORS[c] }}
              />
              <span className="text-gray-400 truncate capitalize">
                {c.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StrengthScoreCard;
