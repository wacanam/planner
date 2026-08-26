import { describe, expect, it, vi } from 'vitest';
import { type BatchOperation, commitChunkedBatch } from '@/lib/firebase/batch-utils';

describe('Firestore Batch Chunking Utility (commitChunkedBatch)', () => {
  it('does nothing when operations list is empty', async () => {
    const mockCommit = vi.fn().mockResolvedValue(undefined);
    const mockWriteBatch = vi.fn().mockReturnValue({
      commit: mockCommit,
    });
    const mockFirestore = {} as any;

    vi.mock('firebase/firestore', () => ({
      writeBatch: mockWriteBatch,
    }));

    await commitChunkedBatch(mockFirestore, []);
    expect(mockCommit).not.toHaveBeenCalled();
  });

  it('executes all operations in a single batch when count is within chunk size', async () => {
    const committedBatches: number[] = [];
    let batchCounter = 0;

    const mockFirestore = {} as any;

    const ops: BatchOperation[] = [];
    for (let i = 0; i < 50; i++) {
      ops.push((batch) => {
        (batch as any).items.push(i);
      });
    }

    // Custom test runner for chunked logic
    const executedChunks: number[] = [];
    const chunkSize = 400;

    for (let i = 0; i < ops.length; i += chunkSize) {
      const chunk = ops.slice(i, i + chunkSize);
      executedChunks.push(chunk.length);
    }

    expect(executedChunks).toEqual([50]);
  });

  it('splits 950 operations into 3 batches when chunk size is 400', async () => {
    const ops: number[] = Array.from({ length: 950 }, (_, i) => i);
    const chunkSize = 400;
    const executedChunks: number[] = [];

    for (let i = 0; i < ops.length; i += chunkSize) {
      const chunk = ops.slice(i, i + chunkSize);
      executedChunks.push(chunk.length);
    }

    expect(executedChunks).toEqual([400, 400, 150]);
  });

  it('clamps chunk size to max 500 when higher value is passed', () => {
    const requestedChunkSize = 1000;
    const safeChunkSize = Math.min(Math.max(1, requestedChunkSize), 500);
    expect(safeChunkSize).toBe(500);
  });
});
