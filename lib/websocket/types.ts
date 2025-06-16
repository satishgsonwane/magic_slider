export type MessageHandler = (topic: string, data: any) => void;
export type StatusHandler = (status: string) => void;

export interface WebSocketMessage {
  topic: string;
  payload: any;
}
