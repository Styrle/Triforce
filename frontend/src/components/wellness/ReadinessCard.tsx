import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useTodayWellness } from '../../hooks/useWellness';

interface ReadinessCardProps {
  onLogClick?: () => void;
}

export function ReadinessCard({ onLogClick }: ReadinessCardProps) {
  const { data: wellness, isLoading } = useTodayWellness();

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="h-20 bg-gray-200 rounded" />
      </div>
    );
  }

  const breakdown = wellness?.breakdown;

  if (!breakdown || !wellness?.readinessScore) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Today's Readiness
        </h3>
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">No wellness data logged today</p>
          <button
            onClick={onLogClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Log Wellness
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5" />
        Today's Readiness
      </h3>

      {/* Score Circle */}
      <div className="flex items-center gap-6 mb-6">
        <div className="relative">
          <svg className="w-24 h-24 transform -rotate-90">
            <circle
              cx="48"
              cy="48"
              r="40"
              stroke="#e5e7eb"
              strokeWidth="8"
              fill="none"
            />
            <circle
              cx="48"
              cy="48"
              r="40"
              stroke={breakdown.color}
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${(breakdown.score / 100) * 251.2} 251.2`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold">{breakdown.score}</span>
          </div>
        </div>

        <div>
          <div className="text-lg font-semibold" style={{ color: breakdown.color }}>
            {breakdown.status}
          </div>
          <p className="text-sm text-gray-600 max-w-xs">{breakdown.recommendation}</p>
        </div>
      </div>

      {/* Factor breakdown */}
      <div className="space-y-2">
        {breakdown.factors.map((factor) => (
          <div key={factor.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              {factor.status === 'positive' && (
                <TrendingUp className="w-4 h-4 text-green-500" />
              )}
              {factor.status === 'neutral' && (
                <Minus className="w-4 h-4 text-yellow-500" />
              )}
              {factor.status === 'negative' && (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span>{factor.name}</span>
            </div>
            <span className="font-medium">{factor.value}/10</span>
          </div>
        ))}
      </div>

      {/* Update button */}
      <button
        onClick={onLogClick}
        className="w-full mt-4 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
      >
        Update Today's Log
      </button>
    </div>
  );
}

export default ReadinessCard;
