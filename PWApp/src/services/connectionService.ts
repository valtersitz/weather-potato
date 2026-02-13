import type { PotatoConfig } from '../types';
import { RELAY_URL } from '../utils/constants';

interface PendingRequest {
  resolve: (data: any) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

interface WebSocketMessage {
  id?: string;
  type: 'request' | 'response' | 'error';
  device_id?: string;
  method?: string;
  path?: string;
  body?: any;
  status?: number;
  data?: any;
  error?: string;
}

class ConnectionService {
  private ws: WebSocket | null = null;
  private config: PotatoConfig | null = null;
  private pendingRequests = new Map<string, PendingRequest>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private isConnecting = false;
  private requestTimeout = 10000; // 10 seconds

  /**
   * Initialize connection to relay server
   */
  init(config: PotatoConfig): void {
    console.log('[ConnectionService] Initializing with config:', config.device_id);
    this.config = config;
    this.connect();
  }

  /**
   * Establish WebSocket connection to relay
   */
  private connect(): void {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    const relayUrl = this.config?.relay_url || RELAY_URL;

    console.log('[ConnectionService] Connecting to relay:', relayUrl);

    try {
      this.ws = new WebSocket(relayUrl);

      this.ws.onopen = () => {
        console.log('[ConnectionService] ✅ Connected to relay');
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.isConnecting = false;
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = () => {
        console.log('[ConnectionService] Disconnected from relay');
        this.isConnecting = false;
        this.handleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('[ConnectionService] WebSocket error:', error);
        this.isConnecting = false;
      };

    } catch (error) {
      console.error('[ConnectionService] Failed to create WebSocket:', error);
      this.isConnecting = false;
      this.handleReconnect();
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: string): void {
    try {
      const msg: WebSocketMessage = JSON.parse(data);
      console.log('[ConnectionService] Received message:', msg.type, msg.id);

      if (msg.type === 'response' && msg.id) {
        const pending = this.pendingRequests.get(msg.id);
        if (pending) {
          pending.resolve(msg.data);
          this.pendingRequests.delete(msg.id);
        }
      } else if (msg.type === 'error' && msg.id) {
        const pending = this.pendingRequests.get(msg.id);
        if (pending) {
          pending.reject(new Error(msg.error || 'Unknown error from relay'));
          this.pendingRequests.delete(msg.id);
        }
      }
    } catch (error) {
      console.error('[ConnectionService] Failed to parse message:', error);
    }
  }

  /**
   * Handle reconnection with exponential backoff
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[ConnectionService] Max reconnect attempts reached');
      // Reject all pending requests
      this.pendingRequests.forEach((pending) => {
        pending.reject(new Error('Connection lost and max reconnect attempts reached'));
      });
      this.pendingRequests.clear();
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`[ConnectionService] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Wait for WebSocket to be ready
   */
  private async waitForConnection(): Promise<void> {
    const maxWait = 5000; // 5 seconds
    const startTime = Date.now();

    while (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      if (Date.now() - startTime > maxWait) {
        throw new Error('Connection timeout: WebSocket not ready');
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Make a request to the device through the relay
   */
  async request(method: 'GET' | 'POST', path: string, body?: any): Promise<any> {
    if (!this.config) {
      throw new Error('ConnectionService not initialized. Call init() first.');
    }

    // Wait for connection to be ready
    await this.waitForConnection();

    // Generate unique request ID
    const requestId = crypto.randomUUID();

    // Create promise for this request
    const promise = new Promise((resolve, reject) => {
      // Set timeout for this request
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timeout after ${this.requestTimeout}ms`));
      }, this.requestTimeout);

      this.pendingRequests.set(requestId, {
        resolve: (data) => {
          clearTimeout(timeoutId);
          resolve(data);
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
        timestamp: Date.now()
      });
    });

    // Send request through WebSocket
    const message: WebSocketMessage = {
      id: requestId,
      type: 'request',
      device_id: this.config.device_id,
      method,
      path,
      body: body || null
    };

    console.log(`[ConnectionService] Sending ${method} ${path} (id: ${requestId})`);
    this.ws!.send(JSON.stringify(message));

    return promise;
  }

  /**
   * Disconnect from relay
   */
  disconnect(): void {
    console.log('[ConnectionService] Disconnecting...');
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.pendingRequests.clear();
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnect
  }

  /**
   * Check if connected to relay
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
export const connectionService = new ConnectionService();
