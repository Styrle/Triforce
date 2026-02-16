import { useState } from 'react';
import {
  Calendar,
  TrendingUp,
  Calculator,
  Plus,
} from 'lucide-react';
import {
  WorkoutLogTab,
  WorkoutAnalyticsTab,
  WorkoutCalculatorTab,
  NewWorkoutModal,
} from '../components/workout';

type TabType = 'log' | 'analytics' | 'calculator';

export function Workouts() {
  const [activeTab, setActiveTab] = useState<TabType>('log');
  const [showNewWorkout, setShowNewWorkout] = useState(false);

  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'log', label: 'Workout Log', icon: Calendar },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'calculator', label: 'Calculator', icon: Calculator },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workouts</h1>
          <p className="text-gray-500 mt-1">Log sessions, track volume, and calculate training loads</p>
        </div>
        <button
          onClick={() => setShowNewWorkout(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Workout
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
      {activeTab === 'log' && <WorkoutLogTab />}
      {activeTab === 'analytics' && <WorkoutAnalyticsTab />}
      {activeTab === 'calculator' && <WorkoutCalculatorTab />}

      {/* New Workout Modal */}
      {showNewWorkout && <NewWorkoutModal onClose={() => setShowNewWorkout(false)} />}
    </div>
  );
}

export default Workouts;
