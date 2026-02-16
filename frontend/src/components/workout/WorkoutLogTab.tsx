import { useState } from 'react';
import {
  ListChecks,
  Loader2,
  ChevronRight,
  Trash2,
  Clock,
  Weight,
  Dumbbell,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  useWorkoutSessions,
  useWorkoutSession,
  useDeleteWorkoutSession,
} from '../../hooks/useWorkouts';
import type { WorkoutSession } from '../../types/workout';
import { LIFT_TYPE_NAMES, MUSCLE_GROUP_NAMES } from '../../types/strength';
import type { LiftType, MuscleGroup } from '../../types/strength';

export function WorkoutLogTab() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data, isLoading } = useWorkoutSessions({ limit: 50, offset: 0 });
  const deleteMutation = useDeleteWorkoutSession();

  const handleDelete = (sessionId: string) => {
    if (!confirm('Delete this workout session?')) return;
    deleteMutation.mutate(sessionId, {
      onSuccess: () => toast.success('Workout deleted'),
      onError: () => toast.error('Failed to delete workout'),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  const sessions = data?.sessions || [];

  if (sessions.length === 0) {
    return (
      <div className="card">
        <div className="card-body text-center py-12">
          <ListChecks className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No workouts logged yet</p>
          <p className="text-sm text-gray-400 mt-1">Click "New Workout" to log your first session</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sessions.map((session) => (
        <SessionCard
          key={session.id}
          session={session}
          expanded={expandedId === session.id}
          onToggle={() => setExpandedId(expandedId === session.id ? null : session.id)}
          onDelete={() => handleDelete(session.id)}
          isDeleting={deleteMutation.isPending}
        />
      ))}
      {data && data.total > sessions.length && (
        <p className="text-center text-sm text-gray-400">
          Showing {sessions.length} of {data.total} workouts
        </p>
      )}
    </div>
  );
}

function SessionCard({
  session,
  expanded,
  onToggle,
  onDelete,
  isDeleting,
}: {
  session: WorkoutSession;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="card">
      <div
        className="card-body cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-primary-50 rounded-lg">
              <Dumbbell className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{session.name}</p>
              <p className="text-sm text-gray-500">
                {format(new Date(session.date), 'EEEE, MMM d, yyyy')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Weight className="w-4 h-4" />
                {session.totalVolume ? `${Math.round(session.totalVolume).toLocaleString()}kg` : '--'}
              </span>
              <span className="flex items-center gap-1">
                <ListChecks className="w-4 h-4" />
                {session.exercises.length} exercise{session.exercises.length !== 1 ? 's' : ''}
              </span>
              {session.duration && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {Math.round(session.duration / 60)}min
                </span>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              disabled={isDeleting}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              title="Delete workout"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <ChevronRight
              className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
            />
          </div>
        </div>
      </div>

      {expanded && <SessionDetail sessionId={session.id} />}
    </div>
  );
}

function SessionDetail({ sessionId }: { sessionId: string }) {
  const { data: session, isLoading } = useWorkoutSession(sessionId);

  if (isLoading) {
    return (
      <div className="px-6 pb-4 flex justify-center">
        <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="px-6 pb-4 border-t border-gray-100 pt-4 space-y-4">
      {/* Summary stats on mobile */}
      <div className="sm:hidden grid grid-cols-3 gap-3 text-center">
        <div className="p-2 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">Volume</p>
          <p className="font-semibold text-sm">
            {session.totalVolume ? `${Math.round(session.totalVolume).toLocaleString()}kg` : '--'}
          </p>
        </div>
        <div className="p-2 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">Exercises</p>
          <p className="font-semibold text-sm">{session.exercises.length}</p>
        </div>
        <div className="p-2 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">Sets</p>
          <p className="font-semibold text-sm">{session.totalSets ?? '--'}</p>
        </div>
      </div>

      {/* Exercises */}
      {session.exercises.map((exercise, i) => (
        <div key={exercise.id || i} className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-medium text-gray-900">
              {exercise.liftType
                ? LIFT_TYPE_NAMES[exercise.liftType as LiftType] || exercise.exerciseName
                : exercise.exerciseName}
            </p>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              {exercise.estimatedE1RM && (
                <span>e1RM: {Math.round(exercise.estimatedE1RM)}kg</span>
              )}
              {exercise.averageRPE && (
                <span>RPE: {exercise.averageRPE.toFixed(1)}</span>
              )}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs">
                  <th className="text-left px-3 py-1.5 font-medium">Set</th>
                  <th className="text-right px-3 py-1.5 font-medium">Weight</th>
                  <th className="text-right px-3 py-1.5 font-medium">Reps</th>
                  <th className="text-right px-3 py-1.5 font-medium">RPE</th>
                  <th className="text-right px-3 py-1.5 font-medium">Volume</th>
                </tr>
              </thead>
              <tbody>
                {exercise.sets.map((set, j) => (
                  <tr key={j} className="border-t border-gray-100">
                    <td className="px-3 py-1.5 text-gray-600">
                      {set.isWarmup ? 'W' : set.setNumber || j + 1}
                    </td>
                    <td className="text-right px-3 py-1.5 font-medium">{set.weight}kg</td>
                    <td className="text-right px-3 py-1.5">{set.reps}</td>
                    <td className="text-right px-3 py-1.5 text-gray-500">
                      {set.rpe ?? '--'}
                    </td>
                    <td className="text-right px-3 py-1.5 text-gray-500">
                      {(set.weight * set.reps).toLocaleString()}kg
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Muscle Volume Breakdown */}
      {session.muscleVolumeBreakdown && session.muscleVolumeBreakdown.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Muscle Volume</p>
          <div className="flex flex-wrap gap-2">
            {session.muscleVolumeBreakdown
              .sort((a, b) => b.effectiveVolume - a.effectiveVolume)
              .slice(0, 8)
              .map((mv) => (
                <span
                  key={mv.muscleGroup}
                  className="px-2 py-1 bg-primary-50 text-primary-700 rounded text-xs font-medium"
                >
                  {MUSCLE_GROUP_NAMES[mv.muscleGroup as MuscleGroup] || mv.muscleGroup}:{' '}
                  {Math.round(mv.effectiveVolume).toLocaleString()}kg
                </span>
              ))}
          </div>
        </div>
      )}

      {session.notes && (
        <p className="text-sm text-gray-500 italic">{session.notes}</p>
      )}
    </div>
  );
}
