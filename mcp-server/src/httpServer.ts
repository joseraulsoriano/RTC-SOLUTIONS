import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import dotenv from 'dotenv';
import { z } from 'zod';
import { SearchService } from './services/searchService.js';
import { MCPSearchRequest } from './types/index.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar rate limiting
const rateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip,
  points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') / 1000, // convertir a segundos
});

// Esquema de validación para requests
const SearchRequestSchema = z.object({
  query: z.string().min(1, 'La consulta no puede estar vacía'),
  maxResults: z.number().min(1).max(50).optional().default(10),
  language: z.string().optional().default('es'),
  region: z.string().optional().default('es'),
  safeSearch: z.enum(['strict', 'moderate', 'off']).optional().default('moderate')
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:8081'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware de rate limiting
app.use(async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch (rejRes) {
    res.status(429).json({
      error: 'Demasiadas solicitudes',
      message: 'Has excedido el límite de solicitudes. Intenta de nuevo más tarde.',
      retryAfter: Math.round(rejRes.msBeforeNext / 1000)
    });
  }
});

// Inicializar servicio de búsqueda
const searchService = new SearchService(
  process.env.SEARCH_API_KEY || '',
  process.env.SEARCH_ENGINE_ID || ''
);

// Rutas de la API
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.get('/api/info', (req, res) => {
  res.json({
    name: 'MCP Web Search Server',
    version: '1.0.0',
    description: 'Servidor MCP para realizar búsquedas web',
    endpoints: {
      '/api/search': 'Búsqueda general en web',
      '/api/search/news': 'Búsqueda de noticias',
      '/api/search/academic': 'Búsqueda académica'
    },
    rateLimits: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')
    }
  });
});

// Búsqueda general
app.post('/api/search', async (req, res) => {
  try {
    const validatedRequest = SearchRequestSchema.parse(req.body);
    const result = await searchService.search(validatedRequest);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error en búsqueda general:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Datos de entrada inválidos',
        details: error.errors
      });
    } else {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor'
      });
    }
  }
});

// Búsqueda de noticias
app.post('/api/search/news', async (req, res) => {
  try {
    const validatedRequest = SearchRequestSchema.parse(req.body);
    const result = await searchService.searchNews(validatedRequest);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error en búsqueda de noticias:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Datos de entrada inválidos',
        details: error.errors
      });
    } else {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor'
      });
    }
  }
});

// Búsqueda académica
app.post('/api/search/academic', async (req, res) => {
  try {
    const validatedRequest = SearchRequestSchema.parse(req.body);
    const result = await searchService.searchAcademic(validatedRequest);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error en búsqueda académica:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Datos de entrada inválidos',
        details: error.errors
      });
    } else {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor'
      });
    }
  }
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint no encontrado',
    message: `La ruta ${req.method} ${req.originalUrl} no existe`
  });
});

// Manejo global de errores
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error no manejado:', err);
  
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo salió mal'
  });
});

// Iniciar servidor
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor HTTP ejecutándose en puerto ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`📖 API Info: http://localhost:${PORT}/api/info`);
});

// Manejo de cierre graceful
process.on('SIGTERM', () => {
  console.log('SIGTERM recibido, cerrando servidor HTTP...');
  server.close(() => {
    console.log('Servidor HTTP cerrado.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT recibido, cerrando servidor HTTP...');
  server.close(() => {
    console.log('Servidor HTTP cerrado.');
    process.exit(0);
  });
});

export default app;