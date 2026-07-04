import http from 'http';
import https from 'https';
import { URL } from 'url';
import { logger } from './logger';

export function httpRequest(options: {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: any;
  label?: string;
}): Promise<{ status: number; data: any }> {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(options.url);
    const isHttps = parsedUrl.protocol === 'https:';
    const lib = isHttps ? https : http;

    const bodyStr = options.body ? JSON.stringify(options.body) : undefined;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (bodyStr) {
      headers['Content-Length'] = String(Buffer.byteLength(bodyStr));
    }

    // Log full request
    const path = parsedUrl.pathname + parsedUrl.search;
    logger.info(`HTTP SEND ${options.method} ${path}`, {
      method: options.method,
      url: options.url,
      body: options.body || null,
      headers: { ...headers, Authorization: headers.Authorization ? '***' : undefined },
    });

    const req = lib.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path,
        method: options.method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          const elapsed = Date.now() - startTime;
          let parsed: any;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = String(data);
          }

          // Log full response
          logger.info(`HTTP RECV ${options.method} ${path}`, {
            status: res.statusCode || 0,
            elapsed: `${elapsed}ms`,
            body: parsed,
          });

          resolve({ status: res.statusCode || 0, data: parsed });
        });
      },
    );

    req.on('error', (err) => {
      const elapsed = Date.now() - startTime;
      logger.error(`HTTP FAIL ${options.method} ${path}`, { error: err.message, elapsed: `${elapsed}ms` });
      reject(err);
    });
    req.setTimeout(15000, () => {
      logger.warn(`HTTP TIMEOUT ${options.method} ${path}`);
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}
