import { format } from 'date-fns';
import { clsx } from 'clsx';
import type { SportType } from '../../types';

// Types for calendar data
export interface CalendarActivity {
  id: string;
  name: string;
  sportType: SportType;
  startDate: string;
  movingTime: number;
  distance: number | null;
  tss: number | null;
  avgHeartRate: number | null;
  avgPower: number | null;
}

export interface CalendarWorkout {
  id: string;
  name: string;
  sportType: SportType;
  scheduledDate: string;
  targetDuration: number | null;
  targetTss: number | null;
  status: 'PLANNED' | 'COMPLETED' | 'PARTIAL' | 'SKIPPED' | 'MOVED';
  completedActivityId: string | null;
}

export interface CalendarMetrics {
  date: string;
  tss: number;
  ctl: number | null;
  atl: number | null;
  tsb: number | null;
  activityCount: number;
  totalDuration: number;
}

export interface DayData {
  activities: CalendarActivity[];
  plannedWorkouts: CalendarWorkout[];
  metrics: CalendarMetrics | null;
}

interface CalendarDayCellProps {
  date: Date;
  data: DayData;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isHighlighted: boolean;
  onClick: () => void;
  onActivityClick?: (activityId: string) => void;
  onWorkoutClick?: (workoutId: string) => void;
}

// Sport colors
const SPORT_COLORS: Record<SportType, { bg: string; text: string; border: string }> = {
  SWIM: { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-400' },
  BIKE: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-400' },
  RUN: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-400' },
  STRENGTH: { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-400' },
  OTHER: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-400' },
};

const SPORT_DOT_COLORS: Record<SportType, string> = {
  SWIM: 'bg-cyan-500',
  BIKE: 'bg-purple-500',
  RUN: 'bg-amber-500',
  STRENGTH: 'bg-pink-500',
  OTHER: 'bg-gray-500',
};

export function CalendarDayCell({
  date,
  data,
  isCurrentMonth,
  isToday,
  isSelected,
  isHighlighted,
  onClick,
  onActivityClick,
  onWorkoutClick,
}: CalendarDayCellProps) {
  const { activities, plannedWorkouts, metrics } = data;
  const dayNumber = format(date, 'd');

  // Get unmatched planned workouts (not completed)
  const pendingWorkouts = plannedWorkouts.filter(
    (w) => w.status === 'PLANNED' && !w.completedActivityId
  );

  // Calculate total TSS for the day
  const totalTss = metrics?.tss || activities.reduce((sum, a) => sum + (a.tss || 0), 0);

  // Format duration
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
    return `${minutes}m`;
  };

  // Get TSS color based on value
  const getTssColor = (tss: number): string => {
    if (tss >= 150) return 'text-red-600';
    if (tss >= 100) return 'text-amber-600';
    if (tss >= 50) return 'text-emerald-600';
    return 'text-gray-500';
  };

  return (
    <div
      onClick={onClick}
      className={clsx(
        'min-h-[100px] p-1.5 rounded-lg border cursor-pointer transition-all',
        'hover:border-primary-300 hover:shadow-sm',
        {
          'bg-white border-gray-200': isCurrentMonth && !isSelected && !isToday,
          'bg-gray-50 border-gray-100': !isCurrentMonth,
          'bg-primary-50 border-primary-300 ring-1 ring-primary-200': isSelected,
          'border-primary-400 border-2': isToday && !isSelected,
          'bg-yellow-50': isHighlighted && !isSelected,
        }
      )}
    >
      {/* Day Header */}
      <div className="flex items-center justify-between mb-1">
        <span
          className={clsx('text-sm font-medium', {
            'text-gray-900': isCurrentMonth,
            'text-gray-400': !isCurrentMonth,
            'text-primary-600': isToday,
          })}
        >
          {dayNumber}
        </span>

        {/* TSS Badge */}
        {totalTss > 0 && (
          <span className={clsx('text-xs font-medium', getTssColor(totalTss))}>
            {Math.round(totalTss)}
          </span>
        )}
      </div>

      {/* Activities */}
      <div className="space-y-0.5">
        {activities.slice(0, 3).map((activity) => (
          <ActivityPill
            key={activity.id}
            activity={activity}
            onClick={(e) => {
              e.stopPropagation();
              onActivityClick?.(activity.id);
            }}
            formatDuration={formatDuration}
          />
        ))}

        {/* Pending Workouts */}
        {pendingWorkouts.slice(0, 2).map((workout) => (
          <WorkoutPill
            key={workout.id}
            workout={workout}
            onClick={(e) => {
              e.stopPropagation();
              onWorkoutClick?.(workout.id);
            }}
            formatDuration={formatDuration}
          />
        ))}

        {/* More indicator */}
        {(activities.length > 3 || pendingWorkouts.length > 2) && (
          <div className="text-xs text-gray-400 text-center">
            +{activities.length - 3 + Math.max(0, pendingWorkouts.length - 2)} more
          </div>
        )}
      </div>

      {/* Sport dots (if no room for pills) */}
      {activities.length === 0 && pendingWorkouts.length === 0 && (
        <div className="flex-1" />
      )}

      {/* Compact sport indicators for many activities */}
      {activities.length > 3 && (
        <div className="flex items-center gap-0.5 mt-1 flex-wrap">
          {getUniqueSports(activities).map((sport) => (
            <div
              key={sport}
              className={clsx('w-1.5 h-1.5 rounded-full', SPORT_DOT_COLORS[sport])}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Activity pill component
function ActivityPill({
  activity,
  onClick,
  formatDuration,
}: {
  activity: CalendarActivity;
  onClick: (e: React.MouseEvent) => void;
  formatDuration: (seconds: number) => string;
}) {
  const colors = SPORT_COLORS[activity.sportType];

  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full text-left px-1.5 py-0.5 rounded text-xs truncate',
        'hover:opacity-80 transition-opacity',
        colors.bg,
        colors.text
      )}
      title={`${activity.name} - ${formatDuration(activity.movingTime)}`}
    >
      <span className="font-medium">{getSportIcon(activity.sportType)}</span>
      <span className="ml-1 truncate">{formatDuration(activity.movingTime)}</span>
    </button>
  );
}

// Workout pill component (for planned workouts)
function WorkoutPill({
  workout,
  onClick,
  formatDuration,
}: {
  workout: CalendarWorkout;
  onClick: (e: React.MouseEvent) => void;
  formatDuration: (seconds: number) => string;
}) {
  const colors = SPORT_COLORS[workout.sportType];
  const isCompleted = workout.status === 'COMPLETED' || workout.status === 'PARTIAL';
  const isSkipped = workout.status === 'SKIPPED';

  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full text-left px-1.5 py-0.5 rounded text-xs truncate',
        'border border-dashed transition-opacity',
        colors.border,
        colors.text,
        {
          'opacity-50 line-through': isSkipped,
          'bg-white hover:opacity-80': !isCompleted && !isSkipped,
          [colors.bg]: isCompleted,
        }
      )}
      title={`${workout.name}${workout.targetDuration ? ` - ${formatDuration(workout.targetDuration)}` : ''}`}
    >
      <span className="font-medium">{getSportIcon(workout.sportType)}</span>
      <span className="ml-1 truncate">
        {workout.targetDuration ? formatDuration(workout.targetDuration) : workout.name}
      </span>
    </button>
  );
}

// Helper functions
function getSportIcon(sport: SportType): string {
  const icons: Record<SportType, string> = {
    SWIM: '🏊',
    BIKE: '🚴',
    RUN: '🏃',
    STRENGTH: '💪',
    OTHER: '🏋️',
  };
  return icons[sport];
}

function getUniqueSports(activities: CalendarActivity[]): SportType[] {
  return [...new Set(activities.map((a) => a.sportType))];
}

export default CalendarDayCell;
