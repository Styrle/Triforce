import { useState } from 'react';
import { format, subDays, addDays, startOfWeek } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Upload,
  Target,
  Calendar,
  BarChart3,
  ListTodo,
} from 'lucide-react';
import {
  useDailyNutrition,
  useWeeklyNutrition,
  useDeleteEntry,
} from '../hooks/useNutrition';
import {
  MacroSummary,
  DailyLog,
  FoodLogger,
  MFPImport,
  MacroChart,
  WeeklyChart,
  NutritionTargets,
} from '../components/nutrition';
import toast from 'react-hot-toast';

type TabType = 'log' | 'weekly' | 'import';

const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: 'log', label: 'Daily Log', icon: ListTodo },
  { id: 'weekly', label: 'Weekly', icon: BarChart3 },
  { id: 'import', label: 'Import', icon: Upload },
];

export function Nutrition() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<TabType>('log');
  const [showFoodLogger, setShowFoodLogger] = useState(false);
  const [showTargets, setShowTargets] = useState(false);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const weekStart = format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  // Fetch daily nutrition
  const {
    data: dailyData,
    isLoading: isDailyLoading,
  } = useDailyNutrition(dateStr);

  // Fetch weekly nutrition
  const {
    data: weeklyData,
    isLoading: isWeeklyLoading,
  } = useWeeklyNutrition(weekStart, activeTab === 'weekly');

  // Delete mutation
  const deleteEntry = useDeleteEntry();

  const navigateDate = (direction: 'prev' | 'next') => {
    setSelectedDate((prev) =>
      direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1)
    );
  };

  const goToToday = () => setSelectedDate(new Date());

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Delete this entry?')) return;

    try {
      await deleteEntry.mutateAsync(entryId);
      toast.success('Entry deleted');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to delete');
    }
  };

  // Extract values from daily data
  const calories = dailyData?.totalCalories || 0;
  const protein = dailyData?.totalProtein || 0;
  const carbs = dailyData?.totalCarbs || 0;
  const fat = dailyData?.totalFat || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nutrition</h1>
          <p className="text-gray-500 mt-1">Track your meals and macros</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTargets(true)}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Target className="w-4 h-4" />
            <span className="hidden sm:inline">Targets</span>
          </button>
          <button
            onClick={() => setShowFoodLogger(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Log Food
          </button>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => navigateDate('prev')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="text-center min-w-[200px]">
          <button
            onClick={() => {
              // TODO: Could add a date picker here
            }}
            className="flex items-center justify-center gap-2 text-lg font-semibold hover:text-primary-600 transition-colors"
          >
            <Calendar className="w-5 h-5" />
            {format(selectedDate, 'EEEE, MMMM d')}
          </button>
          {!isToday && (
            <button
              onClick={goToToday}
              className="text-sm text-primary-600 hover:underline mt-1"
            >
              Go to today
            </button>
          )}
        </div>

        <button
          onClick={() => navigateDate('next')}
          disabled={isToday}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Macro Summary */}
      <MacroSummary
        calories={calories}
        protein={protein}
        carbs={carbs}
        fat={fat}
      />

      {/* Tab Navigation */}
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {activeTab === 'log' && (
          <>
            {/* Daily Log - 2/3 width */}
            <div className="lg:col-span-2">
              <DailyLog
                entries={dailyData?.entries || []}
                isLoading={isDailyLoading}
                onDeleteEntry={handleDeleteEntry}
                isDeleting={deleteEntry.isPending}
              />
            </div>

            {/* Sidebar - 1/3 width */}
            <div className="space-y-6">
              {/* Macro Breakdown */}
              <div className="card">
                <div className="card-header">
                  <h3 className="font-semibold">Macro Breakdown</h3>
                </div>
                <div className="card-body">
                  <MacroChart protein={protein} carbs={carbs} fat={fat} />
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'weekly' && (
          <div className="lg:col-span-3">
            <div className="card">
              <div className="card-header">
                <h3 className="font-semibold">Weekly Overview</h3>
              </div>
              <div className="card-body">
                {isWeeklyLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
                  </div>
                ) : weeklyData ? (
                  <div className="space-y-6">
                    {/* Weekly Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-900">
                          {weeklyData.averages.calories}
                        </div>
                        <div className="text-sm text-gray-500">Avg Calories</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-900">
                          {weeklyData.averages.protein}g
                        </div>
                        <div className="text-sm text-gray-500">Avg Protein</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-900">
                          {weeklyData.totals.daysLogged}
                        </div>
                        <div className="text-sm text-gray-500">Days Logged</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-900">
                          {weeklyData.totals.calories.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">Total Calories</div>
                      </div>
                    </div>

                    {/* Weekly Chart */}
                    <WeeklyChart data={weeklyData.dailyData} />
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    No data for this week
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'import' && (
          <div className="lg:col-span-3">
            <MFPImport
              onSuccess={() => {
                setActiveTab('log');
              }}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      {showFoodLogger && (
        <FoodLogger
          date={dateStr}
          onClose={() => setShowFoodLogger(false)}
          onSuccess={() => setShowFoodLogger(false)}
        />
      )}

      {showTargets && (
        <NutritionTargets
          date={dateStr}
          onClose={() => setShowTargets(false)}
          onSuccess={() => setShowTargets(false)}
        />
      )}
    </div>
  );
}

export default Nutrition;
