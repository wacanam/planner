import { type Firestore, writeBatch, type WriteBatch } from 'firebase/firestore';

export type BatchOperation = (batch: WriteBatch) => void;

/**
 * Executes an array of Firestore batch operations in chunks (default: 400 operations per batch)
 * to prevent exceeding Firestore's strict limit of 500 operations per writeBatch.
 *
 * @param firestore The Firestore instance
 * @param operations An array of callback functions, each receiving a WriteBatch to queue mutations
 * @param chunkSize Maximum number of operations per batch (default 400, max allowed 500)
 */
export async function commitChunkedBatch(
  firestore: Firestore,
  operations: BatchOperation[],
  chunkSize = 400
): Promise<void> {
  if (!operations || operations.length === 0) return;

  const safeChunkSize = Math.min(Math.max(1, chunkSize), 500);

  for (let i = 0; i < operations.length; i += safeChunkSize) {
    const chunk = operations.slice(i, i + safeChunkSize);
    const batch = writeBatch(firestore);
    for (const op of chunk) {
      op(batch);
    }
    await batch.commit();
  }
}
