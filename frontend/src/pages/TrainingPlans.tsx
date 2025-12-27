import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, differenceInWeeks, isPast, isFuture } from 'date-fns';
import {
  Plus,
  Calendar,
  Target,
  ChevronRight,
  MoreVertical,
  Play,
  Pause,
  Trash2,
  Edit,
  CheckCircle2,
  Loader2,
  ClipboardList,
} from 'lucide-react';
import { clsx } from 'clsx';
import { usePlans, useUpdatePlan, useDeletePlan } from '../hooks/usePlans';
import type { TrainingPlan, PlanStatus, PlanType } from '../types';

const PLAN_TYPE_LABELS: Record<PlanType, string> = {
  SPRINT_TRI: 'Sprint Triathlon',
  OLYMPIC_TRI: 'Olympic Triathlon',
  HALF_IRONMAN: 'Half Ironman',
  IRONMAN: 'Ironman',
  MARATHON: 'Marathon',
  HALF_MARATHON: 'Half Marathon',
  CENTURY: 'Century Ride',
  GENERAL_FITNESS: 'General Fitness',
  CUSTOM: 'Custom Plan',
};

const STATUS_COLORS: Record<PlanStatus, { bg: string; text: string; dot: string }> = {
  DRAFT: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' },
  ACTIVE: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  PAUSED: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  COMPLETED: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  CANCELLED: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
};

export function TrainingPlans() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<PlanStatus | 'ALL'>('ALL');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const { data: plans, isLoading, error } = usePlans(
    statusFilter === 'ALL' ? undefined : statusFilter
  );
  const updatePlan = useUpdatePlan();
  const deletePlan = useDeletePlan();

  const handleStatusChange = async (planId: string, newStatus: PlanStatus) => {
    await updatePlan.mutateAsync({ planId, updates: { status: newStatus } });
    setMenuOpen(null);
  };

  const handleDelete = async (planId: string) => {
    if (window.confirm('Are you sure you want to delete this plan? This action cannot be undone.')) {
      await deletePlan.mutateAsync(planId);
    }
    setMenuOpen(null);
  };

  const getProgressPercentage = (plan: TrainingPlan): number => {
    const start = new Date(plan.startDate);
    const end = new Date(plan.endDate);
    const now = new Date();

    if (isPast(end)) return 100;
    if (isFuture(start)) return 0;

    const totalWeeks = differenceInWeeks(end, start) || 1;
    const elapsedWeeks = differenceInWeeks(now, start);
    return Math.min(100, Math.max(0, (elapsedWeeks / totalWeeks) * 100));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Training Plans</h1>
          <p className="text-gray-500 mt-1">Create and manage your training plans</p>
        </div>
        <button
          onClick={() => navigate('/plans/new')}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Plan
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {(['ALL', 'ACTIVE', 'DRAFT', 'PAUSED', 'COMPLETED'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              statusFilter === status
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {status === 'ALL' ? 'All Plans' : status.charAt(0) + status.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          Failed to load training plans. Please try again.
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && plans?.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No training plans yet</h3>
          <p className="text-gray-500 mb-6">
            Create your first training plan to start your journey
          </p>
          <button
            onClick={() => navigate('/plans/new')}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Your First Plan
          </button>
        </div>
      )}

      {/* Plans Grid */}
      {!isLoading && !error && plans && plans.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              progress={getProgressPercentage(plan)}
              menuOpen={menuOpen === plan.id}
              onMenuToggle={() => setMenuOpen(menuOpen === plan.id ? null : plan.id)}
              onView={() => navigate(`/plans/${plan.id}`)}
              onEdit={() => navigate(`/plans/${plan.id}/edit`)}
              onStatusChange={(status) => handleStatusChange(plan.id, status)}
              onDelete={() => handleDelete(plan.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface PlanCardProps {
  plan: TrainingPlan;
  progress: number;
  menuOpen: boolean;
  onMenuToggle: () => void;
  onView: () => void;
  onEdit: () => void;
  onStatusChange: (status: PlanStatus) => void;
  onDelete: () => void;
}

function PlanCard({
  plan,
  progress,
  menuOpen,
  onMenuToggle,
  onView,
  onEdit,
  onStatusChange,
  onDelete,
}: PlanCardProps) {
  const statusColor = STATUS_COLORS[plan.status];
  const weeksRemaining = Math.max(
    0,
    differenceInWeeks(new Date(plan.endDate), new Date())
  );

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="card-body">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{plan.name}</h3>
            <p className="text-sm text-gray-500">{PLAN_TYPE_LABELS[plan.planType]}</p>
          </div>

          {/* Status Badge & Menu */}
          <div className="flex items-center gap-2">
            <span
              className={clsx(
                'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
                statusColor.bg,
                statusColor.text
              )}
            >
              <span className={clsx('w-1.5 h-1.5 rounded-full', statusColor.dot)} />
              {plan.status.charAt(0) + plan.status.slice(1).toLowerCase()}
            </span>

            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMenuToggle();
                }}
                className="p-1 rounded hover:bg-gray-100"
              >
                <MoreVertical className="w-4 h-4 text-gray-500" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                  <button
                    onClick={onEdit}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit Plan
                  </button>

                  {plan.status === 'DRAFT' && (
                    <button
                      onClick={() => onStatusChange('ACTIVE')}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Start Plan
                    </button>
                  )}

                  {plan.status === 'ACTIVE' && (
                    <button
                      onClick={() => onStatusChange('PAUSED')}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Pause className="w-4 h-4" />
                      Pause Plan
                    </button>
                  )}

                  {plan.status === 'PAUSED' && (
                    <button
                      onClick={() => onStatusChange('ACTIVE')}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Resume Plan
                    </button>
                  )}

                  {(plan.status === 'ACTIVE' || plan.status === 'PAUSED') && (
                    <button
                      onClick={() => onStatusChange('COMPLETED')}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Mark Completed
                    </button>
                  )}

                  <hr className="my-1" />

                  <button
                    onClick={onDelete}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Plan
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Target Event */}
        {plan.targetEvent && (
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
            <Target className="w-4 h-4 text-primary-500" />
            <span className="truncate">{plan.targetEvent}</span>
          </div>
        )}

        {/* Dates */}
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            <span>
              {format(new Date(plan.startDate), 'MMM d')} -{' '}
              {format(new Date(plan.endDate), 'MMM d, yyyy')}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="text-lg font-semibold text-gray-900">{plan.weeksTotal}</div>
            <div className="text-xs text-gray-500">Weeks</div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="text-lg font-semibold text-gray-900">
              {plan.weeklyHoursMin}-{plan.weeklyHoursMax}
            </div>
            <div className="text-xs text-gray-500">Hrs/Week</div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="text-lg font-semibold text-gray-900">{weeksRemaining}</div>
            <div className="text-xs text-gray-500">Remaining</div>
          </div>
        </div>

        {/* Progress Bar */}
        {plan.status === 'ACTIVE' && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* View Button */}
        <button
          onClick={onView}
          className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors flex items-center justify-center gap-2"
        >
          View Plan
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default TrainingPlans;
