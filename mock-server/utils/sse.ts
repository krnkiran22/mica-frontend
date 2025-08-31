import { Response } from 'express';

// Common SSE headers
export function initSSE(res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.(); // flush if compression middleware not present
}

// Send one JSON payload as an SSE "message" event
export function sendSSE(res: Response, data: unknown) {
  res.write(`event: message\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}