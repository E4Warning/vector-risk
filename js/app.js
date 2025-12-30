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
 * Get the currently selected model
 * @returns {string}
 */
function getSelectedModel() {
    const selector = document.getElementById('model-selector');
    return selector ? selector.value : 'mosquito-alert-municipalities';
}

/**
 * Enable/disable basemap selector with optional tooltip
 * @param {boolean} disabled
 * @param {string} [message]
 */
function setBasemapSelectorAvailability(disabled, message = '') {
    const basemapSelector = document.getElementById('basemap-selector');
    if (!basemapSelector) return;

    basemapSelector.disabled = disabled;
    basemapSelector.title = disabled ? message : '';
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

    // Model selector (used for MosquitoAlert Spain models)
    const modelSelector = document.getElementById('model-selector');
    if (modelSelector) {
        modelSelector.addEventListener('change', async function() {
            if (mapManager.currentRegion === 'spain') {
                const datePicker = document.getElementById('data-date-picker');
                const dateToLoad = datePicker && datePicker.value ? datePicker.value : new Date().toISOString().split('T')[0];
                await loadSpainMosquitoAlertData(dateToLoad, this.value);
            }
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
    mapManager.currentRegion = regionKey;
    const selectedModel = getSelectedModel();
    const modelSelector = document.getElementById('model-selector');
    if (modelSelector) {
        if (regionKey === 'spain') {
            modelSelector.disabled = false;
            const gridOption = modelSelector.querySelector('option[value="mosquito-alert-grid"]');
            if (gridOption) {
                gridOption.disabled = false;
            }
        } else {
            modelSelector.value = 'mosquito-alert-municipalities';
            modelSelector.disabled = true;
        }
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
            // Set default date to today
            const datePicker = document.getElementById('data-date-picker');
            if (datePicker) {
                if (!datePicker.value) {
                    const today = new Date().toISOString().split('T')[0];
                    datePicker.value = today;
                }
                
                // Remove existing listeners and add new one to prevent duplicates
                const newDatePicker = datePicker.cloneNode(true);
                datePicker.parentNode.replaceChild(newDatePicker, datePicker);
                
                // Add event listener for date changes
                newDatePicker.addEventListener('change', function() {
                    if (regionKey === 'barcelona') {
                        loadBarcelonaMosquitoAlertData(this.value);
                    } else if (regionKey === 'spain') {
                        loadSpainMosquitoAlertData(this.value, getSelectedModel());
                    }
                });
                
                // Update info text based on region
                const infoText = dateSelectorSection.querySelector('.info-text');
                if (infoText) {
                    if (regionKey === 'barcelona') {
                        infoText.innerHTML = 'Data from <a href="https://github.com/Mosquito-Alert/bcn" target="_blank" rel="noopener noreferrer">MosquitoAlert BCN</a>';
                    } else if (regionKey === 'spain') {
                        infoText.innerHTML = 'Data from <a href="https://github.com/Mosquito-Alert/MosquitoAlertES" target="_blank" rel="noopener noreferrer">MosquitoAlertES</a>';
                    }
                }
            }
        } else {
            dateSelectorSection.style.display = 'none';
        }
    }
    
    // Disable basemap selector for regions using Mapbox GL (Spain)
    const basemapSelector = document.getElementById('basemap-selector');
    const usingMapbox = regionKey === 'spain' && region.dataSources.mosquitoAlertES && region.dataSources.mosquitoAlertES.enabled && selectedModel === 'mosquito-alert-municipalities';
    setBasemapSelectorAvailability(usingMapbox, 'Basemap selection not available for this region (using Mapbox GL with satellite imagery)');
    
    try {
        // For Barcelona with MosquitoAlertBCN, load the GeoTIFF data
        if (regionKey === 'barcelona' && region.dataSources.mosquitoAlertBCN && region.dataSources.mosquitoAlertBCN.enabled) {
            const datePicker = document.getElementById('data-date-picker');
            const dateToLoad = datePicker ? datePicker.value : new Date().toISOString().split('T')[0];
            await loadBarcelonaMosquitoAlertData(dateToLoad);
        }
        // For Spain with MosquitoAlertES, load the municipality data
        else if (regionKey === 'spain' && region.dataSources.mosquitoAlertES && region.dataSources.mosquitoAlertES.enabled) {
            const datePicker = document.getElementById('data-date-picker');
            const dateToLoad = datePicker ? datePicker.value : new Date().toISOString().split('T')[0];
            await loadSpainMosquitoAlertData(dateToLoad, selectedModel);
        }
        // For other regions, load standard map data
        else {
            await mapManager.loadRegion(regionKey);
        }
        
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
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} modelSelection - Selected model key
 */
async function loadSpainMosquitoAlertData(date, modelSelection = 'mosquito-alert-municipalities') {
    const region = CONFIG.regions['spain'];
    if (!region || !region.dataSources.mosquitoAlertES) {
        console.error('MosquitoAlertES configuration not found for Spain');
        return;
    }
    mapManager.currentRegion = 'spain';
    if (modelSelection === 'mosquito-alert-grid') {
        await loadSpainMosquitoAlertGridData(date);
        return;
    }
    
    const config = region.dataSources.mosquitoAlertES;
    const filename = config.filePattern.replace('{date}', date);
    const url = config.baseUrl + filename;
    
    try {
        const mapStats = document.getElementById('map-stats');
        if (mapStats) {
            mapStats.innerHTML = '<p>Loading data for ' + escapeHtml(date) + '...</p>';
        }
        
        // Fetch the municipality predictions JSON
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const muniData = await response.json();
        const municipalityLookup = new Map();
        muniData.forEach(row => {
            municipalityLookup.set(row['NATCODE']?.toString(), {
                value: row['ma_prob_mean'],
                name: row['NAMEUNIT']
            });
        });
        
        // If we have Mapbox GL JS available and mapbox token, use Mapbox GL
        if (typeof mapboxgl !== 'undefined' && config.mapboxAccessToken) {
            // Remove existing Leaflet map if present
            if (mapManager.map) {
                mapManager.map.remove();
                mapManager.map = null;
            }
            mapManager.layers.geotiff = null;
            
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
            setBasemapSelectorAvailability(true, 'Basemap selection not available for this region (using Mapbox GL with satellite imagery)');
            
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
                
                for (const row of muniData) {
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
                
                // Popup for hover/click
                const popup = new mapboxgl.Popup({
                    closeButton: false,
                    closeOnClick: false
                });
                
                const showFeatureInfo = (e) => {
                    if (!e.features || !e.features.length) return;
                    const feature = e.features[0];
                    const natcode = feature.properties?.NATCODE?.toString();
                    const info = municipalityLookup.get(natcode);
                    const name = info?.name || feature.properties?.NAMEUNIT || 'Municipality';
                    const value = info?.value;
                    const valueText = (value !== undefined && value !== null) ? Number(value).toFixed(4) : 'N/A';
                    
                    popup
                        .setLngLat(e.lngLat)
                        .setHTML(`<strong>${escapeHtml(name)}</strong><br>Predicted value: ${valueText}`)
                        .addTo(mbMap);
                };
                
                const hideFeatureInfo = () => popup.remove();
                
                ['muni-high-res', 'muni-low-res'].forEach(layerId => {
                    mbMap.on('mousemove', layerId, showFeatureInfo);
                    mbMap.on('mouseleave', layerId, hideFeatureInfo);
                    mbMap.on('click', layerId, showFeatureInfo);
                });
                
                // Update stats
                if (mapStats) {
                    const avgRisk = muniData.reduce((sum, item) => 
                        sum + (parseFloat(item.ma_prob_mean) || 0), 0) / muniData.length;
                    
                    mapStats.innerHTML = `
                        <p><strong>Region:</strong> Spain</p>
                        <p><strong>Date:</strong> ${escapeHtml(date)}</p>
                        <p><strong>Model:</strong> Mosquito Alert Municipalities</p>
                        <p><strong>Municipalities:</strong> ${muniData.length}</p>
                        <p><strong>Avg VRI:</strong> ${avgRisk.toFixed(3)}</p>
                    `;
                }
            });
        } else {
            // Fallback message if Mapbox not available
            setBasemapSelectorAvailability(false);
            if (mapStats) {
                mapStats.innerHTML = `
                    <p><strong>Region:</strong> Spain</p>
                    <p><strong>Date:</strong> ${escapeHtml(date)}</p>
                    <p><strong>Municipalities:</strong> ${muniData.length}</p>
                    <p class="info-message">Loaded data from Mosquito Alert Municipalities</p>
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
 * Load MosquitoAlert Spain 1km grid GeoTIFF data
 * @param {string} date - Date in YYYY-MM-DD format
 */
async function loadSpainMosquitoAlertGridData(date) {
    const region = CONFIG.regions['spain'];
    const config = region?.dataSources?.mosquitoAlertES;
    if (!region || !config) {
        console.error('MosquitoAlertES configuration not found for Spain');
        return;
    }
    const mapStats = document.getElementById('map-stats');
    if (mapStats) {
        mapStats.innerHTML = '<p>Loading 1km grid for ' + escapeHtml(date) + '...</p>';
    }

    // Ensure Mapbox map is removed before showing GeoTIFF
    if (mapManager.mbMap) {
        mapManager.mbMap.remove();
        mapManager.mbMap = null;
    }

    mapManager.initMap();
    mapManager.map.setView(region.center, region.zoom);
    setBasemapSelectorAvailability(false);

    // Clear existing GeoRaster layers
    if (mapManager.layers.geotiff) {
        mapManager.map.removeLayer(mapManager.layers.geotiff);
        mapManager.layers.geotiff = null;
    }

    const candidatePatterns = [];
    if (config.gridFilePattern) {
        candidatePatterns.push(config.gridFilePattern);
    }
    if (config.filePattern) {
        candidatePatterns.push(config.filePattern.replace('muni', 'grid').replace('.json', '.tif'));
        candidatePatterns.push(config.filePattern.replace('.json', '.tif'));
    }
    candidatePatterns.push('grid_preds_{date}.tif');

    let georaster = null;
    let usedFilename = '';
    const tried = [];

    for (const pattern of candidatePatterns) {
        if (!pattern || !pattern.includes('{date}')) continue;
        const filename = pattern.replace('{date}', date);
        const url = config.baseUrl + filename;
        tried.push(filename);
        try {
            const response = await fetch(url);
            if (!response.ok) continue;
            const arrayBuffer = await response.arrayBuffer();
            if (typeof parseGeoraster === 'undefined') {
                throw new Error('parseGeoraster library not available');
            }
            georaster = await parseGeoraster(arrayBuffer);
            usedFilename = filename;
            break;
        } catch (err) {
            console.warn('Could not load GeoTIFF from', pattern, err);
        }
    }

    if (!georaster) {
        const msg = `GeoTIFF not available for ${date}. Tried: ${tried.join(', ')}`;
        console.error(msg);
        if (mapStats) {
            mapStats.innerHTML = `<p class=\"error-message\">${escapeHtml(msg)}</p>`;
        }
        return;
    }

    const maxVRI = config.gridMaxVRI || config.maxVRI || 0.3;
    const scale = chroma.scale("Spectral").domain([1, 0]);

    if (typeof GeoRasterLayer === 'undefined') {
        throw new Error('GeoRasterLayer library not available');
    }

    mapManager.layers.geotiff = new GeoRasterLayer({
        georaster: georaster,
        opacity: mapManager.currentOpacity,
        pixelValuesToColorFn: function(pixelValues) {
            const pixelValue = pixelValues[0];
            if (pixelValue === null || pixelValue === undefined || pixelValue < 0) {
                return null;
            }
            const scaledValue = Math.min(pixelValue, maxVRI) / maxVRI;
            return scale(scaledValue).hex();
        },
        resolution: 256
    });

    mapManager.layers.geotiff.addTo(mapManager.map);

    if (mapStats) {
        mapStats.innerHTML = `
            <p><strong>Region:</strong> Spain</p>
            <p><strong>Date:</strong> ${escapeHtml(date)}</p>
            <p><strong>Data Source:</strong> Mosquito Alert 1km grid</p>
            <p><strong>Layer:</strong> GeoTIFF raster</p>
            <p><strong>File:</strong> ${escapeHtml(usedFilename || 'n/a')}</p>
        `;
    }
}

/**
 * Load MosquitoAlert Barcelona GeoTIFF data for a specific date
 * @param {string} date - Date in YYYY-MM-DD format
 */
async function loadBarcelonaMosquitoAlertData(date) {
    const region = CONFIG.regions['barcelona'];
    if (!region || !region.dataSources.mosquitoAlertBCN) {
        console.error('MosquitoAlertBCN configuration not found for Barcelona');
        return;
    }
    
    const config = region.dataSources.mosquitoAlertBCN;
    const filename = config.filePattern.replace('{date}', date);
    const url = config.baseUrl + filename;
    
    try {
        const mapStats = document.getElementById('map-stats');
        if (mapStats) {
            mapStats.innerHTML = '<p>Loading data for ' + escapeHtml(date) + '...</p>';
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
        
        // Fetch and parse GeoTIFF
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        
        // Parse GeoTIFF using georaster library
        if (typeof parseGeoraster === 'undefined') {
            throw new Error('parseGeoraster library not available');
        }
        
        const georaster = await parseGeoraster(arrayBuffer);
        
        // Create color scale
        const scale = chroma.scale("Spectral").domain([1, 0]);
        
        // Add GeoRaster layer
        if (typeof GeoRasterLayer === 'undefined') {
            throw new Error('GeoRasterLayer library not available');
        }
        
        mapManager.layers.geotiff = new GeoRasterLayer({
            georaster: georaster,
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
                <p><strong>Date:</strong> ${escapeHtml(date)}</p>
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
