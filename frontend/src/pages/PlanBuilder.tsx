import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, addWeeks, differenceInWeeks } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Calendar,
  Target,
  Clock,
  Loader2,
  AlertCircle,
  Info,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useCreatePlan } from '../hooks/usePlans';
import type { PlanType, Periodization, CreatePlanInput } from '../types';

// Plan type options with descriptions
const PLAN_TYPES: Array<{
  value: PlanType;
  label: string;
  description: string;
  sports: string[];
  defaultWeeks: number;
}> = [
  {
    value: 'SPRINT_TRI',
    label: 'Sprint Triathlon',
    description: '750m swim, 20km bike, 5km run',
    sports: ['Swim', 'Bike', 'Run'],
    defaultWeeks: 8,
  },
  {
    value: 'OLYMPIC_TRI',
    label: 'Olympic Triathlon',
    description: '1.5km swim, 40km bike, 10km run',
    sports: ['Swim', 'Bike', 'Run'],
    defaultWeeks: 12,
  },
  {
    value: 'HALF_IRONMAN',
    label: 'Half Ironman (70.3)',
    description: '1.9km swim, 90km bike, 21.1km run',
    sports: ['Swim', 'Bike', 'Run'],
    defaultWeeks: 16,
  },
  {
    value: 'IRONMAN',
    label: 'Ironman (140.6)',
    description: '3.8km swim, 180km bike, 42.2km run',
    sports: ['Swim', 'Bike', 'Run'],
    defaultWeeks: 24,
  },
  {
    value: 'MARATHON',
    label: 'Marathon',
    description: '42.2km running race',
    sports: ['Run'],
    defaultWeeks: 16,
  },
  {
    value: 'HALF_MARATHON',
    label: 'Half Marathon',
    description: '21.1km running race',
    sports: ['Run'],
    defaultWeeks: 12,
  },
  {
    value: 'CENTURY',
    label: 'Century Ride',
    description: '100 mile cycling event',
    sports: ['Bike'],
    defaultWeeks: 12,
  },
  {
    value: 'GENERAL_FITNESS',
    label: 'General Fitness',
    description: 'Balanced multi-sport training',
    sports: ['Swim', 'Bike', 'Run', 'Strength'],
    defaultWeeks: 12,
  },
  {
    value: 'CUSTOM',
    label: 'Custom Plan',
    description: 'Build your own training plan',
    sports: ['Any'],
    defaultWeeks: 12,
  },
];

const PERIODIZATION_OPTIONS: Array<{
  value: Periodization;
  label: string;
  description: string;
}> = [
  {
    value: 'LINEAR',
    label: 'Linear Periodization',
    description: 'Gradually increase volume and intensity over time. Best for beginners.',
  },
  {
    value: 'BLOCK',
    label: 'Block Periodization',
    description: 'Focus on one aspect at a time. Great for intermediate athletes.',
  },
  {
    value: 'POLARIZED',
    label: 'Polarized Training',
    description: '80% easy, 20% hard. Optimal for endurance performance.',
  },
  {
    value: 'PYRAMIDAL',
    label: 'Pyramidal',
    description: 'More moderate intensity than polarized. Balanced approach.',
  },
  {
    value: 'REVERSE_LINEAR',
    label: 'Reverse Linear',
    description: 'Start intense, build volume. Good for short preparation periods.',
  },
];

const STEPS = [
  { id: 'type', label: 'Plan Type' },
  { id: 'event', label: 'Event Details' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'training', label: 'Training Load' },
  { id: 'review', label: 'Review' },
];

interface FormData {
  name: string;
  planType: PlanType | null;
  targetEvent: string;
  targetDate: string;
  weeksAvailable: number;
  weeklyHoursMin: number;
  weeklyHoursMax: number;
  periodization: Periodization;
  description: string;
  currentFitness: number;
}

export function PlanBuilder() {
  const navigate = useNavigate();
  const createPlan = useCreatePlan();

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    planType: null,
    targetEvent: '',
    targetDate: format(addWeeks(new Date(), 12), 'yyyy-MM-dd'),
    weeksAvailable: 12,
    weeklyHoursMin: 5,
    weeklyHoursMax: 10,
    periodization: 'LINEAR',
    description: '',
    currentFitness: 50,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    switch (currentStep) {
      case 0: // Plan Type
        if (!formData.planType) {
          newErrors.planType = 'Please select a plan type';
        }
        break;
      case 1: // Event Details
        if (!formData.name.trim()) {
          newErrors.name = 'Plan name is required';
        }
        break;
      case 2: // Schedule
        if (!formData.targetDate) {
          newErrors.targetDate = 'Target date is required';
        }
        if (formData.weeksAvailable < 4) {
          newErrors.weeksAvailable = 'Minimum 4 weeks required';
        }
        if (formData.weeksAvailable > 52) {
          newErrors.weeksAvailable = 'Maximum 52 weeks allowed';
        }
        break;
      case 3: // Training Load
        if (formData.weeklyHoursMin < 1) {
          newErrors.weeklyHoursMin = 'Minimum 1 hour required';
        }
        if (formData.weeklyHoursMax < formData.weeklyHoursMin) {
          newErrors.weeklyHoursMax = 'Max hours must be greater than min';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSelectPlanType = (type: PlanType) => {
    const planInfo = PLAN_TYPES.find((p) => p.value === type);
    updateField('planType', type);
    if (planInfo) {
      updateField('weeksAvailable', planInfo.defaultWeeks);
      updateField(
        'targetDate',
        format(addWeeks(new Date(), planInfo.defaultWeeks), 'yyyy-MM-dd')
      );
    }
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    if (!formData.planType) return;

    try {
      const input: CreatePlanInput = {
        name: formData.name,
        planType: formData.planType,
        targetDate: formData.targetDate,
        weeksAvailable: formData.weeksAvailable,
        weeklyHoursMin: formData.weeklyHoursMin,
        weeklyHoursMax: formData.weeklyHoursMax,
        periodization: formData.periodization,
        description: formData.description || undefined,
        targetEvent: formData.targetEvent || undefined,
        currentFitness: formData.currentFitness,
      };

      const plan = await createPlan.mutateAsync(input);
      navigate(`/plans/${plan.id}`);
    } catch (error) {
      console.error('Failed to create plan:', error);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <StepPlanType formData={formData} onSelect={handleSelectPlanType} />;
      case 1:
        return (
          <StepEventDetails
            formData={formData}
            errors={errors}
            updateField={updateField}
          />
        );
      case 2:
        return (
          <StepSchedule formData={formData} errors={errors} updateField={updateField} />
        );
      case 3:
        return (
          <StepTrainingLoad
            formData={formData}
            errors={errors}
            updateField={updateField}
          />
        );
      case 4:
        return <StepReview formData={formData} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/plans')}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Plans
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Create Training Plan</h1>
        <p className="text-gray-500 mt-1">
          Build a personalized training plan for your next event
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                  index < currentStep
                    ? 'bg-primary-500 text-white'
                    : index === currentStep
                    ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-500'
                    : 'bg-gray-100 text-gray-400'
                )}
              >
                {index < currentStep ? <Check className="w-4 h-4" /> : index + 1}
              </div>
              <span
                className={clsx(
                  'ml-2 text-sm font-medium hidden sm:block',
                  index === currentStep ? 'text-gray-900' : 'text-gray-400'
                )}
              >
                {step.label}
              </span>
              {index < STEPS.length - 1 && (
                <div
                  className={clsx(
                    'w-12 sm:w-24 h-0.5 mx-2 sm:mx-4',
                    index < currentStep ? 'bg-primary-500' : 'bg-gray-200'
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="card mb-6">
        <div className="card-body">{renderStep()}</div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleBack}
          disabled={currentStep === 0}
          className={clsx(
            'px-4 py-2 rounded-lg font-medium flex items-center gap-2',
            currentStep === 0
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-600 hover:bg-gray-100'
          )}
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        {currentStep < STEPS.length - 1 ? (
          <button
            onClick={handleNext}
            className="btn-primary flex items-center gap-2"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={createPlan.isPending}
            className="btn-primary flex items-center gap-2"
          >
            {createPlan.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Create Plan
              </>
            )}
          </button>
        )}
      </div>

      {/* Error Message */}
      {createPlan.isError && (
        <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>Failed to create plan. Please try again.</span>
        </div>
      )}
    </div>
  );
}

// Step 1: Plan Type Selection
function StepPlanType({
  formData,
  onSelect,
}: {
  formData: FormData;
  onSelect: (type: PlanType) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        What type of plan do you want to create?
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PLAN_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => onSelect(type.value)}
            className={clsx(
              'p-4 rounded-lg border-2 text-left transition-all',
              formData.planType === type.value
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            )}
          >
            <div className="font-medium text-gray-900">{type.label}</div>
            <div className="text-sm text-gray-500 mt-1">{type.description}</div>
            <div className="flex items-center gap-2 mt-2">
              {type.sports.map((sport) => (
                <span
                  key={sport}
                  className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded"
                >
                  {sport}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Step 2: Event Details
function StepEventDetails({
  formData,
  errors,
  updateField,
}: {
  formData: FormData;
  errors: Record<string, string>;
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
}) {
  const planInfo = PLAN_TYPES.find((p) => p.value === formData.planType);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">
        Tell us about your {planInfo?.label || 'training'} plan
      </h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Plan Name *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder={`My ${planInfo?.label || 'Training'} Plan`}
          className={clsx(
            'input w-full',
            errors.name && 'border-red-500 focus:ring-red-500'
          )}
        />
        {errors.name && (
          <p className="text-red-500 text-sm mt-1">{errors.name}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Target Event (optional)
        </label>
        <div className="relative">
          <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={formData.targetEvent}
            onChange={(e) => updateField('targetEvent', e.target.value)}
            placeholder="e.g., Ironman Arizona 2025"
            className="input w-full pl-10"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description (optional)
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="Add notes about your goals, focus areas, or anything else..."
          rows={3}
          className="input w-full"
        />
      </div>
    </div>
  );
}

// Step 3: Schedule
function StepSchedule({
  formData,
  errors,
  updateField,
}: {
  formData: FormData;
  errors: Record<string, string>;
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
}) {
  const handleDateChange = (date: string) => {
    updateField('targetDate', date);
    const weeks = differenceInWeeks(new Date(date), new Date());
    if (weeks >= 4 && weeks <= 52) {
      updateField('weeksAvailable', weeks);
    }
  };

  const handleWeeksChange = (weeks: number) => {
    updateField('weeksAvailable', weeks);
    updateField('targetDate', format(addWeeks(new Date(), weeks), 'yyyy-MM-dd'));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">
        When is your target event?
      </h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Target Date *
        </label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="date"
            value={formData.targetDate}
            onChange={(e) => handleDateChange(e.target.value)}
            min={format(addWeeks(new Date(), 4), 'yyyy-MM-dd')}
            className={clsx(
              'input w-full pl-10',
              errors.targetDate && 'border-red-500'
            )}
          />
        </div>
        {errors.targetDate && (
          <p className="text-red-500 text-sm mt-1">{errors.targetDate}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Weeks Available: {formData.weeksAvailable}
        </label>
        <input
          type="range"
          value={formData.weeksAvailable}
          onChange={(e) => handleWeeksChange(parseInt(e.target.value))}
          min={4}
          max={52}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>4 weeks</span>
          <span>52 weeks</span>
        </div>
        {errors.weeksAvailable && (
          <p className="text-red-500 text-sm mt-1">{errors.weeksAvailable}</p>
        )}
      </div>

      <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700">
          <p className="font-medium">Plan Duration</p>
          <p className="mt-1">
            Your plan will start today and run for {formData.weeksAvailable} weeks until{' '}
            {format(new Date(formData.targetDate), 'MMMM d, yyyy')}.
          </p>
        </div>
      </div>
    </div>
  );
}

// Step 4: Training Load
function StepTrainingLoad({
  formData,
  errors,
  updateField,
}: {
  formData: FormData;
  errors: Record<string, string>;
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">
        Set your training parameters
      </h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Weekly Training Hours
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Minimum</label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number"
                value={formData.weeklyHoursMin}
                onChange={(e) =>
                  updateField('weeklyHoursMin', parseFloat(e.target.value) || 0)
                }
                min={1}
                max={40}
                step={0.5}
                className={clsx(
                  'input w-full pl-10',
                  errors.weeklyHoursMin && 'border-red-500'
                )}
              />
            </div>
            {errors.weeklyHoursMin && (
              <p className="text-red-500 text-xs mt-1">{errors.weeklyHoursMin}</p>
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Maximum</label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number"
                value={formData.weeklyHoursMax}
                onChange={(e) =>
                  updateField('weeklyHoursMax', parseFloat(e.target.value) || 0)
                }
                min={1}
                max={50}
                step={0.5}
                className={clsx(
                  'input w-full pl-10',
                  errors.weeklyHoursMax && 'border-red-500'
                )}
              />
            </div>
            {errors.weeklyHoursMax && (
              <p className="text-red-500 text-xs mt-1">{errors.weeklyHoursMax}</p>
            )}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Current Fitness Level: {formData.currentFitness}
        </label>
        <input
          type="range"
          value={formData.currentFitness}
          onChange={(e) => updateField('currentFitness', parseInt(e.target.value))}
          min={0}
          max={150}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Beginner (0)</span>
          <span>Intermediate (50)</span>
          <span>Advanced (100+)</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Training Philosophy
        </label>
        <div className="space-y-2">
          {PERIODIZATION_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => updateField('periodization', option.value)}
              className={clsx(
                'w-full p-3 rounded-lg border-2 text-left transition-all',
                formData.periodization === option.value
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <div className="font-medium text-gray-900">{option.label}</div>
              <div className="text-sm text-gray-500">{option.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Step 5: Review
function StepReview({ formData }: { formData: FormData }) {
  const planInfo = PLAN_TYPES.find((p) => p.value === formData.planType);
  const periodInfo = PERIODIZATION_OPTIONS.find(
    (p) => p.value === formData.periodization
  );

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">
        Review your training plan
      </h2>

      <div className="bg-gray-50 rounded-lg divide-y divide-gray-200">
        <ReviewRow label="Plan Name" value={formData.name} />
        <ReviewRow label="Plan Type" value={planInfo?.label || ''} />
        {formData.targetEvent && (
          <ReviewRow label="Target Event" value={formData.targetEvent} />
        )}
        <ReviewRow
          label="Duration"
          value={`${formData.weeksAvailable} weeks`}
        />
        <ReviewRow
          label="Target Date"
          value={format(new Date(formData.targetDate), 'MMMM d, yyyy')}
        />
        <ReviewRow
          label="Weekly Hours"
          value={`${formData.weeklyHoursMin} - ${formData.weeklyHoursMax} hours`}
        />
        <ReviewRow
          label="Training Philosophy"
          value={periodInfo?.label || ''}
        />
        <ReviewRow
          label="Starting Fitness"
          value={`${formData.currentFitness} CTL`}
        />
      </div>

      <div className="bg-emerald-50 p-4 rounded-lg flex items-start gap-3">
        <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-emerald-700">
          <p className="font-medium">Ready to create your plan!</p>
          <p className="mt-1">
            Click "Create Plan" to generate your personalized training schedule with
            phases, weeks, and workouts automatically configured based on your preferences.
          </p>
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-3 px-4">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

export default PlanBuilder;
