import { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Loader2,
} from 'lucide-react';
import { CalendarDayCell, DayData } from './CalendarDayCell';
import { useCalendarData } from '../../hooks/useCalendarData';

interface ActivityCalendarProps {
  onDayClick?: (date: Date, data: DayData) => void;
  onActivityClick?: (activityId: string) => void;
  onWorkoutClick?: (workoutId: string) => void;
  highlightedDates?: Date[];
  className?: string;
}

export function ActivityCalendar({
  onDayClick,
  onActivityClick,
  onWorkoutClick,
  highlightedDates = [],
  className = '',
}: ActivityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Calculate date range for the calendar view
  const { start, end, days } = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return {
      start: calendarStart,
      end: calendarEnd,
      days: eachDayOfInterval({ start: calendarStart, end: calendarEnd }),
    };
  }, [currentMonth]);

  // Fetch calendar data
  const { data: calendarData, isLoading, error } = useCalendarData(start, end);

  // Navigation handlers
  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  // Handle day click
  const handleDayClick = (date: Date, dayData: DayData) => {
    setSelectedDate(date);
    onDayClick?.(date, dayData);
  };

  // Get day data from calendar response
  const getDayData = (date: Date): DayData => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayInfo = calendarData?.days.find((d) => d.date === dateStr);

    return {
      activities: dayInfo?.activities || [],
      plannedWorkouts: dayInfo?.plannedWorkouts || [],
      metrics: dayInfo?.metrics || null,
    };
  };

  // Check if date is highlighted
  const isHighlighted = (date: Date) =>
    highlightedDates.some((d) => isSameDay(d, date));

  // Weekday headers
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>
      {/* Calendar Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Today
          </button>
          <div className="flex items-center border border-gray-200 rounded-lg">
            <button
              onClick={goToPreviousMonth}
              className="p-1.5 hover:bg-gray-100 rounded-l-lg transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={goToNextMonth}
              className="p-1.5 hover:bg-gray-100 rounded-r-lg transition-colors"
              aria-label="Next month"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center justify-center py-12 text-red-500">
          <p>Failed to load calendar data</p>
        </div>
      )}

      {/* Calendar Grid */}
      {!isLoading && !error && (
        <div className="p-2">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 mb-1">
            {weekdays.map((day) => (
              <div
                key={day}
                className="py-2 text-center text-xs font-medium text-gray-500 uppercase"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Day Cells */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const dayData = getDayData(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;

              return (
                <CalendarDayCell
                  key={day.toISOString()}
                  date={day}
                  data={dayData}
                  isCurrentMonth={isCurrentMonth}
                  isToday={isToday(day)}
                  isSelected={isSelected}
                  isHighlighted={isHighlighted(day)}
                  onClick={() => handleDayClick(day, dayData)}
                  onActivityClick={onActivityClick}
                  onWorkoutClick={onWorkoutClick}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-cyan-500" />
          <span>Swim</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-purple-500" />
          <span>Bike</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span>Run</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-pink-500" />
          <span>Strength</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full border-2 border-dashed border-gray-400" />
          <span>Planned</span>
        </div>
      </div>
    </div>
  );
}

export default ActivityCalendar;
