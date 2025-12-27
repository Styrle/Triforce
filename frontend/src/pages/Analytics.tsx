import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
} from 'lucide-react';
import { api } from '../services/api';
import { PMCChart } from '../components/charts/PMCChart';
import type { SportType, PMCResponse } from '../types';

type TabType = 'overview' | 'zones' | 'trends' | 'peaks';
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

interface PeakPerformance {
  id: string;
  sportType: SportType;
  metricType: string;
  duration: number;
  value: number;
  achievedAt: string;
  activityId: string;
  activityName: string;
}

export function Analytics() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [dateRange, setDateRange] = useState<DateRange>(90);
  const [selectedSport, setSelectedSport] = useState<SportType>('BIKE');

  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: LineChart },
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
        <nav className="flex gap-4 -mb-px">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-1 py-3 border-b-2 font-medium text-sm transition-colors ${
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
  const { data: pmcData, isLoading } = useQuery({
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

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex justify-end">
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
          {isLoading ? (
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
                <p className="text-sm text-gray-400 mt-1">Sync activities to see your fitness trends</p>
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
      const response = await api.get('/analytics/ef-trend', {
        params: { sport: selectedSport, days: dateRange },
      });
      return response.data.data;
    },
  });

  return (
    <div className="space-y-6">
      {/* Sport Selector */}
      <div className="flex gap-2">
        {(['SWIM', 'BIKE', 'RUN'] as SportType[]).map((sport) => {
          const icons: Record<string, React.ElementType> = {
            SWIM: Waves,
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

      {/* Efficiency Factor Trend */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">Efficiency Factor Trend</h2>
            <div className="relative group">
              <Info className="w-4 h-4 text-gray-400 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                EF = Speed (or Power) / Heart Rate. Higher is better.
              </div>
            </div>
          </div>
        </div>
        <div className="card-body">
          {efLoading ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
          ) : efData?.length > 0 ? (
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <p className="text-gray-500">Chart visualization coming soon</p>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No efficiency data available</p>
                <p className="text-sm text-gray-400 mt-1">
                  Activities with HR data will show trends here
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PeaksTab({
  selectedSport,
  setSelectedSport,
}: {
  selectedSport: SportType;
  setSelectedSport: (sport: SportType) => void;
}) {
  const { data: peaks, isLoading } = useQuery({
    queryKey: ['peaks', selectedSport],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: PeakPerformance[] }>('/analytics/peaks', {
        params: { sport: selectedSport },
      });
      return response.data.data;
    },
  });

  const durations = [5, 10, 30, 60, 300, 600, 1200, 3600];
  const durationLabels: Record<number, string> = {
    5: '5s',
    10: '10s',
    30: '30s',
    60: '1min',
    300: '5min',
    600: '10min',
    1200: '20min',
    3600: '60min',
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

      {/* Peak Performances Grid */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold">
            Peak {selectedSport === 'BIKE' ? 'Power' : 'Pace'} Performances
          </h2>
        </div>
        <div className="card-body">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
          ) : peaks && peaks.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {durations.map((duration) => {
                const peak = peaks.find((p) => p.duration === duration);
                return (
                  <div key={duration} className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-500 mb-1">{durationLabels[duration]}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {peak ? (selectedSport === 'BIKE' ? `${peak.value}W` : formatPeakPace(peak.value)) : '--'}
                    </p>
                    {peak && (
                      <p className="text-xs text-gray-400 mt-1 truncate">
                        {new Date(peak.achievedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Zap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No peak performances recorded</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper Components
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
    STRENGTH: Activity,
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
