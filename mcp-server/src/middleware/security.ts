import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import crypto from 'crypto';

// Rate limiters por tipo de endpoint
export const createRateLimiters = () => {
  const searchLimiter = new RateLimiterMemory({
    keyGenerator: (req: Request) => `search_${req.ip}`,
    points: 50, // 50 búsquedas
    duration: 900, // por 15 minutos
  });

  const generalLimiter = new RateLimiterMemory({
    keyGenerator: (req: Request) => `general_${req.ip}`,
    points: 100, // 100 requests
    duration: 900, // por 15 minutos
  });

  const strictLimiter = new RateLimiterMemory({
    keyGenerator: (req: Request) => `strict_${req.ip}`,
    points: 10, // 10 requests
    duration: 60, // por minuto
  });

  return { searchLimiter, generalLimiter, strictLimiter };
};

// Middleware de validación de entrada
export const validateInput = (req: Request, res: Response, next: NextFunction) => {
  const { body } = req;

  // Validar tamaño del body
  const bodySize = JSON.stringify(body).length;
  if (bodySize > 10000) { // 10KB máximo
    return res.status(413).json({
      success: false,
      error: 'Payload demasiado grande',
      message: 'El tamaño de la solicitud excede el límite permitido'
    });
  }

  // Sanitizar strings
  if (body.query) {
    body.query = sanitizeString(body.query);
    
    // Validar longitud de query
    if (body.query.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Query demasiado larga',
        message: 'La consulta no puede exceder 500 caracteres'
      });
    }

    // Detectar patrones maliciosos
    if (containsMaliciousPatterns(body.query)) {
      return res.status(400).json({
        success: false,
        error: 'Query inválida',
        message: 'La consulta contiene caracteres o patrones no permitidos'
      });
    }
  }

  next();
};

// Sanitizar strings de entrada
const sanitizeString = (str: string): string => {
  return str
    .trim()
    .replace(/[<>]/g, '') // Remover < y >
    .replace(/javascript:/gi, '') // Remover javascript:
    .replace(/data:/gi, '') // Remover data:
    .replace(/vbscript:/gi, '') // Remover vbscript:
    .substring(0, 1000); // Limitar longitud
};

// Detectar patrones maliciosos
const containsMaliciousPatterns = (str: string): boolean => {
  const maliciousPatterns = [
    /<script/i,
    /javascript:/i,
    /data:text\/html/i,
    /vbscript:/i,
    /onload=/i,
    /onerror=/i,
    /onclick=/i,
    /eval\(/i,
    /setTimeout\(/i,
    /setInterval\(/i,
    /document\.cookie/i,
    /localStorage/i,
    /sessionStorage/i,
  ];

  return maliciousPatterns.some(pattern => pattern.test(str));
};

// Middleware de headers de seguridad
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevenir clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevenir MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // XSS Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https:; " +
    "font-src 'self'; " +
    "object-src 'none'; " +
    "media-src 'self'; " +
    "frame-src 'none';"
  );

  next();
};

// Middleware de logging de seguridad
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const originalSend = res.send;

  res.send = function(body) {
    const duration = Date.now() - startTime;
    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      duration,
      bodySize: body ? body.length : 0,
    };

    // Log requests sospechosos
    if (res.statusCode >= 400 || duration > 10000) {
      console.warn('🚨 Suspicious request:', logData);
    }

    return originalSend.call(this, body);
  };

  next();
};

// Generar API key temporal (para desarrollo)
export const generateApiKey = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// Validar API key (implementación básica)
export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.header('X-API-Key') || req.query.apiKey;
  
  // En producción, deberías validar contra una base de datos
  const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
  
  if (process.env.NODE_ENV === 'production' && validApiKeys.length > 0) {
    if (!apiKey || !validApiKeys.includes(apiKey as string)) {
      return res.status(401).json({
        success: false,
        error: 'API Key inválida',
        message: 'Se requiere una API key válida para acceder a este endpoint'
      });
    }
  }

  next();
};

// Middleware de protección DDoS básica
export const ddosProtection = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip;
  const now = Date.now();
  
  // Implementación básica de detección de DDoS
  // En producción, usar soluciones más robustas como Cloudflare
  
  if (!ddosProtection.requests) {
    ddosProtection.requests = new Map();
  }

  const requests = ddosProtection.requests.get(ip) || [];
  const recentRequests = requests.filter(time => now - time < 60000); // Último minuto

  if (recentRequests.length > 100) { // Más de 100 requests por minuto
    console.warn(`🚨 Possible DDoS attack from IP: ${ip}`);
    return res.status(429).json({
      success: false,
      error: 'Demasiadas solicitudes',
      message: 'Has sido temporalmente bloqueado por actividad sospechosa'
    });
  }

  recentRequests.push(now);
  ddosProtection.requests.set(ip, recentRequests);

  next();
};

// Extender el namespace para incluir la propiedad requests
declare namespace ddosProtection {
  let requests: Map<string, number[]>;
}