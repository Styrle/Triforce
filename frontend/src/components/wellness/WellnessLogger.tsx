import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Moon,
  Battery,
  Brain,
  Heart,
  Dumbbell,
  Smile,
  Scale,
  Activity,
  Save,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useLogWellness, useWellnessByDate } from '../../hooks/useWellness';
import type { WellnessInput } from '../../types';

interface WellnessLoggerProps {
  date?: Date;
  onClose?: () => void;
  compact?: boolean;
}

interface SliderInputProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: number | undefined;
  onChange: (value: number) => void;
  color: string;
  inverted?: boolean;
}

interface NumberInputProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: number | undefined;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}

interface TagSelectorProps {
  selected: string[];
  onChange: (tags: string[]) => void;
}

const colorClasses: Record<string, string> = {
  indigo: 'bg-indigo-500',
  yellow: 'bg-yellow-500',
  pink: 'bg-pink-500',
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  green: 'bg-green-500',
};

const SliderInput = ({
  label,
  icon: Icon,
  value,
  onChange,
  color,
  inverted,
}: SliderInputProps) => {
  const getLabel = (val: number | undefined) => {
    if (val === undefined) return 'Not set';
    if (inverted) {
      if (val <= 3) return 'Low';
      if (val <= 6) return 'Moderate';
      return 'High';
    } else {
      if (val <= 3) return 'Low';
      if (val <= 6) return 'Moderate';
      return 'Good';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className="text-sm text-gray-500">
          {value !== undefined ? `${value}/10` : ''} {getLabel(value)}
        </span>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`
              flex-1 h-8 rounded transition-all
              ${
                value !== undefined && n <= value
                  ? colorClasses[color]
                  : 'bg-gray-200 hover:bg-gray-300'
              }
            `}
          />
        ))}
      </div>
    </div>
  );
};

const NumberInput = ({
  label,
  icon: Icon,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
}: NumberInputProps) => (
  <div>
    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
      <Icon className="w-4 h-4" />
      {label}
    </label>
    <div className="relative">
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        step={step}
        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder="--"
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
          {suffix}
        </span>
      )}
    </div>
  </div>
);

const TagSelector = ({ selected, onChange }: TagSelectorProps) => {
  const commonTags = [
    'travel',
    'sick',
    'injured',
    'race-week',
    'deload',
    'poor-sleep',
    'stressed',
    'recovered',
    'strong',
    'tired',
  ];

  const toggleTag = (tag: string) => {
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag));
    } else {
      onChange([...selected, tag]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {commonTags.map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() => toggleTag(tag)}
          className={`
            px-3 py-1 rounded-full text-sm transition-colors
            ${
              selected.includes(tag)
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
          `}
        >
          {tag}
        </button>
      ))}
    </div>
  );
};

export function WellnessLogger({
  date = new Date(),
  onClose,
  compact = false,
}: WellnessLoggerProps) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const { data: existingData, isLoading } = useWellnessByDate(dateStr);
  const logMutation = useLogWellness();

  const [formData, setFormData] = useState<WellnessInput>({
    date: dateStr,
    overallMood: undefined,
    sleepQuality: undefined,
    energyLevel: undefined,
    stressLevel: undefined,
    muscleSoreness: undefined,
    motivation: undefined,
    sleepDuration: undefined,
    restingHR: undefined,
    hrv: undefined,
    weight: undefined,
    notes: '',
    tags: [],
  });

  // Load existing data
  useEffect(() => {
    if (existingData) {
      setFormData({
        date: dateStr,
        overallMood: existingData.overallMood ?? undefined,
        sleepQuality: existingData.sleepQuality ?? undefined,
        energyLevel: existingData.energyLevel ?? undefined,
        stressLevel: existingData.stressLevel ?? undefined,
        muscleSoreness: existingData.muscleSoreness ?? undefined,
        motivation: existingData.motivation ?? undefined,
        sleepDuration: existingData.sleepDuration ?? undefined,
        restingHR: existingData.restingHR ?? undefined,
        hrv: existingData.hrv ?? undefined,
        weight: existingData.weight ?? undefined,
        notes: existingData.notes || '',
        tags: existingData.tags || [],
      });
    }
  }, [existingData, dateStr]);

  const handleSliderChange = (field: keyof WellnessInput, value: number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNumberChange = (field: keyof WellnessInput, value: string) => {
    const num = parseFloat(value);
    setFormData((prev) => ({
      ...prev,
      [field]: isNaN(num) ? undefined : num,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await logMutation.mutateAsync(formData);
      toast.success('Wellness logged successfully');
      onClose?.();
    } catch (error) {
      toast.error('Failed to log wellness');
    }
  };

  const sliderFields = [
    { key: 'sleepQuality', label: 'Sleep Quality', icon: Moon, color: 'indigo' },
    { key: 'energyLevel', label: 'Energy Level', icon: Battery, color: 'yellow' },
    { key: 'overallMood', label: 'Mood', icon: Smile, color: 'pink' },
    {
      key: 'stressLevel',
      label: 'Stress Level',
      icon: Brain,
      color: 'red',
      inverted: true,
    },
    {
      key: 'muscleSoreness',
      label: 'Muscle Soreness',
      icon: Dumbbell,
      color: 'orange',
      inverted: true,
    },
    { key: 'motivation', label: 'Motivation', icon: Activity, color: 'green' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{format(date, 'EEEE, MMMM d')}</h3>
          <p className="text-sm text-gray-500">Log how you're feeling today</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Slider inputs */}
      <div className="space-y-4">
        {sliderFields.map((field) => (
          <SliderInput
            key={field.key}
            label={field.label}
            icon={field.icon}
            value={formData[field.key as keyof WellnessInput] as number | undefined}
            onChange={(v) => handleSliderChange(field.key as keyof WellnessInput, v)}
            color={field.color}
            inverted={field.inverted}
          />
        ))}
      </div>

      {/* Numeric inputs */}
      {!compact && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <NumberInput
            label="Sleep (hours)"
            icon={Moon}
            value={formData.sleepDuration}
            onChange={(v) => handleNumberChange('sleepDuration', v)}
            min={0}
            max={24}
            step={0.5}
          />
          <NumberInput
            label="Resting HR"
            icon={Heart}
            value={formData.restingHR}
            onChange={(v) => handleNumberChange('restingHR', v)}
            min={30}
            max={200}
            suffix="bpm"
          />
          <NumberInput
            label="HRV"
            icon={Activity}
            value={formData.hrv}
            onChange={(v) => handleNumberChange('hrv', v)}
            min={0}
            max={200}
            suffix="ms"
          />
          <NumberInput
            label="Weight"
            icon={Scale}
            value={formData.weight}
            onChange={(v) => handleNumberChange('weight', v)}
            min={30}
            max={300}
            step={0.1}
            suffix="kg"
          />
        </div>
      )}

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tags (optional)
        </label>
        <TagSelector
          selected={formData.tags || []}
          onChange={(tags) => setFormData((prev) => ({ ...prev, tags }))}
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Notes (optional)
        </label>
        <textarea
          value={formData.notes || ''}
          onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
          placeholder="Any additional notes about how you're feeling..."
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={3}
        />
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={logMutation.isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {logMutation.isPending ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save
        </button>
      </div>
    </form>
  );
}

export default WellnessLogger;
