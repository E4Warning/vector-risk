// Data loading utilities
class DataLoader {
    constructor() {
        this.cache = new Map();
    }

    /**
     * Load CSV data from a URL
     * @param {string} url - URL to the CSV file
     * @returns {Promise<Array>} Parsed CSV data
     */
    async loadCSV(url) {
        if (this.cache.has(url)) {
            return this.cache.get(url);
        }

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const text = await this.getCSVText(response, url);
            const data = this.parseCSV(text);
            this.cache.set(url, data);
            return data;
        } catch (error) {
            console.warn(`Could not load CSV from ${url}:`, error);
            return this.generateSampleCSVData();
        }
    }

    /**
     * Get CSV text, handling gzip-compressed responses when needed
     * @param {Response} response - Fetch response object
     * @param {string} url - Original URL (used to detect .gz files)
     * @returns {Promise<string>} CSV text
     */
    async getCSVText(response, url) {
        const isGzip = url.endsWith('.gz') ||
            response.headers.get('content-encoding') === 'gzip' ||
            (response.headers.get('content-type') || '').includes('gzip');

        if (!isGzip) {
            return await response.text();
        }

        const textFallbackResponse = response.clone();

        if (typeof DecompressionStream !== 'undefined' && response.body?.pipeThrough) {
            try {
                const decompressedStream = response.body.pipeThrough(new DecompressionStream('gzip'));
                return await new Response(decompressedStream).text();
            } catch (err) {
                console.warn('Gzip decompression via stream failed, trying alternative method:', err);
            }
        }

        try {
            const arrayBuffer = await response.arrayBuffer();
            if (typeof pako !== 'undefined' && typeof pako.ungzip === 'function') {
                return pako.ungzip(new Uint8Array(arrayBuffer), { to: 'string' });
            }
        } catch (err) {
            console.warn('Gzip decompression via pako failed:', err);
        }

        try {
            return await textFallbackResponse.text();
        } catch (err) {
            console.warn('Falling back to empty text after gzip failures:', err);
            return '';
        }
    }

    /**
     * Parse CSV text into an array of objects
     * Handles basic CSV parsing - for production, consider using a proper CSV library
     * @param {string} csvText - Raw CSV text
     * @returns {Array} Parsed data
     */
    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        return lines.slice(1).map(line => {
            // Basic CSV parsing - does not handle quoted fields with commas
            // For complex CSV files, consider using a proper CSV parsing library
            const values = line.split(',').map(v => v.trim());
            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = values[index];
            });
            return obj;
        });
    }

    /**
     * Load GeoJSON data from a URL
     * @param {string} url - URL to the GeoJSON file
     * @returns {Promise<Object>} GeoJSON data
     */
    async loadGeoJSON(url) {
        if (this.cache.has(url)) {
            return this.cache.get(url);
        }

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.cache.set(url, data);
            return data;
        } catch (error) {
            console.warn(`Could not load GeoJSON from ${url}:`, error);
            return this.generateSampleGeoJSON();
        }
    }

    /**
     * Load GeoTIFF data from a URL
     * @param {string} url - URL to the GeoTIFF file
     * @returns {Promise<Object>} GeoTIFF data
     */
    async loadGeoTIFF(url) {
        if (this.cache.has(url)) {
            return this.cache.get(url);
        }

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            
            // Parse GeoTIFF using georaster library if available
            if (typeof window.parseGeoraster !== 'undefined') {
                const georaster = await window.parseGeoraster(arrayBuffer);
                this.cache.set(url, georaster);
                return georaster;
            }
            
            return null;
        } catch (error) {
            console.warn(`Could not load GeoTIFF from ${url}:`, error);
            return null;
        }
    }

    /**
     * Generate sample CSV data for demonstration
     * @returns {Array} Sample data
     */
    generateSampleCSVData() {
        const data = [];
        const startDate = new Date('2024-01-01');
        
        for (let i = 0; i < 12; i++) {
            const date = new Date(startDate);
            date.setMonth(startDate.getMonth() + i);
            
            data.push({
                date: date.toISOString().split('T')[0],
                risk_level: Math.random() * 100,
                temperature: 15 + Math.random() * 20,
                humidity: 40 + Math.random() * 40,
                observations: Math.floor(Math.random() * 100)
            });
        }
        
        return data;
    }

    /**
     * Generate sample GeoJSON data for demonstration
     * @returns {Object} Sample GeoJSON
     */
    generateSampleGeoJSON() {
        return {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    properties: {
                        name: 'Sample Area 1',
                        risk_level: 'high',
                        risk_score: 75
                    },
                    geometry: {
                        type: 'Point',
                        coordinates: [0, 0]
                    }
                },
                {
                    type: 'Feature',
                    properties: {
                        name: 'Sample Area 2',
                        risk_level: 'medium',
                        risk_score: 50
                    },
                    geometry: {
                        type: 'Point',
                        coordinates: [1, 1]
                    }
                }
            ]
        };
    }

    /**
     * Clear the cache
     */
    clearCache() {
        this.cache.clear();
    }
}

// Create a global instance
const dataLoader = new DataLoader();
