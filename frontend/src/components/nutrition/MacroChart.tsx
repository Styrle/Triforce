interface MacroChartProps {
  protein: number;
  carbs: number;
  fat: number;
}

export function MacroChart({ protein, carbs, fat }: MacroChartProps) {
  // Calculate calories from macros
  const proteinCals = protein * 4;
  const carbsCals = carbs * 4;
  const fatCals = fat * 9;
  const totalCals = proteinCals + carbsCals + fatCals;

  if (totalCals === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400">
        No data
      </div>
    );
  }

  const proteinPct = Math.round((proteinCals / totalCals) * 100);
  const carbsPct = Math.round((carbsCals / totalCals) * 100);
  const fatPct = 100 - proteinPct - carbsPct; // Ensure it adds up to 100

  // Create conic gradient for pie chart
  const gradient = `conic-gradient(
    #ef4444 0% ${proteinPct}%,
    #f59e0b ${proteinPct}% ${proteinPct + carbsPct}%,
    #22c55e ${proteinPct + carbsPct}% 100%
  )`;

  return (
    <div className="flex flex-col items-center">
      {/* Pie Chart */}
      <div
        className="w-32 h-32 rounded-full mb-4 relative"
        style={{ background: gradient }}
      >
        <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
          <span className="text-sm font-medium text-gray-600">
            {Math.round(totalCals)} kcal
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2 w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-sm text-gray-600">Protein</span>
          </div>
          <div className="text-sm">
            <span className="font-medium">{Math.round(protein)}g</span>
            <span className="text-gray-400 ml-1">({proteinPct}%)</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-sm text-gray-600">Carbs</span>
          </div>
          <div className="text-sm">
            <span className="font-medium">{Math.round(carbs)}g</span>
            <span className="text-gray-400 ml-1">({carbsPct}%)</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm text-gray-600">Fat</span>
          </div>
          <div className="text-sm">
            <span className="font-medium">{Math.round(fat)}g</span>
            <span className="text-gray-400 ml-1">({fatPct}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MacroChart;
