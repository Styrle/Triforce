import Bull, { Queue, Job } from 'bull';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { activitySyncService } from '../activities/syncService';
import { pmcService } from '../metrics/pmcService';

// Job types
interface SyncActivitiesJob {
  type: 'SYNC_ACTIVITIES';
  userId: string;
  fullSync?: boolean;
  afterDate?: string;
}

interface ProcessActivityJob {
  type: 'PROCESS_ACTIVITY';
  activityId: string;
  userId: string;
}

interface FetchStreamsJob {
  type: 'FETCH_STREAMS';
  activityId: string;
  userId: string;
  stravaActivityId: number;
}

interface RecalculatePMCJob {
  type: 'RECALCULATE_PMC';
  userId: string;
  fromDate?: string;
}

interface WebhookEventJob {
  type: 'WEBHOOK_EVENT';
  objectType: string;
  objectId: number;
  aspectType: string;
  ownerId: number;
  eventTime: number;
}

type JobData =
  | SyncActivitiesJob
  | ProcessActivityJob
  | FetchStreamsJob
  | RecalculatePMCJob
  | WebhookEventJob;

class JobQueueService {
  private queue: Queue<JobData>;
  private isProcessing: boolean = false;

  constructor() {
    this.queue = new Bull<JobData>('triforce-jobs', config.redisUrl, {
      defaultJobOptions: {
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50, // Keep last 50 failed jobs
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    this.setupEventHandlers();
  }

  /**
   * Setup queue event handlers
   */
  private setupEventHandlers(): void {
    this.queue.on('error', (error) => {
      logger.error('Job queue error:', error);
    });

    this.queue.on('failed', (job, error) => {
      logger.error(`Job ${job.id} failed:`, {
        type: job.data.type,
        error: error.message,
        attempts: job.attemptsMade,
      });
    });

    this.queue.on('completed', (job) => {
      logger.debug(`Job ${job.id} completed:`, { type: job.data.type });
    });

    this.queue.on('stalled', (job) => {
      logger.warn(`Job ${job.id} stalled:`, { type: job.data.type });
    });
  }

  /**
   * Start processing jobs
   */
  async startProcessing(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;
    logger.info('Starting job queue processor');

    // Process jobs with concurrency of 3
    this.queue.process(3, async (job: Job<JobData>) => {
      return this.processJob(job);
    });
  }

  /**
   * Process a single job
   */
  private async processJob(job: Job<JobData>): Promise<void> {
    const { data } = job;
    logger.info(`Processing job ${job.id}:`, { type: data.type });

    switch (data.type) {
      case 'SYNC_ACTIVITIES':
        await this.handleSyncActivities(data);
        break;

      case 'PROCESS_ACTIVITY':
        await this.handleProcessActivity(data);
        break;

      case 'FETCH_STREAMS':
        await this.handleFetchStreams(data);
        break;

      case 'RECALCULATE_PMC':
        await this.handleRecalculatePMC(data);
        break;

      case 'WEBHOOK_EVENT':
        await this.handleWebhookEvent(data);
        break;

      default:
        logger.warn(`Unknown job type: ${(data as any).type}`);
    }
  }

  /**
   * Handle sync activities job
   */
  private async handleSyncActivities(data: SyncActivitiesJob): Promise<void> {
    await activitySyncService.syncAllActivities(data.userId, {
      fullSync: data.fullSync,
      afterDate: data.afterDate ? new Date(data.afterDate) : undefined,
    });
  }

  /**
   * Handle process activity job
   */
  private async handleProcessActivity(data: ProcessActivityJob): Promise<void> {
    await activitySyncService.processActivity(data.activityId, data.userId);
  }

  /**
   * Handle fetch streams job
   */
  private async handleFetchStreams(data: FetchStreamsJob): Promise<void> {
    await activitySyncService.fetchActivityStreams(
      data.activityId,
      data.userId,
      data.stravaActivityId
    );
  }

  /**
   * Handle recalculate PMC job
   */
  private async handleRecalculatePMC(data: RecalculatePMCJob): Promise<void> {
    if (data.fromDate) {
      await pmcService.propagatePMC(data.userId, new Date(data.fromDate));
    } else {
      await pmcService.initializePMC(data.userId);
    }
  }

  /**
   * Handle Strava webhook event job
   */
  private async handleWebhookEvent(data: WebhookEventJob): Promise<void> {
    const { objectType, objectId, aspectType, ownerId } = data;

    // Find user by Strava athlete ID
    const { prisma } = await import('../../config/database');
    const connection = await prisma.stravaConnection.findFirst({
      where: { stravaAthleteId: String(ownerId) },
      select: { userId: true },
    });

    if (!connection) {
      logger.warn(`No user found for Strava athlete ${ownerId}`);
      return;
    }

    const userId = connection.userId;

    if (objectType === 'activity') {
      if (aspectType === 'create' || aspectType === 'update') {
        // Sync the activity
        await activitySyncService.syncActivityById(userId, objectId);
      } else if (aspectType === 'delete') {
        // Delete the activity
        await activitySyncService.deleteActivityByStravaId(String(objectId));
      }
    }
  }

  /**
   * Add a job to the queue
   */
  async addJob(
    data: JobData,
    options?: { delay?: number; priority?: number }
  ): Promise<Job<JobData>> {
    return this.queue.add(data, {
      delay: options?.delay,
      priority: options?.priority,
    });
  }

  /**
   * Queue activity sync
   */
  async queueActivitySync(
    userId: string,
    options?: { fullSync?: boolean; afterDate?: Date; delay?: number }
  ): Promise<Job<JobData>> {
    return this.addJob(
      {
        type: 'SYNC_ACTIVITIES',
        userId,
        fullSync: options?.fullSync,
        afterDate: options?.afterDate?.toISOString(),
      },
      { delay: options?.delay }
    );
  }

  /**
   * Queue activity processing
   */
  async queueActivityProcessing(
    activityId: string,
    userId: string
  ): Promise<Job<JobData>> {
    return this.addJob({
      type: 'PROCESS_ACTIVITY',
      activityId,
      userId,
    });
  }

  /**
   * Queue stream fetching
   */
  async queueStreamFetch(
    activityId: string,
    userId: string,
    stravaActivityId: number
  ): Promise<Job<JobData>> {
    return this.addJob({
      type: 'FETCH_STREAMS',
      activityId,
      userId,
      stravaActivityId,
    });
  }

  /**
   * Queue PMC recalculation
   */
  async queuePMCRecalculation(
    userId: string,
    fromDate?: Date
  ): Promise<Job<JobData>> {
    return this.addJob({
      type: 'RECALCULATE_PMC',
      userId,
      fromDate: fromDate?.toISOString(),
    });
  }

  /**
   * Queue webhook event processing
   */
  async queueWebhookEvent(event: {
    objectType: string;
    objectId: number;
    aspectType: string;
    ownerId: number;
    eventTime: number;
  }): Promise<Job<JobData>> {
    return this.addJob({
      type: 'WEBHOOK_EVENT',
      ...event,
    });
  }

  /**
   * Get queue stats
   */
  async getStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down job queue...');
    await this.queue.close();
  }
}

// Export singleton instance
export const jobQueueService = new JobQueueService();
export default jobQueueService;
