import morgan from 'morgan';
import { config } from '../config';
import { httpLogStream } from '../utils/logger';

// Custom Morgan token for response time in ms
morgan.token('response-time-ms', (req, res) => {
  const responseTime = res.getHeader('X-Response-Time');
  return responseTime ? String(responseTime) : '-';
});

// Development format - colorized and detailed
const devFormat = ':method :url :status :response-time ms - :res[content-length]';

// Production format - JSON-like for log aggregation
const prodFormat = JSON.stringify({
  method: ':method',
  url: ':url',
  status: ':status',
  responseTime: ':response-time',
  contentLength: ':res[content-length]',
  userAgent: ':user-agent',
  ip: ':remote-addr',
});

// Create appropriate Morgan middleware based on environment
export const requestLogger = morgan(
  config.isProduction ? prodFormat : devFormat,
  {
    stream: httpLogStream,
    skip: (req) => {
      // Skip health check endpoints in production
      if (config.isProduction && req.url === '/health') {
        return true;
      }
      return false;
    },
  }
);

export default requestLogger;
