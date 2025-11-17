import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from './UserContext';

const WebSocketContext = createContext();

export function WebSocketProvider({ children }) {
  const { user } = useUser();
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]); // Real-time messages buffer
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState({}); // conversationId -> Set of userIds
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const messageHandlersRef = useRef(new Map()); // Custom message handlers

  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000; // 1 second

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!user) {
      console.log('WebSocket: No user, skipping connection');
      return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      console.log('WebSocket: No token, skipping connection');
      return;
    }

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    const wsUrl = `ws://localhost:8000/api/ws?token=${token}`;
    console.log('WebSocket: Connecting to', wsUrl);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket: Connected');
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;

      // Start heartbeat
      const heartbeatInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000); // Every 30 seconds

      ws.heartbeatInterval = heartbeatInterval;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket: Received message', data);

        // Handle different message types
        switch (data.type) {
          case 'message':
            // Add to messages buffer
            setMessages(prev => [...prev, data.message]);
            
            // Call custom handlers
            messageHandlersRef.current.forEach(handler => {
              if (handler.type === 'message') {
                handler.callback(data.message);
              }
            });
            break;

          case 'typing':
            setTypingUsers(prev => {
              const conversationTyping = new Set(prev[data.conversation_id] || []);
              if (data.is_typing) {
                conversationTyping.add(data.user_id);
              } else {
                conversationTyping.delete(data.user_id);
              }
              return {
                ...prev,
                [data.conversation_id]: conversationTyping
              };
            });

            // Call custom handlers
            messageHandlersRef.current.forEach(handler => {
              if (handler.type === 'typing') {
                handler.callback(data);
              }
            });
            break;

          case 'user_status':
            setOnlineUsers(prev => {
              const newSet = new Set(prev);
              if (data.status === 'online') {
                newSet.add(data.user_id);
              } else {
                newSet.delete(data.user_id);
              }
              return newSet;
            });

            // Call custom handlers
            messageHandlersRef.current.forEach(handler => {
              if (handler.type === 'user_status') {
                handler.callback(data);
              }
            });
            break;

          case 'read_receipt':
            // Call custom handlers
            messageHandlersRef.current.forEach(handler => {
              if (handler.type === 'read_receipt') {
                handler.callback(data);
              }
            });
            break;

          case 'pong':
            // Heartbeat response
            console.log('WebSocket: Heartbeat received');
            break;

          case 'error':
            console.error('WebSocket: Server error', data.message);
            break;

          default:
            console.warn('WebSocket: Unknown message type', data.type);
        }
      } catch (error) {
        console.error('WebSocket: Error parsing message', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket: Error', error);
    };

    ws.onclose = (event) => {
      console.log('WebSocket: Disconnected', event.code, event.reason);
      setIsConnected(false);

      // Clear heartbeat interval
      if (ws.heartbeatInterval) {
        clearInterval(ws.heartbeatInterval);
      }

      // Attempt to reconnect with exponential backoff
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current);
        console.log(`WebSocket: Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current += 1;
          connect();
        }, delay);
      } else {
        console.log('WebSocket: Max reconnection attempts reached');
      }
    };
  }, [user]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Send a message
  const sendMessage = useCallback((conversationId, content) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        conversation_id: conversationId,
        content
      }));
      return true;
    }
    return false;
  }, []);

  // Send typing indicator
  const sendTyping = useCallback((conversationId, isTyping) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        conversation_id: conversationId,
        is_typing: isTyping
      }));
    }
  }, []);

  // Mark messages as read
  const markAsRead = useCallback((conversationId) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'read',
        conversation_id: conversationId
      }));
    }
  }, []);

  // Register a custom message handler
  const registerHandler = useCallback((id, type, callback) => {
    messageHandlersRef.current.set(id, { type, callback });
    
    // Return cleanup function
    return () => {
      messageHandlersRef.current.delete(id);
    };
  }, []);

  // Get typing users for a conversation
  const getTypingUsers = useCallback((conversationId) => {
    return Array.from(typingUsers[conversationId] || []);
  }, [typingUsers]);

  // Check if user is online
  const isUserOnline = useCallback((userId) => {
    return onlineUsers.has(userId);
  }, [onlineUsers]);

  // Clear messages buffer
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Connect on mount if user is logged in
  useEffect(() => {
    if (user) {
      connect();
    } else {
      disconnect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [user, connect, disconnect]);

  const value = {
    isConnected,
    messages,
    onlineUsers: Array.from(onlineUsers),
    sendMessage,
    sendTyping,
    markAsRead,
    registerHandler,
    getTypingUsers,
    isUserOnline,
    clearMessages,
    connect,
    disconnect
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
