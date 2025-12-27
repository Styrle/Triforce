import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Activity, TrendingUp, Calendar, Dumbbell, ChevronDown, Loader2 } from 'lucide-react';
import { PMCChart } from '../components/charts/PMCChart';
import { TriScoreGauge } from '../components/charts/TriScoreGauge';
import { ActivityCalendar } from '../components/calendar';
import { usePMCData, useDashboardSummary, useTriScore } from '../hooks/usePMCData';

type DateRange = 30 | 60 | 90 | 180 | 365;

export function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [pmcDays, setPmcDays] = useState<DateRange>(90);

  // Fetch data
  const { data: pmcData, isLoading: pmcLoading, error: pmcError } = usePMCData({ days: pmcDays });
  const { data: dashboardData, isLoading: dashboardLoading } = useDashboardSummary();
  const { data: triScoreData, isLoading: triScoreLoading } = useTriScore();

  // Get current PMC values
  const currentCTL = pmcData?.current?.ctl ?? dashboardData?.ctl;
  const currentTSB = pmcData?.current?.tsb ?? dashboardData?.tsb;
  const currentATL = pmcData?.current?.atl;

  // Determine form status
  const getFormStatus = (tsb: number | null | undefined) => {
    if (tsb === null || tsb === undefined) return { label: 'No data', color: 'gray' };
    if (tsb >= 15) return { label: 'Fresh', color: 'emerald' };
    if (tsb >= 5) return { label: 'Optimal', color: 'green' };
    if (tsb >= -10) return { label: 'Neutral', color: 'amber' };
    if (tsb >= -25) return { label: 'Tired', color: 'orange' };
    return { label: 'Exhausted', color: 'red' };
  };

  const formStatus = getFormStatus(currentTSB);

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name || 'Athlete'}!
        </h1>
        <p className="text-gray-500 mt-1">Here's your training overview for today.</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Fitness (CTL)"
          value={currentCTL?.toFixed(0) ?? '--'}
          subtitle={dashboardData?.fitnessLevel ?? 'No data yet'}
          icon={TrendingUp}
          color="blue"
          loading={dashboardLoading}
        />
        <StatCard
          title="Fatigue (ATL)"
          value={currentATL?.toFixed(0) ?? '--'}
          subtitle={currentATL ? `${((currentATL / (currentCTL || 1)) * 100).toFixed(0)}% of CTL` : 'No data yet'}
          icon={Activity}
          color="amber"
          loading={pmcLoading}
        />
        <StatCard
          title="Form (TSB)"
          value={currentTSB?.toFixed(0) ?? '--'}
          subtitle={formStatus.label}
          icon={Calendar}
          color={formStatus.color as any}
          loading={dashboardLoading}
        />
        <StatCard
          title="Weekly TSS"
          value={dashboardData?.weeklyTss?.toFixed(0) ?? '0'}
          subtitle={`${dashboardData?.weeklyHours?.toFixed(1) ?? '0'} hours`}
          icon={Dumbbell}
          color="purple"
          loading={dashboardLoading}
        />
      </div>

      {/* Main content area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PMC Chart */}
        <div className="lg:col-span-2 card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold">Performance Management Chart</h2>
            <div className="relative">
              <select
                value={pmcDays}
                onChange={(e) => setPmcDays(Number(e.target.value) as DateRange)}
                className="appearance-none bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
                <option value={180}>6 months</option>
                <option value={365}>1 year</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="card-body">
            {pmcLoading ? (
              <div className="h-80 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
              </div>
            ) : pmcError ? (
              <div className="h-80 flex items-center justify-center bg-red-50 rounded-lg">
                <div className="text-center">
                  <p className="text-red-600 font-medium">Error loading PMC data</p>
                  <p className="text-sm text-red-500 mt-1">Please try again later</p>
                </div>
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
              <div className="h-80 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <div className="text-center">
                  <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">Connect Strava to see your PMC</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Go to Settings to connect your Strava account
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar widgets */}
        <div className="space-y-6">
          {/* Tri-Score */}
          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold">Tri-Score</h2>
            </div>
            <div className="card-body">
              {triScoreLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
                </div>
              ) : (
                <TriScoreGauge
                  data={triScoreData}
                  size="md"
                  showSportBreakdown={true}
                  showBalance={true}
                  showRecommendations={false}
                  animated={true}
                />
              )}
            </div>
          </div>

          {/* Training Readiness */}
          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold">Training Readiness</h2>
            </div>
            <div className="card-body">
              {dashboardLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
                </div>
              ) : dashboardData ? (
                <div className="space-y-3">
                  <div className="text-center">
                    <div className="text-3xl font-bold" style={{ color: getReadinessColor(currentTSB) }}>
                      {getReadinessLabel(currentTSB)}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Based on your current form
                    </p>
                  </div>

                  {/* Streak */}
                  <div className="flex items-center justify-between pt-3 border-t">
                    <span className="text-sm text-gray-500">Activity streak</span>
                    <span className="font-semibold text-primary-600">
                      {dashboardData.streak} days
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-3xl font-bold text-gray-300">--</div>
                  <p className="text-sm text-gray-500 mt-2">
                    Sync activities to calculate readiness
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Activity Calendar */}
      <ActivityCalendar
        onActivityClick={(activityId) => navigate(`/activities/${activityId}`)}
        onWorkoutClick={(workoutId) => navigate(`/plans/workouts/${workoutId}`)}
      />
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  color: 'blue' | 'amber' | 'green' | 'emerald' | 'purple' | 'orange' | 'red' | 'gray';
  loading?: boolean;
}

function StatCard({ title, value, subtitle, icon: Icon, color, loading }: StatCardProps) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    gray: 'bg-gray-50 text-gray-700 border-gray-100',
  };

  const iconColorClasses: Record<string, string> = {
    blue: 'text-blue-500',
    amber: 'text-amber-500',
    green: 'text-emerald-500',
    emerald: 'text-emerald-500',
    purple: 'text-purple-500',
    orange: 'text-orange-500',
    red: 'text-red-500',
    gray: 'text-gray-500',
  };

  return (
    <div className={`card p-5 border ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin mt-2" />
          ) : (
            <>
              <p className="text-2xl font-bold mt-1">{value}</p>
              <p className="text-xs opacity-70 mt-1">{subtitle}</p>
            </>
          )}
        </div>
        <Icon className={`w-6 h-6 ${iconColorClasses[color]}`} />
      </div>
    </div>
  );
}

function getReadinessColor(tsb: number | null | undefined): string {
  if (tsb === null || tsb === undefined) return '#9CA3AF';
  if (tsb >= 10) return '#10B981';
  if (tsb >= 0) return '#22C55E';
  if (tsb >= -15) return '#F59E0B';
  return '#EF4444';
}

function getReadinessLabel(tsb: number | null | undefined): string {
  if (tsb === null || tsb === undefined) return '--';
  if (tsb >= 15) return 'Peak';
  if (tsb >= 5) return 'Ready';
  if (tsb >= -5) return 'Moderate';
  if (tsb >= -15) return 'Tired';
  return 'Rest';
}

export default Dashboard;
