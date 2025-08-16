import axios from 'axios';
import * as cheerio from 'cheerio';
import { SearchResult, SearchResponse, MCPSearchRequest } from '../types';

export class SearchService {
  private readonly apiKey: string;
  private readonly engineId: string;

  constructor(apiKey: string, engineId: string) {
    this.apiKey = apiKey;
    this.engineId = engineId;
  }

  /**
   * Realiza búsqueda usando Google Custom Search API
   */
  async searchGoogle(request: MCPSearchRequest): Promise<SearchResponse> {
    const startTime = Date.now();
    
    try {
      const params = {
        key: this.apiKey,
        cx: this.engineId,
        q: request.query,
        num: Math.min(request.maxResults || 10, 10),
        hl: request.language || 'es',
        gl: request.region || 'es',
        safe: request.safeSearch || 'moderate'
      };

      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params,
        timeout: 10000
      });

      const results: SearchResult[] = (response.data.items || []).map((item: any) => ({
        title: item.title,
        url: item.link,
        snippet: item.snippet,
        displayUrl: item.displayLink,
        datePublished: item.pagemap?.metatags?.[0]?.['article:published_time']
      }));

      return {
        query: request.query,
        results,
        totalResults: parseInt(response.data.searchInformation?.totalResults || '0'),
        searchTime: Date.now() - startTime
      };
    } catch (error) {
      console.error('Error en búsqueda Google:', error);
      throw new Error(`Error en búsqueda: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Búsqueda alternativa usando DuckDuckGo (sin API key)
   */
  async searchDuckDuckGo(request: MCPSearchRequest): Promise<SearchResponse> {
    const startTime = Date.now();
    
    try {
      // Primero obtenemos el token de búsqueda
      const tokenResponse = await axios.get('https://duckduckgo.com/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 5000
      });

      const $ = cheerio.load(tokenResponse.data);
      const vqd = $('input[name="vqd"]').attr('value');

      if (!vqd) {
        throw new Error('No se pudo obtener token de DuckDuckGo');
      }

      // Realizamos la búsqueda
      const searchResponse = await axios.get('https://links.duckduckgo.com/d.js', {
        params: {
          q: request.query,
          vqd,
          kl: request.region || 'es-es',
          l: request.region || 'es-es',
          p: request.safeSearch === 'strict' ? '1' : '0',
          s: '0',
          df: '',
          ex: '-1'
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://duckduckgo.com/'
        },
        timeout: 10000
      });

      // Parsear respuesta de DuckDuckGo
      const jsonMatch = searchResponse.data.match(/DDG\.pageLayout\.load\('d',(\[.*?\])\);/);
      if (!jsonMatch) {
        throw new Error('No se pudo parsear respuesta de DuckDuckGo');
      }

      const searchData = JSON.parse(jsonMatch[1]);
      const maxResults = request.maxResults || 10;
      
      const results: SearchResult[] = searchData
        .slice(0, maxResults)
        .map((item: any) => ({
          title: item.t,
          url: item.u,
          snippet: item.a,
          displayUrl: item.i,
          datePublished: undefined
        }));

      return {
        query: request.query,
        results,
        totalResults: searchData.length,
        searchTime: Date.now() - startTime
      };
    } catch (error) {
      console.error('Error en búsqueda DuckDuckGo:', error);
      throw new Error(`Error en búsqueda DuckDuckGo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Método principal que intenta múltiples proveedores
   */
  async search(request: MCPSearchRequest): Promise<SearchResponse> {
    // Validar entrada
    if (!request.query || request.query.trim().length === 0) {
      throw new Error('La consulta de búsqueda no puede estar vacía');
    }

    // Intentar Google primero si tenemos API key
    if (this.apiKey && this.engineId) {
      try {
        return await this.searchGoogle(request);
      } catch (error) {
        console.warn('Fallo en Google Search, intentando DuckDuckGo:', error);
      }
    }

    // Fallback a DuckDuckGo
    return await this.searchDuckDuckGo(request);
  }

  /**
   * Búsqueda de noticias específica
   */
  async searchNews(request: MCPSearchRequest): Promise<SearchResponse> {
    const newsRequest = {
      ...request,
      query: `${request.query} site:news.google.com OR site:bbc.com OR site:cnn.com OR site:reuters.com`
    };
    
    return await this.search(newsRequest);
  }

  /**
   * Búsqueda académica
   */
  async searchAcademic(request: MCPSearchRequest): Promise<SearchResponse> {
    const academicRequest = {
      ...request,
      query: `${request.query} site:scholar.google.com OR site:arxiv.org OR site:researchgate.net`
    };
    
    return await this.search(academicRequest);
  }
}