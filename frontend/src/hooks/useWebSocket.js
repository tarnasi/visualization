import { useState, useEffect, useRef, useCallback } from 'react';

const useWebSocket = (url, onMessage) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  
  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
      };
      
      ws.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data);
          setData(parsedData);
          if (onMessage) {
            onMessage(parsedData);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
          setError(err.message);
        }
      };
      
      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('WebSocket connection error');
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        wsRef.current = null;
        
        // Auto-reconnect after 3 seconds
        reconnectAttempts.current += 1;
        console.log(`Reconnecting... Attempt ${reconnectAttempts.current}`);
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };
      
      wsRef.current = ws;
    } catch (err) {
      console.error('Error creating WebSocket:', err);
      setError(err.message);
      
      // Retry connection
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    }
  }, [url, onMessage]);
  
  const sendMessage = useCallback((message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        const messageStr = typeof message === 'string' 
          ? message 
          : JSON.stringify(message);
        wsRef.current.send(messageStr);
      } catch (err) {
        console.error('Error sending WebSocket message:', err);
        setError(err.message);
      }
    } else {
      console.warn('WebSocket is not connected');
      setError('WebSocket is not connected');
    }
  }, []);
  
  useEffect(() => {
    connect();
    
    return () => {
      // Cleanup on unmount
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);
  
  return {
    data,
    isConnected,
    error,
    sendMessage
  };
};

export default useWebSocket;
