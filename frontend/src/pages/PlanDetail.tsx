import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, isToday } from 'date-fns';
import {
  ChevronLeft,
  Calendar,
  Target,
  Clock,
  TrendingUp,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MoreVertical,
  Play,
  Pause,
  Edit,
  Trash2,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { clsx } from 'clsx';
import {
  usePlan,
  usePlanCompliance,
  useUpdatePlan,
  useDeletePlan,
  useMatchActivities,
  useCompleteWorkout,
  useSkipWorkout,
} from '../hooks/usePlans';
import type { PlanStatus, PlannedWorkout, PlanWeek, SportType } from '../types';

const SPORT_COLORS: Record<SportType, { bg: string; text: string }> = {
  SWIM: { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  BIKE: { bg: 'bg-purple-100', text: 'text-purple-700' },
  RUN: { bg: 'bg-amber-100', text: 'text-amber-700' },
  STRENGTH: { bg: 'bg-pink-100', text: 'text-pink-700' },
  OTHER: { bg: 'bg-gray-100', text: 'text-gray-700' },
};

const STATUS_COLORS: Record<PlanStatus, { bg: string; text: string }> = {
  DRAFT: { bg: 'bg-gray-100', text: 'text-gray-700' },
  ACTIVE: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  PAUSED: { bg: 'bg-amber-100', text: 'text-amber-700' },
  COMPLETED: { bg: 'bg-blue-100', text: 'text-blue-700' },
  CANCELLED: { bg: 'bg-red-100', text: 'text-red-700' },
};

export function PlanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1]));

  const { data: plan, isLoading, error } = usePlan(id);
  const { data: compliance } = usePlanCompliance(id);
  const updatePlan = useUpdatePlan();
  const deletePlan = useDeletePlan();
  const matchActivities = useMatchActivities();
  const completeWorkout = useCompleteWorkout();
  const skipWorkout = useSkipWorkout();

  const handleStatusChange = async (newStatus: PlanStatus) => {
    if (!id) return;
    await updatePlan.mutateAsync({ planId: id, updates: { status: newStatus } });
    setMenuOpen(false);
  };

  const handleDelete = async () => {
    if (!id) return;
    if (window.confirm('Are you sure you want to delete this plan?')) {
      await deletePlan.mutateAsync(id);
      navigate('/plans');
    }
  };

  const handleMatchActivities = async () => {
    if (!id) return;
    await matchActivities.mutateAsync(id);
  };

  const toggleWeek = (weekNumber: number) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekNumber)) {
        next.delete(weekNumber);
      } else {
        next.add(weekNumber);
      }
      return next;
    });
  };

  const formatDuration = (minutes: number | null): string => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-gray-900">Plan not found</h2>
        <button
          onClick={() => navigate('/plans')}
          className="mt-4 text-primary-600 hover:text-primary-700"
        >
          Back to Plans
        </button>
      </div>
    );
  }

  const statusColor = STATUS_COLORS[plan.status];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => navigate('/plans')}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Plans
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{plan.name}</h1>
            <span
              className={clsx(
                'px-2.5 py-1 rounded-full text-xs font-medium',
                statusColor.bg,
                statusColor.text
              )}
            >
              {plan.status}
            </span>
          </div>
          {plan.targetEvent && (
            <div className="flex items-center gap-2 mt-2 text-gray-600">
              <Target className="w-4 h-4" />
              <span>{plan.targetEvent}</span>
            </div>
          )}
        </div>

        {/* Actions Menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <MoreVertical className="w-5 h-5 text-gray-500" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
              <button
                onClick={() => navigate(`/plans/${id}/edit`)}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit Plan
              </button>

              {plan.status === 'DRAFT' && (
                <button
                  onClick={() => handleStatusChange('ACTIVE')}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Start Plan
                </button>
              )}

              {plan.status === 'ACTIVE' && (
                <button
                  onClick={() => handleStatusChange('PAUSED')}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Pause className="w-4 h-4" />
                  Pause Plan
                </button>
              )}

              {plan.status === 'PAUSED' && (
                <button
                  onClick={() => handleStatusChange('ACTIVE')}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Resume Plan
                </button>
              )}

              <button
                onClick={handleMatchActivities}
                disabled={matchActivities.isPending}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <RefreshCw className={clsx('w-4 h-4', matchActivities.isPending && 'animate-spin')} />
                Match Activities
              </button>

              <hr className="my-1" />

              <button
                onClick={handleDelete}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Plan
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{plan.weeksTotal}</div>
              <div className="text-sm text-gray-500">Total Weeks</div>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {plan.weeklyHoursMin}-{plan.weeklyHoursMax}
              </div>
              <div className="text-sm text-gray-500">Hrs/Week</div>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {compliance?.overallCompliance?.toFixed(0) ?? '-'}%
              </div>
              <div className="text-sm text-gray-500">Compliance</div>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {compliance?.workoutsCompleted ?? 0}/{compliance?.workoutsPlanned ?? 0}
              </div>
              <div className="text-sm text-gray-500">Completed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline/Phases */}
      {plan.phases && plan.phases.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold">Training Phases</h2>
          </div>
          <div className="card-body">
            <div className="flex gap-1">
              {plan.phases.map((phase) => {
                const width = ((phase.weekEnd - phase.weekStart + 1) / plan.weeksTotal) * 100;
                const phaseColors: Record<string, string> = {
                  BASE: 'bg-blue-400',
                  BUILD: 'bg-amber-400',
                  PEAK: 'bg-red-400',
                  RACE: 'bg-purple-400',
                  RECOVERY: 'bg-emerald-400',
                  TRANSITION: 'bg-gray-400',
                };

                return (
                  <div
                    key={phase.id}
                    className={clsx(
                      'h-8 rounded flex items-center justify-center text-xs font-medium text-white',
                      phaseColors[phase.phaseType] || 'bg-gray-400'
                    )}
                    style={{ width: `${width}%` }}
                    title={`${phase.name}: Weeks ${phase.weekStart}-${phase.weekEnd}`}
                  >
                    {width > 15 && phase.name}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>Week 1</span>
              <span>Week {plan.weeksTotal}</span>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Schedule */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold">Weekly Schedule</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {plan.weeks?.map((week) => (
            <WeekRow
              key={week.id}
              week={week}
              isExpanded={expandedWeeks.has(week.weekNumber)}
              onToggle={() => toggleWeek(week.weekNumber)}
              formatDuration={formatDuration}
              onCompleteWorkout={(workoutId) =>
                completeWorkout.mutate({ workoutId })
              }
              onSkipWorkout={(workoutId) =>
                skipWorkout.mutate({ workoutId })
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface WeekRowProps {
  week: PlanWeek;
  isExpanded: boolean;
  onToggle: () => void;
  formatDuration: (minutes: number | null) => string;
  onCompleteWorkout: (workoutId: string) => void;
  onSkipWorkout: (workoutId: string) => void;
}

function WeekRow({
  week,
  isExpanded,
  onToggle,
  formatDuration,
  onCompleteWorkout,
  onSkipWorkout,
}: WeekRowProps) {
  const isCurrentWeek =
    new Date() >= new Date(week.startDate) && new Date() <= new Date(week.endDate);
  const completedCount =
    week.workouts?.filter((w) => w.status === 'COMPLETED' || w.status === 'PARTIAL')
      .length ?? 0;
  const totalCount = week.workouts?.length ?? 0;

  return (
    <div>
      <button
        onClick={onToggle}
        className={clsx(
          'w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50',
          isCurrentWeek && 'bg-primary-50'
        )}
      >
        <div className="flex items-center gap-4">
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">Week {week.weekNumber}</span>
              {isCurrentWeek && (
                <span className="text-xs px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full">
                  Current
                </span>
              )}
              {week.isRecoveryWeek && (
                <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                  Recovery
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500">
              {format(new Date(week.startDate), 'MMM d')} -{' '}
              {format(new Date(week.endDate), 'MMM d')}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">
              {week.targetHours.toFixed(1)}h
            </div>
            <div className="text-xs text-gray-500">{week.targetTss} TSS</div>
          </div>

          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">
              {completedCount}/{totalCount}
            </div>
            <div className="text-xs text-gray-500">workouts</div>
          </div>

          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {isExpanded && week.workouts && (
        <div className="px-4 pb-4 bg-gray-50">
          <div className="grid gap-2 mt-2">
            {week.workouts.map((workout) => (
              <WorkoutCard
                key={workout.id}
                workout={workout}
                formatDuration={formatDuration}
                onComplete={() => onCompleteWorkout(workout.id)}
                onSkip={() => onSkipWorkout(workout.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface WorkoutCardProps {
  workout: PlannedWorkout;
  formatDuration: (minutes: number | null) => string;
  onComplete: () => void;
  onSkip: () => void;
}

function WorkoutCard({
  workout,
  formatDuration,
  onComplete,
  onSkip,
}: WorkoutCardProps) {
  const sportColor = SPORT_COLORS[workout.sportType];
  const workoutDate = new Date(workout.scheduledDate);
  const isWorkoutToday = isToday(workoutDate);

  const statusIcon = () => {
    switch (workout.status) {
      case 'COMPLETED':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'PARTIAL':
        return <CheckCircle2 className="w-5 h-5 text-amber-500" />;
      case 'SKIPPED':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return null;
    }
  };

  return (
    <div
      className={clsx(
        'bg-white rounded-lg border p-3 flex items-center justify-between',
        workout.status === 'SKIPPED' && 'opacity-60',
        isWorkoutToday && 'ring-2 ring-primary-300'
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={clsx(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            sportColor.bg
          )}
        >
          <span className={clsx('text-lg', sportColor.text)}>
            {workout.sportType === 'SWIM' && '🏊'}
            {workout.sportType === 'BIKE' && '🚴'}
            {workout.sportType === 'RUN' && '🏃'}
            {workout.sportType === 'STRENGTH' && '💪'}
            {workout.sportType === 'OTHER' && '🏋️'}
          </span>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span
              className={clsx(
                'font-medium',
                workout.status === 'SKIPPED'
                  ? 'text-gray-400 line-through'
                  : 'text-gray-900'
              )}
            >
              {workout.name}
            </span>
            {statusIcon()}
          </div>
          <div className="text-sm text-gray-500 flex items-center gap-3">
            <span>{format(workoutDate, 'EEE, MMM d')}</span>
            {workout.targetDuration && (
              <span>{formatDuration(workout.targetDuration)}</span>
            )}
            {workout.targetTss && <span>{workout.targetTss} TSS</span>}
          </div>
        </div>
      </div>

      {workout.status === 'PLANNED' && (
        <div className="flex items-center gap-2">
          <button
            onClick={onComplete}
            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"
            title="Mark as completed"
          >
            <CheckCircle2 className="w-5 h-5" />
          </button>
          <button
            onClick={onSkip}
            className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"
            title="Skip workout"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default PlanDetail;
