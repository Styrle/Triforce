import { prisma } from '../../config/database';
import { parse } from 'csv-parse/sync';
import { MealType } from '@prisma/client';

interface NutritionEntry {
  date: Date;
  meal: MealType;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

interface DailySummary {
  date: Date;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
  entries: NutritionEntry[];
}

interface LogEntryInput {
  date?: Date;
  meal: MealType;
  name: string;
  servings?: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  notes?: string;
}

export class NutritionService {
  /**
   * Import nutrition data from MyFitnessPal CSV export
   */
  async importMFPCSV(
    userId: string,
    csvContent: string
  ): Promise<{ imported: number; skipped: number; daysProcessed: number }> {
    let records: Record<string, string>[];
    try {
      records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relaxColumnCount: true,
      });
    } catch (error) {
      throw new Error('Invalid CSV format');
    }

    let imported = 0;
    let skipped = 0;

    // Group by date
    const byDate = new Map<string, NutritionEntry[]>();

    for (const record of records) {
      try {
        const date = this.parseDate(record.Date || record.date);
        if (!date) {
          skipped++;
          continue;
        }

        const dateKey = date.toISOString().split('T')[0];
        const mealStr = (record.Meal || record.meal || 'SNACK').toUpperCase();
        const meal = this.parseMealType(mealStr);

        const entry: NutritionEntry = {
          date,
          meal,
          name: record.Food || record['Food Name'] || record.food || record.name || 'Unknown',
          calories: this.parseNumber(record.Calories || record.calories),
          protein: this.parseNumber(record.Protein || record.protein),
          carbs: this.parseNumber(record.Carbohydrates || record.Carbs || record.carbs),
          fat: this.parseNumber(record.Fat || record.fat),
          fiber: this.parseNumber(record.Fiber || record.fiber),
          sugar: this.parseNumber(record.Sugar || record.sugar),
          sodium: this.parseNumber(record.Sodium || record.sodium),
        };

        if (!byDate.has(dateKey)) byDate.set(dateKey, []);
        byDate.get(dateKey)!.push(entry);
        imported++;
      } catch (e) {
        skipped++;
      }
    }

    // Save daily summaries
    for (const [dateKey, entries] of byDate) {
      const date = new Date(dateKey);

      const totals = {
        calories: entries.reduce((sum, e) => sum + e.calories, 0),
        protein: entries.reduce((sum, e) => sum + e.protein, 0),
        carbs: entries.reduce((sum, e) => sum + e.carbs, 0),
        fat: entries.reduce((sum, e) => sum + e.fat, 0),
        fiber: entries.reduce((sum, e) => sum + (e.fiber || 0), 0),
        sugar: entries.reduce((sum, e) => sum + (e.sugar || 0), 0),
        sodium: entries.reduce((sum, e) => sum + (e.sodium || 0), 0),
      };

      // Upsert daily nutrition
      const daily = await prisma.dailyNutrition.upsert({
        where: { userId_date: { userId, date } },
        update: {
          ...totals,
          source: 'mfp_import',
        },
        create: {
          userId,
          date,
          ...totals,
          source: 'mfp_import',
        },
      });

      // Delete existing entries for this day (to avoid duplicates on re-import)
      await prisma.nutritionEntry.deleteMany({
        where: { dailyId: daily.id },
      });

      // Create new entries
      await prisma.nutritionEntry.createMany({
        data: entries.map((e) => ({
          dailyId: daily.id,
          meal: e.meal,
          name: e.name,
          servings: 1,
          calories: e.calories,
          protein: e.protein,
          carbs: e.carbs,
          fat: e.fat,
        })),
      });
    }

    return { imported, skipped, daysProcessed: byDate.size };
  }

  /**
   * Get daily nutrition with entries
   */
  async getDailyNutrition(userId: string, date: Date): Promise<DailySummary | null> {
    const nutrition = await prisma.dailyNutrition.findUnique({
      where: { userId_date: { userId, date } },
      include: { entries: true },
    });

    if (!nutrition) return null;

    return {
      date: nutrition.date,
      totalCalories: nutrition.calories || 0,
      totalProtein: nutrition.protein || 0,
      totalCarbs: nutrition.carbs || 0,
      totalFat: nutrition.fat || 0,
      totalFiber: nutrition.fiber || 0,
      entries: nutrition.entries.map((e) => ({
        date: nutrition.date,
        meal: e.meal,
        name: e.name,
        calories: e.calories || 0,
        protein: e.protein || 0,
        carbs: e.carbs || 0,
        fat: e.fat || 0,
      })),
    };
  }

  /**
   * Get nutrition for a date range
   */
  async getNutritionRange(userId: string, startDate: Date, endDate: Date) {
    return prisma.dailyNutrition.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
      include: { entries: true },
      orderBy: { date: 'asc' },
    });
  }

  /**
   * Log a single nutrition entry
   */
  async logEntry(userId: string, entry: LogEntryInput) {
    const date = entry.date || new Date();
    // Normalize to date only (no time)
    const dateOnly = new Date(date.toISOString().split('T')[0]);

    // Get or create daily nutrition
    let daily = await prisma.dailyNutrition.findUnique({
      where: { userId_date: { userId, date: dateOnly } },
    });

    if (!daily) {
      daily = await prisma.dailyNutrition.create({
        data: {
          userId,
          date: dateOnly,
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          source: 'manual',
        },
      });
    }

    // Add entry
    await prisma.nutritionEntry.create({
      data: {
        dailyId: daily.id,
        meal: entry.meal,
        name: entry.name,
        servings: entry.servings || 1,
        calories: entry.calories,
        protein: entry.protein,
        carbs: entry.carbs,
        fat: entry.fat,
        notes: entry.notes,
      },
    });

    // Update totals
    await prisma.dailyNutrition.update({
      where: { id: daily.id },
      data: {
        calories: { increment: entry.calories },
        protein: { increment: entry.protein },
        carbs: { increment: entry.carbs },
        fat: { increment: entry.fat },
        fiber: { increment: entry.fiber || 0 },
        sugar: { increment: entry.sugar || 0 },
        sodium: { increment: entry.sodium || 0 },
      },
    });

    return this.getDailyNutrition(userId, dateOnly);
  }

  /**
   * Delete a nutrition entry
   */
  async deleteEntry(userId: string, entryId: string) {
    const entry = await prisma.nutritionEntry.findUnique({
      where: { id: entryId },
      include: { daily: true },
    });

    if (!entry || entry.daily.userId !== userId) {
      throw new Error('Entry not found');
    }

    // Subtract from daily totals
    await prisma.dailyNutrition.update({
      where: { id: entry.dailyId },
      data: {
        calories: { decrement: entry.calories || 0 },
        protein: { decrement: entry.protein || 0 },
        carbs: { decrement: entry.carbs || 0 },
        fat: { decrement: entry.fat || 0 },
      },
    });

    await prisma.nutritionEntry.delete({
      where: { id: entryId },
    });
  }

  /**
   * Set nutrition targets
   */
  async setTargets(
    userId: string,
    date: Date,
    targets: {
      calorieTarget?: number;
      proteinTarget?: number;
      carbTarget?: number;
      fatTarget?: number;
    }
  ) {
    const dateOnly = new Date(date.toISOString().split('T')[0]);

    return prisma.dailyNutrition.upsert({
      where: { userId_date: { userId, date: dateOnly } },
      update: targets,
      create: {
        userId,
        date: dateOnly,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        ...targets,
      },
    });
  }

  /**
   * Get weekly summary
   */
  async getWeeklySummary(userId: string, weekStart: Date) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const dailyData = await this.getNutritionRange(userId, weekStart, weekEnd);

    const totals = dailyData.reduce(
      (acc, day) => ({
        calories: acc.calories + (day.calories || 0),
        protein: acc.protein + (day.protein || 0),
        carbs: acc.carbs + (day.carbs || 0),
        fat: acc.fat + (day.fat || 0),
        daysLogged: acc.daysLogged + 1,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, daysLogged: 0 }
    );

    return {
      weekStart,
      weekEnd,
      totals,
      averages: {
        calories: totals.daysLogged ? Math.round(totals.calories / totals.daysLogged) : 0,
        protein: totals.daysLogged ? Math.round(totals.protein / totals.daysLogged) : 0,
        carbs: totals.daysLogged ? Math.round(totals.carbs / totals.daysLogged) : 0,
        fat: totals.daysLogged ? Math.round(totals.fat / totals.daysLogged) : 0,
      },
      dailyData,
    };
  }

  private parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;

    // Try various date formats
    const formats = [
      /^(\d{4})-(\d{2})-(\d{2})$/,              // 2024-01-15
      /^(\d{2})\/(\d{2})\/(\d{4})$/,             // 01/15/2024
      /^(\d{2})-(\d{2})-(\d{4})$/,               // 15-01-2024
    ];

    for (const format of formats) {
      if (format.test(dateStr)) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) return date;
      }
    }

    // Try native Date parsing as fallback
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) return date;

    return null;
  }

  private parseMealType(meal: string): MealType {
    const normalized = meal.toUpperCase().trim();
    if (normalized.includes('BREAKFAST')) return 'BREAKFAST';
    if (normalized.includes('LUNCH')) return 'LUNCH';
    if (normalized.includes('DINNER') || normalized.includes('SUPPER')) return 'DINNER';
    return 'SNACK';
  }

  private parseNumber(value: string | undefined): number {
    if (!value) return 0;
    const num = parseFloat(value.replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? 0 : num;
  }
}

export const nutritionService = new NutritionService();
export default nutritionService;
