import { useState } from 'react';
import { Plus, BarChart3, Calendar } from 'lucide-react';
import { useWellnessStats, useWellnessCorrelations } from '../hooks/useWellness';
import {
  ReadinessCard,
  WellnessLogger,
  WellnessTrendChart,
  WellnessCalendar,
} from '../components/wellness';

interface StatCardProps {
  label: string;
  value: number;
  suffix?: string;
  color?: 'green' | 'yellow' | 'red' | 'blue';
}

interface InsightCardProps {
  title: string;
  correlation: number;
  description: string;
}

const colorClasses = {
  green: 'text-green-600',
  yellow: 'text-yellow-600',
  red: 'text-red-600',
  blue: 'text-blue-600',
};

function StatCard({ label, value, suffix, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`text-2xl font-bold ${color ? colorClasses[color] : ''}`}>
        {value}
        {suffix && (
          <span className="text-sm font-normal text-gray-400 ml-1">{suffix}</span>
        )}
      </div>
    </div>
  );
}

function InsightCard({ title, correlation, description }: InsightCardProps) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
      <div
        className={`
          px-2 py-1 rounded text-sm font-medium
          ${correlation >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
        `}
      >
        {correlation >= 0 ? '+' : ''}
        {(correlation * 100).toFixed(0)}%
      </div>
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-sm text-gray-600">{description}</div>
      </div>
    </div>
  );
}

export function Wellness() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showLogger, setShowLogger] = useState(false);
  const [view, setView] = useState<'dashboard' | 'calendar'>('dashboard');

  const { data: stats } = useWellnessStats(30);
  const { data: correlations } = useWellnessCorrelations(90);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Wellness</h1>
          <p className="text-gray-600">Track your daily readiness and recovery</p>
        </div>

        <div className="flex gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView('dashboard')}
              className={`px-3 py-1 rounded-md transition-colors ${
                view === 'dashboard' ? 'bg-white shadow' : ''
              }`}
            >
              <BarChart3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('calendar')}
              className={`px-3 py-1 rounded-md transition-colors ${
                view === 'calendar' ? 'bg-white shadow' : ''
              }`}
            >
              <Calendar className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setShowLogger(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Log Wellness
          </button>
        </div>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard
            label="Avg Readiness"
            value={stats.avgReadiness}
            suffix="/100"
            color={
              stats.avgReadiness >= 70
                ? 'green'
                : stats.avgReadiness >= 50
                  ? 'yellow'
                  : 'red'
            }
          />
          <StatCard
            label="Avg Sleep"
            value={stats.avgSleep}
            suffix="hrs"
            color={
              stats.avgSleep >= 7 ? 'green' : stats.avgSleep >= 6 ? 'yellow' : 'red'
            }
          />
          <StatCard
            label="Avg Mood"
            value={stats.avgMood}
            suffix="/10"
            color={stats.avgMood >= 7 ? 'green' : stats.avgMood >= 5 ? 'yellow' : 'red'}
          />
          <StatCard label="Entries" value={stats.entriesLogged} suffix="days" />
          <StatCard label="Streak" value={stats.streak} suffix="days" color="blue" />
        </div>
      )}

      {view === 'dashboard' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Today's readiness */}
          <div className="lg:col-span-1">
            <ReadinessCard onLogClick={() => setShowLogger(true)} />
          </div>

          {/* Right column - Trends */}
          <div className="lg:col-span-2 space-y-6">
            <WellnessTrendChart days={30} showTSB />

            {/* Correlation insights */}
            {correlations && correlations.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-semibold mb-4">Insights</h3>
                <div className="space-y-3">
                  {correlations.map((corr, index) => (
                    <InsightCard
                      key={index}
                      title={corr.metric}
                      correlation={corr.correlation}
                      description={corr.description}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <WellnessCalendar
          selectedDate={selectedDate}
          onDateSelect={(date) => {
            setSelectedDate(date);
            setShowLogger(true);
          }}
        />
      )}

      {/* Logger Modal */}
      {showLogger && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowLogger(false)}
          />
          <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto p-6">
            <WellnessLogger date={selectedDate} onClose={() => setShowLogger(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

export default Wellness;
