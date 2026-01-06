import { Trash2, Coffee, Sun, Moon, Cookie, Loader2 } from 'lucide-react';
import type { MealType } from '../../types';

interface Entry {
  id?: string;
  meal: MealType;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface DailyLogProps {
  entries: Entry[];
  isLoading?: boolean;
  onDeleteEntry?: (entryId: string) => void;
  isDeleting?: boolean;
}

const mealConfig: Record<MealType, { label: string; icon: React.ReactNode; order: number }> = {
  BREAKFAST: { label: 'Breakfast', icon: <Coffee className="w-4 h-4" />, order: 1 },
  LUNCH: { label: 'Lunch', icon: <Sun className="w-4 h-4" />, order: 2 },
  DINNER: { label: 'Dinner', icon: <Moon className="w-4 h-4" />, order: 3 },
  SNACK: { label: 'Snacks', icon: <Cookie className="w-4 h-4" />, order: 4 },
};

function groupEntriesByMeal(entries: Entry[]): Record<MealType, Entry[]> {
  const grouped: Record<MealType, Entry[]> = {
    BREAKFAST: [],
    LUNCH: [],
    DINNER: [],
    SNACK: [],
  };

  entries.forEach((entry) => {
    if (grouped[entry.meal]) {
      grouped[entry.meal].push(entry);
    } else {
      grouped.SNACK.push(entry);
    }
  });

  return grouped;
}

function MealSection({
  meal,
  entries,
  onDeleteEntry,
  isDeleting,
}: {
  meal: MealType;
  entries: Entry[];
  onDeleteEntry?: (entryId: string) => void;
  isDeleting?: boolean;
}) {
  const config = mealConfig[meal];
  const totalCalories = entries.reduce((sum, e) => sum + (e.calories || 0), 0);

  if (entries.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-gray-700">
          {config.icon}
          <span className="font-medium">{config.label}</span>
        </div>
        <span className="text-sm text-gray-500">{Math.round(totalCalories)} kcal</span>
      </div>
      <div className="space-y-2">
        {entries.map((entry, index) => (
          <div
            key={entry.id || `${meal}-${index}`}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex-1">
              <div className="font-medium text-gray-900">{entry.name}</div>
              <div className="text-sm text-gray-500 flex gap-3">
                <span>{Math.round(entry.calories)} kcal</span>
                <span>P: {Math.round(entry.protein)}g</span>
                <span>C: {Math.round(entry.carbs)}g</span>
                <span>F: {Math.round(entry.fat)}g</span>
              </div>
            </div>
            {onDeleteEntry && entry.id && (
              <button
                onClick={() => onDeleteEntry(entry.id!)}
                disabled={isDeleting}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                title="Delete entry"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DailyLog({ entries, isLoading, onDeleteEntry, isDeleting }: DailyLogProps) {
  if (isLoading) {
    return (
      <div className="card">
        <div className="card-body flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="card">
        <div className="card-body text-center py-12">
          <Coffee className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No food logged for this day</p>
          <p className="text-sm text-gray-400 mt-1">
            Add your first entry or import from MyFitnessPal
          </p>
        </div>
      </div>
    );
  }

  const grouped = groupEntriesByMeal(entries);
  const orderedMeals: MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="font-semibold">Food Log</h3>
      </div>
      <div className="card-body">
        {orderedMeals.map((meal) => (
          <MealSection
            key={meal}
            meal={meal}
            entries={grouped[meal]}
            onDeleteEntry={onDeleteEntry}
            isDeleting={isDeleting}
          />
        ))}
      </div>
    </div>
  );
}

export default DailyLog;
