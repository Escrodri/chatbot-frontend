/**
 * WebSocket Service
 *
 * Persistent WebSocket with auto-reconnection and event emitters.
 */

class WebSocketService {
  constructor() {
    this.ws = null;
    this.url = null;
    this.listeners = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000;
    this.heartbeatInterval = null;
    this.isIntentionallyClosed = false;
  }

  /**
   * Connect to WebSocket
   */
  connect(url) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.url = url;
    this.isIntentionallyClosed = false;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this._emit('connected', {});
        this._startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this._emit(data.type || 'message', data);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this._emit('error', error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this._stopHeartbeat();
        this._emit('disconnected', {});

        if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
          this._reconnect();
        }
      };
    } catch (err) {
      console.error('Error creating WebSocket:', err);
    }
  }

  /**
   * Send message over WebSocket
   */
  send(type, data = {}) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...data }));
    }
  }

  /**
   * Subscribe to event
   */
  on(eventType, callback) {
    if (!this.listeners[eventType]) {
      this.listeners[eventType] = [];
    }
    this.listeners[eventType].push(callback);

    return () => {
      this.listeners[eventType] = this.listeners[eventType].filter(cb => cb !== callback);
    };
  }

  /**
   * Unsubscribe from event
   */
  off(eventType, callback) {
    if (this.listeners[eventType]) {
      this.listeners[eventType] = this.listeners[eventType].filter(cb => cb !== callback);
    }
  }

  /**
   * Emit event to listeners
   */
  _emit(eventType, data) {
    if (this.listeners[eventType]) {
      this.listeners[eventType].forEach(callback => {
        try {
          callback(data);
        } catch (err) {
          console.error(`Error in listener for ${eventType}:`, err);
        }
      });
    }
  }

  /**
   * Start heartbeat
   */
  _startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send('ping');
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  _stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  _reconnect() {
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      if (!this.isIntentionallyClosed) {
        this.connect(this.url);
      }
    }, delay);
  }

  /**
   * Close WebSocket
   */
  close() {
    this.isIntentionallyClosed = true;
    this._stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Check connection status
   */
  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const websocketService = new WebSocketService();
export default websocketService;
