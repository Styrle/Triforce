import { useState } from 'react';
import {
  Plus,
  Loader2,
  X,
  ChevronDown,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useCreateWorkout } from '../../hooks/useWorkouts';
import { useCustomExercises } from '../../hooks/useExercises';
import { LIFT_TYPE_NAMES } from '../../types/strength';
import type { LiftType } from '../../types/strength';
import type { WorkoutExerciseInput, WorkoutSetInput } from '../../types/workout';

// All 44 lift types for the selector
const LIFT_TYPES = Object.entries(LIFT_TYPE_NAMES).map(([value, label]) => ({
  value: value as LiftType,
  label,
}));

interface ExerciseFormData {
  exerciseName: string;
  liftType: string;
  isCustom: boolean;
  sets: { weight: string; reps: string; rpe: string }[];
}

export function NewWorkoutModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [exercises, setExercises] = useState<ExerciseFormData[]>([
    {
      exerciseName: '',
      liftType: 'BACK_SQUAT',
      isCustom: false,
      sets: [{ weight: '', reps: '', rpe: '' }],
    },
  ]);
  const createMutation = useCreateWorkout();
  const { data: customExercises = [] } = useCustomExercises();

  const addExercise = () => {
    setExercises([
      ...exercises,
      {
        exerciseName: '',
        liftType: 'BACK_SQUAT',
        isCustom: false,
        sets: [{ weight: '', reps: '', rpe: '' }],
      },
    ]);
  };

  const removeExercise = (index: number) => {
    if (exercises.length <= 1) return;
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const updateExercise = (index: number, updates: Partial<ExerciseFormData>) => {
    setExercises(
      exercises.map((ex, i) => (i === index ? { ...ex, ...updates } : ex))
    );
  };

  const handleExerciseSelect = (exIndex: number, value: string) => {
    // Check if it's a custom exercise (prefixed with "custom:")
    if (value.startsWith('custom:')) {
      const customName = value.replace('custom:', '');
      updateExercise(exIndex, {
        liftType: '',
        exerciseName: customName,
        isCustom: true,
      });
    } else {
      const liftLabel = LIFT_TYPES.find((l) => l.value === value)?.label || '';
      updateExercise(exIndex, {
        liftType: value,
        exerciseName: liftLabel,
        isCustom: false,
      });
    }
  };

  const addSet = (exIndex: number) => {
    const updated = [...exercises];
    const prevSet = updated[exIndex].sets[updated[exIndex].sets.length - 1];
    updated[exIndex].sets.push({
      weight: prevSet?.weight || '',
      reps: prevSet?.reps || '',
      rpe: '',
    });
    setExercises(updated);
  };

  const removeSet = (exIndex: number, setIndex: number) => {
    const updated = [...exercises];
    if (updated[exIndex].sets.length <= 1) return;
    updated[exIndex].sets = updated[exIndex].sets.filter((_, i) => i !== setIndex);
    setExercises(updated);
  };

  const updateSet = (
    exIndex: number,
    setIndex: number,
    field: 'weight' | 'reps' | 'rpe',
    value: string
  ) => {
    const updated = [...exercises];
    updated[exIndex].sets[setIndex][field] = value;
    setExercises(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const exerciseInputs: WorkoutExerciseInput[] = exercises.map((ex, i) => {
      const liftLabel = LIFT_TYPES.find((l) => l.value === ex.liftType)?.label || ex.liftType;
      const sets: WorkoutSetInput[] = ex.sets
        .filter((s) => s.weight && s.reps)
        .map((s) => ({
          reps: parseInt(s.reps),
          weight: parseFloat(s.weight),
          rpe: s.rpe ? parseFloat(s.rpe) : undefined,
        }));

      return {
        exerciseName: ex.isCustom ? ex.exerciseName : (ex.exerciseName || liftLabel),
        liftType: ex.isCustom ? undefined : (ex.liftType as LiftType),
        orderIndex: i,
        sets,
      };
    });

    const validExercises = exerciseInputs.filter((ex) => ex.sets.length > 0);

    if (validExercises.length === 0) {
      toast.error('Add at least one exercise with weight and reps');
      return;
    }

    createMutation.mutate(
      {
        name: name || `Workout - ${format(new Date(), 'MMM d, yyyy')}`,
        exercises: validExercises,
      },
      {
        onSuccess: () => {
          toast.success('Workout logged');
          onClose();
        },
        onError: () => toast.error('Failed to save workout'),
      }
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold">Log Workout</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          {/* Workout Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Workout Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`Workout - ${format(new Date(), 'MMM d, yyyy')}`}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Exercises */}
          {exercises.map((exercise, exIndex) => (
            <div key={exIndex} className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">Exercise {exIndex + 1}</span>
                {exercises.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeExercise(exIndex)}
                    className="p-1 text-gray-400 hover:text-red-500 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Exercise Selector with Custom Exercises */}
              <div className="relative">
                <select
                  value={exercise.isCustom ? `custom:${exercise.exerciseName}` : exercise.liftType}
                  onChange={(e) => handleExerciseSelect(exIndex, e.target.value)}
                  className="w-full appearance-none border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <optgroup label="Predefined Exercises">
                    {LIFT_TYPES.map((lift) => (
                      <option key={lift.value} value={lift.value}>
                        {lift.label}
                      </option>
                    ))}
                  </optgroup>
                  {customExercises.length > 0 && (
                    <optgroup label="My Custom Exercises">
                      {customExercises.map((ce) => (
                        <option key={ce.id} value={`custom:${ce.name}`}>
                          {ce.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              {/* Sets */}
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 font-medium px-1">
                  <span className="col-span-1">Set</span>
                  <span className="col-span-4">Weight (kg)</span>
                  <span className="col-span-3">Reps</span>
                  <span className="col-span-3">RPE</span>
                  <span className="col-span-1" />
                </div>
                {exercise.sets.map((set, setIndex) => (
                  <div key={setIndex} className="grid grid-cols-12 gap-2 items-center">
                    <span className="col-span-1 text-sm text-gray-500 text-center">
                      {setIndex + 1}
                    </span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={set.weight}
                      onChange={(e) => updateSet(exIndex, setIndex, 'weight', e.target.value)}
                      placeholder="100"
                      className="col-span-4 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={set.reps}
                      onChange={(e) => updateSet(exIndex, setIndex, 'reps', e.target.value)}
                      placeholder="5"
                      className="col-span-3 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <input
                      type="number"
                      min="1"
                      max="10"
                      step="0.5"
                      value={set.rpe}
                      onChange={(e) => updateSet(exIndex, setIndex, 'rpe', e.target.value)}
                      placeholder="--"
                      className="col-span-3 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeSet(exIndex, setIndex)}
                      disabled={exercise.sets.length <= 1}
                      className="col-span-1 p-1 text-gray-300 hover:text-red-500 disabled:opacity-30 disabled:hover:text-gray-300"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addSet(exIndex)}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  + Add Set
                </button>
              </div>
            </div>
          ))}

          {/* Add Exercise */}
          <button
            type="button"
            onClick={addExercise}
            className="w-full border-2 border-dashed border-gray-300 rounded-lg py-3 text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors"
          >
            + Add Exercise
          </button>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 btn btn-primary flex items-center justify-center gap-2"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {createMutation.isPending ? 'Saving...' : 'Save Workout'}
            </button>
          </div>

          {createMutation.isError && (
            <p className="text-sm text-red-600 text-center">Failed to save workout. Please try again.</p>
          )}
        </form>
      </div>
    </div>
  );
}
