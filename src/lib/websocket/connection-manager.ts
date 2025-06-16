import { type StatusHandler } from './types';

export class ConnectionManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private statusHandler: StatusHandler | null = null;

  constructor(
    private readonly url: string,
    private readonly onMessage: (event: MessageEvent) => void,
    statusHandler?: StatusHandler
  ) {
    this.statusHandler = statusHandler || null;
  }

  public connect(): void {
    try {
      this.ws = new WebSocket(this.url);
      this.setupEventHandlers();
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.attemptReconnect();
    }
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connection established');
      this.reconnectAttempts = 0;
      if (this.statusHandler) {
        this.statusHandler('WebSocket connected');
      }
    };
    
    this.ws.onmessage = this.onMessage;
    this.ws.onclose = this.handleClose.bind(this);
    this.ws.onerror = this.handleError.bind(this);
  }

  private handleClose(event: CloseEvent): void {
    console.log('WebSocket connection closed:', event);
    if (this.statusHandler) {
      this.statusHandler('WebSocket disconnected');
    }
    this.attemptReconnect();
  }

  private handleError(event: Event): void {
    console.error('WebSocket error:', event);
    if (this.statusHandler) {
      this.statusHandler('WebSocket error');
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      if (this.statusHandler) {
        this.statusHandler('Failed to connect after multiple attempts');
      }
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    if (this.statusHandler) {
      this.statusHandler(`Reconnecting in ${delay/1000}s (attempt ${this.reconnectAttempts})`);
    }
    
    this.reconnectTimeout = setTimeout(() => this.connect(), delay);
  }
}
