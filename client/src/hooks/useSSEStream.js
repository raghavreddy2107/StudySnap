// src/hooks/useSSEStream.js
import { useState, useRef, useCallback } from 'react';
import api from '../api/axiosInstance.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const FALLBACK_POLL_MS = 5000;

export const useSSEStream = () => {
  const [streamedText, setStreamedText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState(null);
  const eventSourceRef = useRef(null);
  const intentionallyClosedRef = useRef(false);
  const pollTimerRef = useRef(null);

  const closeCurrentStream = useCallback(() => {
    if (eventSourceRef.current) {
      intentionallyClosedRef.current = true;
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const startPolling = useCallback((summaryId) => {
    stopPolling();
    pollTimerRef.current = setInterval(async () => {
      try {
        const { data } = await api.get(`/summary/${summaryId}`);
        if (data.status === 'DONE') {
          stopPolling();
          closeCurrentStream();
          setStreamedText(data.summaryText || '');
          setIsStreaming(false);
          setIsDone(true);
          setError(null);
          return;
        }
        if (data.status === 'FAILED') {
          stopPolling();
          closeCurrentStream();
          setError(data.errorMsg || 'Summary failed. Open dashboard to view details.');
          setIsStreaming(false);
        }
      } catch {
        // Keep trying; transient network/server errors should not interrupt generation UX.
      }
    }, FALLBACK_POLL_MS);
  }, [closeCurrentStream, stopPolling]);

  const startStream = useCallback((summaryId) => {
    closeCurrentStream();
    stopPolling();
    intentionallyClosedRef.current = false;
    setStreamedText('');
    setIsStreaming(true);
    setIsDone(false);
    setError(null);

    const token = localStorage.getItem('accessToken');
    // EventSource doesn't support custom headers, use query param as fallback
    const url = `${API_URL}/api/summary/${summaryId}/stream?token=${encodeURIComponent(token || '')}`;

    const es = new EventSource(url, { withCredentials: true });
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.chunk) {
          setStreamedText((prev) => prev + data.chunk);
        }

        if (data.done) {
          stopPolling();
          setIsStreaming(false);
          setIsDone(true);
          closeCurrentStream();
        }

        if (data.error) {
          stopPolling();
          setError(data.error);
          setIsStreaming(false);
          closeCurrentStream();
        }
      } catch (e) {
        console.error('[SSE parse error]', e);
      }
    };

    es.onerror = () => {
      // EventSource triggers onerror on close/reconnect attempts; only surface real interruptions.
      if (intentionallyClosedRef.current) return;
      // Start API polling fallback so UI can still complete if SSE events are missed.
      closeCurrentStream();
      startPolling(summaryId);
    };
    startPolling(summaryId);
  }, [closeCurrentStream, startPolling, stopPolling]);

  const stopStream = useCallback(() => {
    closeCurrentStream();
    stopPolling();
    setIsStreaming(false);
  }, [closeCurrentStream, stopPolling]);

  const reset = useCallback(() => {
    stopStream();
    setStreamedText('');
    setIsDone(false);
    setError(null);
  }, [stopStream]);

  return { streamedText, isStreaming, isDone, error, startStream, stopStream, reset };
};
