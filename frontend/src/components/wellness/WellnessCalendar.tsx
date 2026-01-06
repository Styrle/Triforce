import { useState } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useWellnessTrend } from '../../hooks/useWellness';

interface WellnessCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

export function WellnessCalendar({ selectedDate, onDateSelect }: WellnessCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { data: trend } = useWellnessTrend(90);

  // Create a map of date -> readiness score
  const readinessByDate = new Map(trend?.map((t) => [t.date, t.readinessScore]) || []);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getColorForScore = (score: number | null | undefined): string => {
    if (score === null || score === undefined) return 'bg-gray-100';
    if (score >= 80) return 'bg-green-400';
    if (score >= 65) return 'bg-lime-400';
    if (score >= 50) return 'bg-yellow-400';
    if (score >= 35) return 'bg-orange-400';
    return 'bg-red-400';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">{format(currentMonth, 'MMMM yyyy')}</h3>
        <div className="flex gap-2">
          <button
            onClick={() =>
              setCurrentMonth(
                (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1)
              )
            }
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-3 py-1 text-sm hover:bg-gray-100 rounded-lg"
          >
            Today
          </button>
          <button
            onClick={() =>
              setCurrentMonth(
                (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1)
              )
            }
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const score = readinessByDate.get(dateKey);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isSelected = isSameDay(day, selectedDate);
          const isTodayDate = isToday(day);

          return (
            <button
              key={dateKey}
              onClick={() => onDateSelect(day)}
              className={`
                aspect-square p-2 rounded-lg transition-all relative
                ${isCurrentMonth ? '' : 'opacity-40'}
                ${isSelected ? 'ring-2 ring-blue-500' : ''}
                ${getColorForScore(score)}
                hover:ring-2 hover:ring-blue-300
              `}
            >
              <span
                className={`
                text-sm
                ${isTodayDate ? 'font-bold' : ''}
                ${score !== null && score !== undefined ? 'text-white' : 'text-gray-700'}
              `}
              >
                {format(day, 'd')}
              </span>

              {score !== null && score !== undefined && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs text-white/80">
                  {Math.round(score)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-6">
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <div className="w-4 h-4 rounded bg-green-400" />
          <span>Optimal</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <div className="w-4 h-4 rounded bg-yellow-400" />
          <span>Moderate</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <div className="w-4 h-4 rounded bg-red-400" />
          <span>Low</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <div className="w-4 h-4 rounded bg-gray-100" />
          <span>No data</span>
        </div>
      </div>
    </div>
  );
}

export default WellnessCalendar;
