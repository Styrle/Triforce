import { useState } from 'react';
import {
  Plus,
  Loader2,
  X,
  Dumbbell,
  Pencil,
  Trash2,
  Search,
  ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useCustomExercises,
  useCreateExercise,
  useUpdateExercise,
  useDeleteExercise,
} from '../../hooks/useExercises';
import { MUSCLE_GROUP_NAMES } from '../../types/strength';
import type { MuscleGroup } from '../../types/strength';
import type {
  CustomExercise,
  CustomExerciseInput,
  ExerciseCategory,
  ExerciseMuscleContribution,
} from '../../types/exercise';
import { EXERCISE_CATEGORIES } from '../../types/exercise';

const MUSCLE_GROUPS = Object.entries(MUSCLE_GROUP_NAMES).map(([value, label]) => ({
  value: value as MuscleGroup,
  label,
}));

const EQUIPMENT_OPTIONS = [
  'Barbell',
  'Dumbbell',
  'Cable',
  'Machine',
  'Bodyweight',
  'Kettlebell',
  'Band',
  'Other',
];

export function ExercisesTab() {
  const [showModal, setShowModal] = useState(false);
  const [editingExercise, setEditingExercise] = useState<CustomExercise | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  const { data: exercises = [], isLoading } = useCustomExercises();
  const deleteMutation = useDeleteExercise();

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Deactivate "${name}"? It will no longer appear in exercise selection.`)) return;
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success('Exercise deactivated'),
      onError: () => toast.error('Failed to deactivate exercise'),
    });
  };

  const handleEdit = (exercise: CustomExercise) => {
    setEditingExercise(exercise);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingExercise(null);
  };

  const filtered = exercises.filter((ex) => {
    const matchesSearch = !search || ex.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || ex.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {exercises.length} custom exercise{exercises.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Exercise
        </button>
      </div>

      {/* Filters */}
      {exercises.length > 0 && (
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search exercises..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="appearance-none border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Categories</option>
              {EXERCISE_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Exercise List */}
      {filtered.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-12">
            <Dumbbell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">
              {exercises.length === 0 ? 'No custom exercises yet' : 'No exercises match your search'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {exercises.length === 0
                ? 'Add exercises that aren\'t in the predefined list'
                : 'Try a different search or category'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              onEdit={() => handleEdit(exercise)}
              onDelete={() => handleDelete(exercise.id, exercise.name)}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <ExerciseModal
          exercise={editingExercise}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

function ExerciseCard({
  exercise,
  onEdit,
  onDelete,
}: {
  exercise: CustomExercise;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const categoryLabel = EXERCISE_CATEGORIES.find((c) => c.value === exercise.category)?.label || exercise.category;
  const contributions = (exercise.muscleContributions || []) as ExerciseMuscleContribution[];

  return (
    <div className="card group">
      <div className="card-body">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-900">{exercise.name}</p>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                {categoryLabel}
              </span>
              {exercise.isBodyweight && (
                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs font-medium">
                  BW
                </span>
              )}
            </div>
            {exercise.equipment && (
              <p className="text-sm text-gray-500 mt-1">{exercise.equipment}</p>
            )}
            {exercise.description && (
              <p className="text-sm text-gray-400 mt-1">{exercise.description}</p>
            )}
            {contributions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {contributions.map((mc) => (
                  <span
                    key={mc.muscleGroup}
                    className="px-2 py-0.5 bg-primary-50 text-primary-700 rounded text-xs"
                  >
                    {MUSCLE_GROUP_NAMES[mc.muscleGroup as MuscleGroup] || mc.muscleGroup}{' '}
                    {Math.round(mc.contribution * 100)}%
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onEdit}
              className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
              title="Edit"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExerciseModal({
  exercise,
  onClose,
}: {
  exercise: CustomExercise | null;
  onClose: () => void;
}) {
  const isEditing = !!exercise;
  const createMutation = useCreateExercise();
  const updateMutation = useUpdateExercise();

  const [name, setName] = useState(exercise?.name || '');
  const [description, setDescription] = useState(exercise?.description || '');
  const [category, setCategory] = useState<ExerciseCategory>(exercise?.category || 'OTHER');
  const [equipment, setEquipment] = useState(exercise?.equipment || '');
  const [isBodyweight, setIsBodyweight] = useState(exercise?.isBodyweight || false);
  const [muscleContributions, setMuscleContributions] = useState<ExerciseMuscleContribution[]>(
    (exercise?.muscleContributions as ExerciseMuscleContribution[]) || []
  );

  const totalContribution = muscleContributions.reduce((sum, mc) => sum + mc.contribution, 0);

  const addMuscleContribution = () => {
    // Find first muscle group not already used
    const used = new Set(muscleContributions.map((mc) => mc.muscleGroup));
    const available = MUSCLE_GROUPS.find((mg) => !used.has(mg.value));
    if (!available) return;

    setMuscleContributions([
      ...muscleContributions,
      { muscleGroup: available.value, contribution: 0.1 },
    ]);
  };

  const removeMuscleContribution = (index: number) => {
    setMuscleContributions(muscleContributions.filter((_, i) => i !== index));
  };

  const updateMuscleContribution = (index: number, field: 'muscleGroup' | 'contribution', value: string | number) => {
    setMuscleContributions(
      muscleContributions.map((mc, i) =>
        i === index ? { ...mc, [field]: value } : mc
      )
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Exercise name is required');
      return;
    }

    if (totalContribution > 1.05) {
      toast.error('Muscle contributions cannot exceed 100%');
      return;
    }

    const input: CustomExerciseInput = {
      name: name.trim(),
      description: description || undefined,
      category,
      equipment: equipment || undefined,
      isBodyweight,
      muscleContributions: muscleContributions.length > 0 ? muscleContributions : undefined,
    };

    if (isEditing) {
      updateMutation.mutate(
        { ...input, id: exercise!.id },
        {
          onSuccess: () => {
            toast.success('Exercise updated');
            onClose();
          },
          onError: () => toast.error('Failed to update exercise'),
        }
      );
    } else {
      createMutation.mutate(input, {
        onSuccess: () => {
          toast.success('Exercise created');
          onClose();
        },
        onError: () => toast.error('Failed to create exercise'),
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold">{isEditing ? 'Edit Exercise' : 'Add Custom Exercise'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Landmine Press"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes about form or setup"
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Category & Equipment */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExerciseCategory)}
                  className="w-full appearance-none border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {EXERCISE_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Equipment</label>
              <div className="relative">
                <select
                  value={equipment}
                  onChange={(e) => setEquipment(e.target.value)}
                  className="w-full appearance-none border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">None</option>
                  {EQUIPMENT_OPTIONS.map((eq) => (
                    <option key={eq} value={eq}>{eq}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Bodyweight Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isBodyweight}
              onChange={(e) => setIsBodyweight(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Bodyweight exercise</span>
          </label>

          {/* Muscle Contributions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                Muscle Contributions
                {muscleContributions.length > 0 && (
                  <span className={`ml-2 text-xs ${totalContribution > 1 ? 'text-red-500' : 'text-gray-400'}`}>
                    ({Math.round(totalContribution * 100)}%)
                  </span>
                )}
              </label>
              <button
                type="button"
                onClick={addMuscleContribution}
                disabled={muscleContributions.length >= MUSCLE_GROUPS.length}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium disabled:opacity-30"
              >
                + Add Muscle
              </button>
            </div>

            {muscleContributions.length === 0 ? (
              <p className="text-xs text-gray-400">Optional: map this exercise to muscle groups for volume analysis</p>
            ) : (
              <div className="space-y-2">
                {muscleContributions.map((mc, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <select
                        value={mc.muscleGroup}
                        onChange={(e) => updateMuscleContribution(i, 'muscleGroup', e.target.value)}
                        className="w-full appearance-none border border-gray-300 rounded px-2 py-1.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        {MUSCLE_GROUPS.map((mg) => (
                          <option key={mg.value} value={mg.value}>{mg.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                    </div>
                    <div className="flex items-center gap-1 w-24">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={Math.round(mc.contribution * 100)}
                        onChange={(e) => updateMuscleContribution(i, 'contribution', parseInt(e.target.value || '0') / 100)}
                        className="w-16 border border-gray-300 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <span className="text-xs text-gray-400">%</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMuscleContribution(i)}
                      className="p-1 text-gray-300 hover:text-red-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 btn btn-primary flex items-center justify-center gap-2"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {isPending ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
