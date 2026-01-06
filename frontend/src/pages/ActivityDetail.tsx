import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Clock,
  TrendingUp,
  Heart,
  Zap,
  Mountain,
  Activity,
  Bike,
  Waves,
  Footprints,
  Dumbbell,
  Loader2,
  ExternalLink,
  Trash2,
  BarChart3,
} from 'lucide-react';
import { api } from '../services/api';
import type { Activity as ActivityType, SportType } from '../types';

const sportIcons: Record<SportType, React.ElementType> = {
  SWIM: Waves,
  BIKE: Bike,
  RUN: Footprints,
  STRENGTH: Dumbbell,
  OTHER: Activity,
};

const sportColors: Record<SportType, string> = {
  SWIM: 'text-blue-600 bg-blue-50',
  BIKE: 'text-amber-600 bg-amber-50',
  RUN: 'text-green-600 bg-green-50',
  STRENGTH: 'text-purple-600 bg-purple-50',
  OTHER: 'text-gray-600 bg-gray-50',
};

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function formatDistance(meters: number | null, sportType: SportType): string {
  if (meters === null || meters === undefined) return '--';
  if (sportType === 'SWIM') {
    return `${meters.toFixed(0)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

function formatPace(avgSpeed: number | null, sportType: SportType): string {
  if (avgSpeed === null || avgSpeed === 0) return '--';
  if (sportType === 'SWIM') {
    const pace = 100 / avgSpeed;
    const mins = Math.floor(pace / 60);
    const secs = Math.floor(pace % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}/100m`;
  }
  if (sportType === 'RUN') {
    const pace = 1000 / avgSpeed / 60;
    const mins = Math.floor(pace);
    const secs = Math.floor((pace - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}/km`;
  }
  if (sportType === 'BIKE') {
    return `${(avgSpeed * 3.6).toFixed(1)} km/h`;
  }
  return '--';
}

export function ActivityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['activity', id],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: ActivityType }>(`/activities/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/activities/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      navigate('/analytics?tab=activities');
    },
  });

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this activity?')) {
      deleteMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <Link
          to="/analytics?tab=activities"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Activities
        </Link>
        <div className="card">
          <div className="card-body text-center py-12">
            <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-red-600 font-medium">Activity not found</p>
            <p className="text-sm text-gray-500 mt-1">
              This activity may have been deleted or you don't have access to it.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const activity = data;
  const Icon = sportIcons[activity.sportType] || Activity;
  const colorClasses = sportColors[activity.sportType] || sportColors.OTHER;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          to="/analytics?tab=activities"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Activities
        </Link>
        <div className="flex items-center gap-2">
          {activity.stravaId && (
            <a
              href={`https://www.strava.com/activities/${activity.stravaId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              View on Strava
            </a>
          )}
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="btn btn-secondary text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Activity Header Card */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-start gap-4">
            <div className={`p-4 rounded-xl ${colorClasses}`}>
              <Icon className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{activity.name}</h1>
              <p className="text-gray-500 mt-1">
                {format(new Date(activity.startDate), 'EEEE, MMMM d, yyyy')} at{' '}
                {format(new Date(activity.startDate), 'h:mm a')}
              </p>
              {activity.description && (
                <p className="text-gray-600 mt-2">{activity.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Clock}
          label="Duration"
          value={formatDuration(activity.movingTime)}
          subValue={activity.elapsedTime !== activity.movingTime ?
            `${formatDuration(activity.elapsedTime)} elapsed` : undefined}
        />
        {activity.distance !== null && activity.distance !== undefined && (
          <StatCard
            icon={TrendingUp}
            label="Distance"
            value={formatDistance(activity.distance, activity.sportType)}
          />
        )}
        {activity.avgSpeed && (
          <StatCard
            icon={activity.sportType === 'BIKE' ? Bike : Footprints}
            label={activity.sportType === 'BIKE' ? 'Avg Speed' : 'Avg Pace'}
            value={formatPace(activity.avgSpeed, activity.sportType)}
            subValue={activity.maxSpeed ?
              `Max: ${formatPace(activity.maxSpeed, activity.sportType)}` : undefined}
          />
        )}
        {activity.totalElevation && activity.totalElevation > 0 && (
          <StatCard
            icon={Mountain}
            label="Elevation"
            value={`${activity.totalElevation.toFixed(0)} m`}
          />
        )}
      </div>

      {/* Heart Rate & Power */}
      {(activity.avgHeartRate || activity.avgPower) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activity.avgHeartRate && (
            <div className="card">
              <div className="card-body">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-red-50">
                    <Heart className="w-5 h-5 text-red-600" />
                  </div>
                  <h3 className="font-semibold">Heart Rate</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Average</p>
                    <p className="text-2xl font-bold">{activity.avgHeartRate} <span className="text-sm font-normal text-gray-500">bpm</span></p>
                  </div>
                  {activity.maxHeartRate && (
                    <div>
                      <p className="text-sm text-gray-500">Max</p>
                      <p className="text-2xl font-bold">{activity.maxHeartRate} <span className="text-sm font-normal text-gray-500">bpm</span></p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activity.avgPower && (
            <div className="card">
              <div className="card-body">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-yellow-50">
                    <Zap className="w-5 h-5 text-yellow-600" />
                  </div>
                  <h3 className="font-semibold">Power</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Average</p>
                    <p className="text-2xl font-bold">{activity.avgPower} <span className="text-sm font-normal text-gray-500">W</span></p>
                  </div>
                  {activity.normalizedPower && (
                    <div>
                      <p className="text-sm text-gray-500">Normalized</p>
                      <p className="text-2xl font-bold">{Math.round(activity.normalizedPower)} <span className="text-sm font-normal text-gray-500">W</span></p>
                    </div>
                  )}
                  {activity.maxPower && (
                    <div>
                      <p className="text-sm text-gray-500">Max</p>
                      <p className="text-2xl font-bold">{activity.maxPower} <span className="text-sm font-normal text-gray-500">W</span></p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Training Metrics */}
      {(activity.tss || activity.intensityFactor || activity.efficiencyFactor) && (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary-50">
                <BarChart3 className="w-5 h-5 text-primary-600" />
              </div>
              <h3 className="font-semibold">Training Metrics</h3>
            </div>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {activity.tss !== null && activity.tss !== undefined && (
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">TSS</p>
                  <p className="text-2xl font-bold text-primary-600">{activity.tss.toFixed(0)}</p>
                  <p className="text-xs text-gray-400">Training Stress</p>
                </div>
              )}
              {activity.intensityFactor !== null && activity.intensityFactor !== undefined && (
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">IF</p>
                  <p className="text-2xl font-bold">{activity.intensityFactor.toFixed(2)}</p>
                  <p className="text-xs text-gray-400">Intensity Factor</p>
                </div>
              )}
              {activity.efficiencyFactor !== null && activity.efficiencyFactor !== undefined && (
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">EF</p>
                  <p className="text-2xl font-bold">{activity.efficiencyFactor.toFixed(2)}</p>
                  <p className="text-xs text-gray-400">Efficiency Factor</p>
                </div>
              )}
              {activity.avgCadence && (
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Cadence</p>
                  <p className="text-2xl font-bold">{activity.avgCadence}</p>
                  <p className="text-xs text-gray-400">{activity.sportType === 'BIKE' ? 'rpm' : activity.sportType === 'RUN' ? 'spm' : ''}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Laps */}
      {activity.laps && activity.laps.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold">Laps</h3>
          </div>
          <div className="card-body p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Lap</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Time</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Distance</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Pace/Speed</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">HR</th>
                    {activity.sportType === 'BIKE' && (
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Power</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {activity.laps.map((lap, index) => (
                    <tr key={lap.id || index} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{lap.lapIndex + 1}</td>
                      <td className="px-4 py-3">{formatDuration(lap.movingTime)}</td>
                      <td className="px-4 py-3">{lap.distance ? formatDistance(lap.distance, activity.sportType) : '--'}</td>
                      <td className="px-4 py-3">{lap.avgSpeed ? formatPace(lap.avgSpeed, activity.sportType) : '--'}</td>
                      <td className="px-4 py-3">{lap.avgHeartRate || '--'}</td>
                      {activity.sportType === 'BIKE' && (
                        <td className="px-4 py-3">{lap.avgPower ? `${lap.avgPower} W` : '--'}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subValue?: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gray-100">
          <Icon className="w-5 h-5 text-gray-600" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
          {subValue && <p className="text-xs text-gray-400">{subValue}</p>}
        </div>
      </div>
    </div>
  );
}

export default ActivityDetail;
