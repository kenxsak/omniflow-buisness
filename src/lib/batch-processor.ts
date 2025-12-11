/**
 * Batch Processing Utility for large-scale campaigns
 * Handles splitting large recipient lists into manageable chunks
 * and processing them sequentially with delays
 */

export interface BatchProcessingConfig {
  batchSize?: number; // Default 1000
  delayBetweenBatches?: number; // milliseconds, default 500
  logProgress?: boolean;
  abortSignal?: AbortSignal;
}

export interface BatchProcessingResult {
  totalProcessed: number;
  batchesProcessed: number;
  successCount: number;
  failureCount: number;
  totalTime: number; // milliseconds
  estimatedTimePerContact: number; // milliseconds
}

/**
 * Process items in batches sequentially
 * Great for APIs with rate limiting and large datasets
 */
export async function processBatchSequentially<T, R>(
  items: T[],
  processFunction: (batch: T[]) => Promise<R[]>,
  config: BatchProcessingConfig = {}
): Promise<{
  results: R[];
  stats: BatchProcessingResult;
}> {
  const {
    batchSize = 1000,
    delayBetweenBatches = 500,
    logProgress = true,
    abortSignal
  } = config;

  const startTime = Date.now();
  const results: R[] = [];
  let successCount = 0;
  let failureCount = 0;
  let batchesProcessed = 0;

  try {
    for (let i = 0; i < items.length; i += batchSize) {
      // Check abort signal
      if (abortSignal?.aborted) {
        throw new Error('Batch processing aborted');
      }

      const batch = items.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(items.length / batchSize);

      if (logProgress) {
        console.log(
          `[BATCH] Processing batch ${batchNumber}/${totalBatches} (${batch.length} items, ` +
          `${i + batch.length}/${items.length} total)`
        );
      }

      try {
        const batchResults = await processFunction(batch);
        results.push(...batchResults);

        // Count successes/failures based on results
        batchResults.forEach((result) => {
          if (result && typeof result === 'object' && 'success' in result) {
            if ((result as any).success) {
              successCount++;
            } else {
              failureCount++;
            }
          } else {
            successCount++;
          }
        });

        batchesProcessed++;

        // Add delay between batches (except after last batch)
        if (i + batchSize < items.length) {
          if (logProgress) {
            console.log(`[BATCH] Waiting ${delayBetweenBatches}ms before next batch...`);
          }
          await delay(delayBetweenBatches);
        }
      } catch (error) {
        console.error(`[BATCH] Error processing batch ${batchNumber}:`, error);
        failureCount += batch.length;
        throw error; // Re-throw to stop processing on error
      }
    }

    const totalTime = Date.now() - startTime;
    const estimatedTimePerContact = items.length > 0 ? totalTime / items.length : 0;

    return {
      results,
      stats: {
        totalProcessed: items.length,
        batchesProcessed,
        successCount,
        failureCount,
        totalTime,
        estimatedTimePerContact
      }
    };
  } catch (error) {
    console.error('[BATCH] Batch processing failed:', error);
    throw error;
  }
}

/**
 * Process items in parallel batches (for non-rate-limited APIs)
 */
export async function processBatchParallel<T, R>(
  items: T[],
  processFunction: (batch: T[]) => Promise<R[]>,
  config: BatchProcessingConfig = {}
): Promise<{
  results: R[];
  stats: BatchProcessingResult;
}> {
  const {
    batchSize = 1000,
    logProgress = true,
    abortSignal
  } = config;

  const startTime = Date.now();

  try {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    if (logProgress) {
      console.log(`[BATCH] Processing ${batches.length} batches in parallel`);
    }

    const batchPromises = batches.map((batch, index) => {
      if (abortSignal?.aborted) {
        return Promise.reject(new Error('Batch processing aborted'));
      }
      
      if (logProgress) {
        console.log(
          `[BATCH] Starting batch ${index + 1}/${batches.length} (${batch.length} items)`
        );
      }

      return processFunction(batch);
    });

    const allResults = await Promise.all(batchPromises);
    const results = allResults.flat();

    let successCount = 0;
    let failureCount = 0;

    results.forEach((result) => {
      if (result && typeof result === 'object' && 'success' in result) {
        if ((result as any).success) {
          successCount++;
        } else {
          failureCount++;
        }
      } else {
        successCount++;
      }
    });

    const totalTime = Date.now() - startTime;
    const estimatedTimePerContact = items.length > 0 ? totalTime / items.length : 0;

    return {
      results,
      stats: {
        totalProcessed: items.length,
        batchesProcessed: batches.length,
        successCount,
        failureCount,
        totalTime,
        estimatedTimePerContact
      }
    };
  } catch (error) {
    console.error('[BATCH] Parallel batch processing failed:', error);
    throw error;
  }
}

/**
 * Split items into chunks
 */
export function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Delay helper
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
