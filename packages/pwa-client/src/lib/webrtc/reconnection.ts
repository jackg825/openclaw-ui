export type ReconnectionState = 'idle' | 'waiting' | 'attempting';

export interface ReconnectionConfig {
  initialDelay: number;
  maxDelay: number;
  multiplier: number;
  maxAttempts: number;
}

const DEFAULT_CONFIG: ReconnectionConfig = {
  initialDelay: 1000,
  maxDelay: 30000,
  multiplier: 2,
  maxAttempts: 10,
};

export class ReconnectionManager extends EventTarget {
  private config: ReconnectionConfig;
  private state: ReconnectionState = 'idle';
  private attempts = 0;
  private currentDelay: number;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(config?: Partial<ReconnectionConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.currentDelay = this.config.initialDelay;
  }

  getState(): ReconnectionState {
    return this.state;
  }

  getAttempts(): number {
    return this.attempts;
  }

  /** Schedule a reconnection attempt. Calls onAttempt when it's time to try. */
  schedule(onAttempt: () => Promise<boolean>): void {
    if (this.attempts >= this.config.maxAttempts) {
      this.state = 'idle';
      this.dispatchEvent(new CustomEvent('exhausted', { detail: { attempts: this.attempts } }));
      return;
    }

    this.state = 'waiting';
    this.dispatchEvent(
      new CustomEvent('waiting', { detail: { delay: this.currentDelay, attempt: this.attempts + 1 } }),
    );

    this.timer = setTimeout(async () => {
      this.state = 'attempting';
      this.attempts++;
      this.dispatchEvent(new CustomEvent('attempting', { detail: { attempt: this.attempts } }));

      const success = await onAttempt();
      if (success) {
        this.reset();
      } else {
        this.currentDelay = Math.min(this.currentDelay * this.config.multiplier, this.config.maxDelay);
        this.schedule(onAttempt);
      }
    }, this.currentDelay);
  }

  /** Reset state after a successful connection */
  reset(): void {
    this.state = 'idle';
    this.attempts = 0;
    this.currentDelay = this.config.initialDelay;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /** Stop any pending reconnection */
  cancel(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.state = 'idle';
  }
}
