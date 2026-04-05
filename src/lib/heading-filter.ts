/**
 * HeadingFilter — accurate compass heading with zero jitter
 *
 * Algorithm: 1D Kalman filter
 *
 * Two noise sources:
 *   - Process noise (Q): how much the heading actually changes per second
 *   - Measurement noise (R): how noisy the magnetometer is
 *
 * The Kalman gain K = P / (P + R) automatically balances:
 *   - High uncertainty → trust measurement more
 *   - Low uncertainty  → trust prediction more
 *
 * Result: optimal estimate that's smooth when stationary,
 *         responsive when turning, and never oscillates.
 */
export class HeadingFilter {
  private angle   = 0;     // current estimate (degrees)
  private P       = 1;     // error covariance
  private ready   = false;

  // Tuning constants
  private readonly Q: number; // process noise variance (deg²/s)
  private readonly R: number; // measurement noise variance (deg²)

  constructor(options?: { Q?: number; R?: number }) {
    // Q: how fast heading really changes (lower = smoother but slower)
    // R: magnetometer noise level (higher = smoother but less responsive)
    this.Q = options?.Q ?? 0.1;
    this.R = options?.R ?? 5.0;
  }

  /**
   * Feed a new magnetometer reading (degrees, 0-360).
   * Returns the filtered heading.
   */
  update(measurement: number): number {
    if (!this.ready) {
      this.angle = measurement;
      this.ready = true;
      return this.angle;
    }

    // ── Predict ────────────────────────────────────────────────────────────
    // No gyro input here — prediction = same as last estimate
    // P grows by Q each step (we're less certain over time)
    this.P += this.Q;

    // ── Update ────────────────────────────────────────────────────────────
    // Innovation: shortest-path difference between measurement and estimate
    const innovation = shortestAngle(measurement, this.angle);

    // Kalman gain: how much to trust the measurement vs prediction
    const K = this.P / (this.P + this.R);

    // Update estimate
    this.angle = (this.angle + K * innovation + 360) % 360;

    // Update covariance
    this.P = (1 - K) * this.P;

    return this.angle;
  }

  /**
   * Reset filter (e.g. when location toggled off)
   */
  reset() {
    this.ready = false;
    this.P = 1;
  }

  get current() { return this.angle; }
  get isReady() { return this.ready; }
}

/**
 * Tilt-compensated heading from DeviceOrientationEvent.
 *
 * On iOS: returns webkitCompassHeading directly (already tilt-compensated by OS).
 * On Android: applies rotation matrix to correct for pitch/roll tilt.
 *
 * Returns null if insufficient data.
 */
export function getTiltCompensatedHeading(
  e: DeviceOrientationEvent & { webkitCompassHeading?: number }
): number | null {
  // iOS — OS already handles tilt compensation
  if (e.webkitCompassHeading !== undefined) {
    return e.webkitCompassHeading;
  }

  // Need all three angles for tilt compensation
  if (e.alpha === null || e.beta === null || e.gamma === null) return null;

  const toRad = Math.PI / 180;
  const α = e.alpha * toRad;
  const β = e.beta  * toRad;
  const γ = e.gamma * toRad;

  // Standard tilt-compensation rotation matrix projection
  // Projects the gravity-corrected magnetic field onto the horizontal plane
  const x = Math.cos(α) * Math.sin(β) * Math.sin(γ) - Math.sin(α) * Math.cos(γ);
  const y = Math.sin(α) * Math.sin(β) * Math.sin(γ) + Math.cos(α) * Math.cos(γ);

  let heading = Math.atan2(x, y) * (180 / Math.PI);
  if (heading < 0) heading += 360;

  // deviceorientationabsolute = true north; relative needs inversion
  const isAbsolute = (e as DeviceOrientationEvent & { absolute?: boolean }).absolute === true;
  return isAbsolute ? heading : (360 - heading) % 360;
}

/**
 * Shortest signed angle difference: result in (-180, 180].
 * Handles the 359° → 1° wrap-around correctly.
 */
export function shortestAngle(target: number, current: number): number {
  return ((target - current + 540) % 360) - 180;
}

/**
 * Compass accuracy level from iOS webkitCompassAccuracy.
 * Returns 'good' | 'poor' | 'unknown'
 */
export function compassAccuracy(
  e: DeviceOrientationEvent & { webkitCompassAccuracy?: number }
): 'good' | 'poor' | 'unknown' {
  const acc = e.webkitCompassAccuracy;
  if (acc === undefined) return 'unknown';
  if (acc < 0 || acc > 25) return 'poor';
  return 'good';
}
