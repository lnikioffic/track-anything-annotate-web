import {
  WS_BASE_URL,
  WS_RECONNECT_INTERVAL,
  WS_MAX_RECONNECT_ATTEMPTS,
} from "./apiConfig";
import type {
  WsMessage,
  TrackingProgressPayload,
  TrackingCompletePayload,
  TrackingErrorPayload,
} from "./apiTypes";

type WsEventType =
  | "tracking_progress"
  | "tracking_complete"
  | "tracking_error"
  | "annotation_update";
type WsEventHandler<T> = (payload: T) => void;

interface WsEventMap {
  tracking_progress: TrackingProgressPayload;
  tracking_complete: TrackingCompletePayload;
  tracking_error: TrackingErrorPayload;
  annotation_update: {
    projectId: string;
    annotationId: string;
    action: "create" | "update" | "delete";
  };
}

export class WsClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private eventHandlers = new Map<WsEventType, Set<WsEventHandler<any>>>();
  private shouldReconnect = true;

  constructor(url: string = WS_BASE_URL) {
    this.url = url;
  }

  connect(projectId?: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    const wsUrl = projectId
      ? `${this.url}/ws/projects/${projectId}`
      : `${this.url}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);
      this.ws.onopen = () => {
        console.log("WebSocket connected");
        this.reconnectAttempts = 0;
      };
      this.ws.onclose = (event) => {
        console.log("WebSocket closed:", event.code, event.reason);
        if (this.shouldReconnect && event.code !== 1000) {
          this.scheduleReconnect(projectId);
        }
      };
      this.ws.onerror = (event) => console.error("WebSocket error:", event);
      this.ws.onmessage = (event) => {
        try {
          const message: WsMessage<any> = JSON.parse(event.data);
          this.emit(message.type, message.payload);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };
    } catch (error) {
      console.error("WebSocket connection failed:", error);
      this.scheduleReconnect(projectId);
    }
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.clearReconnectTimer();
    this.ws?.close();
    this.ws = null;
  }

  private scheduleReconnect(projectId?: string): void {
    if (this.reconnectAttempts >= WS_MAX_RECONNECT_ATTEMPTS) {
      console.error("Max WebSocket reconnect attempts reached");
      return;
    }
    this.clearReconnectTimer();
    this.reconnectAttempts++;
    console.log(
      `Reconnecting WebSocket (attempt ${this.reconnectAttempts})...`,
    );
    this.reconnectTimer = setTimeout(
      () => this.connect(projectId),
      WS_RECONNECT_INTERVAL,
    );
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  on<T extends WsEventType>(
    event: T,
    handler: WsEventHandler<WsEventMap[T]>,
  ): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  off<T extends WsEventType>(
    event: T,
    handler: WsEventHandler<WsEventMap[T]>,
  ): void {
    this.eventHandlers.get(event)?.delete(handler);
  }

  private emit<T extends WsEventType>(event: T, payload: WsEventMap[T]): void {
    this.eventHandlers.get(event)?.forEach((handler) => handler(payload));
  }

  getConnectionState(): "connecting" | "connected" | "disconnected" {
    if (!this.ws) return "disconnected";
    if (this.ws.readyState === WebSocket.OPEN) return "connected";
    return "connecting";
  }
}

export const wsClient = new WsClient();
export default wsClient;
