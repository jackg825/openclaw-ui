const BUFFER_THRESHOLD = 128 * 1024; // 128 KiB — pause sending when bufferedAmount exceeds this
const DRAIN_CHECK_INTERVAL = 50; // ms

export class DataChannelWrapper extends EventTarget {
  private dc: RTCDataChannel;
  private messageHandler: ((message: string) => void) | null = null;
  private queue: string[] = [];
  private draining = false;

  constructor(dc: RTCDataChannel) {
    super();
    this.dc = dc;
    this.dc.binaryType = 'arraybuffer';

    this.dc.onopen = () => {
      this.dispatchEvent(new Event('open'));
      this.drainQueue();
    };

    this.dc.onclose = () => {
      this.dispatchEvent(new Event('close'));
    };

    this.dc.onerror = (event) => {
      this.dispatchEvent(new CustomEvent('error', { detail: event }));
    };

    this.dc.onmessage = (event: MessageEvent) => {
      const data = typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data);
      this.messageHandler?.(data);
      this.dispatchEvent(new CustomEvent('message', { detail: data }));
    };
  }

  get readyState(): RTCDataChannelState {
    return this.dc.readyState;
  }

  get bufferedAmount(): number {
    return this.dc.bufferedAmount;
  }

  get label(): string {
    return this.dc.label;
  }

  onMessage(handler: (message: string) => void): void {
    this.messageHandler = handler;
  }

  /** Send a string message. Queues if buffer is full or channel not open. */
  send(data: string): void {
    if (this.dc.readyState !== 'open' || this.dc.bufferedAmount > BUFFER_THRESHOLD) {
      this.queue.push(data);
      if (this.dc.readyState === 'open' && !this.draining) {
        this.drainQueue();
      }
      return;
    }
    this.dc.send(data);
  }

  close(): void {
    this.queue = [];
    this.dc.close();
  }

  private drainQueue(): void {
    if (this.draining || this.dc.readyState !== 'open') return;
    this.draining = true;

    const drain = () => {
      while (this.queue.length > 0 && this.dc.bufferedAmount <= BUFFER_THRESHOLD) {
        const msg = this.queue.shift()!;
        this.dc.send(msg);
      }

      if (this.queue.length > 0 && this.dc.readyState === 'open') {
        setTimeout(drain, DRAIN_CHECK_INTERVAL);
      } else {
        this.draining = false;
      }
    };

    drain();
  }
}
