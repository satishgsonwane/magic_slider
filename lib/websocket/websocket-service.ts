import { ConnectionManager } from './connection-manager';
import { WebSocketMessageHandler } from './message-handler';
import type { MessageHandler, StatusHandler } from './types';

class WebSocketService {
  private connectionManager: ConnectionManager;
  private messageHandler: WebSocketMessageHandler;

  constructor() {
    this.messageHandler = new WebSocketMessageHandler();
    const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:12553';
    
    this.connectionManager = new ConnectionManager(
      wsUrl,
      this.messageHandler.handleMessage.bind(this.messageHandler)
    );
  }

  public connect(statusHandler?: StatusHandler): void {
    this.connectionManager = new ConnectionManager(
      process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:12553',
      this.messageHandler.handleMessage.bind(this.messageHandler),
      statusHandler
    );
    this.connectionManager.connect();
  }

  public disconnect(): void {
    this.connectionManager.disconnect();
  }

  public addMessageHandler(handler: MessageHandler): void {
    this.messageHandler.addHandler(handler);
  }

  public removeMessageHandler(handler: MessageHandler): void {
    this.messageHandler.removeHandler(handler);
  }
}

// Create a singleton instance
export const websocketService = new WebSocketService();
