import { useState } from 'react';
import { Loader2, TrendingUp, Trophy } from 'lucide-react';
import { format } from 'date-fns';
import { useVolumeAnalytics, usePersonalBests } from '../../hooks/useWorkouts';
import { LIFT_TYPE_NAMES, MUSCLE_GROUP_NAMES } from '../../types/strength';
import type { LiftType, MuscleGroup } from '../../types/strength';
import type { PersonalBest } from '../../types/workout';

export function WorkoutAnalyticsTab() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');
  const { data: volumeData, isLoading: volumeLoading } = useVolumeAnalytics(period);
  const { data: pbs = [], isLoading: pbsLoading } = usePersonalBests();

  const isLoading = volumeLoading || pbsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex gap-2">
        {(['day', 'week', 'month'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === p
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {/* Volume Summary Cards */}
      {volumeData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-4">
            <p className="text-sm text-gray-500">Total Volume</p>
            <p className="text-2xl font-bold text-gray-900">
              {volumeData.totalVolume ? `${Math.round(volumeData.totalVolume).toLocaleString()}kg` : '0kg'}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">Sessions</p>
            <p className="text-2xl font-bold text-gray-900">{volumeData.sessionCount}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">Avg Volume / Session</p>
            <p className="text-2xl font-bold text-primary-600">
              {volumeData.averageSessionVolume
                ? `${Math.round(volumeData.averageSessionVolume).toLocaleString()}kg`
                : '--'}
            </p>
          </div>
        </div>
      )}

      {/* Volume by Lift */}
      {volumeData && volumeData.volumeByLift.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold">Volume by Exercise</h2>
          </div>
          <div className="card-body space-y-3">
            {volumeData.volumeByLift
              .sort((a, b) => b.volume - a.volume)
              .map((item) => {
                const maxVol = volumeData.volumeByLift[0]?.volume || 1;
                const pct = (item.volume / maxVol) * 100;
                return (
                  <div key={item.liftType}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">
                        {LIFT_TYPE_NAMES[item.liftType as LiftType] || item.liftType}
                      </span>
                      <span className="font-medium">{Math.round(item.volume).toLocaleString()}kg</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Volume by Muscle */}
      {volumeData && volumeData.volumeByMuscle.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold">Volume by Muscle Group</h2>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {volumeData.volumeByMuscle
                .sort((a, b) => b.effectiveVolume - a.effectiveVolume)
                .map((mv) => (
                  <div key={mv.muscleGroup} className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">
                      {MUSCLE_GROUP_NAMES[mv.muscleGroup as MuscleGroup] || mv.muscleGroup}
                    </p>
                    <p className="font-bold text-gray-900">
                      {Math.round(mv.effectiveVolume).toLocaleString()}kg
                    </p>
                    <p className="text-xs text-gray-400">{mv.sets} sets</p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Personal Bests */}
      {pbs.length > 0 && (
        <div className="card">
          <div className="card-header flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h2 className="font-semibold">Personal Bests</h2>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pbs.map((pb: PersonalBest) => (
                <div
                  key={pb.liftType}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {LIFT_TYPE_NAMES[pb.liftType as LiftType] || pb.liftType}
                    </p>
                    <p className="text-sm text-gray-500">
                      {pb.weight}kg x {pb.reps} reps
                      {pb.achievedAt &&
                        ` - ${format(new Date(pb.achievedAt), 'MMM d, yyyy')}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{Math.round(pb.estimated1RM)}kg</p>
                    <p className="text-xs text-gray-500">Est. 1RM</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {(!volumeData || volumeData.sessionCount === 0) && pbs.length === 0 && (
        <div className="card">
          <div className="card-body text-center py-12">
            <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No analytics data yet</p>
            <p className="text-sm text-gray-400 mt-1">Log workouts to see volume and PR tracking</p>
          </div>
        </div>
      )}
    </div>
  );
}
