import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolResult,
  Tool
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { SearchService } from './searchService.js';
import { MCPSearchRequest, SearchResponse } from '../types/index.js';

// Esquemas de validación
const SearchRequestSchema = z.object({
  query: z.string().min(1, 'La consulta no puede estar vacía'),
  maxResults: z.number().min(1).max(50).optional().default(10),
  language: z.string().optional().default('es'),
  region: z.string().optional().default('es'),
  safeSearch: z.enum(['strict', 'moderate', 'off']).optional().default('moderate')
});

export class MCPSearchServer {
  private server: Server;
  private searchService: SearchService;

  constructor(searchService: SearchService) {
    this.searchService = searchService;
    this.server = new Server(
      {
        name: 'web-search-server',
        version: '1.0.0',
        description: 'Servidor MCP para realizar búsquedas web'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Listar herramientas disponibles
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.getAvailableTools()
      };
    });

    // Ejecutar herramientas
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'web_search':
            return await this.handleWebSearch(args);
          case 'news_search':
            return await this.handleNewsSearch(args);
          case 'academic_search':
            return await this.handleAcademicSearch(args);
          default:
            throw new Error(`Herramienta desconocida: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`
            }
          ],
          isError: true
        };
      }
    });
  }

  private getAvailableTools(): Tool[] {
    return [
      {
        name: 'web_search',
        description: 'Realiza búsquedas generales en internet',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Término de búsqueda'
            },
            maxResults: {
              type: 'number',
              description: 'Número máximo de resultados (1-50)',
              minimum: 1,
              maximum: 50,
              default: 10
            },
            language: {
              type: 'string',
              description: 'Idioma de búsqueda (es, en, etc.)',
              default: 'es'
            },
            region: {
              type: 'string',
              description: 'Región de búsqueda (es, us, etc.)',
              default: 'es'
            },
            safeSearch: {
              type: 'string',
              enum: ['strict', 'moderate', 'off'],
              description: 'Nivel de filtro de contenido',
              default: 'moderate'
            }
          },
          required: ['query']
        }
      },
      {
        name: 'news_search',
        description: 'Busca noticias específicamente',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Término de búsqueda para noticias'
            },
            maxResults: {
              type: 'number',
              description: 'Número máximo de resultados',
              minimum: 1,
              maximum: 20,
              default: 10
            },
            language: {
              type: 'string',
              description: 'Idioma de búsqueda',
              default: 'es'
            }
          },
          required: ['query']
        }
      },
      {
        name: 'academic_search',
        description: 'Busca contenido académico y científico',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Término de búsqueda académica'
            },
            maxResults: {
              type: 'number',
              description: 'Número máximo de resultados',
              minimum: 1,
              maximum: 20,
              default: 10
            }
          },
          required: ['query']
        }
      }
    ];
  }

  private async handleWebSearch(args: any): Promise<CallToolResult> {
    const validatedArgs = SearchRequestSchema.parse(args);
    const result = await this.searchService.search(validatedArgs);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatSearchResults(result)
        }
      ]
    };
  }

  private async handleNewsSearch(args: any): Promise<CallToolResult> {
    const validatedArgs = SearchRequestSchema.parse(args);
    const result = await this.searchService.searchNews(validatedArgs);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatSearchResults(result, 'Noticias')
        }
      ]
    };
  }

  private async handleAcademicSearch(args: any): Promise<CallToolResult> {
    const validatedArgs = SearchRequestSchema.parse(args);
    const result = await this.searchService.searchAcademic(validatedArgs);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatSearchResults(result, 'Contenido Académico')
        }
      ]
    };
  }

  private formatSearchResults(result: SearchResponse, type: string = 'Resultados'): string {
    const { query, results, totalResults, searchTime } = result;
    
    let formatted = `## ${type} para: "${query}"\n\n`;
    formatted += `**Total encontrados:** ${totalResults.toLocaleString()}\n`;
    formatted += `**Tiempo de búsqueda:** ${searchTime}ms\n\n`;

    if (results.length === 0) {
      formatted += 'No se encontraron resultados para esta búsqueda.\n';
      return formatted;
    }

    results.forEach((item, index) => {
      formatted += `### ${index + 1}. ${item.title}\n`;
      formatted += `**URL:** ${item.url}\n`;
      formatted += `**Descripción:** ${item.snippet}\n`;
      if (item.datePublished) {
        formatted += `**Fecha:** ${new Date(item.datePublished).toLocaleDateString()}\n`;
      }
      formatted += '\n---\n\n';
    });

    return formatted;
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Servidor MCP iniciado y escuchando...');
  }

  async stop(): Promise<void> {
    await this.server.close();
  }
}