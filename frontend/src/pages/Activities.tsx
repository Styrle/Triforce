import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Activity as ActivityIcon,
  Bike,
  Waves,
  Footprints,
  Dumbbell,
  Clock,
  TrendingUp,
  Heart,
  Zap,
  ChevronRight,
  Filter,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronDown,
} from 'lucide-react';
import { api } from '../services/api';
import type { Activity, SportType, ApiResponse, PaginationMeta } from '../types';

const sportIcons: Record<SportType, React.ElementType> = {
  SWIM: Waves,
  BIKE: Bike,
  RUN: Footprints,
  STRENGTH: Dumbbell,
  OTHER: ActivityIcon,
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
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatDistance(meters: number | null, sportType: SportType): string {
  if (meters === null) return '--';
  if (sportType === 'SWIM') {
    return `${meters.toFixed(0)}m`;
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

export function Activities() {
  const [page, setPage] = useState(1);
  const [sportFilter, setSportFilter] = useState<SportType | 'ALL'>('ALL');
  const [showFilters, setShowFilters] = useState(false);
  const limit = 20;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['activities', page, sportFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, limit };
      if (sportFilter !== 'ALL') {
        params.sportType = sportFilter;
      }
      const response = await api.get<ApiResponse<Activity[]>>('/activities', { params });
      return response.data;
    },
  });

  const { refetch: syncActivities, isFetching: isSyncing } = useQuery({
    queryKey: ['activities-sync'],
    queryFn: async () => {
      const response = await api.post('/activities/sync');
      return response.data;
    },
    enabled: false,
  });

  const activities = data?.data || [];
  const meta = data?.meta as PaginationMeta | undefined;

  const handleSync = async () => {
    await syncActivities();
    refetch();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activities</h1>
          <p className="text-gray-500 mt-1">View and manage your training activities</p>
        </div>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="btn btn-primary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync from Strava'}
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              <Filter className="w-4 h-4" />
              Filters
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            {meta && (
              <span className="text-sm text-gray-500">
                {meta.total} activities total
              </span>
            )}
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t">
              <label className="text-sm font-medium text-gray-700">Sport Type</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {(['ALL', 'SWIM', 'BIKE', 'RUN', 'STRENGTH', 'OTHER'] as const).map((sport) => (
                  <button
                    key={sport}
                    onClick={() => {
                      setSportFilter(sport);
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      sportFilter === sport
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {sport === 'ALL' ? 'All Sports' : sport.charAt(0) + sport.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Activity List */}
      {isLoading ? (
        <div className="card">
          <div className="card-body flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        </div>
      ) : error ? (
        <div className="card">
          <div className="card-body text-center py-12">
            <p className="text-red-600 font-medium">Error loading activities</p>
            <button onClick={() => refetch()} className="btn btn-secondary mt-4">
              Try Again
            </button>
          </div>
        </div>
      ) : activities.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-12">
            <ActivityIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No activities found</p>
            <p className="text-sm text-gray-400 mt-1">
              Connect Strava or add activities manually
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.pages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!meta.hasPrev}
            className="btn btn-secondary flex items-center gap-2 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {meta.page} of {meta.pages}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!meta.hasNext}
            className="btn btn-secondary flex items-center gap-2 disabled:opacity-50"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function ActivityCard({ activity }: { activity: Activity }) {
  const Icon = sportIcons[activity.sportType] || ActivityIcon;
  const colorClasses = sportColors[activity.sportType] || sportColors.OTHER;

  return (
    <Link to={`/activities/${activity.id}`} className="card hover:shadow-md transition-shadow">
      <div className="card-body">
        <div className="flex items-start gap-4">
          {/* Sport Icon */}
          <div className={`p-3 rounded-xl ${colorClasses}`}>
            <Icon className="w-6 h-6" />
          </div>

          {/* Main Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 truncate">{activity.name}</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {format(new Date(activity.startDate), 'EEEE, MMM d, yyyy')} at{' '}
                  {format(new Date(activity.startDate), 'h:mm a')}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-4 mt-3">
              <StatBadge
                icon={Clock}
                value={formatDuration(activity.movingTime)}
                label="Duration"
              />
              {activity.distance && (
                <StatBadge
                  icon={TrendingUp}
                  value={formatDistance(activity.distance, activity.sportType)}
                  label="Distance"
                />
              )}
              {activity.avgSpeed && (
                <StatBadge
                  icon={Zap}
                  value={formatPace(activity.avgSpeed, activity.sportType)}
                  label={activity.sportType === 'BIKE' ? 'Speed' : 'Pace'}
                />
              )}
              {activity.avgHeartRate && (
                <StatBadge
                  icon={Heart}
                  value={`${activity.avgHeartRate} bpm`}
                  label="Avg HR"
                />
              )}
              {activity.tss && (
                <StatBadge
                  icon={Zap}
                  value={activity.tss.toFixed(0)}
                  label="TSS"
                  highlight
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function StatBadge({
  icon: Icon,
  value,
  label,
  highlight,
}: {
  icon: React.ElementType;
  value: string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div className={`flex items-center gap-1.5 ${highlight ? 'text-primary-600' : 'text-gray-600'}`}>
      <Icon className="w-4 h-4" />
      <span className="font-medium">{value}</span>
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  );
}

export default Activities;
