import { useState } from 'react';
import { X, Loader2, Target } from 'lucide-react';
import { useSetTargets } from '../../hooks/useNutrition';
import toast from 'react-hot-toast';

interface NutritionTargetsProps {
  date: string;
  currentTargets?: {
    calorieTarget?: number | null;
    proteinTarget?: number | null;
    carbTarget?: number | null;
    fatTarget?: number | null;
  };
  onClose: () => void;
  onSuccess?: () => void;
}

export function NutritionTargets({
  date,
  currentTargets,
  onClose,
  onSuccess,
}: NutritionTargetsProps) {
  const [formData, setFormData] = useState({
    calorieTarget: currentTargets?.calorieTarget?.toString() || '2000',
    proteinTarget: currentTargets?.proteinTarget?.toString() || '150',
    carbTarget: currentTargets?.carbTarget?.toString() || '250',
    fatTarget: currentTargets?.fatTarget?.toString() || '65',
  });

  const setTargets = useSetTargets();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await setTargets.mutateAsync({
        date,
        targets: {
          calorieTarget: parseFloat(formData.calorieTarget) || undefined,
          proteinTarget: parseFloat(formData.proteinTarget) || undefined,
          carbTarget: parseFloat(formData.carbTarget) || undefined,
          fatTarget: parseFloat(formData.fatTarget) || undefined,
        },
      });
      toast.success('Targets updated');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to update targets');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Calculate macro percentages
  const totalMacroCals =
    parseFloat(formData.proteinTarget || '0') * 4 +
    parseFloat(formData.carbTarget || '0') * 4 +
    parseFloat(formData.fatTarget || '0') * 9;
  const targetCals = parseFloat(formData.calorieTarget || '0');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold">Nutrition Targets</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Calorie Target */}
          <div>
            <label className="label">Daily Calorie Target</label>
            <input
              type="number"
              name="calorieTarget"
              value={formData.calorieTarget}
              onChange={handleChange}
              className="input"
              min="0"
              step="50"
            />
          </div>

          {/* Macro Targets */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Protein (g)</label>
              <input
                type="number"
                name="proteinTarget"
                value={formData.proteinTarget}
                onChange={handleChange}
                className="input"
                min="0"
                step="5"
              />
            </div>
            <div>
              <label className="label">Carbs (g)</label>
              <input
                type="number"
                name="carbTarget"
                value={formData.carbTarget}
                onChange={handleChange}
                className="input"
                min="0"
                step="5"
              />
            </div>
            <div>
              <label className="label">Fat (g)</label>
              <input
                type="number"
                name="fatTarget"
                value={formData.fatTarget}
                onChange={handleChange}
                className="input"
                min="0"
                step="5"
              />
            </div>
          </div>

          {/* Macro calories info */}
          <div className="p-3 bg-gray-50 rounded-lg text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Macros total:</span>
              <span className="font-medium">{Math.round(totalMacroCals)} kcal</span>
            </div>
            {targetCals > 0 && Math.abs(totalMacroCals - targetCals) > 50 && (
              <p className="text-amber-600 mt-1 text-xs">
                Note: Macro calories differ from calorie target by{' '}
                {Math.abs(Math.round(totalMacroCals - targetCals))} kcal
              </p>
            )}
          </div>

          {/* Quick Presets */}
          <div>
            <label className="label mb-2">Quick Presets</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    calorieTarget: '2000',
                    proteinTarget: '150',
                    carbTarget: '200',
                    fatTarget: '67',
                  })
                }
                className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Balanced
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    calorieTarget: '2000',
                    proteinTarget: '200',
                    carbTarget: '150',
                    fatTarget: '67',
                  })
                }
                className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                High Protein
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    calorieTarget: '2000',
                    proteinTarget: '150',
                    carbTarget: '100',
                    fatTarget: '111',
                  })
                }
                className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Low Carb
              </button>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={setTargets.isPending}
              className="flex-1 btn btn-primary flex items-center justify-center gap-2"
            >
              {setTargets.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Targets'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NutritionTargets;
