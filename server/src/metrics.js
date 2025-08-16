// Métricas simples en memoria
// - observe(key, ms): acumula duración
// - toJSON(): resumen por clave
// - toPrometheus(): métrica tipo summary simple

const store = new Map();

function observeDuration(key, durationMs) {
	const k = String(key);
	const prev = store.get(k) || { calls: 0, total_ms: 0, last_ms: 0 };
	prev.calls += 1;
	prev.total_ms += durationMs;
	prev.last_ms = durationMs;
	store.set(k, prev);
}

function getSummaryJSON() {
	const out = {};
	for (const [key, v] of store.entries()) {
		out[key] = {
			calls: v.calls,
			total_ms: Number(v.total_ms.toFixed(2)),
			avg_ms: Number((v.total_ms / Math.max(1, v.calls)).toFixed(2)),
			last_ms: Number(v.last_ms.toFixed(2)),
		};
	}
	return out;
}

function toPrometheus() {
	let lines = [];
	lines.push('# HELP app_request_duration_ms_sum Suma de duración por clave en ms');
	lines.push('# TYPE app_request_duration_ms_sum counter');
	lines.push('# HELP app_request_duration_ms_count Conteo de llamadas por clave');
	lines.push('# TYPE app_request_duration_ms_count counter');
	for (const [key, v] of store.entries()) {
		const label = `key="${key.replace(/"/g, '\\"')}"`;
		lines.push(`app_request_duration_ms_sum{${label}} ${v.total_ms.toFixed(2)}`);
		lines.push(`app_request_duration_ms_count{${label}} ${v.calls}`);
	}
	return lines.join('\n') + '\n';
}

function reset() {
	store.clear();
}

module.exports = {
	observeDuration,
	getSummaryJSON,
	toPrometheus,
	reset,
};