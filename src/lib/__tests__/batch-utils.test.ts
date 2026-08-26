import { describe, expect, it, vi } from 'vitest';
import { writeBatch } from 'firebase/firestore';
import { type BatchOperation, commitChunkedBatch } from '@/lib/firebase/batch-utils';

vi.mock('firebase/firestore', () => ({
  writeBatch: vi.fn(),
}));

describe('Firestore Batch Chunking Utility (commitChunkedBatch)', () => {
  it('does nothing when operations list is empty', async () => {
    const mockCommit = vi.fn().mockResolvedValue(undefined);
    (writeBatch as any).mockReset?.();
    (writeBatch as any).mockReturnValue({ commit: mockCommit });
    const mockFirestore = {} as any;

    await commitChunkedBatch(mockFirestore, []);
    expect(mockCommit).not.toHaveBeenCalled();
    expect(writeBatch).not.toHaveBeenCalled();
  });

  it('executes all operations in a single batch when count is within chunk size', async () => {
    const mockCommit = vi.fn().mockResolvedValue(undefined);
    (writeBatch as any).mockReset?.();
    (writeBatch as any).mockReturnValue({ commit: mockCommit });
    const mockFirestore = {} as any;

    const ops: BatchOperation[] = [];
    for (let i = 0; i < 50; i++) {
      ops.push((batch) => {
        (batch as any).items = (batch as any).items || [];
        (batch as any).items.push(i);
      });
    }

    await commitChunkedBatch(mockFirestore, ops, 400);
    expect(writeBatch).toHaveBeenCalledTimes(1);
    expect(mockCommit).toHaveBeenCalledTimes(1);
  });

  it('splits 950 operations into 3 batches when chunk size is 400', async () => {
    const mockCommit = vi.fn().mockResolvedValue(undefined);
    (writeBatch as any).mockReset?.();
    (writeBatch as any).mockReturnValue({ commit: mockCommit });
    const mockFirestore = {} as any;

    const ops: BatchOperation[] = Array.from({ length: 950 }, (_, i) => () => {});

    await commitChunkedBatch(mockFirestore, ops, 400);
    expect(writeBatch).toHaveBeenCalledTimes(3);
    expect(mockCommit).toHaveBeenCalledTimes(3);
  });

  it('clamps chunk size to max 500 when higher value is passed', async () => {
    const mockCommit = vi.fn().mockResolvedValue(undefined);
    (writeBatch as any).mockReset?.();
    (writeBatch as any).mockReturnValue({ commit: mockCommit });
    const mockFirestore = {} as any;

    const ops: BatchOperation[] = Array.from({ length: 1200 }, (_, i) => () => {});

    await commitChunkedBatch(mockFirestore, ops, 1000);
    // 1200 / 500 (clamped) = 3 batches (500 + 500 + 200)
    expect(writeBatch).toHaveBeenCalledTimes(3);
    expect(mockCommit).toHaveBeenCalledTimes(3);
  });
});
