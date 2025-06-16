/**
 * WebSocket message and connection types
 */
export interface WebSocketMessage<T = unknown> {
  topic: string;
  payload: T;
}

export interface NatsMessage {
  eventName: string;
  eventData: Record<string, unknown>;
}

export type MessageHandler<T = unknown> = (topic: string, data: T) => void;
export type StatusHandler = (status: string) => void;

export interface SocketState {
  status: 'connecting' | 'connected' | 'disconnected';
  error: Error | null;
}

export interface NatsSubscriptionData {
  topic: string;
  message: {
    camera: number;
    preset: number;
    status: string;
    [key: string]: unknown;
  };
}
