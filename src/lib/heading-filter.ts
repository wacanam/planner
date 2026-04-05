/**
 * heading-filter.ts
 *
 * Circular moving average heading filter.
 * Uses sin/cos averaging — correct for angles, handles 359°→1° wrap.
 */
export class HeadingFilter {
  private sinSum = 0;
  private cosSum = 0;
  private buf: number[] = [];
  private idx = 0;

  constructor(private readonly size = 12) {}

  update(deg: number): number {
    const rad = deg * (Math.PI / 180);
    const s   = Math.sin(rad);
    const co  = Math.cos(rad);

    if (this.buf.length < this.size) {
      this.buf.push(deg);
      this.sinSum += s;
      this.cosSum += co;
    } else {
      const old    = this.buf[this.idx] * (Math.PI / 180);
      this.sinSum += s  - Math.sin(old);
      this.cosSum += co - Math.cos(old);
      this.buf[this.idx] = deg;
      this.idx = (this.idx + 1) % this.size;
    }

    return (Math.atan2(this.sinSum, this.cosSum) * 180 / Math.PI + 360) % 360;
  }

  reset() { this.sinSum = 0; this.cosSum = 0; this.buf = []; this.idx = 0; }

  get isReady() { return this.buf.length > 0; }
  get current() {
    if (!this.isReady) return 0;
    return (Math.atan2(this.sinSum, this.cosSum) * 180 / Math.PI + 360) % 360;
  }
}

/**
 * getTiltCompensatedHeading
 *
 * Returns the direction the TOP of the phone is pointing on the horizontal plane
 * — exactly what Google Maps uses. Works regardless of pitch/roll/tilt.
 *
 * iOS:   webkitCompassHeading — CoreMotion does full sensor fusion (best quality)
 * Android: rotation matrix from alpha/beta/gamma (tilt-compensated)
 */
export function getTiltCompensatedHeading(
  e: DeviceOrientationEvent & { webkitCompassHeading?: number }
): number | null {
  // iOS — CoreMotion already does full sensor fusion + tilt compensation
  if (typeof e.webkitCompassHeading === 'number') {
    return e.webkitCompassHeading;
  }

  // Android tilt-compensated via rotation matrix
  if (e.alpha === null || e.beta === null || e.gamma === null) return null;

  const r = Math.PI / 180;
  const α = e.alpha * r;
  const β = e.beta  * r;
  const γ = e.gamma * r;

  const x = Math.cos(α) * Math.sin(β) * Math.sin(γ) - Math.sin(α) * Math.cos(γ);
  const y = Math.sin(α) * Math.sin(β) * Math.sin(γ) + Math.cos(α) * Math.cos(γ);

  let h = Math.atan2(x, y) * (180 / Math.PI);
  if (h < 0) h += 360;

  const abs = (e as DeviceOrientationEvent & { absolute?: boolean }).absolute === true;
  return abs ? h : (360 - h) % 360;
}

/**
 * getHeadingFromQuaternion
 *
 * Convert AbsoluteOrientationSensor quaternion → horizontal heading (degrees).
 * This is the most accurate Android method — full OS-level sensor fusion.
 * The quaternion represents the phone's orientation in 3D space;
 * extracting yaw gives where the phone's top edge points horizontally.
 *
 * Usage:
 *   const sensor = new AbsoluteOrientationSensor({ frequency: 60 });
 *   sensor.onreading = () => {
 *     const h = getHeadingFromQuaternion(sensor.quaternion);
 *   };
 */
export function getHeadingFromQuaternion(q: readonly [number, number, number, number]): number {
  const [x, y, z, w] = q;
  // Extract yaw (rotation around vertical axis) from quaternion
  const yaw = Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z));
  let deg = yaw * (180 / Math.PI);
  if (deg < 0) deg += 360;
  return deg;
}

/** iOS compass accuracy. */
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
