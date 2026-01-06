import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  LineChart,
  TrendingUp,
  Activity,
  Heart,
  Zap,
  Timer,
  Target,
  ChevronDown,
  Loader2,
  Waves,
  Bike,
  Footprints,
  Info,
  RefreshCw,
  Dumbbell,
  Clock,
  Filter,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { api } from '../services/api';
import { PMCChart } from '../components/charts/PMCChart';
import type { SportType, PMCResponse, Activity as ActivityType, PaginationMeta, ApiResponse } from '../types';

type TabType = 'overview' | 'activities' | 'zones' | 'trends' | 'peaks';
type DateRange = 30 | 60 | 90 | 180 | 365;

interface ZoneData {
  zone: number | string;
  name: string;
  min: number;
  max: number;
  description: string;
}

interface ZonesResponse {
  hr: ZoneData[] | null;
  power: ZoneData[] | null;
  pace: ZoneData[] | null;
  swim: ZoneData[] | null;
}

interface CurrentMetrics {
  ctl: number;
  ctlStatus: string;
  atl: number;
  atlStatus: string;
  tsb: number;
  tsbStatus: string;
  ctlChange: number;
  atlChange: number;
  weeklyTSS: number;
  weeklyHours: number;
}

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

export function Analytics() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabType) || 'overview';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [dateRange, setDateRange] = useState<DateRange>(90);
  const [selectedSport, setSelectedSport] = useState<SportType>('BIKE');

  useEffect(() => {
    const tab = searchParams.get('tab') as TabType;
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: LineChart },
    { id: 'activities', label: 'Activities', icon: Activity },
    { id: 'zones', label: 'Training Zones', icon: Target },
    { id: 'trends', label: 'Trends', icon: TrendingUp },
    { id: 'peaks', label: 'Peak Performances', icon: Zap },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1">Deep insights into your training performance</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4 -mb-px overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleTabChange(id)}
              className={`flex items-center gap-2 px-1 py-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab dateRange={dateRange} setDateRange={setDateRange} />
      )}
      {activeTab === 'activities' && <ActivitiesTab />}
      {activeTab === 'zones' && <ZonesTab />}
      {activeTab === 'trends' && (
        <TrendsTab
          selectedSport={selectedSport}
          setSelectedSport={setSelectedSport}
          dateRange={dateRange}
        />
      )}
      {activeTab === 'peaks' && <PeaksTab selectedSport={selectedSport} setSelectedSport={setSelectedSport} />}
    </div>
  );
}

function OverviewTab({
  dateRange,
  setDateRange,
}: {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
}) {
  const queryClient = useQueryClient();

  const { data: currentMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['analytics', 'current'],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: CurrentMetrics }>('/analytics/current');
      return response.data.data;
    },
  });

  const { data: pmcData, isLoading: pmcLoading } = useQuery({
    queryKey: ['pmc', dateRange],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: PMCResponse }>('/analytics/pmc', {
        params: { days: dateRange },
      });
      return response.data.data;
    },
  });

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['analytics-summary', dateRange],
    queryFn: async () => {
      const response = await api.get('/analytics/summary', { params: { days: dateRange } });
      return response.data.data;
    },
  });

  const initPMCMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post<{ success: boolean; data: { message: string; activitiesProcessed: number; tssUpdated: number } }>('/analytics/initialize-pmc');
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['pmc'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      alert(`PMC Initialized! Processed ${data.activitiesProcessed} activities, updated TSS on ${data.tssUpdated} activities.`);
    },
    onError: (error) => {
      console.error('Failed to initialize PMC:', error);
      alert('Failed to initialize PMC. Please try again.');
    },
  });

  const hasNoPMCData = !pmcLoading && (!pmcData?.history || pmcData.history.length === 0);
  const hasZeroMetrics = currentMetrics && currentMetrics.ctl === 0 && currentMetrics.atl === 0;

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {(hasNoPMCData || hasZeroMetrics) && (
            <button
              onClick={() => initPMCMutation.mutate()}
              disabled={initPMCMutation.isPending}
              className="btn btn-primary flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${initPMCMutation.isPending ? 'animate-spin' : ''}`} />
              {initPMCMutation.isPending ? 'Calculating TSS & PMC...' : 'Initialize PMC Data'}
            </button>
          )}
          {!hasNoPMCData && !hasZeroMetrics && (
            <button
              onClick={() => initPMCMutation.mutate()}
              disabled={initPMCMutation.isPending}
              className="btn btn-secondary flex items-center gap-2 text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${initPMCMutation.isPending ? 'animate-spin' : ''}`} />
              {initPMCMutation.isPending ? 'Recalculating...' : 'Recalculate TSS'}
            </button>
          )}
        </div>
        <div className="relative">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(Number(e.target.value) as DateRange)}
            className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
            <option value={180}>Last 6 months</option>
            <option value={365}>Last year</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Current Fitness Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <FitnessCard
          label="Fitness (CTL)"
          value={currentMetrics?.ctl ?? 0}
          status={currentMetrics?.ctlStatus || 'Beginner'}
          change={currentMetrics?.ctlChange}
          color="blue"
          loading={metricsLoading}
        />
        <FitnessCard
          label="Fatigue (ATL)"
          value={currentMetrics?.atl ?? 0}
          status={currentMetrics?.atlStatus || 'Low'}
          change={currentMetrics?.atlChange}
          color="red"
          loading={metricsLoading}
        />
        <FitnessCard
          label="Form (TSB)"
          value={currentMetrics?.tsb ?? 0}
          status={currentMetrics?.tsbStatus || 'Neutral'}
          color={(currentMetrics?.tsb ?? 0) >= 0 ? 'green' : 'orange'}
          loading={metricsLoading}
        />
        <FitnessCard
          label="Weekly TSS"
          value={Math.round(currentMetrics?.weeklyTSS ?? 0)}
          status={`${(currentMetrics?.weeklyHours ?? 0).toFixed(1)} hours`}
          color="purple"
          loading={metricsLoading}
        />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Activities"
          value={summaryData?.totalActivities ?? '--'}
          icon={Activity}
          loading={summaryLoading}
        />
        <SummaryCard
          title="Total Hours"
          value={summaryData?.totalDuration ? (summaryData.totalDuration / 3600).toFixed(1) : '--'}
          icon={Timer}
          loading={summaryLoading}
        />
        <SummaryCard
          title="Total Distance"
          value={summaryData?.totalDistance ? `${(summaryData.totalDistance / 1000).toFixed(0)} km` : '--'}
          icon={TrendingUp}
          loading={summaryLoading}
        />
        <SummaryCard
          title="Total TSS"
          value={summaryData?.totalTSS?.toFixed(0) ?? '--'}
          icon={Zap}
          loading={summaryLoading}
        />
      </div>

      {/* PMC Chart */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold">Performance Management Chart</h2>
        </div>
        <div className="card-body">
          {pmcLoading ? (
            <div className="h-80 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
          ) : pmcData?.history && pmcData.history.length > 0 ? (
            <PMCChart
              data={pmcData.history}
              projections={pmcData.projections}
              height={320}
              showLegend={true}
              showTooltip={true}
              showProjections={true}
            />
          ) : (
            <div className="h-80 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No PMC data available</p>
                <p className="text-sm text-gray-400 mt-1">Click "Initialize PMC Data" to calculate your fitness metrics</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sport Breakdown */}
      {summaryData?.bySport && Object.keys(summaryData.bySport).length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold">Activity Breakdown by Sport</h2>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(summaryData.bySport).map(([sport, data]: [string, any]) => (
                <SportBreakdownCard key={sport} sport={sport as SportType} data={data} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActivitiesTab() {
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
      const response = await api.get<ApiResponse<ActivityType[]>>('/activities', { params });
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
        <p className="text-gray-500">View and manage your training activities</p>
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
            <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
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

function ActivityCard({ activity }: { activity: ActivityType }) {
  const Icon = sportIcons[activity.sportType] || Activity;
  const colorClasses = sportColors[activity.sportType] || sportColors.OTHER;

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

function ZonesTab() {
  const { data: zones, isLoading, error } = useQuery({
    queryKey: ['training-zones'],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: ZonesResponse }>('/analytics/zones');
      return response.data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (error || !zones) {
    return (
      <div className="card">
        <div className="card-body text-center py-12">
          <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Unable to load training zones</p>
          <p className="text-sm text-gray-400 mt-1">
            Set your thresholds in Settings to calculate zones
          </p>
        </div>
      </div>
    );
  }

  const hasAnyZones = zones.hr || zones.power || zones.pace || zones.swim;

  if (!hasAnyZones) {
    return (
      <div className="card">
        <div className="card-body text-center py-12">
          <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No zones configured</p>
          <p className="text-sm text-gray-400 mt-1">
            Set your LTHR, FTP, threshold pace, or CSS in Settings
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {zones.hr && <ZoneCard title="Heart Rate Zones" zones={zones.hr} unit="bpm" icon={Heart} />}
      {zones.power && <ZoneCard title="Power Zones" zones={zones.power} unit="W" icon={Zap} />}
      {zones.pace && <ZoneCard title="Run Pace Zones" zones={zones.pace} unit="min/km" icon={Footprints} />}
      {zones.swim && <ZoneCard title="Swim Pace Zones" zones={zones.swim} unit="/100m" icon={Waves} />}
    </div>
  );
}

interface EFTrendData {
  points: Array<{
    date: string;
    activityId: string;
    activityName: string;
    ef: number;
    duration: number;
  }>;
  averageEF: number;
  trendDirection: 'improving' | 'declining' | 'stable';
  trendPercent: number;
  bestEF: {
    date: string;
    activityName: string;
    ef: number;
  } | null;
}

function TrendsTab({
  selectedSport,
  setSelectedSport,
  dateRange,
}: {
  selectedSport: SportType;
  setSelectedSport: (sport: SportType) => void;
  dateRange: DateRange;
}) {
  const { data: efData, isLoading: efLoading } = useQuery({
    queryKey: ['ef-trend', selectedSport, dateRange],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: EFTrendData }>('/analytics/ef-trend', {
        params: { sport: selectedSport, days: dateRange },
      });
      return response.data.data;
    },
  });

  const trendColors = {
    improving: 'text-green-600 bg-green-50',
    declining: 'text-red-600 bg-red-50',
    stable: 'text-gray-600 bg-gray-50',
  };

  const trendLabels = {
    improving: 'Improving',
    declining: 'Declining',
    stable: 'Stable',
  };

  return (
    <div className="space-y-6">
      {/* Sport Selector */}
      <div className="flex gap-2">
        {(['BIKE', 'RUN'] as SportType[]).map((sport) => {
          const icons: Record<string, React.ElementType> = {
            BIKE: Bike,
            RUN: Footprints,
          };
          const Icon = icons[sport];
          return (
            <button
              key={sport}
              onClick={() => setSelectedSport(sport)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedSport === sport
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {sport.charAt(0) + sport.slice(1).toLowerCase()}
            </button>
          );
        })}
      </div>

      {/* EF Summary Cards */}
      {efData && efData.points.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <p className="text-sm text-gray-500">Average EF</p>
            <p className="text-2xl font-bold text-gray-900">{efData.averageEF.toFixed(3)}</p>
            <p className="text-xs text-gray-400">{selectedSport === 'BIKE' ? 'W/bpm' : 'm/min/bpm'}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">Trend</p>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-sm font-medium ${trendColors[efData.trendDirection]}`}>
                {trendLabels[efData.trendDirection]}
              </span>
              {efData.trendPercent !== 0 && (
                <span className={`text-sm ${efData.trendPercent > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {efData.trendPercent > 0 ? '+' : ''}{efData.trendPercent.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">Best EF</p>
            <p className="text-2xl font-bold text-primary-600">{efData.bestEF?.ef.toFixed(3) || '--'}</p>
            {efData.bestEF && (
              <p className="text-xs text-gray-400 truncate">{efData.bestEF.activityName}</p>
            )}
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">Activities</p>
            <p className="text-2xl font-bold text-gray-900">{efData.points.length}</p>
            <p className="text-xs text-gray-400">with HR data (30min+)</p>
          </div>
        </div>
      )}

      {/* Efficiency Factor Trend */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">Efficiency Factor Trend</h2>
            <div className="relative group">
              <Info className="w-4 h-4 text-gray-400 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                EF = {selectedSport === 'BIKE' ? 'Power / Heart Rate' : 'Speed / Heart Rate'}. Higher is better.
              </div>
            </div>
          </div>
        </div>
        <div className="card-body">
          {efLoading ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
          ) : efData && efData.points.length > 0 ? (
            <div className="space-y-4">
              {/* Bar chart visualization */}
              {(() => {
                const displayPoints = efData.points.slice(-30);
                const maxEF = Math.max(...displayPoints.map(p => p.ef));
                const minEF = Math.min(...displayPoints.map(p => p.ef));
                const range = maxEF - minEF || 0.001;

                return (
                  <div className="relative h-48 bg-gray-50 rounded-lg p-4">
                    {/* Y-axis labels */}
                    <div className="absolute left-0 top-4 bottom-8 w-12 flex flex-col justify-between text-xs text-gray-400">
                      <span>{maxEF.toFixed(2)}</span>
                      <span>{((maxEF + minEF) / 2).toFixed(2)}</span>
                      <span>{minEF.toFixed(2)}</span>
                    </div>

                    {/* Chart area */}
                    <div className="ml-14 h-full flex items-end gap-1 pb-6">
                      {displayPoints.map((point) => {
                        const heightPercent = ((point.ef - minEF) / range) * 100;
                        const isAboveAvg = point.ef >= efData.averageEF;

                        return (
                          <div
                            key={point.activityId}
                            className="flex-1 relative group"
                            style={{ minWidth: '12px', maxWidth: '40px' }}
                          >
                            {/* Bar */}
                            <div
                              className={`absolute bottom-0 left-0 right-0 rounded-t cursor-pointer transition-all ${
                                isAboveAvg
                                  ? 'bg-green-500 hover:bg-green-400'
                                  : 'bg-blue-500 hover:bg-blue-400'
                              }`}
                              style={{
                                height: `${Math.max(heightPercent, 5)}%`,
                                minHeight: '4px'
                              }}
                            />
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none shadow-lg">
                              <p className="font-bold text-sm">{point.ef.toFixed(3)}</p>
                              <p className="text-gray-300 truncate max-w-32">{point.activityName}</p>
                              <p className="text-gray-400">{new Date(point.date).toLocaleDateString()}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Average line */}
                    <div
                      className="absolute left-14 right-4 border-t-2 border-dashed border-orange-400 pointer-events-none"
                      style={{
                        bottom: `${((efData.averageEF - minEF) / range) * 100 * 0.7 + 24}px`
                      }}
                    >
                      <span className="absolute -top-3 right-0 text-xs text-orange-500 bg-gray-50 px-1">
                        avg: {efData.averageEF.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Legend */}
              <div className="flex justify-between text-xs text-gray-500 px-2">
                <span>{efData.points.length > 30 ? 'Last 30 activities' : `${efData.points.length} activities`}</span>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 bg-green-500 rounded" /> Above avg
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 bg-blue-500 rounded" /> Below avg
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 border-t-2 border-dashed border-orange-400" /> Average
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No efficiency data available</p>
                <p className="text-sm text-gray-400 mt-1">
                  {selectedSport} activities with HR data (30+ min) will show trends here
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Activity List */}
      {efData && efData.points.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold">Recent Activities with EF</h2>
          </div>
          <div className="card-body">
            <div className="divide-y">
              {efData.points.slice(-10).reverse().map((point) => (
                <Link
                  key={point.activityId}
                  to={`/activities/${point.activityId}`}
                  className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-4 px-4"
                >
                  <div>
                    <p className="font-medium text-gray-900">{point.activityName}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(point.date).toLocaleDateString()} · {Math.round(point.duration / 60)} min
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${point.ef >= efData.averageEF ? 'text-green-600' : 'text-gray-600'}`}>
                      {point.ef.toFixed(3)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {point.ef >= efData.averageEF ? 'Above avg' : 'Below avg'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ActivityPeaksData {
  sportType: string;
  totalActivities: number;
  peaks: Array<{
    metric: string;
    value: number;
    activityId: string;
    activityName: string;
    date: string;
  }>;
  bests: Record<string, {
    value: number;
    activityId: string;
    activityName: string;
    date: string;
  }>;
}

const peakLabels: Record<string, { label: string; format: (v: number, sport: SportType) => string }> = {
  maxPower: { label: 'Max Power', format: (v) => `${Math.round(v)}W` },
  avgPower20min: { label: 'Best 20min Avg Power', format: (v) => `${Math.round(v)}W` },
  avgPower60min: { label: 'Best 60min Avg Power', format: (v) => `${Math.round(v)}W` },
  maxSpeed: { label: 'Top Speed', format: (v, sport) => sport === 'RUN' ? formatPeakPace(v) : `${(v * 3.6).toFixed(1)} km/h` },
  avgPace5k: { label: 'Best 5K Pace', format: (v) => formatPeakPace(v) },
  avgPace10k: { label: 'Best 10K Pace', format: (v) => formatPeakPace(v) },
  longestDistance: { label: 'Longest Distance', format: (v) => `${(v / 1000).toFixed(1)} km` },
  longestDuration: { label: 'Longest Duration', format: (v) => {
    const hours = Math.floor(v / 3600);
    const mins = Math.floor((v % 3600) / 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }},
  maxHR: { label: 'Max Heart Rate', format: (v) => `${Math.round(v)} bpm` },
  highestTSS: { label: 'Highest TSS', format: (v) => `${Math.round(v)}` },
  bestEF: { label: 'Best Efficiency Factor', format: (v) => v.toFixed(3) },
};

function PeaksTab({
  selectedSport,
  setSelectedSport,
}: {
  selectedSport: SportType;
  setSelectedSport: (sport: SportType) => void;
}) {
  const { data: peaksData, isLoading } = useQuery({
    queryKey: ['activity-peaks', selectedSport],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: ActivityPeaksData }>('/analytics/activity-peaks', {
        params: { sport: selectedSport },
      });
      return response.data.data;
    },
  });

  // Define which peaks to show for each sport
  const bikePeaks = ['maxPower', 'avgPower20min', 'avgPower60min', 'longestDistance', 'longestDuration', 'maxHR', 'highestTSS', 'bestEF'];
  const runPeaks = ['maxSpeed', 'avgPace5k', 'avgPace10k', 'longestDistance', 'longestDuration', 'maxHR', 'highestTSS', 'bestEF'];
  const displayPeaks = selectedSport === 'BIKE' ? bikePeaks : runPeaks;

  return (
    <div className="space-y-6">
      {/* Sport Selector */}
      <div className="flex gap-2">
        {(['BIKE', 'RUN'] as SportType[]).map((sport) => {
          const icons: Record<string, React.ElementType> = {
            BIKE: Bike,
            RUN: Footprints,
          };
          const Icon = icons[sport];
          return (
            <button
              key={sport}
              onClick={() => setSelectedSport(sport)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedSport === sport
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {sport.charAt(0) + sport.slice(1).toLowerCase()}
            </button>
          );
        })}
      </div>

      {/* Summary */}
      {peaksData && peaksData.totalActivities > 0 && (
        <div className="text-sm text-gray-500">
          Personal bests from {peaksData.totalActivities} {selectedSport.toLowerCase()} activities
        </div>
      )}

      {/* Peak Performances Grid */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold">
            Personal Bests - {selectedSport === 'BIKE' ? 'Cycling' : 'Running'}
          </h2>
        </div>
        <div className="card-body">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
          ) : peaksData && Object.keys(peaksData.bests).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {displayPeaks.map((peakKey) => {
                const peak = peaksData.bests[peakKey];
                const config = peakLabels[peakKey];
                if (!config) return null;

                return (
                  <Link
                    key={peakKey}
                    to={peak ? `/activities/${peak.activityId}` : '#'}
                    className={`bg-gray-50 rounded-lg p-4 ${peak ? 'hover:bg-gray-100 transition-colors' : ''}`}
                  >
                    <p className="text-sm text-gray-500 mb-1">{config.label}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {peak ? config.format(peak.value, selectedSport) : '--'}
                    </p>
                    {peak && (
                      <>
                        <p className="text-xs text-gray-500 mt-1 truncate" title={peak.activityName}>
                          {peak.activityName}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(peak.date).toLocaleDateString()}
                        </p>
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Zap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No {selectedSport.toLowerCase()} activities found</p>
              <p className="text-sm text-gray-400 mt-1">
                Sync activities from Strava to see your personal bests
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper Components
function FitnessCard({
  label,
  value,
  status,
  change,
  color,
  loading,
}: {
  label: string;
  value: number;
  status: string;
  change?: number;
  color: 'blue' | 'red' | 'green' | 'orange' | 'purple';
  loading?: boolean;
}) {
  const colorClasses = {
    blue: 'text-blue-600',
    red: 'text-red-600',
    green: 'text-green-600',
    orange: 'text-orange-600',
    purple: 'text-purple-600',
  };

  if (loading) {
    return (
      <div className="card p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
        <div className="h-8 bg-gray-200 rounded w-3/4" />
      </div>
    );
  }

  return (
    <div className="card p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className={`text-3xl font-bold ${colorClasses[color]}`}>
          {Math.round(value)}
        </p>
        {change !== undefined && change !== 0 && (
          <span className={`text-sm ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change > 0 ? '+' : ''}{change.toFixed(1)}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-600">{status}</p>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  loading?: boolean;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary-50">
          <Icon className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-gray-400 mt-1" />
          ) : (
            <p className="text-xl font-bold text-gray-900">{value}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function SportBreakdownCard({ sport, data }: { sport: SportType; data: any }) {
  const icons: Record<SportType, React.ElementType> = {
    SWIM: Waves,
    BIKE: Bike,
    RUN: Footprints,
    STRENGTH: Dumbbell,
    OTHER: Activity,
  };
  const Icon = icons[sport] || Activity;

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-5 h-5 text-gray-600" />
        <span className="font-medium text-gray-900">
          {sport.charAt(0) + sport.slice(1).toLowerCase()}
        </span>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Activities</span>
          <span className="font-medium">{data.count}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Duration</span>
          <span className="font-medium">{(data.duration / 3600).toFixed(1)}h</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">TSS</span>
          <span className="font-medium">{data.tss?.toFixed(0) || 0}</span>
        </div>
      </div>
    </div>
  );
}

function ZoneCard({
  title,
  zones,
  unit,
  icon: Icon,
}: {
  title: string;
  zones: ZoneData[];
  unit: string;
  icon: React.ElementType;
}) {
  const zoneColors = [
    'bg-gray-100 text-gray-700',
    'bg-blue-100 text-blue-700',
    'bg-green-100 text-green-700',
    'bg-yellow-100 text-yellow-700',
    'bg-orange-100 text-orange-700',
    'bg-red-100 text-red-700',
    'bg-purple-100 text-purple-700',
  ];

  return (
    <div className="card">
      <div className="card-header flex items-center gap-2">
        <Icon className="w-5 h-5 text-gray-600" />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="card-body space-y-2">
        {zones.map((zone, index) => (
          <div
            key={zone.zone}
            className={`flex items-center justify-between p-3 rounded-lg ${zoneColors[index] || zoneColors[0]}`}
          >
            <div className="flex items-center gap-3">
              <span className="font-bold w-8">Z{zone.zone}</span>
              <div>
                <p className="font-medium">{zone.name}</p>
                <p className="text-xs opacity-75">{zone.description}</p>
              </div>
            </div>
            <span className="font-mono text-sm">
              {zone.min} - {zone.max} {unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatPeakPace(metersPerSecond: number): string {
  const pace = 1000 / metersPerSecond / 60;
  const mins = Math.floor(pace);
  const secs = Math.floor((pace - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}/km`;
}

export default Analytics;
