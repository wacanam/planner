/**
 * HeadingFilter — Kalman filter with gyroscope prediction
 *
 * State: heading angle (degrees)
 * Predict: advance using gyroscope rate × dt
 * Update:  correct using tilt-compensated magnetometer reading
 *
 * This is the same algorithm used in professional navigation:
 * gyro = smooth fast response, mag = absolute reference drift correction
 */
export class HeadingFilter {
  private angle = 0;
  private P     = 999;   // start with high uncertainty so first reading snaps
  private ready = false;

  // Q: gyro process noise (deg²/s) — how much heading can change per second
  // R: magnetometer noise (deg²) — sensor noise floor
  private readonly Q: number;
  private readonly R: number;

  constructor(Q = 0.3, R = 3) {
    this.Q = Q;
    this.R = R;
  }

  /**
   * Predict step — call with gyro yaw rate (deg/s) and dt (seconds).
   * Call even with rate=0 to grow uncertainty over time.
   */
  predict(rate: number, dt: number) {
    if (!this.ready) return;
    this.angle = (this.angle + rate * dt + 360) % 360;
    this.P += this.Q * dt;
  }

  /**
   * Update step — call with magnetometer heading (degrees).
   * Returns the filtered heading.
   */
  update(measurement: number): number {
    if (!this.ready) {
      this.angle = measurement;
      this.P     = 1;
      this.ready = true;
      return this.angle;
    }

    // Innovation: shortest path difference
    const innovation = shortestAngle(measurement, this.angle);

    // Kalman gain
    const K = this.P / (this.P + this.R);

    // Update state and covariance
    this.angle = (this.angle + K * innovation + 360) % 360;
    this.P     = (1 - K) * this.P;

    return this.angle;
  }

  reset() {
    this.ready = false;
    this.P     = 999;
  }

  get current() { return this.angle; }
  get isReady() { return this.ready; }
}

/**
 * Tilt-compensated heading from DeviceOrientationEvent.
 * iOS: returns webkitCompassHeading (OS-level sensor fusion, best quality).
 * Android: rotation matrix projection of alpha/beta/gamma.
 * Returns null if data is insufficient.
 */
export function getTiltCompensatedHeading(
  e: DeviceOrientationEvent & { webkitCompassHeading?: number }
): number | null {
  // iOS — fully tilt-compensated and Kalman-filtered by the OS
  if (typeof e.webkitCompassHeading === 'number') {
    return e.webkitCompassHeading;
  }

  if (e.alpha === null || e.beta === null || e.gamma === null) return null;

  const toRad = Math.PI / 180;
  const α = e.alpha * toRad;
  const β = e.beta  * toRad;
  const γ = e.gamma * toRad;

  const x = Math.cos(α) * Math.sin(β) * Math.sin(γ) - Math.sin(α) * Math.cos(γ);
  const y = Math.sin(α) * Math.sin(β) * Math.sin(γ) + Math.cos(α) * Math.cos(γ);

  let h = Math.atan2(x, y) * (180 / Math.PI);
  if (h < 0) h += 360;

  // deviceorientationabsolute gives true north directly
  const isAbs = (e as DeviceOrientationEvent & { absolute?: boolean }).absolute === true;
  return isAbs ? h : (360 - h) % 360;
}

/**
 * Shortest signed difference between two angles, result in (-180, 180].
 */
export function shortestAngle(target: number, current: number): number {
  return ((target - current + 540) % 360) - 180;
}

/**
 * iOS compass accuracy from webkitCompassAccuracy (degrees of error).
 * -1 = uncalibrated, 0-10 = good, 11-25 = ok, >25 = poor
 */
export type CompassAccuracy = 'good' | 'ok' | 'poor' | 'uncalibrated' | 'unknown';
export function getCompassAccuracy(
  e: DeviceOrientationEvent & { webkitCompassAccuracy?: number }
): CompassAccuracy {
  const a = e.webkitCompassAccuracy;
  if (a === undefined) return 'unknown';
  if (a < 0)  return 'uncalibrated';
  if (a <= 10) return 'good';
  if (a <= 25) return 'ok';
  return 'poor';
}
