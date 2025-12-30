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
                        loadSpainMosquitoAlertData(this.value);
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
            const datePicker = document.getElementById('data-date-picker');
            const dateToLoad = datePicker ? datePicker.value : new Date().toISOString().split('T')[0];
            await loadBarcelonaMosquitoAlertData(dateToLoad);
        }
        // For Spain with MosquitoAlertES, load the municipality data
        else if (regionKey === 'spain' && region.dataSources.mosquitoAlertES && region.dataSources.mosquitoAlertES.enabled) {
            const datePicker = document.getElementById('data-date-picker');
            const dateToLoad = datePicker ? datePicker.value : new Date().toISOString().split('T')[0];
            await loadSpainMosquitoAlertData(dateToLoad);
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
 */
async function loadSpainMosquitoAlertData(date) {
    const region = CONFIG.regions['spain'];
    if (!region || !region.dataSources.mosquitoAlertES) {
        console.error('MosquitoAlertES configuration not found for Spain');
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
        
        // If we have Mapbox GL JS available and mapbox token, use Mapbox GL
        if (typeof mapboxgl !== 'undefined' && config.mapboxAccessToken) {
            // Remove existing Leaflet map if present
            if (mapManager.map) {
                mapManager.map.remove();
                mapManager.map = null;
            }
            
            // Create Mapbox GL map with a blank style
            mapboxgl.accessToken = config.mapboxAccessToken;
            
            const mapContainer = document.getElementById('map');
            mapContainer.innerHTML = ''; // Clear container
            
            // Create a blank style with satellite raster tiles
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
                
                // Update stats
                if (mapStats) {
                    const avgRisk = muniData.reduce((sum, item) => 
                        sum + (parseFloat(item.ma_prob_mean) || 0), 0) / muniData.length;
                    
                    mapStats.innerHTML = `
                        <p><strong>Region:</strong> Spain</p>
                        <p><strong>Date:</strong> ${escapeHtml(date)}</p>
                        <p><strong>Data Source:</strong> MosquitoAlertES</p>
                        <p><strong>Municipalities:</strong> ${muniData.length}</p>
                        <p><strong>Avg VRI:</strong> ${avgRisk.toFixed(3)}</p>
                    `;
                }
            });
        } else {
            // Fallback message if Mapbox not available
            if (mapStats) {
                mapStats.innerHTML = `
                    <p><strong>Region:</strong> Spain</p>
                    <p><strong>Date:</strong> ${escapeHtml(date)}</p>
                    <p><strong>Municipalities:</strong> ${muniData.length}</p>
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
