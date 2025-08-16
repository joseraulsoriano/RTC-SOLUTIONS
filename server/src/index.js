require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { observeDuration, getSummaryJSON, toPrometheus } = require('./metrics');
const { TTLCache } = require('./cache');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
app.use(cors());
app.disable('x-powered-by');

const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
app.use((req, res, next) => {
	res.header('Access-Control-Allow-Origin', CORS_ORIGIN);
	res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
	next();
});

const cache = new TTLCache({ maxEntries: 1000, defaultTtlMs: 30 * 60 * 1000 });
app.use(express.json());

const PORT = process.env.PORT || 8080;

app.get('/health', (_req, res) => {
	const startedAt = Date.now();
	const payload = { ok: true, ts: new Date().toISOString() };
	const durationMs = Date.now() - startedAt;
	observeDuration('health', durationMs);
	res.json(payload);
});

app.get('/stats', (_req, res) => {
	res.json(getSummaryJSON());
});

app.get('/metrics', (_req, res) => {
	res.set('Content-Type', 'text/plain; version=0.0.4');
	res.send(toPrometheus());
});

function normalizeQuery(q) {
	return String(q || '').trim();
}

async function braveSearch(query, topK = 5) {
	const apiKey = process.env.BRAVE_API_KEY;
	const params = new URLSearchParams({ q: query, count: String(topK) });
	params.set('search_lang', 'es');
	params.set('ui_lang', 'es');
	params.set('country', 'mx');
	params.set('safesearch', 'moderate');
	const headers = apiKey ? { 'X-Subscription-Token': apiKey } : {};
	if (!apiKey) {
		throw new Error('missing_brave_api_key');
	}
	const url = `https://api.search.brave.com/res/v1/web/search?${params.toString()}`;
	const t0 = Date.now();
	const { data } = await axios.get(url, { headers, timeout: 8000 });
	observeDuration('provider_brave', Date.now() - t0);
	const items = (data.web?.results || []).map(r => ({
		title: r.title,
		url: r.url,
		snippet: r.description,
		source: 'brave',
		score: r.rank || 0,
	}));
	return items;
}

async function bingSearchApi(query, topK = 5) {
	const apiKey = process.env.BING_API_KEY;
	if (!apiKey) throw new Error('missing_bing_api_key');
	const params = new URLSearchParams({ q: query, mkt: 'es-MX', count: String(topK), safeSearch: 'Moderate' });
	const url = `https://api.bing.microsoft.com/v7.0/search?${params.toString()}`;
	const t0 = Date.now();
	const { data } = await axios.get(url, {
		headers: { 'Ocp-Apim-Subscription-Key': apiKey },
		timeout: 8000,
	});
	observeDuration('provider_bing_api', Date.now() - t0);
	const items = (data.webPages?.value || []).map(r => ({
		title: r.name,
		url: r.url,
		snippet: r.snippet,
		source: 'bing',
		score: r.rank || 0,
	}));
	return items;
}

async function duckduckgoScrape(query, topK = 5) {
	const params = new URLSearchParams({ q: query });
	const url = `https://html.duckduckgo.com/html/?${params.toString()}`;
	const t0 = Date.now();
	const { data: html } = await axios.get(url, {
		headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SchoolSearchBot/1.0)' },
		timeout: 10000,
	});
	observeDuration('provider_duckduckgo_html', Date.now() - t0);
	const $ = cheerio.load(html);
	const results = [];
	$('div.result').each((_, el) => {
		if (results.length >= topK) return false;
		const linkEl = $(el).find('a.result__a').first();
		let title = linkEl.text().trim();
		let url = linkEl.attr('href');
		if (!url) {
			const altLink = $(el).find('a[href]').first();
			title = title || altLink.text().trim();
			url = altLink.attr('href');
		}
		if (url && url.startsWith('/l/?kh=')) {
			const u = new URL('https://duckduckgo.com' + url);
			url = u.searchParams.get('uddg') || url;
		}
		const snippet = $(el).find('.result__snippet, .result__snippet.js-result-snippet').text().trim();
		if (url) results.push({ title: title || url, url, snippet, source: 'duckduckgo', score: 0 });
	});
	return results;
}

async function bingScrape(query, topK = 5) {
	const params = new URLSearchParams({ q: query, setlang: 'es-MX' });
	const url = `https://www.bing.com/search?${params.toString()}`;
	const t0 = Date.now();
	const { data: html } = await axios.get(url, {
		headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SchoolSearchBot/1.0)' },
		timeout: 10000,
	});
	observeDuration('provider_bing_html', Date.now() - t0);
	const $ = cheerio.load(html);
	const results = [];
	$('li.b_algo').each((_, el) => {
		if (results.length >= topK) return false;
		const a = $(el).find('h2 a').first();
		const title = a.text().trim();
		const url = a.attr('href');
		const snippet = $(el).find('div.b_caption p').text().trim();
		if (url) results.push({ title: title || url, url, snippet, source: 'bing', score: 0 });
	});
	return results;
}

function buildSchoolBoostedQuery(q) {
	const base = q;
	const domains = [
		'site:sep.gob.mx',
		'site:gob.mx/sep',
		'site:.edu.mx',
		'site:.gob.mx',
		'site:unam.mx',
		'site:ipn.mx',
		'site:uab.mx',
		'site:uady.mx',
		'site:uam.mx',
		'site:tec.mx',
	];
	const keywords = ['escuela', 'colegio', 'universidad', 'bachillerato', 'preparatoria', 'becas', 'calendario escolar', 'inscripciones', 'voluntariado', 'servicio social', 'convocatoria'];
	return `${base} (${domains.join(' OR ')}) (${keywords.join(' OR ')})`;
}

app.get('/api/schools/search', async (req, res) => {
	const startedAt = Date.now();
	try {
		const q = normalizeQuery(req.query.q);
		if (!q) return res.status(400).json({ error: 'Parametro q requerido' });
		const topK = parseInt(String(req.query.k || '5'), 10);
		const boostedQuery = buildSchoolBoostedQuery(q);
		const k = isNaN(topK) ? 5 : topK;

		// Cache lookup
		const cacheKey = `schools:${k}:${boostedQuery}`;
		const cached = cache.get(cacheKey);
		if (cached) {
			const durationMs = Date.now() - startedAt;
			observeDuration('api_schools_search_cache_hit', durationMs);
			return res.json({ query: q, boostedQuery, results: cached, duration_ms: durationMs, cache: 'hit' });
		}

		let results = [];
		try {
			if (process.env.BRAVE_API_KEY) {
				results = await braveSearch(boostedQuery, k);
			} else if (process.env.BING_API_KEY) {
				results = await bingSearchApi(boostedQuery, k);
			} else {
				try {
					results = await duckduckgoScrape(boostedQuery, k);
				} catch (_err2) {
					results = await bingScrape(boostedQuery, k);
				}
			}
		} catch (_err) {
			try {
				results = await duckduckgoScrape(boostedQuery, k);
			} catch (_err2) {
				results = await bingScrape(boostedQuery, k);
			}
		}

		cache.set(cacheKey, results);
		const durationMs = Date.now() - startedAt;
		observeDuration('api_schools_search', durationMs);
		res.json({ query: q, boostedQuery, results, duration_ms: durationMs, cache: 'miss' });
	} catch (error) {
		const status = error.response?.status || 500;
		const durationMs = Date.now() - startedAt;
		observeDuration('api_schools_search', durationMs);
		res.status(status).json({ error: 'search_failed', details: error.message, duration_ms: durationMs });
	}
});

app.listen(PORT, () => {
	console.log(`[server] listening on :${PORT}`);
});