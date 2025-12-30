// Map management class
class MapManager {
    constructor() {
        this.map = null;
        this.mbMap = null; // Mapbox GL map instance
        this.baseLayer = null; // Store reference to base tile layer
        this.currentBasemap = 'satellite'; // Track current basemap
        this.currentOpacity = 0.7; // Default opacity
        this.layers = {
            risk: null,
            observations: null,  // Placeholder for future observations layer
            range: null,         // Placeholder for future range layer
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
        
        const basemap = CONFIG.basemaps[this.currentBasemap];
        this.baseLayer = L.tileLayer(basemap.url, {
            attribution: basemap.attribution,
            maxZoom: basemap.maxZoom
        }).addTo(this.map);

        // Reset tracked layers since the map has been recreated
        this.layers = {
            risk: null,
            observations: null,  // Placeholder for future observations layer
            range: null,         // Placeholder for future range layer
            geotiff: null
        };

        return this.map;
    }

    /**
     * Switch basemap
     * @param {string} basemapKey - Key for the basemap in CONFIG.basemaps
     */
    switchBasemap(basemapKey) {
        if (!CONFIG.basemaps[basemapKey]) {
            return;
        }
        
        // Note: Basemap switching is only supported for Leaflet maps.
        // Mapbox GL maps use fixed styles with embedded data layers.
        if (!this.map) {
            console.log('Basemap switching is only supported for Leaflet-based maps');
            return;
        }
        
        // Remove all existing tile layers (base maps) to ensure clean slate
        // Note: This removes ALL L.TileLayer instances, which in the current
        // codebase are only used for basemaps. If data tile layers are added
        // in the future, they should use a different layer type or be tracked
        // separately to avoid being removed here.
        // TODO: Consider using a LayerGroup for basemaps or adding a custom
        // property (e.g., layer.isBasemap = true) to distinguish basemap tiles
        // from data tiles if needed.
        const layersToRemove = [];
        this.map.eachLayer((layer) => {
            if (layer instanceof L.TileLayer) {
                layersToRemove.push(layer);
            }
        });
        layersToRemove.forEach((layer) => {
            this.map.removeLayer(layer);
        });
        
        // Add new base layer
        const basemap = CONFIG.basemaps[basemapKey];
        this.baseLayer = L.tileLayer(basemap.url, {
            attribution: basemap.attribution,
            maxZoom: basemap.maxZoom
        }).addTo(this.map);
        
        // Move base layer to back to ensure it's behind data layers
        this.baseLayer.bringToBack();
        
        this.currentBasemap = basemapKey;
    }

    /**
     * Set opacity for risk layers
     * @param {number} opacity - Opacity value between 0 and 1
     */
    setLayerOpacity(opacity) {
        this.currentOpacity = opacity;
        
        // Update GeoJSON layer opacity
        if (this.layers.risk) {
            this.layers.risk.setStyle({
                fillOpacity: opacity
            });
        }
        
        // Update GeoTIFF layer opacity
        if (this.layers.geotiff && this.layers.geotiff.setOpacity) {
            this.layers.geotiff.setOpacity(opacity);
        }
        
        // Update Mapbox GL map layer opacity if present
        if (this.mbMap) {
            if (this.mbMap.getLayer('muni-high-res')) {
                this.mbMap.setPaintProperty('muni-high-res', 'fill-opacity', opacity);
            }
            if (this.mbMap.getLayer('muni-low-res')) {
                this.mbMap.setPaintProperty('muni-low-res', 'fill-opacity', opacity);
            }
        }
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
        if (typeof window.GeoRasterLayer === 'undefined') {
            console.warn('GeoRasterLayer not available');
            return;
        }

        this.layers.geotiff = new window.GeoRasterLayer({
            georaster: georaster,
            opacity: this.currentOpacity,
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
            fillOpacity: this.currentOpacity
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
        if (layerName === 'risk') {
            // Toggle Leaflet GeoJSON layer
            if (this.layers.risk && this.map) {
                if (visible) {
                    this.map.addLayer(this.layers.risk);
                } else {
                    this.map.removeLayer(this.layers.risk);
                }
            }

            // Toggle GeoTIFF raster layer
            if (this.layers.geotiff && this.map) {
                if (visible) {
                    this.map.addLayer(this.layers.geotiff);
                } else {
                    this.map.removeLayer(this.layers.geotiff);
                }
            }

            // Toggle Mapbox GL layers if present
            if (this.mbMap) {
                ['muni-high-res', 'muni-low-res'].forEach(layerId => {
                    if (this.mbMap.getLayer(layerId)) {
                        try {
                            this.mbMap.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
                        } catch (e) {
                            console.warn(`Failed to toggle Mapbox layer ${layerId}:`, e);
                        }
                    }
                });
            }
            return;
        }

        const layer = this.layers[layerName];
        if (!layer || !this.map) return;

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
        if (this.mbMap) {
            this.mbMap.remove();
            this.mbMap = null;
        }
        this.layers = {
            risk: null,
            observations: null,  // Placeholder for future observations layer
            range: null,         // Placeholder for future range layer
            geotiff: null
        };
    }
}

// Create global instance
const mapManager = new MapManager();
