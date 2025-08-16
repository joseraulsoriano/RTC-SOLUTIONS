#!/usr/bin/env node

import dotenv from 'dotenv';
import { SearchService } from './services/searchService.js';
import { MCPSearchServer } from './services/mcpServer.js';

// Cargar variables de entorno
dotenv.config();

async function main() {
  try {
    // Configurar servicio de búsqueda
    const searchService = new SearchService(
      process.env.SEARCH_API_KEY || '',
      process.env.SEARCH_ENGINE_ID || ''
    );

    // Crear y iniciar servidor MCP
    const mcpServer = new MCPSearchServer(searchService);
    
    // Manejar señales de cierre
    process.on('SIGINT', async () => {
      console.error('Recibida señal SIGINT, cerrando servidor...');
      await mcpServer.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.error('Recibida señal SIGTERM, cerrando servidor...');
      await mcpServer.stop();
      process.exit(0);
    });

    // Iniciar servidor
    await mcpServer.start();
    
  } catch (error) {
    console.error('Error iniciando servidor MCP:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}