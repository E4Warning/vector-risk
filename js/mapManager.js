// Map management class
class MapManager {
    constructor() {
        this.map = null;
        this.layers = {
            risk: null,
            temperature: null,
            humidity: null,
            geotiff: null
        };
        this.currentRegion = null;
    }

    /**
     * Initialize the map
     */
    initMap() {
        if (this.map) {
            this.map.remove();
        }

        this.map = L.map('map').setView(CONFIG.defaultCenter, CONFIG.defaultZoom);
        
        L.tileLayer(CONFIG.tileLayer.url, {
            attribution: CONFIG.tileLayer.attribution,
            maxZoom: 19
        }).addTo(this.map);

        return this.map;
    }

    /**
     * Load and display region data
     * @param {string} regionKey - Key for the region in CONFIG
     */
    async loadRegion(regionKey) {
        const region = CONFIG.regions[regionKey];
        if (!region) {
            console.error(`Region ${regionKey} not found`);
            return;
        }

        this.currentRegion = regionKey;

        // Initialize map if not already done
        if (!this.map) {
            this.initMap();
        }

        // Set map view to region
        this.map.setView(region.center, region.zoom);

        // Clear existing layers
        this.clearLayers();

        // Load GeoJSON data
        try {
            const geojsonData = await dataLoader.loadGeoJSON(region.dataSources.geojson);
            this.addGeoJSONLayer(geojsonData);
        } catch (error) {
            console.error('Error loading GeoJSON:', error);
        }

        // Try to load GeoTIFF if available
        try {
            const geotiffData = await dataLoader.loadGeoTIFF(region.dataSources.geotiff);
            if (geotiffData) {
                this.addGeoTIFFLayer(geotiffData);
            }
        } catch (error) {
            console.warn('GeoTIFF not available:', error);
        }

        // Update stats
        this.updateStats(regionKey);
    }

    /**
     * Add GeoJSON layer to the map
     * @param {Object} geojsonData - GeoJSON data
     */
    addGeoJSONLayer(geojsonData) {
        this.layers.risk = L.geoJSON(geojsonData, {
            style: (feature) => this.getFeatureStyle(feature),
            onEachFeature: (feature, layer) => {
                if (feature.properties) {
                    const props = feature.properties;
                    const popupContent = `
                        <strong>${props.name || 'Unknown'}</strong><br>
                        Risk Level: ${props.risk_level || 'N/A'}<br>
                        Risk Score: ${props.risk_score || 'N/A'}
                    `;
                    layer.bindPopup(popupContent);
                }
            }
        }).addTo(this.map);
    }

    /**
     * Add GeoTIFF layer to the map
     * @param {Object} georaster - Parsed GeoTIFF data
     */
    addGeoTIFFLayer(georaster) {
        if (typeof GeoRasterLayer === 'undefined') {
            console.warn('GeoRasterLayer not available');
            return;
        }

        this.layers.geotiff = new GeoRasterLayer({
            georaster: georaster,
            opacity: 0.7,
            pixelValuesToColorFn: (values) => {
                const value = values[0];
                if (value === null || value === undefined) return null;
                
                // Map values to colors (assuming 0-100 scale)
                if (value > 80) return CONFIG.riskColors.very_high;
                if (value > 60) return CONFIG.riskColors.high;
                if (value > 40) return CONFIG.riskColors.medium;
                if (value > 20) return CONFIG.riskColors.low;
                return CONFIG.riskColors.very_low;
            }
        }).addTo(this.map);
    }

    /**
     * Get style for a GeoJSON feature
     * @param {Object} feature - GeoJSON feature
     * @returns {Object} Style object
     */
    getFeatureStyle(feature) {
        const riskLevel = feature.properties?.risk_level || 'low';
        const color = this.getRiskColor(riskLevel);
        
        return {
            fillColor: color,
            weight: 2,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.7
        };
    }

    /**
     * Get color for risk level
     * @param {string} riskLevel - Risk level
     * @returns {string} Color code
     */
    getRiskColor(riskLevel) {
        const level = riskLevel.toLowerCase().replace(' ', '_');
        return CONFIG.riskColors[level] || CONFIG.riskColors.medium;
    }

    /**
     * Clear all layers from the map
     */
    clearLayers() {
        Object.keys(this.layers).forEach(key => {
            if (this.layers[key]) {
                this.map.removeLayer(this.layers[key]);
                this.layers[key] = null;
            }
        });
    }

    /**
     * Toggle layer visibility
     * @param {string} layerName - Name of the layer
     * @param {boolean} visible - Whether to show the layer
     */
    toggleLayer(layerName, visible) {
        const layer = this.layers[layerName];
        if (!layer) return;

        if (visible) {
            this.map.addLayer(layer);
        } else {
            this.map.removeLayer(layer);
        }
    }

    /**
     * Update map statistics
     * @param {string} regionKey - Region key
     */
    async updateStats(regionKey) {
        const statsDiv = document.getElementById('map-stats');
        if (!statsDiv) return;

        const region = CONFIG.regions[regionKey];
        
        try {
            const csvData = await dataLoader.loadCSV(region.dataSources.csv);
            
            if (csvData.length > 0) {
                const latest = csvData[csvData.length - 1];
                const avgRisk = csvData.reduce((sum, item) => 
                    sum + parseFloat(item.risk_level || 0), 0) / csvData.length;
                
                statsDiv.innerHTML = `
                    <p><strong>Region:</strong> ${region.name}</p>
                    <p><strong>Type:</strong> ${region.type}</p>
                    <p><strong>Latest Risk:</strong> ${parseFloat(latest.risk_level || 0).toFixed(1)}</p>
                    <p><strong>Avg Risk:</strong> ${avgRisk.toFixed(1)}</p>
                    <p><strong>Data Points:</strong> ${csvData.length}</p>
                `;
            } else {
                statsDiv.innerHTML = `
                    <p><strong>Region:</strong> ${region.name}</p>
                    <p><strong>Type:</strong> ${region.type}</p>
                    <p>No data available</p>
                `;
            }
        } catch (error) {
            console.error('Error updating stats:', error);
            statsDiv.innerHTML = '<p>Error loading statistics</p>';
        }
    }

    /**
     * Destroy the map instance
     */
    destroy() {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
        this.layers = {
            risk: null,
            temperature: null,
            humidity: null,
            geotiff: null
        };
    }
}

// Create global instance
const mapManager = new MapManager();
