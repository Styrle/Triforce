import { format, parseISO } from 'date-fns';
import type { DailyNutrition } from '../../types';

interface WeeklyChartProps {
  data: DailyNutrition[];
  calorieTarget?: number;
}

export function WeeklyChart({ data, calorieTarget = 2000 }: WeeklyChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400">
        No weekly data available
      </div>
    );
  }

  // Find max calories for scaling
  const maxCalories = Math.max(
    calorieTarget,
    ...data.map((d) => d.calories || 0)
  );

  return (
    <div className="space-y-4">
      {/* Chart */}
      <div className="flex items-end justify-between gap-2 h-40">
        {data.map((day) => {
          const calories = day.calories || 0;
          const height = maxCalories > 0 ? (calories / maxCalories) * 100 : 0;
          const isOverTarget = calories > calorieTarget;
          const dayLabel = format(parseISO(day.date), 'EEE');

          return (
            <div
              key={day.date}
              className="flex-1 flex flex-col items-center gap-1"
            >
              <div className="relative w-full flex-1 flex items-end">
                {/* Target line */}
                <div
                  className="absolute w-full border-t-2 border-dashed border-gray-300"
                  style={{ bottom: `${(calorieTarget / maxCalories) * 100}%` }}
                />
                {/* Bar */}
                <div
                  className={`w-full rounded-t-sm transition-all duration-300 ${
                    isOverTarget ? 'bg-red-400' : 'bg-blue-500'
                  }`}
                  style={{ height: `${height}%`, minHeight: calories > 0 ? '4px' : '0' }}
                  title={`${Math.round(calories)} kcal`}
                />
              </div>
              <span className="text-xs text-gray-500">{dayLabel}</span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-500 rounded-sm" />
          <span>Under target</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-400 rounded-sm" />
          <span>Over target</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 border-t-2 border-dashed border-gray-300" />
          <span>Target ({calorieTarget})</span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 pt-2 border-t">
        <div className="text-center">
          <div className="text-sm text-gray-500">Avg Calories</div>
          <div className="font-semibold">
            {Math.round(
              data.reduce((sum, d) => sum + (d.calories || 0), 0) /
                data.filter((d) => d.calories && d.calories > 0).length || 0
            )}
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-500">Days Logged</div>
          <div className="font-semibold">
            {data.filter((d) => d.calories && d.calories > 0).length}
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-500">Total Calories</div>
          <div className="font-semibold">
            {Math.round(data.reduce((sum, d) => sum + (d.calories || 0), 0))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default WeeklyChart;
