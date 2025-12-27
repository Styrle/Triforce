import { prisma } from '../../config/database';
import { ResourceCategory, SportType, Difficulty, ContentType } from '@prisma/client';

interface ResourceFilter {
  category?: ResourceCategory;
  sportType?: SportType;
  difficulty?: Difficulty;
  tags?: string[];
  search?: string;
}

interface CreateResourceInput {
  name: string;
  description?: string;
  category: ResourceCategory;
  sportType?: SportType;
  subcategory?: string;
  tags?: string[];
  contentType: ContentType;
  content?: string;
  videoUrl?: string;
  imageUrl?: string;
  duration?: number;
  instructions?: string;
  cues?: string[];
  equipment?: string[];
  difficulty?: Difficulty;
  targetAreas?: string[];
  createdBy?: string;
}

interface RoutineItemInput {
  resourceId?: string;
  customName?: string;
  customDuration?: number;
  reps?: number;
  sets?: number;
  restBetweenSets?: number;
  customInstructions?: string;
}

interface CreateRoutineInput {
  name: string;
  description?: string;
  category: ResourceCategory;
  sportType?: SportType;
  items: RoutineItemInput[];
}

interface PlayerItem {
  id: string;
  name: string;
  duration: number;
  type: 'work' | 'rest';
  instructions: string | undefined | null;
  cues: string[];
  videoUrl: string | undefined | null;
  reps: number | null;
  sets: number;
  restBetweenSets: number;
  currentSet: number;
}

export class ResourceService {
  /**
   * Get resources with filtering and pagination
   */
  async getResources(filter: ResourceFilter, page = 1, limit = 20) {
    const where: Record<string, unknown> = { isPublic: true };

    if (filter.category) where.category = filter.category;
    if (filter.sportType) where.sportType = filter.sportType;
    if (filter.difficulty) where.difficulty = filter.difficulty;
    if (filter.tags?.length) where.tags = { hasSome: filter.tags };
    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const [resources, total] = await Promise.all([
      prisma.resource.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { usageCount: 'desc' },
      }),
      prisma.resource.count({ where }),
    ]);

    return { resources, total, pages: Math.ceil(total / limit), page };
  }

  /**
   * Get a single resource by ID and increment usage count
   */
  async getResource(id: string) {
    const resource = await prisma.resource.findUnique({ where: { id } });
    if (resource) {
      // Increment usage count in background
      prisma.resource.update({
        where: { id },
        data: { usageCount: { increment: 1 } },
      }).catch(() => {});
    }
    return resource;
  }

  /**
   * Create a new resource
   */
  async createResource(data: CreateResourceInput) {
    const videoEmbedId = data.videoUrl ? this.extractVideoId(data.videoUrl) : null;

    return prisma.resource.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        sportType: data.sportType,
        subcategory: data.subcategory,
        tags: data.tags || [],
        contentType: data.contentType,
        content: data.content,
        videoUrl: data.videoUrl,
        videoEmbedId,
        imageUrl: data.imageUrl,
        duration: data.duration,
        instructions: data.instructions,
        cues: data.cues || [],
        equipment: data.equipment || [],
        difficulty: data.difficulty || 'BEGINNER',
        targetAreas: data.targetAreas || [],
        createdBy: data.createdBy,
      },
    });
  }

  /**
   * Get routines for a user (including public and system routines)
   */
  async getRoutines(userId: string, category?: ResourceCategory) {
    return prisma.routine.findMany({
      where: {
        OR: [{ userId }, { isPublic: true }, { isSystem: true }],
        ...(category && { category }),
      },
      include: {
        items: {
          include: { resource: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Get a single routine by ID
   */
  async getRoutine(id: string) {
    return prisma.routine.findUnique({
      where: { id },
      include: {
        items: {
          include: { resource: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
  }

  /**
   * Create a new routine
   */
  async createRoutine(userId: string, data: CreateRoutineInput) {
    // Calculate estimated duration
    const estimatedDuration = data.items.reduce((total, item) => {
      const duration = item.customDuration || 30;
      const sets = item.sets || 1;
      const rest = item.restBetweenSets || 0;
      return total + (duration * sets) + (rest * (sets - 1));
    }, 0);

    return prisma.routine.create({
      data: {
        userId,
        name: data.name,
        description: data.description,
        category: data.category,
        sportType: data.sportType,
        estimatedDuration,
        items: {
          create: data.items.map((item, index) => ({
            resourceId: item.resourceId,
            orderIndex: index,
            customName: item.customName,
            customDuration: item.customDuration,
            reps: item.reps,
            sets: item.sets,
            restBetweenSets: item.restBetweenSets,
            customInstructions: item.customInstructions,
          })),
        },
      },
      include: {
        items: {
          include: { resource: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
  }

  /**
   * Update a routine
   */
  async updateRoutine(userId: string, routineId: string, data: Partial<CreateRoutineInput>) {
    const routine = await prisma.routine.findFirst({
      where: { id: routineId, userId },
    });
    if (!routine) throw new Error('Routine not found or not owned by user');

    // If items are being updated, delete existing and recreate
    if (data.items) {
      await prisma.routineItem.deleteMany({ where: { routineId } });

      const estimatedDuration = data.items.reduce((total, item) => {
        const duration = item.customDuration || 30;
        const sets = item.sets || 1;
        const rest = item.restBetweenSets || 0;
        return total + (duration * sets) + (rest * (sets - 1));
      }, 0);

      return prisma.routine.update({
        where: { id: routineId },
        data: {
          name: data.name,
          description: data.description,
          category: data.category,
          sportType: data.sportType,
          estimatedDuration,
          items: {
            create: data.items.map((item, index) => ({
              resourceId: item.resourceId,
              orderIndex: index,
              customName: item.customName,
              customDuration: item.customDuration,
              reps: item.reps,
              sets: item.sets,
              restBetweenSets: item.restBetweenSets,
              customInstructions: item.customInstructions,
            })),
          },
        },
        include: {
          items: {
            include: { resource: true },
            orderBy: { orderIndex: 'asc' },
          },
        },
      });
    }

    return prisma.routine.update({
      where: { id: routineId },
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        sportType: data.sportType,
      },
      include: {
        items: {
          include: { resource: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
  }

  /**
   * Delete a routine
   */
  async deleteRoutine(userId: string, routineId: string) {
    const routine = await prisma.routine.findFirst({
      where: { id: routineId, userId },
    });
    if (!routine) throw new Error('Routine not found or not owned by user');

    await prisma.routine.delete({ where: { id: routineId } });
  }

  /**
   * Get routine data formatted for workout player
   */
  async getRoutineForPlayer(id: string) {
    const routine = await this.getRoutine(id);
    if (!routine) return null;

    const items: PlayerItem[] = routine.items.map((item) => ({
      id: item.id,
      name: item.customName || item.resource?.name || 'Exercise',
      duration: item.customDuration || item.resource?.duration || 30,
      type: 'work' as const,
      instructions: item.customInstructions || item.resource?.instructions,
      cues: item.resource?.cues || [],
      videoUrl: item.resource?.videoUrl,
      reps: item.reps,
      sets: item.sets || 1,
      restBetweenSets: item.restBetweenSets || 0,
      currentSet: 1,
    }));

    // Expand sets into individual items with rest periods
    const expandedItems: PlayerItem[] = [];
    for (const item of items) {
      for (let set = 1; set <= item.sets; set++) {
        expandedItems.push({
          ...item,
          currentSet: set,
          name: item.sets > 1 ? `${item.name} (Set ${set}/${item.sets})` : item.name,
        });
        if (set < item.sets && item.restBetweenSets > 0) {
          expandedItems.push({
            id: `${item.id}-rest-${set}`,
            name: 'Rest',
            duration: item.restBetweenSets,
            type: 'rest',
            instructions: 'Take a short rest before the next set',
            cues: [],
            videoUrl: null,
            reps: null,
            sets: 1,
            restBetweenSets: 0,
            currentSet: 1,
          });
        }
      }
    }

    return {
      routine: {
        id: routine.id,
        name: routine.name,
        description: routine.description,
        category: routine.category,
        estimatedDuration: routine.estimatedDuration,
      },
      items: expandedItems,
      totalDuration: expandedItems.reduce((sum, item) => sum + item.duration, 0),
    };
  }

  /**
   * Extract video embed ID from URL
   */
  extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /vimeo\.com\/(\d+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  /**
   * Get categories with resource counts
   */
  async getCategoryCounts() {
    const counts = await prisma.resource.groupBy({
      by: ['category'],
      _count: { id: true },
      where: { isPublic: true },
    });

    return counts.map((c) => ({
      category: c.category,
      count: c._count.id,
    }));
  }
}

export const resourceService = new ResourceService();
export default resourceService;
