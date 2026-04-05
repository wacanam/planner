/**
 * heading-filter.ts
 *
 * Circular moving average heading filter.
 *
 * Why not Kalman + gyro?
 *   iOS: webkitCompassHeading is ALREADY Kalman-filtered by CoreMotion.
 *        Adding another filter amplifies noise. Gyro axis varies by device orientation.
 *   Android: deviceorientationabsolute alpha is stable enough with averaging.
 *
 * Circular mean = average of unit vectors → correct wrap-around handling,
 * no 359°→1° spin artifacts, provably optimal for angular data.
 */

export class HeadingFilter {
  private sinSum = 0;
  private cosSum = 0;
  private buf: number[] = [];
  private idx = 0;

  constructor(private readonly size = 15) {}

  /** Feed a new raw heading (0–360°). Returns smoothed heading. */
  update(deg: number): number {
    const rad = deg * (Math.PI / 180);
    const s   = Math.sin(rad);
    const co  = Math.cos(rad);

    if (this.buf.length < this.size) {
      // Buffer filling — add without evicting
      this.buf.push(deg);
      this.sinSum += s;
      this.cosSum += co;
    } else {
      // Ring buffer — evict oldest
      const old    = this.buf[this.idx] * (Math.PI / 180);
      this.sinSum += s   - Math.sin(old);
      this.cosSum += co  - Math.cos(old);
      this.buf[this.idx] = deg;
      this.idx = (this.idx + 1) % this.size;
    }

    const mean = Math.atan2(this.sinSum, this.cosSum) * (180 / Math.PI);
    return (mean + 360) % 360;
  }

  reset() {
    this.sinSum = 0;
    this.cosSum = 0;
    this.buf    = [];
    this.idx    = 0;
  }

  get isReady()  { return this.buf.length > 0; }
  get current()  {
    if (!this.isReady) return 0;
    return (Math.atan2(this.sinSum, this.cosSum) * 180 / Math.PI + 360) % 360;
  }
}

/**
 * Extract tilt-compensated heading from DeviceOrientationEvent.
 *
 * iOS: webkitCompassHeading — best quality, OS-filtered, tilt-compensated.
 * Android deviceorientationabsolute: tilt-compensate alpha using beta/gamma.
 */
export function getTiltCompensatedHeading(
  e: DeviceOrientationEvent & { webkitCompassHeading?: number }
): number | null {
  // iOS — already tilt-compensated + filtered by CoreMotion
  if (typeof e.webkitCompassHeading === 'number') {
    return e.webkitCompassHeading;
  }

  if (e.alpha === null || e.beta === null || e.gamma === null) return null;

  const r = Math.PI / 180;
  const α = e.alpha * r;
  const β = e.beta  * r;
  const γ = e.gamma * r;

  // Rotation matrix projection onto horizontal plane
  const x =  Math.cos(α) * Math.sin(β) * Math.sin(γ) - Math.sin(α) * Math.cos(γ);
  const y =  Math.sin(α) * Math.sin(β) * Math.sin(γ) + Math.cos(α) * Math.cos(γ);

  let h = Math.atan2(x, y) * (180 / Math.PI);
  if (h < 0) h += 360;

  const abs = (e as DeviceOrientationEvent & { absolute?: boolean }).absolute === true;
  return abs ? h : (360 - h) % 360;
}

/** iOS compass accuracy bucket. */
export type CompassAccuracy = 'good' | 'ok' | 'poor' | 'uncalibrated' | 'unknown';
export function getCompassAccuracy(
  e: DeviceOrientationEvent & { webkitCompassAccuracy?: number }
): CompassAccuracy {
  const a = e.webkitCompassAccuracy;
  if (a === undefined || a === null) return 'unknown';
  if (a < 0)   return 'uncalibrated';
  if (a <= 10) return 'good';
  if (a <= 25) return 'ok';
  return 'poor';
}
