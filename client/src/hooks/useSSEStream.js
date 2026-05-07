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
  const tokenQueueRef = useRef([]);
  const flushTimerRef = useRef(null);
  const pendingDoneRef = useRef(false);
  const finalTextRef = useRef(null);

  const stopFlushLoop = useCallback(() => {
    if (flushTimerRef.current) {
      clearInterval(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  }, []);

  const maybeFinalizeDone = useCallback(() => {
    if (pendingDoneRef.current && tokenQueueRef.current.length === 0) {
      pendingDoneRef.current = false;
      if (typeof finalTextRef.current === 'string') {
        setStreamedText(finalTextRef.current);
      }
      finalTextRef.current = null;
      setIsStreaming(false);
      setIsDone(true);
    }
  }, []);

  const startFlushLoop = useCallback(() => {
    if (flushTimerRef.current) return;
    flushTimerRef.current = setInterval(() => {
      const nextToken = tokenQueueRef.current.shift();
      if (typeof nextToken === 'string') {
        setStreamedText((prev) => prev + nextToken);
        return;
      }
      stopFlushLoop();
      maybeFinalizeDone();
    }, 22);
  }, [maybeFinalizeDone, stopFlushLoop]);

  const enqueueChunk = useCallback((chunkText) => {
    if (!chunkText) return;
    const tokens = chunkText.match(/\S+\s*/g) || [chunkText];
    tokenQueueRef.current.push(...tokens);
    startFlushLoop();
  }, [startFlushLoop]);

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
          stopFlushLoop();
          tokenQueueRef.current = [];
          pendingDoneRef.current = false;
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
  }, [closeCurrentStream, stopFlushLoop, stopPolling]);

  const syncFinalSummaryFromServer = useCallback(async (summaryId) => {
    try {
      const { data } = await api.get(`/summary/${summaryId}`);
      if (data?.status === 'DONE') {
        const savedText = data.summaryText || '';
        // Don't overwrite the UI immediately; let the token flush loop render
        // whatever chunks we already received, then finalize once the queue drains.
        finalTextRef.current = savedText;
        if (tokenQueueRef.current.length === 0) {
          pendingDoneRef.current = false;
          finalTextRef.current = null;
          setStreamedText(savedText);
          setIsStreaming(false);
          setIsDone(true);
        }
        setError(null);
        return;
      }

      if (data?.status === 'FAILED') {
        stopFlushLoop();
        tokenQueueRef.current = [];
        pendingDoneRef.current = false;
        finalTextRef.current = null;
        setError(data.errorMsg || 'Summary failed. Open dashboard to view details.');
        setIsStreaming(false);
      }
    } catch {
      // If final sync fails, preserve already streamed content; finalize when queue drains.
      finalTextRef.current = null;
      maybeFinalizeDone();
    }
  }, [maybeFinalizeDone, stopFlushLoop]);

  const startStream = useCallback((summaryId) => {
    closeCurrentStream();
    stopPolling();
    intentionallyClosedRef.current = false;
    setStreamedText('');
    setIsStreaming(true);
    setIsDone(false);
    setError(null);
    pendingDoneRef.current = false;
    finalTextRef.current = null;
    tokenQueueRef.current = [];
    stopFlushLoop();

    const token = localStorage.getItem('accessToken');
    // EventSource doesn't support custom headers, use query param as fallback
    const url = `${API_URL}/api/summary/${summaryId}/stream?token=${encodeURIComponent(token || '')}`;

    const es = new EventSource(url, { withCredentials: true });
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.chunk) enqueueChunk(data.chunk);

        if (data.done) {
          stopPolling();
          closeCurrentStream();
          pendingDoneRef.current = true;
          void syncFinalSummaryFromServer(summaryId);
          maybeFinalizeDone();
        }

        if (data.error) {
          const isRecoverableTimeout =
            typeof data.error === 'string' &&
            data.error.toLowerCase().includes('stream timeout');

          if (isRecoverableTimeout) {
            // Fallback polling is already active; keep waiting for DONE/FAILED.
            closeCurrentStream();
            return;
          }

          stopPolling();
          setError(data.error);
          stopFlushLoop();
          tokenQueueRef.current = [];
          pendingDoneRef.current = false;
          finalTextRef.current = null;
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
  }, [closeCurrentStream, enqueueChunk, startPolling, stopPolling, syncFinalSummaryFromServer]);

  const stopStream = useCallback(() => {
    closeCurrentStream();
    stopPolling();
    stopFlushLoop();
    tokenQueueRef.current = [];
    pendingDoneRef.current = false;
    finalTextRef.current = null;
    setIsStreaming(false);
  }, [closeCurrentStream, stopFlushLoop, stopPolling]);

  const reset = useCallback(() => {
    stopStream();
    setStreamedText('');
    setIsDone(false);
    setError(null);
  }, [stopStream]);

  return {streamedText, isStreaming, isDone, error, startStream, stopStream, reset};
};
