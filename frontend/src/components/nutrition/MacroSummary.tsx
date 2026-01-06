import { Flame, Beef, Wheat, Droplets } from 'lucide-react';

interface MacroSummaryProps {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  calorieTarget?: number | null;
  proteinTarget?: number | null;
  carbTarget?: number | null;
  fatTarget?: number | null;
}

interface MacroCardProps {
  label: string;
  value: number;
  target: number;
  unit: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
}

function MacroCard({ label, value, target, unit, color, bgColor, icon }: MacroCardProps) {
  const percentage = target > 0 ? Math.min((value / target) * 100, 100) : 0;
  const isOver = value > target && target > 0;

  return (
    <div className="card">
      <div className="card-body p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500">{label}</span>
          <div className={`w-8 h-8 rounded-lg ${bgColor} flex items-center justify-center`}>
            {icon}
          </div>
        </div>
        <div className="text-2xl font-bold">
          {Math.round(value)}
          <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>
        </div>
        {target > 0 && (
          <>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${isOver ? 'bg-red-500' : color}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{Math.round(value)} / {target} {unit}</span>
              <span className={isOver ? 'text-red-500 font-medium' : ''}>
                {Math.round(percentage)}%
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function MacroSummary({
  calories,
  protein,
  carbs,
  fat,
  calorieTarget = 2000,
  proteinTarget = 150,
  carbTarget = 250,
  fatTarget = 65,
}: MacroSummaryProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <MacroCard
        label="Calories"
        value={calories}
        target={calorieTarget || 2000}
        unit="kcal"
        color="bg-blue-500"
        bgColor="bg-blue-100"
        icon={<Flame className="w-4 h-4 text-blue-600" />}
      />
      <MacroCard
        label="Protein"
        value={protein}
        target={proteinTarget || 150}
        unit="g"
        color="bg-red-500"
        bgColor="bg-red-100"
        icon={<Beef className="w-4 h-4 text-red-600" />}
      />
      <MacroCard
        label="Carbs"
        value={carbs}
        target={carbTarget || 250}
        unit="g"
        color="bg-amber-500"
        bgColor="bg-amber-100"
        icon={<Wheat className="w-4 h-4 text-amber-600" />}
      />
      <MacroCard
        label="Fat"
        value={fat}
        target={fatTarget || 65}
        unit="g"
        color="bg-green-500"
        bgColor="bg-green-100"
        icon={<Droplets className="w-4 h-4 text-green-600" />}
      />
    </div>
  );
}

export default MacroSummary;
