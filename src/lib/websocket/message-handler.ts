import { processCameraResponse } from '../camera-control';
import type { MessageHandler, WebSocketMessage } from './types';

export class WebSocketMessageHandler {
  private handlers: MessageHandler[] = [];

  public addHandler(handler: MessageHandler): void {
    this.handlers.push(handler);
  }

  public removeHandler(handler: MessageHandler): void {
    this.handlers = this.handlers.filter(h => h !== handler);
  }

  public handleMessage(event: MessageEvent): void {
    console.log('Raw WebSocket message received:', event.data);
    
    let data: WebSocketMessage;
    try {
      data = JSON.parse(event.data);
      console.log('Parsed WebSocket message:', data);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
      return;
    }

    if (!data?.topic) {
      console.warn('Received empty or invalid message');
      return;
    }

    // Process camera responses
    if (data.topic.startsWith('caminq.camera')) {
      processCameraResponse(data.topic, data.payload);
    }

    // Notify all registered handlers
    this.handlers.forEach(handler => {
      try {
        handler(data.topic, data.payload);
      } catch (error) {
        console.error('Error in message handler:', error);
      }
    });
  }
}
