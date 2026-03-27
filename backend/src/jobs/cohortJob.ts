import { Job } from 'bullmq';
import { cohortService } from '../services/CohortService';
import { createLogger } from '../lib/logger';
import { CohortJobData } from '../queues/cohortQueue';

const logger = createLogger('cohort-job');

export async function processCohortJob(job: Job<CohortJobData>): Promise<object> {
  const { organizationId, triggeredBy = 'manual' } = job.data;

  logger.info('Starting cohort computation job', {
    jobId: job.id,
    organizationId,
    triggeredBy,
  });

  // Invalidate stale cache before recomputing
  cohortService.invalidateCache(organizationId);

  const result = await cohortService.computeCohorts(organizationId);

  const summary = {
    jobId: job.id,
    triggeredBy,
    organizationId: organizationId ?? 'global',
    totalUsers: result.totalUsers,
    segments: result.segments.map((s) => ({
      cohort: s.cohort,
      count: s.count,
    })),
    computedAt: result.computedAt.toISOString(),
  };

  logger.info('Cohort computation job complete', summary);
  return summary;
}
