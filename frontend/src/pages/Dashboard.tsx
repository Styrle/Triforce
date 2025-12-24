import { useAuthStore } from '../stores/authStore';
import { Activity, TrendingUp, Calendar, Dumbbell } from 'lucide-react';

export function Dashboard() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name || 'Athlete'}!
        </h1>
        <p className="text-gray-500 mt-1">
          Here's your training overview for today.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Fitness (CTL)"
          value="--"
          subtitle="No data yet"
          icon={TrendingUp}
          color="blue"
        />
        <StatCard
          title="Fatigue (ATL)"
          value="--"
          subtitle="No data yet"
          icon={Activity}
          color="amber"
        />
        <StatCard
          title="Form (TSB)"
          value="--"
          subtitle="No data yet"
          icon={Calendar}
          color="green"
        />
        <StatCard
          title="Weekly TSS"
          value="0"
          subtitle="of 0 target"
          icon={Dumbbell}
          color="purple"
        />
      </div>

      {/* Main content area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PMC Chart placeholder */}
        <div className="lg:col-span-2 card">
          <div className="card-header">
            <h2 className="font-semibold">Performance Management</h2>
          </div>
          <div className="card-body">
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <div className="text-center">
                <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Connect Strava to see your PMC</p>
                <p className="text-sm text-gray-400 mt-1">
                  Go to Settings to connect your Strava account
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar widgets */}
        <div className="space-y-6">
          {/* Tri-Score placeholder */}
          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold">Tri-Score</h2>
            </div>
            <div className="card-body">
              <div className="text-center py-4">
                <div className="text-5xl font-bold text-gray-300">--</div>
                <p className="text-sm text-gray-500 mt-2">
                  Complete activities to see your score
                </p>
              </div>
            </div>
          </div>

          {/* Training Readiness placeholder */}
          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold">Training Readiness</h2>
            </div>
            <div className="card-body">
              <div className="text-center py-4">
                <div className="text-3xl font-bold text-gray-300">--</div>
                <p className="text-sm text-gray-500 mt-2">
                  Sync activities to calculate readiness
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent activities placeholder */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="font-semibold">Recent Activities</h2>
          <span className="text-sm text-gray-500">Last 7 days</span>
        </div>
        <div className="card-body">
          <div className="text-center py-8">
            <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No activities yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Connect Strava or upload a FIT file to get started
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  color: 'blue' | 'amber' | 'green' | 'purple';
}

function StatCard({ title, value, subtitle, icon: Icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
  };

  const iconColorClasses = {
    blue: 'text-blue-500',
    amber: 'text-amber-500',
    green: 'text-emerald-500',
    purple: 'text-purple-500',
  };

  return (
    <div className={`card p-5 border ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          <p className="text-xs opacity-70 mt-1">{subtitle}</p>
        </div>
        <Icon className={`w-6 h-6 ${iconColorClasses[color]}`} />
      </div>
    </div>
  );
}

export default Dashboard;
