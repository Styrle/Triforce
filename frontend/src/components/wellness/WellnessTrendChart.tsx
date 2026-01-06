import { useState } from 'react';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { useWellnessTrend } from '../../hooks/useWellness';

interface WellnessTrendChartProps {
  days?: number;
  showTSB?: boolean;
}

export function WellnessTrendChart({
  days = 30,
  showTSB = false,
}: WellnessTrendChartProps) {
  const { data: trend, isLoading } = useWellnessTrend(days);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'readinessScore',
    'sleepQuality',
    'energyLevel',
  ]);

  const metrics = [
    { key: 'readinessScore', label: 'Readiness', color: '#3b82f6' },
    { key: 'sleepQuality', label: 'Sleep', color: '#8b5cf6' },
    { key: 'energyLevel', label: 'Energy', color: '#eab308' },
    { key: 'overallMood', label: 'Mood', color: '#ec4899' },
    { key: 'stressLevel', label: 'Stress', color: '#ef4444' },
    { key: 'muscleSoreness', label: 'Soreness', color: '#f97316' },
    ...(showTSB ? [{ key: 'tsb', label: 'TSB (Form)', color: '#22c55e' }] : []),
  ];

  const toggleMetric = (key: string) => {
    if (selectedMetrics.includes(key)) {
      setSelectedMetrics(selectedMetrics.filter((m) => m !== key));
    } else {
      setSelectedMetrics([...selectedMetrics, key]);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  const chartData =
    trend?.map((t) => ({
      ...t,
      date: format(parseISO(t.date), 'MMM d'),
      // Scale readiness to 0-10 for comparison
      readinessScore: t.readinessScore ? t.readinessScore / 10 : null,
    })) || [];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="font-semibold mb-4">Wellness Trends</h3>

      {/* Metric toggles */}
      <div className="flex flex-wrap gap-2 mb-4">
        {metrics.map((metric) => (
          <button
            key={metric.key}
            onClick={() => toggleMetric(metric.key)}
            className={`
              px-3 py-1 rounded-full text-sm transition-colors flex items-center gap-2
              ${
                selectedMetrics.includes(metric.key)
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }
            `}
            style={{
              backgroundColor: selectedMetrics.includes(metric.key)
                ? metric.color
                : undefined,
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: metric.color }}
            />
            {metric.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} />
            <YAxis
              domain={[0, 10]}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />

            {metrics
              .filter((m) => selectedMetrics.includes(m.key))
              .map((metric) => (
                <Line
                  key={metric.key}
                  type="monotone"
                  dataKey={metric.key}
                  stroke={metric.color}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
          </ComposedChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-64 flex items-center justify-center text-gray-500">
          No wellness data to display
        </div>
      )}
    </div>
  );
}

export default WellnessTrendChart;
