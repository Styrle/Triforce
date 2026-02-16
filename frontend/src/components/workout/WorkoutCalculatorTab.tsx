import { useState } from 'react';
import { Loader2, Calculator } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useCalculatePercentage,
  useCalculateRPE,
  useRepRangeChart,
} from '../../hooks/useWorkouts';
import type { PercentageTraining, RPEPrescription } from '../../types/workout';

export function WorkoutCalculatorTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PercentageCalculator />
        <RPECalculator />
      </div>
      <RepRangeChartSection />
    </div>
  );
}

function PercentageCalculator() {
  const [inputMax, setInputMax] = useState('');
  const [percentage, setPercentage] = useState('');
  const [result, setResult] = useState<PercentageTraining | null>(null);
  const mutation = useCalculatePercentage();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const max = parseFloat(inputMax);
    const pct = parseFloat(percentage);
    if (!max || !pct) return;
    mutation.mutate(
      { inputMax: max, percentage: pct },
      {
        onSuccess: (data) => setResult(data),
        onError: () => toast.error('Calculation failed'),
      }
    );
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="font-semibold">Percentage Calculator</h2>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">1RM (kg)</label>
              <input
                type="number"
                step="0.5"
                min="1"
                value={inputMax}
                onChange={(e) => setInputMax(e.target.value)}
                placeholder="100"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Percentage</label>
              <input
                type="number"
                min="1"
                max="100"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                placeholder="80"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full btn btn-primary flex items-center justify-center gap-2"
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
            Calculate
          </button>
        </form>

        {result && (
          <div className="mt-4 p-4 bg-primary-50 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Target Weight</span>
              <span className="font-bold text-gray-900">{Math.round(result.targetWeight * 10) / 10}kg</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Estimated Reps</span>
              <span className="font-medium">{result.estimatedReps}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Estimated RPE</span>
              <span className="font-medium">{result.estimatedRPE}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RPECalculator() {
  const [known1RM, setKnown1RM] = useState('');
  const [targetRPE, setTargetRPE] = useState('');
  const [targetReps, setTargetReps] = useState('');
  const [result, setResult] = useState<RPEPrescription | null>(null);
  const mutation = useCalculateRPE();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rm = parseFloat(known1RM);
    const rpe = parseFloat(targetRPE);
    const reps = parseInt(targetReps);
    if (!rm || !rpe || !reps) return;
    mutation.mutate(
      { known1RM: rm, targetRPE: rpe, targetReps: reps },
      {
        onSuccess: (data) => setResult(data),
        onError: () => toast.error('Calculation failed'),
      }
    );
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="font-semibold">RPE Calculator</h2>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Known 1RM (kg)</label>
            <input
              type="number"
              step="0.5"
              min="1"
              value={known1RM}
              onChange={(e) => setKnown1RM(e.target.value)}
              placeholder="100"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target RPE</label>
              <input
                type="number"
                min="1"
                max="10"
                step="0.5"
                value={targetRPE}
                onChange={(e) => setTargetRPE(e.target.value)}
                placeholder="8"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Reps</label>
              <input
                type="number"
                min="1"
                max="20"
                value={targetReps}
                onChange={(e) => setTargetReps(e.target.value)}
                placeholder="5"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full btn btn-primary flex items-center justify-center gap-2"
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
            Calculate
          </button>
        </form>

        {result && (
          <div className="mt-4 p-4 bg-primary-50 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Estimated Weight</span>
              <span className="font-bold text-gray-900">{Math.round(result.estimatedWeight * 10) / 10}kg</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Rep Range</span>
              <span className="font-medium">{result.repRange.min}-{result.repRange.max}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">% of 1RM</span>
              <span className="font-medium">{Math.round(result.percentageOf1RM)}%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RepRangeChartSection() {
  const [oneRM, setOneRM] = useState('');
  const parsedRM = parseFloat(oneRM) || undefined;
  const { data: chart = [], isLoading } = useRepRangeChart(parsedRM);

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <h2 className="font-semibold">Rep Range Chart</h2>
        <div className="relative w-40">
          <input
            type="number"
            step="0.5"
            min="1"
            value={oneRM}
            onChange={(e) => setOneRM(e.target.value)}
            placeholder="Enter 1RM (kg)"
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>
      <div className="card-body">
        {!parsedRM ? (
          <p className="text-center text-gray-400 py-6 text-sm">Enter your 1RM to see the rep range chart</p>
        ) : isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
          </div>
        ) : chart.length === 0 ? (
          <p className="text-center text-gray-400 py-6 text-sm">No data</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left px-3 py-2 font-medium text-gray-500">%</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-500">Weight (kg)</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-500">Reps</th>
                </tr>
              </thead>
              <tbody>
                {chart.map((entry) => (
                  <tr key={entry.percentage} className="border-b border-gray-50">
                    <td className="px-3 py-2 text-gray-700 font-medium">{entry.percentage}%</td>
                    <td className="text-right px-3 py-2 font-bold text-gray-900">
                      {Math.round(entry.weight * 10) / 10}
                    </td>
                    <td className="text-right px-3 py-2 text-gray-600">{entry.reps}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
