# School Search Server

Servidor Express para búsqueda de información educativa/voluntariados con selección de proveedor (Brave/Bing API) y fallbacks. Incluye métricas `/stats` (JSON) y `/metrics` (Prometheus).

## Variables de entorno

Copia `.env.example` a `.env` y rellena según proveedor disponible.

- `PORT`: Puerto (Railway lo inyecta automáticamente)
- `BRAVE_API_KEY`: opcional
- `BING_API_KEY`: opcional
- `CORS_ORIGIN`: origen permitido (por defecto `*`)

## Desarrollo local

```bash
npm i
npm start
curl -s http://127.0.0.1:8080/health
curl -s "http://127.0.0.1:8080/api/schools/search?q=voluntariado%20universitario%20cdmx&k=5"
```

## Métricas

- JSON: `GET /stats`
- Prometheus: `GET /metrics`

## Deploy en Railway (contenerizado)

1. Crear servicio a partir del repo
2. Railway detectará el Dockerfile en `server/`
3. Variables de entorno: añade `BRAVE_API_KEY` o `BING_API_KEY`
4. Deploy y probar:

```bash
curl -s https://<tu-servicio>.up.railway.app/health
curl -s "https://<tu-servicio>.up.railway.app/api/schools/search?q=voluntariado%20mexico&k=5"
```

## Integración con React Native

```ts
const search = async (q: string, k = 5) => {
	const url = `https://<tu-servicio>.up.railway.app/api/schools/search?q=${encodeURIComponent(q)}&k=${k}`;
	const resp = await fetch(url);
	if (!resp.ok) throw new Error('search_failed');
	return resp.json();
};
```

## Notas

- Para resultados confiables y tiempos < 1 s, usa proveedor API (Brave o Bing). Los scrapers son solo fallback.
- Considera añadir Redis para caché persistente si habrá alto volumen.