import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useLogFood } from '../../hooks/useNutrition';
import type { MealType, LogFoodInput } from '../../types';
import toast from 'react-hot-toast';

interface FoodLoggerProps {
  date: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const mealOptions: { value: MealType; label: string }[] = [
  { value: 'BREAKFAST', label: 'Breakfast' },
  { value: 'LUNCH', label: 'Lunch' },
  { value: 'DINNER', label: 'Dinner' },
  { value: 'SNACK', label: 'Snack' },
];

export function FoodLogger({ date, onClose, onSuccess }: FoodLoggerProps) {
  const [formData, setFormData] = useState({
    meal: 'LUNCH' as MealType,
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    servings: '1',
    fiber: '',
    notes: '',
  });

  const logFood = useLogFood();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Please enter a food name');
      return;
    }

    const input: LogFoodInput = {
      meal: formData.meal,
      name: formData.name.trim(),
      calories: parseFloat(formData.calories) || 0,
      protein: parseFloat(formData.protein) || 0,
      carbs: parseFloat(formData.carbs) || 0,
      fat: parseFloat(formData.fat) || 0,
      date,
      servings: parseFloat(formData.servings) || 1,
      fiber: formData.fiber ? parseFloat(formData.fiber) : undefined,
      notes: formData.notes || undefined,
    };

    try {
      await logFood.mutateAsync(input);
      toast.success('Food logged successfully');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to log food');
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">Log Food</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Meal Type */}
          <div>
            <label className="label">Meal</label>
            <select
              name="meal"
              value={formData.meal}
              onChange={handleChange}
              className="input"
            >
              {mealOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Food Name */}
          <div>
            <label className="label">Food Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="input"
              placeholder="e.g., Grilled Chicken Breast"
              required
            />
          </div>

          {/* Servings */}
          <div>
            <label className="label">Servings</label>
            <input
              type="number"
              name="servings"
              value={formData.servings}
              onChange={handleChange}
              className="input"
              min="0.1"
              step="0.1"
              placeholder="1"
            />
          </div>

          {/* Macros Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Calories *</label>
              <input
                type="number"
                name="calories"
                value={formData.calories}
                onChange={handleChange}
                className="input"
                min="0"
                placeholder="0"
                required
              />
            </div>
            <div>
              <label className="label">Protein (g) *</label>
              <input
                type="number"
                name="protein"
                value={formData.protein}
                onChange={handleChange}
                className="input"
                min="0"
                step="0.1"
                placeholder="0"
                required
              />
            </div>
            <div>
              <label className="label">Carbs (g) *</label>
              <input
                type="number"
                name="carbs"
                value={formData.carbs}
                onChange={handleChange}
                className="input"
                min="0"
                step="0.1"
                placeholder="0"
                required
              />
            </div>
            <div>
              <label className="label">Fat (g) *</label>
              <input
                type="number"
                name="fat"
                value={formData.fat}
                onChange={handleChange}
                className="input"
                min="0"
                step="0.1"
                placeholder="0"
                required
              />
            </div>
          </div>

          {/* Optional: Fiber */}
          <div>
            <label className="label">Fiber (g) <span className="text-gray-400 font-normal">- optional</span></label>
            <input
              type="number"
              name="fiber"
              value={formData.fiber}
              onChange={handleChange}
              className="input"
              min="0"
              step="0.1"
              placeholder="0"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="label">Notes <span className="text-gray-400 font-normal">- optional</span></label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="input"
              rows={2}
              placeholder="Any additional notes..."
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={logFood.isPending}
              className="flex-1 btn btn-primary flex items-center justify-center gap-2"
            >
              {logFood.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Log Food'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FoodLogger;
