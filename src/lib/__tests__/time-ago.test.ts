import { describe, it, expect } from 'vitest';
import { timeAgo } from '../time-ago';

describe('timeAgo', () => {
  it('returns "just now" for very recent timestamps', () => {
    expect(timeAgo(new Date())).toBe('just now');
  });

  it('returns Xm ago for timestamps a few minutes ago', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(timeAgo(fiveMinutesAgo)).toBe('5m ago');
  });

  it('returns Xh ago for timestamps a few hours ago', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(timeAgo(threeHoursAgo)).toBe('3h ago');
  });

  it('returns Xd ago for timestamps days ago', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    expect(timeAgo(twoDaysAgo)).toBe('2d ago');
  });
});
