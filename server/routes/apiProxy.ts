import { Router, Request, Response } from 'express';
import type { RequestContext } from '../src/index';

// Store active stream controllers for cancellation
const activeStreamControllers = new Map<string, AbortController>();

export function setupApiProxyRoutes(app: Router) {
  const router = Router();

  // {埋点} ⚡ 外部API代理 (ID: api-test-005) 接收{url,method,headers,body}，fetch后返回{ok,status,data}
  router.post('/fetch', async (req: Request, res: Response) => {
    try {
      const { url, method, headers, body } = req.body;

      if (!url || typeof url !== 'string') {
        return res.status(400).json({
          ok: false,
          status: 0,
          statusText: 'Invalid URL',
          error: 'URL is required',
        });
      }

      const response = await fetch(url, {
        method: method || 'GET',
        headers: headers || {},
        body: body,
      });

      const contentType = response.headers.get('content-type') || '';
      let data: string | object;

      if (contentType.includes('text/event-stream')) {
        // SSE streaming response
        data = await response.text();
      } else if (contentType.includes('application/json')) {
        data = await response.json() as object;
      } else {
        data = await response.text();
      }

      res.json({
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data,
      });
    } catch (error) {
      res.json({
        ok: false,
        status: 0,
        statusText: error instanceof Error ? error.message : 'Network error',
        headers: {},
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // POST /api/api/stream - Initiate a streaming request (Server-Sent Events)
  router.post('/stream', async (req: Request, res: Response) => {
    const { url, method, headers, body, requestId } = req.body;

    if (!url || !requestId) {
      return res.status(400).json({
        ok: false,
        status: 0,
        statusText: 'Missing required parameters: url, requestId',
      });
    }

    const controller = new AbortController();
    activeStreamControllers.set(requestId, controller);

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const response = await fetch(url, {
        method: method || 'GET',
        headers: headers || {},
        body: body,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.text();
        activeStreamControllers.delete(requestId);
        res.write(`event: error\ndata: ${JSON.stringify({
          ok: false,
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        })}\n\n`);
        res.end();
        return;
      }

      if (!response.body) {
        activeStreamControllers.delete(requestId);
        res.write(`event: error\ndata: ${JSON.stringify({
          ok: false,
          status: response.status,
          statusText: 'No response body',
        })}\n\n`);
        res.end();
        return;
      }

      // Pipe the response body to the client
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        res.write(`data: ${chunk}\n\n`);
      }

      res.write(`event: done\ndata: ${JSON.stringify({ requestId })}\n\n`);
      res.end();
    } catch (error) {
      activeStreamControllers.delete(requestId);
      if (error instanceof Error && error.name === 'AbortError') {
        res.write(`event: abort\ndata: ${JSON.stringify({ requestId })}\n\n`);
      } else {
        res.write(`event: error\ndata: ${JSON.stringify({
          ok: false,
          status: 0,
          statusText: error instanceof Error ? error.message : 'Network error',
          error: error instanceof Error ? error.message : 'Unknown error',
        })}\n\n`);
      }
      res.end();
    } finally {
      activeStreamControllers.delete(requestId);
    }
  });

  // DELETE /api/api/stream/:requestId - Cancel a streaming request
  router.delete('/stream/:requestId', (req: Request, res: Response) => {
    const { requestId } = req.params;
    const controller = activeStreamControllers.get(requestId);

    if (controller) {
      controller.abort();
      activeStreamControllers.delete(requestId);
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, error: 'Stream not found' });
    }
  });

  app.use('/api/api', router);
}
