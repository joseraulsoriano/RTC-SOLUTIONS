# MCP Search - Agente de Búsqueda Web

Una implementación completa de un agente MCP (Model Context Protocol) para realizar búsquedas web inteligentes con una aplicación React Native como cliente.

## 🚀 Características

### Servidor MCP
- **Protocolo MCP**: Implementación completa del Model Context Protocol
- **Múltiples proveedores**: Google Custom Search API y DuckDuckGo como fallback
- **Tipos de búsqueda**: General, noticias y contenido académico
- **Seguridad**: Rate limiting, validación de entrada, headers de seguridad
- **Escalabilidad**: Arquitectura preparada para producción

### Aplicación React Native
- **UI moderna**: Interfaz Material Design 3 con tema claro/oscuro
- **Búsqueda inteligente**: Sugerencias basadas en historial
- **Offline-first**: Manejo de conectividad y caché
- **UX optimizada**: Estados de carga, error y resultados vacíos

## 📁 Estructura del Proyecto

```
/workspace/
├── mcp-server/                 # Servidor MCP
│   ├── src/
│   │   ├── services/          # Servicios de búsqueda y MCP
│   │   ├── middleware/        # Middleware de seguridad
│   │   ├── types/            # Definiciones TypeScript
│   │   ├── index.ts          # Punto de entrada MCP
│   │   └── httpServer.ts     # Servidor HTTP para desarrollo
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── .env.example
├── react-native-app/          # Aplicación móvil
│   ├── src/
│   │   ├── components/       # Componentes React Native
│   │   ├── screens/          # Pantallas de la app
│   │   ├── services/         # Cliente API
│   │   ├── hooks/           # Hooks personalizados
│   │   ├── store/           # Estado global (Zustand)
│   │   └── types/           # Tipos TypeScript
│   ├── App.tsx
│   ├── index.js
│   └── package.json
└── deployment/               # Configuración de despliegue
    ├── docker-compose.yml
    ├── nginx/
    └── .env.example
```

## 🛠️ Instalación y Configuración

### Prerrequisitos

- Node.js 18+
- Docker y Docker Compose
- React Native CLI (para desarrollo móvil)
- Android Studio / Xcode (para emuladores)

### 1. Configurar el Servidor MCP

```bash
cd mcp-server

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus API keys

# Desarrollo
npm run dev

# Producción
npm run build
npm start
```

### 2. Configurar la Aplicación React Native

```bash
cd react-native-app

# Instalar dependencias
npm install

# iOS (macOS únicamente)
cd ios && pod install && cd ..

# Ejecutar en Android
npm run android

# Ejecutar en iOS
npm run ios
```

### 3. Despliegue con Docker

```bash
cd deployment

# Configurar variables de entorno
cp .env.example .env
# Editar .env con configuración de producción

# Iniciar todos los servicios
docker-compose up -d

# Ver logs
docker-compose logs -f mcp-server
```

## 🔧 Configuración

### Variables de Entorno del Servidor

```env
# APIs de búsqueda
SEARCH_API_KEY=tu_google_custom_search_api_key
SEARCH_ENGINE_ID=tu_google_custom_search_engine_id

# Seguridad
JWT_SECRET=tu_jwt_secret_super_seguro
VALID_API_KEYS=api_key_1,api_key_2

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8081
```

### Configuración de Google Custom Search

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la Custom Search JSON API
4. Crea credenciales (API Key)
5. Ve a [Custom Search Engine](https://cse.google.com/)
6. Crea un nuevo motor de búsqueda
7. Copia el Search Engine ID

## 🔍 API Endpoints

### Servidor HTTP (Desarrollo)

```http
GET  /health              # Health check
GET  /api/info           # Información del servidor
POST /api/search         # Búsqueda general
POST /api/search/news    # Búsqueda de noticias
POST /api/search/academic # Búsqueda académica
```

### Formato de Request

```json
{
  "query": "inteligencia artificial",
  "maxResults": 10,
  "language": "es",
  "region": "es",
  "safeSearch": "moderate"
}
```

### Formato de Response

```json
{
  "success": true,
  "data": {
    "query": "inteligencia artificial",
    "results": [
      {
        "title": "Título del resultado",
        "url": "https://ejemplo.com",
        "snippet": "Descripción del resultado...",
        "displayUrl": "ejemplo.com",
        "datePublished": "2024-01-01T00:00:00Z"
      }
    ],
    "totalResults": 1250000,
    "searchTime": 245
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## 🔒 Seguridad

### Medidas Implementadas

- **Rate Limiting**: Límites por IP y tipo de endpoint
- **Validación de Entrada**: Sanitización y validación de queries
- **Headers de Seguridad**: CSP, HSTS, X-Frame-Options, etc.
- **Protección DDoS**: Detección básica de patrones maliciosos
- **CORS**: Configuración restrictiva de orígenes permitidos
- **API Keys**: Autenticación opcional para producción

### Configuración de Nginx

El reverse proxy Nginx incluye:
- Terminación SSL/TLS
- Rate limiting adicional
- Headers de seguridad
- Compresión gzip
- Logging de seguridad

## 📱 Funcionalidades de la App React Native

### Componentes Principales

1. **SearchBar**: Barra de búsqueda con sugerencias
2. **SearchResults**: Lista de resultados optimizada
3. **HomeScreen**: Pantalla principal con estado global

### Características

- **Sugerencias**: Basadas en historial de búsquedas
- **Tipos de búsqueda**: General, noticias, académico
- **Estado offline**: Manejo de conectividad
- **Caché**: Resultados en caché con React Query
- **Compartir**: Funcionalidad nativa de compartir
- **Temas**: Soporte para modo claro/oscuro

## 🚀 Despliegue en Producción

### Opciones de Hosting

1. **VPS/Servidor Dedicado**
   ```bash
   # Clonar repositorio
   git clone <repo-url>
   cd mcp-search
   
   # Configurar y desplegar
   cd deployment
   cp .env.example .env
   # Editar .env
   docker-compose up -d
   ```

2. **Azure App Service**
   - Seguir la [guía oficial de Microsoft](https://learn.microsoft.com/es-es/azure/app-service/tutorial-ai-model-context-protocol-server-node)
   - Configurar variables de entorno
   - Habilitar HTTPS

3. **AWS/GCP**
   - Usar ECS/Cloud Run
   - Configurar Load Balancer
   - Implementar WAF

### Consideraciones de Producción

- **SSL/TLS**: Usar certificados válidos
- **Monitoreo**: Prometheus + Grafana incluidos
- **Logs**: Centralización con ELK stack
- **Backup**: Base de datos y configuración
- **Escalado**: Horizontal con load balancer

## 🔧 Desarrollo

### Scripts Disponibles

**Servidor MCP:**
```bash
npm run dev      # Desarrollo con hot reload
npm run build    # Compilar TypeScript
npm run start    # Producción
npm run test     # Ejecutar tests
```

**React Native:**
```bash
npm run android  # Ejecutar en Android
npm run ios      # Ejecutar en iOS
npm run start    # Metro bundler
npm run lint     # Linting
```

### Estructura de Código

- **TypeScript**: Tipado estricto en todo el proyecto
- **ESLint/Prettier**: Formateo y linting consistente
- **Modular**: Arquitectura por capas y responsabilidades
- **Testing**: Jest para pruebas unitarias

## 📊 Monitoreo

### Métricas Disponibles

- **Performance**: Tiempo de respuesta, throughput
- **Errores**: Rate de errores, tipos de errores
- **Uso**: Requests por endpoint, usuarios activos
- **Sistema**: CPU, memoria, disco

### Dashboards Grafana

Accede a `http://localhost:3001` (admin/password configurado)

- **Overview**: Métricas generales del sistema
- **API**: Performance de endpoints
- **Security**: Eventos de seguridad
- **Infrastructure**: Recursos del servidor

## 🤝 Contribución

1. Fork el repositorio
2. Crea una rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crea un Pull Request

## 📄 Licencia

MIT License - ver [LICENSE](LICENSE) para más detalles.

## 🆘 Soporte

### Problemas Comunes

1. **Error de API Key**
   - Verificar configuración en `.env`
   - Validar permisos en Google Cloud Console

2. **Rate Limiting**
   - Ajustar límites en configuración
   - Implementar caché más agresivo

3. **Conectividad React Native**
   - Verificar URL del servidor
   - Configurar network security config (Android)

### Contacto

- Issues: [GitHub Issues](https://github.com/tu-usuario/mcp-search/issues)
- Documentación: [Wiki](https://github.com/tu-usuario/mcp-search/wiki)
- Email: tu-email@ejemplo.com

---

**¡Construido con ❤️ usando MCP, React Native y Node.js!**