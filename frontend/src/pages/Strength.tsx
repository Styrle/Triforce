import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dumbbell,
  Plus,
  TrendingUp,
  Target,
  Calendar,
  ChevronDown,
  Loader2,
  X,
  Info,
  Award,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import * as d3 from 'd3';
import { api } from '../services/api';

type TabType = 'log' | 'progress' | 'standards' | 'analysis';

interface LiftRecord {
  id: string;
  liftType: string;
  weight: number;
  reps: number;
  bodyweight: number;
  estimated1RM: number;
  strengthScore: number;
  classification: string;
  performedAt: string;
  notes?: string;
}

interface LiftStandard {
  liftType: string;
  sex: string;
  subpar: number;
  untrained: number;
  novice: number;
  intermediate: number;
  proficient: number;
  advanced: number;
  exceptional: number;
  elite: number;
  worldClass: number;
}

interface StandardsResponse {
  standards: LiftStandard;
  userScore: {
    score: number;
    classification: string;
    percentile: number;
    bwRatio: number;
    nextLevel: string | null;
    toNextLevel: number | null;
  } | null;
  userBest1RM: number | null;
}

// Import strength types and components
import {
  LiftType,
  CLASSIFICATION_COLORS,
  BODYWEIGHT_LIFTS,
  StrengthProfile,
  Classification,
} from '../types/strength';
import {
  AnatomicalModel,
  RelativeStrengthsChart,
  StrengthScoreCard
} from '../components/strength';

// All 44 lift types
const LIFT_TYPES = [
  // Squat Pattern
  { value: 'BACK_SQUAT', label: 'Back Squat' },
  { value: 'FRONT_SQUAT', label: 'Front Squat' },
  { value: 'ZERCHER_SQUAT', label: 'Zercher Squat' },
  { value: 'SAFETY_BAR_SQUAT', label: 'Safety Bar Squat' },
  { value: 'LEG_PRESS', label: 'Leg Press' },
  { value: 'HACK_SQUAT', label: 'Hack Squat' },
  { value: 'GOBLET_SQUAT', label: 'Goblet Squat' },
  { value: 'BULGARIAN_SPLIT_SQUAT', label: 'Bulgarian Split Squat' },
  // Floor Pull Pattern
  { value: 'DEADLIFT', label: 'Deadlift' },
  { value: 'SUMO_DEADLIFT', label: 'Sumo Deadlift' },
  { value: 'ROMANIAN_DEADLIFT', label: 'Romanian Deadlift' },
  { value: 'TRAP_BAR_DEADLIFT', label: 'Trap Bar Deadlift' },
  { value: 'STIFF_LEG_DEADLIFT', label: 'Stiff Leg Deadlift' },
  { value: 'DEFICIT_DEADLIFT', label: 'Deficit Deadlift' },
  { value: 'BLOCK_PULL', label: 'Block Pull' },
  { value: 'POWER_CLEAN', label: 'Power Clean' },
  { value: 'CLEAN', label: 'Clean' },
  { value: 'SNATCH', label: 'Snatch' },
  { value: 'HIP_THRUST', label: 'Hip Thrust' },
  // Horizontal Press Pattern
  { value: 'BENCH_PRESS', label: 'Bench Press' },
  { value: 'INCLINE_BENCH', label: 'Incline Bench' },
  { value: 'CLOSE_GRIP_BENCH', label: 'Close Grip Bench' },
  { value: 'DUMBBELL_BENCH_PRESS', label: 'Dumbbell Bench Press' },
  { value: 'DUMBBELL_INCLINE_PRESS', label: 'Dumbbell Incline Press' },
  { value: 'FLOOR_PRESS', label: 'Floor Press' },
  { value: 'DIP', label: 'Dip' },
  { value: 'WEIGHTED_DIP', label: 'Weighted Dip' },
  // Vertical Press Pattern
  { value: 'OVERHEAD_PRESS', label: 'Overhead Press' },
  { value: 'PUSH_PRESS', label: 'Push Press' },
  { value: 'SEATED_PRESS', label: 'Seated Press' },
  { value: 'DUMBBELL_SHOULDER_PRESS', label: 'Dumbbell Shoulder Press' },
  { value: 'ARNOLD_PRESS', label: 'Arnold Press' },
  { value: 'BEHIND_NECK_PRESS', label: 'Behind Neck Press' },
  { value: 'Z_PRESS', label: 'Z Press' },
  // Pull Pattern
  { value: 'PULL_UP', label: 'Pull-up' },
  { value: 'CHIN_UP', label: 'Chin-up' },
  { value: 'PENDLAY_ROW', label: 'Pendlay Row' },
  { value: 'BENT_OVER_ROW', label: 'Bent Over Row' },
  { value: 'LAT_PULLDOWN', label: 'Lat Pulldown' },
  { value: 'BARBELL_ROW', label: 'Barbell Row' },
  { value: 'DUMBBELL_ROW', label: 'Dumbbell Row' },
  { value: 'CABLE_ROW', label: 'Cable Row' },
  { value: 'T_BAR_ROW', label: 'T-Bar Row' },
  { value: 'BARBELL_CURL', label: 'Barbell Curl' },
];

export function Strength() {
  const [activeTab, setActiveTab] = useState<TabType>('log');
  const [showAddModal, setShowAddModal] = useState(false);

  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'log', label: 'Lift Log', icon: Calendar },
    { id: 'progress', label: 'Progress', icon: TrendingUp },
    { id: 'standards', label: 'Standards', icon: Target },
    { id: 'analysis', label: 'Analysis', icon: Dumbbell },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Strength Training</h1>
          <p className="text-gray-500 mt-1">Track lifts, monitor progress, and analyze muscle balance</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Log Lift
        </button>
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
      {activeTab === 'log' && <LiftLogTab />}
      {activeTab === 'progress' && <ProgressTab />}
      {activeTab === 'standards' && <StandardsTab />}
      {activeTab === 'analysis' && <AnalysisTab />}

      {/* Add Lift Modal */}
      {showAddModal && <AddLiftModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}

function LiftLogTab() {
  const queryClient = useQueryClient();

  const { data: lifts = [], isLoading } = useQuery({
    queryKey: ['strength-lifts'],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: LiftRecord[] }>('/strength/lifts', {
        params: { limit: 100 },
      });
      return response.data.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (liftId: string) => {
      await api.delete(`/strength/lifts/${liftId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strength-lifts'] });
      queryClient.invalidateQueries({ queryKey: ['strength-lifts-all'] });
      queryClient.invalidateQueries({ queryKey: ['strength-profile'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (lifts.length === 0) {
    return (
      <div className="card">
        <div className="card-body text-center py-12">
          <Dumbbell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No lifts recorded yet</p>
          <p className="text-sm text-gray-400 mt-1">Click "Log Lift" to record your first lift</p>
        </div>
      </div>
    );
  }

  // Group lifts by date
  const liftsByDate = lifts.reduce((acc: Record<string, LiftRecord[]>, lift) => {
    const date = format(new Date(lift.performedAt), 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(lift);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(liftsByDate)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([date, dayLifts]) => (
          <div key={date} className="card">
            <div className="card-header">
              <h3 className="font-medium text-gray-900">
                {format(new Date(date), 'EEEE, MMMM d, yyyy')}
              </h3>
            </div>
            <div className="card-body space-y-3">
              {dayLifts.map((lift) => (
                <LiftCard
                  key={lift.id}
                  lift={lift}
                  onDelete={() => deleteMutation.mutate(lift.id)}
                  isDeleting={deleteMutation.isPending}
                />
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}

function LiftCard({
  lift,
  onDelete,
  isDeleting,
}: {
  lift: LiftRecord;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const liftLabel = LIFT_TYPES.find((l) => l.value === lift.liftType)?.label || lift.liftType;

  // 9-tier classification colors
  const classificationKey = lift.classification?.toLowerCase() as Classification || 'untrained';
  const classificationColor = CLASSIFICATION_COLORS[classificationKey] || '#6B7280';
  const classificationLabel = classificationKey.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group">
      <div className="flex items-center gap-4">
        <div className="p-2 bg-white rounded-lg shadow-sm">
          <Dumbbell className="w-5 h-5 text-gray-600" />
        </div>
        <div>
          <p className="font-medium text-gray-900">{liftLabel}</p>
          <p className="text-sm text-gray-500">
            {lift.weight}kg x {lift.reps} reps
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="font-bold text-gray-900">{Math.round(lift.estimated1RM)}kg</p>
          <p className="text-xs text-gray-500">Est. 1RM</p>
        </div>
        <span
          className="px-2 py-1 rounded text-xs font-medium text-white"
          style={{ backgroundColor: classificationColor }}
        >
          {classificationLabel}
        </span>
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          title="Delete lift"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Color palette for different lift types
const LIFT_COLORS: Record<string, string> = {
  BACK_SQUAT: '#8B5CF6',
  FRONT_SQUAT: '#A78BFA',
  DEADLIFT: '#EF4444',
  SUMO_DEADLIFT: '#F87171',
  BENCH_PRESS: '#3B82F6',
  INCLINE_BENCH: '#60A5FA',
  OVERHEAD_PRESS: '#F59E0B',
  PUSH_PRESS: '#FBBF24',
  PENDLAY_ROW: '#10B981',
  BENT_OVER_ROW: '#34D399',
  PULL_UP: '#EC4899',
  CHIN_UP: '#F472B6',
  DIP: '#6366F1',
  POWER_CLEAN: '#14B8A6',
};

interface ProgressChartProps {
  data: { date: string | Date; estimated1RM: number; liftType?: string }[];
  height?: number;
  showLegend?: boolean;
  multiLine?: boolean;
}

function ProgressChart({ data, height = 280, showLegend = false, multiLine = false }: ProgressChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || data.length === 0) return;

    const containerWidth = containerRef.current.clientWidth;
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const width = containerWidth - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3
      .select(svgRef.current)
      .attr('width', containerWidth)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Parse dates and prepare data
    const parsedData = data.map((d) => ({
      ...d,
      date: new Date(d.date),
      estimated1RM: d.estimated1RM,
    }));

    // Group data by lift type if multiLine
    const groupedData = multiLine
      ? d3.group(parsedData, (d) => d.liftType || 'unknown')
      : new Map([['single', parsedData]]);

    // Scales
    const xExtent = d3.extent(parsedData, (d) => d.date) as [Date, Date];
    const x = d3.scaleTime().domain(xExtent).range([0, width]);

    const yMax = d3.max(parsedData, (d) => d.estimated1RM) || 100;
    const yMin = d3.min(parsedData, (d) => d.estimated1RM) || 0;
    const yPadding = (yMax - yMin) * 0.1;
    const y = d3
      .scaleLinear()
      .domain([Math.max(0, yMin - yPadding), yMax + yPadding])
      .range([chartHeight, 0]);

    // Grid lines
    svg
      .append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.1)
      .call(
        d3
          .axisLeft(y)
          .tickSize(-width)
          .tickFormat(() => '')
      );

    // Axes
    svg
      .append('g')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat('%b %d') as any))
      .selectAll('text')
      .attr('fill', '#6B7280')
      .attr('font-size', '11px');

    svg
      .append('g')
      .call(d3.axisLeft(y).ticks(5).tickFormat((d) => `${d}kg`))
      .selectAll('text')
      .attr('fill', '#6B7280')
      .attr('font-size', '11px');

    // Line generator
    const line = d3
      .line<{ date: Date; estimated1RM: number }>()
      .x((d) => x(d.date))
      .y((d) => y(d.estimated1RM))
      .curve(d3.curveMonotoneX);

    // Draw lines for each group
    groupedData.forEach((points, liftType) => {
      const color = multiLine ? LIFT_COLORS[liftType] || '#6B7280' : '#8B5CF6';
      const sortedPoints = [...points].sort((a, b) => a.date.getTime() - b.date.getTime());

      // Area gradient
      const areaGradient = svg
        .append('defs')
        .append('linearGradient')
        .attr('id', `area-gradient-${liftType}`)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '0%')
        .attr('y2', '100%');

      areaGradient.append('stop').attr('offset', '0%').attr('stop-color', color).attr('stop-opacity', 0.3);

      areaGradient.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 0);

      // Area
      const area = d3
        .area<{ date: Date; estimated1RM: number }>()
        .x((d) => x(d.date))
        .y0(chartHeight)
        .y1((d) => y(d.estimated1RM))
        .curve(d3.curveMonotoneX);

      svg
        .append('path')
        .datum(sortedPoints)
        .attr('fill', `url(#area-gradient-${liftType})`)
        .attr('d', area);

      // Line
      svg
        .append('path')
        .datum(sortedPoints)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 2.5)
        .attr('d', line);

      // Dots
      svg
        .selectAll(`.dot-${liftType}`)
        .data(sortedPoints)
        .enter()
        .append('circle')
        .attr('class', `dot-${liftType}`)
        .attr('cx', (d) => x(d.date))
        .attr('cy', (d) => y(d.estimated1RM))
        .attr('r', 4)
        .attr('fill', color)
        .attr('stroke', 'white')
        .attr('stroke-width', 2);
    });

    // Legend for multi-line charts
    if (showLegend && multiLine && groupedData.size > 1) {
      const legendData = Array.from(groupedData.keys());
      const legend = svg
        .append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width - 120}, 0)`);

      legendData.forEach((liftType, i) => {
        const liftLabel = LIFT_TYPES.find((l) => l.value === liftType)?.label || liftType;
        const g = legend.append('g').attr('transform', `translate(0, ${i * 20})`);

        g.append('rect')
          .attr('width', 12)
          .attr('height', 12)
          .attr('fill', LIFT_COLORS[liftType] || '#6B7280')
          .attr('rx', 2);

        g.append('text')
          .attr('x', 18)
          .attr('y', 10)
          .attr('font-size', '11px')
          .attr('fill', '#4B5563')
          .text(liftLabel);
      });
    }
  }, [data, height, showLegend, multiLine]);

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center">
          <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No progress data available</p>
          <p className="text-sm text-gray-400 mt-1">Record lifts to see your progress</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full">
      <svg ref={svgRef} className="w-full" />
    </div>
  );
}

function ProgressTab() {
  const [selectedLift, setSelectedLift] = useState('ALL');

  // Fetch all lifts for both views
  const { data: allLifts = [], isLoading: allLiftsLoading } = useQuery({
    queryKey: ['strength-lifts-all'],
    queryFn: async () => {
      const response = await api.get('/strength/lifts', { params: { limit: 200 } });
      return response.data.data as LiftRecord[];
    },
  });

  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ['strength-progress', selectedLift],
    queryFn: async () => {
      const response = await api.get(`/strength/progress/${selectedLift}`, {
        params: { days: 180 },
      });
      return response.data.data;
    },
    enabled: selectedLift !== 'ALL',
  });

  const isLoading = selectedLift === 'ALL' ? allLiftsLoading : progressLoading;

  // Prepare chart data for ALL lifts view
  const allLiftsChartData = allLifts.map((lift) => ({
    date: lift.performedAt,
    estimated1RM: lift.estimated1RM,
    liftType: lift.liftType,
  }));

  // Prepare chart data for single lift view
  const singleLiftChartData = progress?.map((p: { date: string; estimated1RM: number }) => ({
    date: p.date,
    estimated1RM: p.estimated1RM,
  })) || [];

  // Calculate aggregate stats when viewing all lifts
  const allLiftsStats =
    selectedLift === 'ALL' && allLifts.length > 0
      ? {
          totalLifts: allLifts.length,
          liftTypes: [...new Set(allLifts.map((l) => l.liftType))].length,
          recentPRs: allLifts.filter((l) => {
            const liftDate = new Date(l.performedAt);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return liftDate >= thirtyDaysAgo;
          }).length,
        }
      : null;

  // Calculate single lift stats
  const singleLiftStats =
    selectedLift !== 'ALL' && allLifts.length > 0
      ? (() => {
          const liftRecords = allLifts.filter((l) => l.liftType === selectedLift);
          if (liftRecords.length === 0) return null;
          const sortedByDate = [...liftRecords].sort(
            (a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()
          );
          const current1RM = sortedByDate[0]?.estimated1RM || 0;
          const pr1RM = Math.max(...liftRecords.map((l) => l.estimated1RM));

          // Calculate 90-day change
          const ninetyDaysAgo = new Date();
          ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
          const oldRecords = liftRecords.filter((l) => new Date(l.performedAt) < ninetyDaysAgo);
          const oldBest = oldRecords.length > 0 ? Math.max(...oldRecords.map((l) => l.estimated1RM)) : null;
          const change = oldBest ? Math.round(current1RM - oldBest) : null;

          return { current1RM: Math.round(current1RM), pr1RM: Math.round(pr1RM), change };
        })()
      : null;

  return (
    <div className="space-y-6">
      {/* Lift Selector */}
      <div className="relative w-64">
        <select
          value={selectedLift}
          onChange={(e) => setSelectedLift(e.target.value)}
          className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="ALL">All Lifts</option>
          {LIFT_TYPES.map((lift) => (
            <option key={lift.value} value={lift.value}>
              {lift.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>

      {/* Progress Chart */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold">
            {selectedLift === 'ALL' ? 'All Lifts Progress' : `${LIFT_TYPES.find((l) => l.value === selectedLift)?.label || selectedLift} Progress`}
          </h2>
        </div>
        <div className="card-body">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
          ) : selectedLift === 'ALL' ? (
            <ProgressChart data={allLiftsChartData} showLegend multiLine />
          ) : (
            <ProgressChart data={singleLiftChartData} />
          )}
        </div>
      </div>

      {/* Stats Summary */}
      {selectedLift === 'ALL' && allLiftsStats ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-4">
            <p className="text-sm text-gray-500">Total Lifts Recorded</p>
            <p className="text-2xl font-bold text-gray-900">{allLiftsStats.totalLifts}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">Different Exercises</p>
            <p className="text-2xl font-bold text-gray-900">{allLiftsStats.liftTypes}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">Lifts (Last 30 Days)</p>
            <p className="text-2xl font-bold text-primary-600">{allLiftsStats.recentPRs}</p>
          </div>
        </div>
      ) : singleLiftStats ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-4">
            <p className="text-sm text-gray-500">Current 1RM</p>
            <p className="text-2xl font-bold text-gray-900">{singleLiftStats.current1RM}kg</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">All-Time PR</p>
            <p className="text-2xl font-bold text-gray-900">{singleLiftStats.pr1RM}kg</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">Progress (90 days)</p>
            <p
              className={`text-2xl font-bold ${
                singleLiftStats.change !== null
                  ? singleLiftStats.change >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                  : 'text-gray-400'
              }`}
            >
              {singleLiftStats.change !== null ? `${singleLiftStats.change > 0 ? '+' : ''}${singleLiftStats.change}kg` : '--'}
            </p>
          </div>
        </div>
      ) : null}

      {/* Lift Type Summary (for ALL view) */}
      {selectedLift === 'ALL' && allLifts.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold">Best Lifts by Exercise</h2>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(
                allLifts.reduce((acc: Record<string, LiftRecord[]>, lift) => {
                  if (!acc[lift.liftType]) acc[lift.liftType] = [];
                  acc[lift.liftType].push(lift);
                  return acc;
                }, {})
              )
                .sort(([, a], [, b]) => {
                  const aMax = Math.max(...(a as LiftRecord[]).map((l) => l.estimated1RM));
                  const bMax = Math.max(...(b as LiftRecord[]).map((l) => l.estimated1RM));
                  return bMax - aMax;
                })
                .map(([liftType, lifts]) => {
                  const liftRecords = lifts as LiftRecord[];
                  const best = Math.max(...liftRecords.map((l) => l.estimated1RM));
                  const latest = [...liftRecords].sort(
                    (a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()
                  )[0];
                  const liftLabel = LIFT_TYPES.find((l) => l.value === liftType)?.label || liftType;
                  return (
                    <div
                      key={liftType}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => setSelectedLift(liftType)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: LIFT_COLORS[liftType] || '#6B7280' }}
                        />
                        <div>
                          <p className="font-medium text-gray-900">{liftLabel}</p>
                          <p className="text-xs text-gray-500">
                            {liftRecords.length} record{liftRecords.length !== 1 ? 's' : ''} • Last:{' '}
                            {format(new Date(latest.performedAt), 'MMM d')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{Math.round(best)}kg</p>
                        <p className="text-xs text-gray-500">Best 1RM</p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StandardsTab() {
  const [selectedLift, setSelectedLift] = useState('BACK_SQUAT');

  const { data, isLoading } = useQuery({
    queryKey: ['strength-standards', selectedLift],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: StandardsResponse }>(
        `/strength/standards/${selectedLift}`
      );
      return response.data.data;
    },
  });

  const standards = data?.standards;
  const userScore = data?.userScore;
  const userBest1RM = data?.userBest1RM;

  return (
    <div className="space-y-6">
      {/* Lift Selector */}
      <div className="relative w-64">
        <select
          value={selectedLift}
          onChange={(e) => setSelectedLift(e.target.value)}
          className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {LIFT_TYPES.filter((l) => !['PULL_UP', 'CHIN_UP', 'DIP'].includes(l.value)).map((lift) => (
            <option key={lift.value} value={lift.value}>
              {lift.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>

      {/* Standards Display */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <Target className="w-5 h-5 text-gray-600" />
          <h2 className="font-semibold">Strength Standards</h2>
          <div className="relative group ml-auto">
            <Info className="w-4 h-4 text-gray-400 cursor-help" />
            <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
              Based on bodyweight ratio standards
            </div>
          </div>
        </div>
        <div className="card-body">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
          ) : standards ? (
            <div className="space-y-3">
              {/* 9-tier classification bars */}
              <StandardBar label="Subpar" value={standards.subpar} userValue={userBest1RM ?? undefined} color={CLASSIFICATION_COLORS.subpar} maxValue={standards.worldClass * 1.1} />
              <StandardBar label="Untrained" value={standards.untrained} userValue={userBest1RM ?? undefined} color={CLASSIFICATION_COLORS.untrained} maxValue={standards.worldClass * 1.1} />
              <StandardBar label="Novice" value={standards.novice} userValue={userBest1RM ?? undefined} color={CLASSIFICATION_COLORS.novice} maxValue={standards.worldClass * 1.1} />
              <StandardBar label="Intermediate" value={standards.intermediate} userValue={userBest1RM ?? undefined} color={CLASSIFICATION_COLORS.intermediate} maxValue={standards.worldClass * 1.1} />
              <StandardBar label="Proficient" value={standards.proficient} userValue={userBest1RM ?? undefined} color={CLASSIFICATION_COLORS.proficient} maxValue={standards.worldClass * 1.1} />
              <StandardBar label="Advanced" value={standards.advanced} userValue={userBest1RM ?? undefined} color={CLASSIFICATION_COLORS.advanced} maxValue={standards.worldClass * 1.1} />
              <StandardBar label="Exceptional" value={standards.exceptional} userValue={userBest1RM ?? undefined} color={CLASSIFICATION_COLORS.exceptional} maxValue={standards.worldClass * 1.1} />
              <StandardBar label="Elite" value={standards.elite} userValue={userBest1RM ?? undefined} color={CLASSIFICATION_COLORS.elite} maxValue={standards.worldClass * 1.1} />
              <StandardBar label="World Class" value={standards.worldClass} userValue={userBest1RM ?? undefined} color={CLASSIFICATION_COLORS.world_class} maxValue={standards.worldClass * 1.1} />

              {userScore && userBest1RM && (
                <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: `${CLASSIFICATION_COLORS[userScore.classification as Classification] || '#6B7280'}20` }}>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5" style={{ color: CLASSIFICATION_COLORS[userScore.classification as Classification] || '#6B7280' }} />
                      <span className="font-medium text-gray-900">Your Best: {userBest1RM}kg</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">
                        Score: <span className="font-bold">{userScore.score}</span>
                      </span>
                      <span
                        className="px-2 py-0.5 rounded text-sm font-medium text-white"
                        style={{ backgroundColor: CLASSIFICATION_COLORS[userScore.classification as Classification] || '#6B7280' }}
                      >
                        {userScore.classification.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </div>
                  </div>
                  {userScore.nextLevel && userScore.toNextLevel && (
                    <p className="text-sm text-gray-600 mt-2">
                      {userScore.toNextLevel}kg more to reach {userScore.nextLevel.replace('_', ' ')}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Set your bodyweight in Settings to see personalized standards</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StandardBar({
  label,
  value,
  userValue,
  color,
  maxValue,
}: {
  label: string;
  value: number;
  userValue?: number;
  color: string;
  maxValue?: number;
}) {
  // Use provided maxValue or calculate from the standard value
  const max = maxValue || value * 1.1;
  const percentage = Math.min((value / max) * 100, 100);
  const userPercentage = userValue ? Math.min((userValue / max) * 100, 100) : 0;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="text-gray-600">{label}</span>
        </div>
        <span className="font-medium">{Math.round(value)}kg</span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden relative">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
        {userValue !== undefined && userValue > 0 && (
          <div
            className="absolute top-0 w-1 h-full bg-gray-800 rounded"
            style={{ left: `calc(${userPercentage}% - 2px)` }}
            title={`Your best: ${userValue}kg`}
          />
        )}
      </div>
    </div>
  );
}

function AnalysisTab() {
  // Fetch strength profile with category scores
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['strength-profile'],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: StrengthProfile | null }>('/strength/profile');
      return response.data.data;
    },
  });

  // Fetch muscle analysis
  const { data: analysis, isLoading: analysisLoading } = useQuery({
    queryKey: ['muscle-analysis'],
    queryFn: async () => {
      const response = await api.get('/strength/muscle-analysis');
      return response.data.data;
    },
  });

  const isLoading = profileLoading || analysisLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  const hasData = profileData && profileData.strengthScore !== null;
  const muscleScores = analysis?.muscleScores || [];

  if (!hasData && muscleScores.length === 0) {
    return (
      <div className="card">
        <div className="card-body text-center py-12">
          <Dumbbell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Not enough data for analysis</p>
          <p className="text-sm text-gray-400 mt-1">Record lifts across different movements to see your strength profile</p>
        </div>
      </div>
    );
  }

  // Map classification to proper type
  const classification = profileData?.classification as Classification | null;

  // Default category scores if not available
  const categoryScores = profileData?.categoryScores || {
    squat: null,
    floorPull: null,
    horizPress: null,
    vertPress: null,
    pull: null,
  };

  return (
    <div className="space-y-6">
      {/* Main Score and Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Card - takes 1 column */}
        <div className="lg:col-span-1">
          <StrengthScoreCard
            strengthScore={profileData?.strengthScore ?? null}
            symmetryScore={analysis?.balanceScore ?? null}
            totalScore={profileData?.totalScore ?? null}
            classification={classification}
            categoryScores={categoryScores}
            liftCount={profileData?.liftCount ?? 0}
            className="h-full"
          />
        </div>

        {/* Anatomical Model - takes 2 columns */}
        <div className="lg:col-span-2">
          <div className="card h-full">
            <div className="card-body">
              <AnatomicalModel
                muscleScores={muscleScores}
                className="h-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Relative Strengths Chart */}
      {muscleScores.length > 0 && (
        <div className="card">
          <div className="card-body">
            <RelativeStrengthsChart
              muscleScores={muscleScores}
            />
          </div>
        </div>
      )}

      {/* Imbalances & Recommendations */}
      {analysis?.imbalances && analysis.imbalances.length > 0 && (
        <div className="card border-amber-200 bg-amber-50">
          <div className="card-header">
            <h2 className="font-semibold text-amber-800">Muscle Imbalances Detected</h2>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              {analysis.imbalances.map((imbalance: any, i: number) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-white rounded-lg">
                  <Target className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {formatMuscleGroup(imbalance.muscleGroup || '')}
                      {imbalance.type === 'weak' ? ' (Weak Point)' : ' (Strong Point)'}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {imbalance.description || `${Math.abs(imbalance.deviation || 0).toFixed(1)}% ${imbalance.type === 'weak' ? 'below' : 'above'} average`}
                    </p>
                    {imbalance.priority && (
                      <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${
                        imbalance.priority === 'high' ? 'bg-red-100 text-red-700' :
                        imbalance.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {imbalance.priority} priority
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Weak Points / Recommendations */}
      {analysis?.weakPoints && analysis.weakPoints.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold">Recommended Focus Areas</h2>
          </div>
          <div className="card-body">
            <ul className="space-y-2">
              {analysis.weakPoints.map((point: any, i: number) => (
                <li key={i} className="flex items-start gap-2 text-gray-700">
                  <Dumbbell className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary-500" />
                  <span>
                    <span className="font-medium">{formatMuscleGroup(point.muscleGroup)}:</span>{' '}
                    {point.recommendation}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function AddLiftModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [liftType, setLiftType] = useState('BACK_SQUAT');
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [notes, setNotes] = useState('');

  // Check if selected lift is a bodyweight exercise
  const isBodyweight = BODYWEIGHT_LIFTS.includes(liftType as LiftType);

  const mutation = useMutation({
    mutationFn: async (data: { liftType: string; weight: number; reps: number; isBodyweight: boolean; notes?: string }) => {
      const response = await api.post('/strength/lifts', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strength-profile'] });
      queryClient.invalidateQueries({ queryKey: ['strength-lifts'] });
      queryClient.invalidateQueries({ queryKey: ['strength-lifts-all'] });
      queryClient.invalidateQueries({ queryKey: ['strength-progress'] });
      queryClient.invalidateQueries({ queryKey: ['muscle-analysis'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      liftType,
      weight: parseFloat(weight) || 0,
      reps: parseInt(reps),
      isBodyweight,
      notes: notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">Log Lift</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lift Type</label>
            <select
              value={liftType}
              onChange={(e) => setLiftType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <optgroup label="Squat Patterns">
                {LIFT_TYPES.slice(0, 8).map((lift) => (
                  <option key={lift.value} value={lift.value}>{lift.label}</option>
                ))}
              </optgroup>
              <optgroup label="Floor Pull Patterns">
                {LIFT_TYPES.slice(8, 19).map((lift) => (
                  <option key={lift.value} value={lift.value}>{lift.label}</option>
                ))}
              </optgroup>
              <optgroup label="Horizontal Press">
                {LIFT_TYPES.slice(19, 27).map((lift) => (
                  <option key={lift.value} value={lift.value}>{lift.label}</option>
                ))}
              </optgroup>
              <optgroup label="Vertical Press">
                {LIFT_TYPES.slice(27, 34).map((lift) => (
                  <option key={lift.value} value={lift.value}>{lift.label}</option>
                ))}
              </optgroup>
              <optgroup label="Pull Patterns">
                {LIFT_TYPES.slice(34).map((lift) => (
                  <option key={lift.value} value={lift.value}>{lift.label}</option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isBodyweight ? 'Added Weight (kg)' : 'Weight (kg)'}
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder={isBodyweight ? '0' : '100'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                required={!isBodyweight}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reps</label>
              <input
                type="number"
                min="1"
                max="30"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                placeholder="5"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
          </div>

          {isBodyweight && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                <span className="font-medium">Bodyweight exercise:</span> Uses your profile weight.
                Enter any additional weight (e.g., weight vest, dip belt) or leave at 0 for bodyweight only.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did it feel?"
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 btn btn-primary flex items-center justify-center gap-2"
            >
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {mutation.isPending ? 'Saving...' : 'Log Lift'}
            </button>
          </div>

          {mutation.isError && (
            <p className="text-sm text-red-600 text-center">Failed to save lift. Please try again.</p>
          )}
        </form>
      </div>
    </div>
  );
}

function formatMuscleGroup(group: string | undefined | null): string {
  if (!group) return 'Unknown';
  return group
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export default Strength;
