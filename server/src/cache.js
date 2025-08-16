// Caché en memoria con TTL

class TTLCache {
	constructor(options = {}) {
		this.maxEntries = options.maxEntries || 500;
		this.defaultTtlMs = options.defaultTtlMs || 15 * 60 * 1000; // 15 min
		this.map = new Map();
	}

	get(key) {
		const k = String(key);
		const entry = this.map.get(k);
		if (!entry) return undefined;
		if (Date.now() > entry.expiresAt) {
			this.map.delete(k);
			return undefined;
		}
		return entry.value;
	}

	set(key, value, ttlMs) {
		const k = String(key);
		const expiresAt = Date.now() + (typeof ttlMs === 'number' ? ttlMs : this.defaultTtlMs);
		this.map.set(k, { value, expiresAt });
		if (this.map.size > this.maxEntries) {
			// Evict oldest
			const firstKey = this.map.keys().next().value;
			this.map.delete(firstKey);
		}
	}

	delete(key) {
		this.map.delete(String(key));
	}

	clear() {
		this.map.clear();
	}
}

module.exports = { TTLCache };