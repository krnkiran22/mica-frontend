"use client";

import { useEffect, useRef, useState } from "react";

interface UseSSEOptions {
  onMessage?: (data: any) => void;
  onError?: (error: Error) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export function useSSE(url: string | null, options: UseSSEOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!url) return;

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
      options.onOpen?.();
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        options.onMessage?.(data);
      } catch (err) {
        console.error("Failed to parse SSE message:", err);
      }
    };

    eventSource.onerror = (err) => {
      setIsConnected(false);
      const error = new Error("SSE connection error");
      setError(error);
      options.onError?.(error);
      eventSource.close();
      options.onClose?.();
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [url]);

  return {
    isConnected,
    error,
    close: () => {
      eventSourceRef.current?.close();
      setIsConnected(false);
    },
  };
}