// Main application logic

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Normalize a date range input into start/end strings (YYYY-MM-DD)
 * @param {string|Object} dateInput
 * @returns {{startDate: string, endDate: string}}
 */
function normalizeDateRange(dateInput) {
    const today = new Date().toISOString().split('T')[0];
    if (typeof dateInput === 'string') {
        return { startDate: dateInput, endDate: dateInput };
    }
    if (!dateInput) {
        return { startDate: today, endDate: today };
    }

    const startDate = dateInput.startDate || dateInput.endDate || today;
    const endDate = dateInput.endDate || dateInput.startDate || today;

    if (new Date(startDate) > new Date(endDate)) {
        return { startDate: endDate, endDate: startDate };
    }
    return { startDate, endDate };
}

/**
 * Build an array of ISO date strings between start and end (inclusive)
 * @param {{startDate: string, endDate: string}} range
 * @returns {string[]}
 */
function buildDateArray(range) {
    const { startDate, endDate } = normalizeDateRange(range);
    const dates = [];
    const cursor = new Date(startDate);
    const last = new Date(endDate);

    while (cursor <= last) {
        dates.push(cursor.toISOString().split('T')[0]);
        cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
}

/**
 * Format a date range for display
 * @param {{startDate: string, endDate: string}} range
 * @returns {string}
 */
function formatRangeLabel(range) {
    const { startDate, endDate } = normalizeDateRange(range);
    if (startDate === endDate) return startDate;
    return `${startDate} to ${endDate}`;
}

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

/**
 * Initialize the application
 */
function initializeApp() {
    // Set up navigation
    setupNavigation();
    
    // Set up layer controls
    setupLayerControls();
    
    // Set up region links
    setupRegionLinks();
    
    // Show home section by default
    showHome();
}

/**
 * Set up navigation event listeners
 */
function setupNavigation() {
    // Main navigation links
    document.querySelectorAll('.main-nav a[href^="#"]').forEach(link => {
        link.addEventListener('click', function(e) {
            // Check if this is a dropdown toggle
            if (this.classList.contains('dropdown-toggle')) {
                e.preventDefault();
                return;
            }
            
            if (!this.parentElement.classList.contains('dropdown')) {
                e.preventDefault();
                const section = this.getAttribute('href').substring(1);
                
                if (section === 'home') {
                    showHome();
                } else if (section === 'about') {
                    showAbout();
                }
                
                // Update active state
                document.querySelectorAll('.main-nav a').forEach(a => {
                    a.classList.remove('active');
                });
                this.classList.add('active');
            }
        });
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown').forEach(dropdown => {
                dropdown.classList.remove('active');
            });
        }
    });
}

/**
 * Set up layer control event listeners
 */
function setupLayerControls() {
    const riskLayerCheckbox = document.getElementById('risk-layer');
    const observationsLayerCheckbox = document.getElementById('observations-layer');
    const rangeLayerCheckbox = document.getElementById('range-layer');
    
    if (riskLayerCheckbox) {
        riskLayerCheckbox.addEventListener('change', function() {
            mapManager.toggleLayer('risk', this.checked);
        });
    }
    
    if (observationsLayerCheckbox) {
        observationsLayerCheckbox.addEventListener('change', function() {
            if (this.checked) {
                const startPicker = document.getElementById('data-start-date');
                const endPicker = document.getElementById('data-end-date');
                const vectorSelector = document.getElementById('vector-selector');
                const selectedSpecies = vectorSelector ? vectorSelector.value : 'ae-albopictus';
                const observationRange = (startPicker || endPicker) ? normalizeDateRange({
                    startDate: startPicker?.value,
                    endDate: endPicker?.value
                }) : null;
                // Reload observations if they are not present yet
                if (!mapManager.layers.observations && !mapManager.mbMap?.getSource?.('observations-source')) {
                    loadMosquitoObservations(mapManager.currentRegion || 'spain', selectedSpecies, observationRange);
                }
            }
            mapManager.toggleLayer('observations', this.checked);
        });
    }
    
    if (rangeLayerCheckbox) {
        rangeLayerCheckbox.addEventListener('change', function() {
            mapManager.toggleLayer('range', this.checked);
        });
    }
    
    // Transparency slider
    const transparencySlider = document.getElementById('transparency-slider');
    const transparencyValue = document.getElementById('transparency-value');
    
    if (transparencySlider && transparencyValue) {
        transparencySlider.addEventListener('input', function() {
            const opacity = this.value / 100;
            transparencyValue.textContent = this.value;
            mapManager.setLayerOpacity(opacity);
        });
    }
    
    // Basemap selector
    const basemapSelector = document.getElementById('basemap-selector');
    
    if (basemapSelector) {
        basemapSelector.addEventListener('change', function() {
            mapManager.switchBasemap(this.value);
        });
    }

    // Reload observations when the selected species changes
    const vectorSelector = document.getElementById('vector-selector');
    if (vectorSelector) {
        vectorSelector.addEventListener('change', function() {
            const startPicker = document.getElementById('data-start-date');
            const endPicker = document.getElementById('data-end-date');
            const observationRange = (startPicker || endPicker) ? normalizeDateRange({
                startDate: startPicker?.value,
                endDate: endPicker?.value
            }) : null;
            loadMosquitoObservations(mapManager.currentRegion || 'spain', this.value, observationRange);
        });
    }
}

/**
 * Set up region link event listeners
 */
function setupRegionLinks() {
    document.querySelectorAll('[data-region]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const region = this.getAttribute('data-region');
            showRegion(region);
        });
    });
}

/**
 * Show the home section
 */
function showHome() {
    hideAllSections();
    document.getElementById('home-section').classList.add('active');
    
    // Update navigation
    document.querySelectorAll('.main-nav a').forEach(a => {
        a.classList.remove('active');
    });
    document.querySelector('.main-nav a[href="#home"]')?.classList.add('active');
}

/**
 * Show the about section
 */
function showAbout() {
    hideAllSections();
    document.getElementById('about-section').classList.add('active');
}

/**
 * Show a specific region
 * @param {string} regionKey - Key for the region
 */
async function showRegion(regionKey) {
    const region = CONFIG.regions[regionKey];
    if (!region) {
        console.error(`Region ${regionKey} not found`);
        return;
    }
    
    // Hide all sections and show map section
    hideAllSections();
    document.getElementById('map-section').classList.add('active');
    
    // Update region title
    const regionTitle = document.getElementById('region-title');
    if (regionTitle) {
        regionTitle.textContent = `${region.name} Risk Map`;
    }
    
    // Update navigation
    document.querySelectorAll('.main-nav a').forEach(a => {
        a.classList.remove('active');
    });
    
    // Check if region is coming soon
    if (region.comingSoon) {
        // Show coming soon message
        const comingSoonSection = document.getElementById('coming-soon-section');
        const mapContainer = document.querySelector('.map-container');
        const visualizationSection = document.querySelector('.visualization-section');
        
        if (comingSoonSection) {
            comingSoonSection.style.display = 'block';
        }
        if (mapContainer) {
            mapContainer.style.display = 'none';
        }
        if (visualizationSection) {
            visualizationSection.style.display = 'none';
        }
        return;
    }
    
    // Hide coming soon and show map
    const comingSoonSection = document.getElementById('coming-soon-section');
    const mapContainer = document.querySelector('.map-container');
    const visualizationSection = document.querySelector('.visualization-section');
    
    if (comingSoonSection) {
        comingSoonSection.style.display = 'none';
    }
    if (mapContainer) {
        mapContainer.style.display = 'flex';
    }
    if (visualizationSection) {
        visualizationSection.style.display = 'block';
    }
    
    // Show loading message
    const mapStats = document.getElementById('map-stats');
    if (mapStats) {
        mapStats.innerHTML = '<p>Loading data...</p>';
    }
    
    // Show/hide date selector for Spain and Barcelona MosquitoAlert data
    const dateSelectorSection = document.getElementById('date-selector-section');
    if (dateSelectorSection) {
        const hasDateBasedData = (regionKey === 'barcelona' && region.dataSources.mosquitoAlertBCN && region.dataSources.mosquitoAlertBCN.enabled) ||
                                  (regionKey === 'spain' && region.dataSources.mosquitoAlertES && region.dataSources.mosquitoAlertES.enabled);
        
        if (hasDateBasedData) {
            dateSelectorSection.style.display = 'block';
            const startPicker = document.getElementById('data-start-date');
            const endPicker = document.getElementById('data-end-date');
            const today = new Date().toISOString().split('T')[0];

            if (startPicker && endPicker) {
                if (!startPicker.value) startPicker.value = today;
                if (!endPicker.value) endPicker.value = today;

                // Avoid duplicate listeners by cloning nodes
                const newStartPicker = startPicker.cloneNode(true);
                const newEndPicker = endPicker.cloneNode(true);
                startPicker.parentNode.replaceChild(newStartPicker, startPicker);
                endPicker.parentNode.replaceChild(newEndPicker, endPicker);

                const refreshForRange = () => {
                    const range = normalizeDateRange({
                        startDate: newStartPicker.value,
                        endDate: newEndPicker.value
                    });

                    if (regionKey === 'barcelona') {
                        loadBarcelonaMosquitoAlertData(range);
                    } else if (regionKey === 'spain') {
                        loadSpainMosquitoAlertData(range);
                    }

                    const vectorSelector = document.getElementById('vector-selector');
                    const selectedSpecies = vectorSelector ? vectorSelector.value : 'ae-albopictus';
                    loadMosquitoObservations(regionKey, selectedSpecies, range);
                };

                newStartPicker.addEventListener('change', refreshForRange);
                newEndPicker.addEventListener('change', refreshForRange);
            }

            // Update info text based on region
            const infoText = dateSelectorSection.querySelector('.info-text');
            if (infoText) {
                if (regionKey === 'barcelona') {
                    infoText.innerHTML = 'Data from <a href="https://github.com/Mosquito-Alert/bcn" target="_blank" rel="noopener noreferrer">MosquitoAlert BCN</a>';
                } else if (regionKey === 'spain') {
                    infoText.innerHTML = 'Data from <a href="https://github.com/Mosquito-Alert/MosquitoAlertES" target="_blank" rel="noopener noreferrer">MosquitoAlertES</a>';
                }
            }
        } else {
            dateSelectorSection.style.display = 'none';
        }
    }
    
    // Disable basemap selector for regions using Mapbox GL (Spain)
    const basemapSelector = document.getElementById('basemap-selector');
    if (basemapSelector) {
        if (regionKey === 'spain' && region.dataSources.mosquitoAlertES && region.dataSources.mosquitoAlertES.enabled) {
            basemapSelector.disabled = true;
            basemapSelector.title = 'Basemap selection not available for this region (using Mapbox GL with satellite imagery)';
        } else {
            basemapSelector.disabled = false;
            basemapSelector.title = '';
        }
    }
    
    try {
        // For Barcelona with MosquitoAlertBCN, load the GeoTIFF data
        if (regionKey === 'barcelona' && region.dataSources.mosquitoAlertBCN && region.dataSources.mosquitoAlertBCN.enabled) {
            const startPicker = document.getElementById('data-start-date');
            const endPicker = document.getElementById('data-end-date');
            const dateRange = normalizeDateRange({
                startDate: startPicker?.value,
                endDate: endPicker?.value
            });
            await loadBarcelonaMosquitoAlertData(dateRange);
        }
        // For Spain with MosquitoAlertES, load the municipality data
        else if (regionKey === 'spain' && region.dataSources.mosquitoAlertES && region.dataSources.mosquitoAlertES.enabled) {
            const startPicker = document.getElementById('data-start-date');
            const endPicker = document.getElementById('data-end-date');
            const dateRange = normalizeDateRange({
                startDate: startPicker?.value,
                endDate: endPicker?.value
            });
            await loadSpainMosquitoAlertData(dateRange);
        }
        // For other regions, load standard map data
        else {
            await mapManager.loadRegion(regionKey);
        }
        
        // Load mosquito observations overlay when available
        const vectorSelector = document.getElementById('vector-selector');
        const selectedSpecies = vectorSelector ? vectorSelector.value : 'ae-albopictus';
        const startPicker = document.getElementById('data-start-date');
        const endPicker = document.getElementById('data-end-date');
        const observationRange = (startPicker || endPicker) ? normalizeDateRange({
            startDate: startPicker?.value,
            endDate: endPicker?.value
        }) : null;
        await loadMosquitoObservations(regionKey, selectedSpecies, observationRange);
        
        // Create visualization
        await visualization.createRiskChart(regionKey);
    } catch (error) {
        console.error('Error loading region:', error);
        if (mapStats) {
            mapStats.innerHTML = '<p class="error-message">Error loading data. Please check the data sources.</p>';
        }
    }
}

/**
 * Hide all content sections
 */
function hideAllSections() {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
}

/**
 * Handle window resize
 */
window.addEventListener('resize', function() {
    if (mapManager.map) {
        mapManager.map.invalidateSize();
    }
});

/**
 * Handle page visibility change (for cleanup)
 */
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // Optionally pause animations or cleanup
    }
});

/**
 * Load MosquitoAlert Spain data for a specific date
 * @param {string|Object} dateInput - Date or date range
 */
async function loadSpainMosquitoAlertData(dateInput) {
    const { startDate, endDate } = normalizeDateRange(dateInput);
    const datesToLoad = buildDateArray({ startDate, endDate });
    const region = CONFIG.regions['spain'];
    if (!region || !region.dataSources.mosquitoAlertES) {
        console.error('MosquitoAlertES configuration not found for Spain');
        return;
    }
    
    mapManager.currentRegion = 'spain';
    const config = region.dataSources.mosquitoAlertES;
    
    try {
        const mapStats = document.getElementById('map-stats');
        if (mapStats) {
            mapStats.innerHTML = '<p>Loading data for ' + escapeHtml(formatRangeLabel({ startDate, endDate })) + '...</p>';
        }
        
        // Fetch all requested dates in parallel
        const responses = await Promise.allSettled(
            datesToLoad.map(date => {
                const dateUrl = config.baseUrl + config.filePattern.replace('{date}', date);
                return fetch(dateUrl).then(res => ({ res, date }));
            })
        );

        const allRows = [];
        for (const result of responses) {
            if (result.status !== 'fulfilled') continue;
            const { res, date } = result.value;
            if (!res.ok) {
                console.warn(`Skipping ${date} because it returned ${res.status}`);
                continue;
            }
            const muniData = await res.json();
            allRows.push({ date, rows: muniData });
        }

        // Aggregate by municipality (mean of ma_prob_mean)
        const aggregatedByCode = new Map();
        allRows.forEach(({ rows }) => {
            rows.forEach(row => {
                const natCodeStr = row['NATCODE']?.toString();
                const value = parseFloat(row['ma_prob_mean']);
                if (!natCodeStr || Number.isNaN(value)) return;

                const current = aggregatedByCode.get(natCodeStr) || { sum: 0, count: 0, sample: { NATCODE: natCodeStr } };
                current.sum += value;
                current.count += 1;
                aggregatedByCode.set(natCodeStr, current);
            });
        });

        const aggregatedArray = Array.from(aggregatedByCode.entries()).map(([code, agg]) => ({
            ...agg.sample,
            NATCODE: code,
            ma_prob_mean: agg.count > 0 ? agg.sum / agg.count : null
        }));

        if (aggregatedArray.length === 0) {
            if (mapStats) {
                mapStats.innerHTML = '<p class="error-message">No municipality predictions available for the selected range.</p>';
            }
            return;
        }
        
        // If we have Mapbox GL JS available and mapbox token, use Mapbox GL
        if (typeof mapboxgl !== 'undefined' && config.mapboxAccessToken) {
            // Remove existing Leaflet map if present
            if (mapManager.map) {
                mapManager.map.remove();
                mapManager.map = null;
            }
            
            // Create Mapbox GL map with satellite basemap style
            mapboxgl.accessToken = config.mapboxAccessToken;
            
            const mapContainer = document.getElementById('map');
            mapContainer.innerHTML = ''; // Clear container
            
            // Create a custom style with satellite raster tiles
            const blankStyle = {
                "version": 8,
                "name": "Blank with Satellite",
                "sources": {
                    "satellite": {
                        "type": "raster",
                        "tiles": [
                            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        ],
                        "tileSize": 256,
                        "attribution": "Tiles &copy; Esri"
                    }
                },
                "layers": [
                    {
                        "id": "satellite-layer",
                        "type": "raster",
                        "source": "satellite",
                        "minzoom": 0,
                        "maxzoom": 22
                    }
                ]
            };
            
            const mbMap = new mapboxgl.Map({
                container: 'map',
                style: blankStyle,
                center: [region.center[1], region.center[0]], // [lng, lat] format for Mapbox GL
                zoom: region.zoom
            });
            
            // Store reference for cleanup
            mapManager.mbMap = mbMap;
            
            mbMap.on('load', () => {
                // Add municipality boundary sources
                mbMap.addSource('municipalities-low-res', {
                    type: 'vector',
                    url: config.municipalityBoundariesLowRes,
                    maxzoom: 8,
                    minzoom: 0
                });
                
                mbMap.addSource('municipalities-high-res', {
                    type: 'vector',
                    url: config.municipalityBoundariesHighRes,
                    maxzoom: 15,
                    minzoom: 8
                });
                
                // Create color scale
                const scale = chroma.scale("Spectral").domain([1, 0]);
                
                // Create match expression for coloring municipalities
                const matchExpression = ['match', ['get', 'NATCODE']];
                
                for (const row of aggregatedArray) {
                    const value = row['ma_prob_mean'];
                    if (value !== null && value !== undefined) {
                        // Scale value with max
                        const scaledValue = Math.min(value, config.maxVRI) / config.maxVRI;
                        const color = scale(scaledValue).hex();
                        matchExpression.push(row['NATCODE'].toString(), color);
                    }
                }
                
                // Default color for municipalities without data
                matchExpression.push('rgba(0, 0, 0, 0)');
                
                // Add high-res layer
                mbMap.addLayer({
                    'id': 'muni-high-res',
                    'type': 'fill',
                    'source': 'municipalities-high-res',
                    'source-layer': config.municipalitySourceLayerHighRes,
                    'maxzoom': 22,
                    'minzoom': 8,
                    'paint': {
                        'fill-color': matchExpression,
                        'fill-opacity': mapManager.currentOpacity
                    }
                });
                
                // Add low-res layer
                mbMap.addLayer({
                    'id': 'muni-low-res',
                    'type': 'fill',
                    'source': 'municipalities-low-res',
                    'source-layer': config.municipalitySourceLayerLowRes,
                    'maxzoom': 8,
                    'minzoom': 0,
                    'paint': {
                        'fill-color': matchExpression,
                        'fill-opacity': mapManager.currentOpacity
                    }
                });
                
                // Update stats
                if (mapStats) {
                    const avgRisk = aggregatedArray.length > 0 ? aggregatedArray.reduce((sum, item) => 
                        sum + (parseFloat(item.ma_prob_mean) || 0), 0) / aggregatedArray.length : 0;
                    
                    mapStats.innerHTML = `
                        <p><strong>Region:</strong> Spain</p>
                        <p><strong>Date:</strong> ${escapeHtml(formatRangeLabel({ startDate, endDate }))}</p>
                        <p><strong>Data Source:</strong> MosquitoAlertES</p>
                        <p><strong>Municipalities:</strong> ${aggregatedArray.length}</p>
                        <p><strong>Avg VRI:</strong> ${avgRisk.toFixed(3)}</p>
                    `;
                }
            });
        } else {
            // Fallback message if Mapbox not available
            if (mapStats) {
                mapStats.innerHTML = `
                    <p><strong>Region:</strong> Spain</p>
                    <p><strong>Date:</strong> ${escapeHtml(formatRangeLabel({ startDate, endDate }))}</p>
                    <p><strong>Municipalities:</strong> ${aggregatedArray.length}</p>
                    <p class="info-message">Loaded data from MosquitoAlertES</p>
                `;
            }
        }
        
    } catch (error) {
        console.error('Error loading MosquitoAlertES data:', error);
        const mapStats = document.getElementById('map-stats');
        if (mapStats) {
            mapStats.innerHTML = '<p class="error-message">Error loading MosquitoAlertES data. The data for this date may not be available yet.</p>';
        }
    }
}

/**
 * Load MosquitoAlert Barcelona GeoTIFF data for a specific date
 * @param {string|Object} dateInput - Date or date range
 */
async function loadBarcelonaMosquitoAlertData(dateInput) {
    const { startDate, endDate } = normalizeDateRange(dateInput);
    const datesToLoad = buildDateArray({ startDate, endDate });
    const region = CONFIG.regions['barcelona'];
    if (!region || !region.dataSources.mosquitoAlertBCN) {
        console.error('MosquitoAlertBCN configuration not found for Barcelona');
        return;
    }
    
    mapManager.currentRegion = 'barcelona';
    const config = region.dataSources.mosquitoAlertBCN;
    
    try {
        const mapStats = document.getElementById('map-stats');
        if (mapStats) {
            mapStats.innerHTML = '<p>Loading data for ' + escapeHtml(formatRangeLabel({ startDate, endDate })) + '...</p>';
        }
        
        // Remove existing Mapbox map if present
        if (mapManager.mbMap) {
            mapManager.mbMap.remove();
            mapManager.mbMap = null;
        }
        
        // Initialize Leaflet map with the current basemap
        mapManager.initMap();
        mapManager.map.setView(region.center, region.zoom);
        
        // Clear existing GeoRaster layers
        if (mapManager.layers.geotiff) {
            mapManager.map.removeLayer(mapManager.layers.geotiff);
            mapManager.layers.geotiff = null;
        }
        
        // Fetch and parse all GeoTIFFs, then average pixel values
        if (typeof parseGeoraster === 'undefined') {
            throw new Error('parseGeoraster library not available');
        }

        const georasters = [];
        for (const date of datesToLoad) {
            const url = config.baseUrl + config.filePattern.replace('{date}', date);
            const response = await fetch(url);
            if (!response.ok) {
                console.warn(`Skipping ${url} (status ${response.status})`);
                continue;
            }
            const arrayBuffer = await response.arrayBuffer();
            const raster = await parseGeoraster(arrayBuffer);
            georasters.push(raster);
        }

        if (georasters.length === 0) {
            throw new Error('No GeoTIFFs could be loaded for the selected range.');
        }

        const averagedGeoraster = averageGeorasters(georasters);
        
        // Create color scale
        const scale = chroma.scale("Spectral").domain([1, 0]);
        
        // Add GeoRaster layer
        if (typeof GeoRasterLayer === 'undefined') {
            throw new Error('GeoRasterLayer library not available');
        }
        
        mapManager.layers.geotiff = new GeoRasterLayer({
            georaster: averagedGeoraster,
            opacity: mapManager.currentOpacity,
            pixelValuesToColorFn: function(pixelValues) {
                const pixelValue = pixelValues[0]; // single band
                
                // Return null for negative or missing values
                if (pixelValue < 0 || pixelValue === null || pixelValue === undefined) {
                    return null;
                }
                
                // Scale value with max VRI
                const scaledValue = Math.min(pixelValue, config.maxVRI) / config.maxVRI;
                const color = scale(scaledValue).hex();
                
                return color;
            },
            resolution: 256
        });
        
        mapManager.layers.geotiff.addTo(mapManager.map);
        
        // Update stats
        if (mapStats) {
            mapStats.innerHTML = `
                <p><strong>Region:</strong> Barcelona</p>
                <p><strong>Date:</strong> ${escapeHtml(formatRangeLabel({ startDate, endDate }))}</p>
                <p><strong>Data Source:</strong> MosquitoAlert BCN</p>
                <p><strong>Type:</strong> GeoTIFF Raster</p>
                <p><strong>Max VRI:</strong> ${config.maxVRI}</p>
            `;
        }
        
    } catch (error) {
        console.error('Error loading Barcelona GeoTIFF data:', error);
        const mapStats = document.getElementById('map-stats');
        if (mapStats) {
            mapStats.innerHTML = '<p class="error-message">Error loading Barcelona data. The data for this date may not be available yet.</p>';
        }
    }
}

/**
 * Average a list of GeoRaster objects (single band) into a new GeoRaster
 * @param {Array} georasters
 * @returns {Object} averaged georaster
 */
function averageGeorasters(georasters) {
    if (!georasters || georasters.length === 0) return null;
    const base = georasters[0];
    if (!base.values || base.values.length === 0 || !base.values[0]) return null;
    const firstBand = base.values[0];
    if (!Array.isArray(firstBand) || firstBand.length === 0 || !Array.isArray(firstBand[0])) return null;
    const bandCount = base.values.length;
    const height = base.height || firstBand.length;
    const width = base.width || (firstBand[0] ? firstBand[0].length : 0);
    if (!height || !width) return null;
    const noData = base.noDataValue;

    const sums = Array.from({ length: bandCount }, () =>
        Array.from({ length: height }, () => new Float64Array(width))
    );
    const counts = Array.from({ length: bandCount }, () =>
        Array.from({ length: height }, () => new Uint16Array(width))
    );

    georasters.forEach(raster => {
        if (!raster || !raster.values || raster.values.length < bandCount) return;
        const band0 = raster.values[0];
        if (!band0 || band0.length !== height || !Array.isArray(band0[0]) || band0[0].length !== width) return;

        for (let b = 0; b < bandCount; b++) {
            const band = raster.values[b];
            for (let y = 0; y < height; y++) {
                const row = band[y];
                const sumRow = sums[b][y];
                const countRow = counts[b][y];
                for (let x = 0; x < width; x++) {
                    const val = row[x];
                    if (val === null || val === undefined) continue;
                    if (noData !== undefined && val === noData) continue;
                    sumRow[x] += val;
                    countRow[x] += 1;
                }
            }
        }
    });

    const averagedValues = sums.map((bandSums, b) =>
        bandSums.map((rowSums, y) => {
            const countRow = counts[b][y];
            const averagedRow = [];
            for (let x = 0; x < width; x++) {
                const c = countRow[x];
                if (c > 0) {
                    averagedRow.push(rowSums[x] / c);
                } else {
                    averagedRow.push(noData !== undefined ? noData : null);
                }
            }
            return averagedRow;
        })
    );

    return { ...base, values: averagedValues };
}

/**
 * Load and display mosquito observation reports for a species and date range
 * @param {string} regionKey
 * @param {string} speciesKey
 * @param {Object} dateRange
 */
async function loadMosquitoObservations(regionKey, speciesKey, dateRange) {
    const observationsConfig = CONFIG.observationsSource;
    if (!observationsConfig) return;

    const range = normalizeDateRange(dateRange || new Date().toISOString().split('T')[0]);
    const { startDate, endDate } = range;
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    const speciesAliases = {
        'ae-albopictus': ['aedes albopictus', 'albopictus', 'ae. albopictus'],
        'ae-aegypti': ['aedes aegypti', 'aegypti', 'ae. aegypti'],
        'ae-japonicus': ['aedes japonicus', 'japonicus'],
        'ae-koreicus': ['aedes koreicus', 'koreicus'],
        'culex': ['culex', 'culex pipiens']
    };
    const speciesTerms = speciesAliases[speciesKey] || [speciesKey];
    const normalizedSpeciesTerms = speciesTerms.map(term => term.toLowerCase());

    const observationsUrl = observationsConfig.baseUrl + (observationsConfig.fallbackFile || '');
    const observations = await dataLoader.loadObservations(observationsUrl);
    const features = Array.isArray(observations?.features) ? observations.features : [];

    const dateProps = observationsConfig.datePropertyCandidates || [];
    const speciesProps = observationsConfig.speciesPropertyCandidates || [];

    const isWithinRange = (value) => {
        if (!value) return false;
        const date = new Date(value);
        return !Number.isNaN(date.getTime()) && date >= startDateObj && date <= endDateObj;
    };

    const matchesSpecies = (props) => {
        const propValue = speciesProps.map(key => props?.[key]).find(Boolean);
        if (!propValue) return false;
        const normalized = propValue.toString().toLowerCase();
        return normalizedSpeciesTerms.some(term => normalized.includes(term));
    };

    const filteredFeatures = features.filter(feature => {
        const props = feature.properties || {};
        const dateValue = dateProps.map(key => props[key]).find(Boolean);
        const inRange = isWithinRange(dateValue || props.date || props.timestamp);
        return inRange && matchesSpecies(props);
    });

    const collection = {
        type: 'FeatureCollection',
        features: filteredFeatures
    };

    mapManager.setObservationsData(collection);

    const mapStats = document.getElementById('map-stats');
    if (mapStats && filteredFeatures.length === 0) {
        const existingHtml = mapStats.innerHTML;
        mapStats.innerHTML = existingHtml + `<p class="info-message">No observation reports for ${escapeHtml(speciesKey)} between ${escapeHtml(startDate)} and ${escapeHtml(endDate)}.</p>`;
    }
}
