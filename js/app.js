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
const reportLinkHandlers = new WeakMap();

/**
 * Sanitize HTML by removing script and iframe elements
 * @param {string} html
 * @returns {string}
 */
function sanitizeHtml(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    doc.querySelectorAll('script, iframe').forEach(el => el.remove());
    return doc.body.innerHTML;
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
    basemapSelector.title = message || (disabled ? message : '');
}

/**
 * Hide the report section and reset its content
 */
function hideReportSection() {
    const section = document.getElementById('report-section');
    const container = document.getElementById('daily-report-container');
    if (section) {
        section.style.display = 'none';
    }
    if (container) {
        container.innerHTML = '<p class="info-text">Select a region with a daily report to view it here.</p>';
    }
}

/**
 * Load and display the latest report for a region
 * @param {string} regionKey
 */
async function showRegionReport(regionKey) {
    const section = document.getElementById('report-section');
    const container = document.getElementById('daily-report-container');
    const title = document.getElementById('report-title');

    if (!section || !container) {
        return;
    }

    const region = CONFIG.regions[regionKey];
    const reportUrls = [
        region?.dataSources?.reportUrl,
        region?.dataSources?.reportFallbackUrl
    ].filter(Boolean);

    if (reportUrls.length === 0) {
        hideReportSection();
        return;
    }

    section.style.display = 'block';
    if (title) {
        title.textContent = `${region.name} Daily Report`;
    }
    container.innerHTML = '<p class="info-text">Loading report...</p>';

    for (const url of reportUrls) {
        try {
            const response = await fetch(url, { cache: 'no-cache' });
            if (!response.ok) {
                throw new Error(`Failed to fetch report: ${response.status}`);
            }
            const html = await response.text();
            container.innerHTML = sanitizeHtml(html);
            return;
        } catch (error) {
            console.error('Error loading report from', url, error);
        }
    }

    container.innerHTML = '<p class="error-message">Unable to load the daily report right now. Please try again later.</p>';
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

    // Set up report reload action
    const reloadButton = document.getElementById('reload-report-btn');
    if (reloadButton) {
        reloadButton.addEventListener('click', function() {
            if (mapManager?.currentRegion) {
                showRegionReport(mapManager.currentRegion);
            }
        });
    }
    
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
    const riskLayerRadio = document.getElementById('risk-layer');
    const observationsLayerRadio = document.getElementById('observations-layer');
    
    if (riskLayerRadio) {
        riskLayerRadio.addEventListener('change', async function() {
            if (this.checked) {
                await handleLayerSelection('risk');
            }
        });
    }
    
    if (observationsLayerRadio) {
        observationsLayerRadio.addEventListener('change', async function() {
            if (this.checked) {
                await handleLayerSelection('observations');
            }
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
            if (!mapManager || !mapManager.currentRegion) return;
            if (mapManager.currentRegion !== 'spain') return;
            const datePicker = document.getElementById('data-date-picker');
            const dateToLoad = datePicker && datePicker.value ? datePicker.value : new Date().toISOString().split('T')[0];
            await loadSpainMosquitoAlertData(dateToLoad, this.value);
            // For grid model, load observations here (municipalities model loads in map's load handler)
            if (this.value === 'mosquito-alert-grid' && CONFIG.regions.spain?.dataSources?.mosquitoAlertES?.observationsUrl) {
                await loadObservationOverlay('spain');
            }
        });
    }
}

/**
 * Ensure only one layer is active and handle map transitions for observations
 * @param {string} selectedLayer
 */
async function handleLayerSelection(selectedLayer) {
    if (!mapManager || !mapManager.currentRegion) {
        return;
    }

    const regionKey = mapManager.currentRegion;
    const region = CONFIG.regions[regionKey];
    const riskLayerRadio = document.getElementById('risk-layer');
    const observationsLayerRadio = document.getElementById('observations-layer');

    if (selectedLayer === 'observations') {
        if (riskLayerRadio) riskLayerRadio.checked = false;
        if (observationsLayerRadio) observationsLayerRadio.checked = true;

        // If a Mapbox map is active, replace it with Leaflet so observations render correctly
        const wasMapbox = Boolean(mapManager.mbMap);
        if (mapManager.mbMap) {
            mapManager.mbMap.remove();
            mapManager.mbMap = null;
        }

        if (!mapManager.map || wasMapbox) {
            mapManager.initMap();
            if (region?.center && region?.zoom) {
                mapManager.map.setView(region.center, region.zoom);
            }
        }

        setBasemapSelectorAvailability(false, 'Basemap selection enabled for observations view');
        mapManager.toggleLayer('risk', false);
        await loadObservationOverlay(regionKey);
        mapManager.toggleLayer('observations', true);
        return;
    }

    if (selectedLayer === 'risk') {
        if (riskLayerRadio) riskLayerRadio.checked = true;
        if (observationsLayerRadio) observationsLayerRadio.checked = false;

        const selectedModel = getSelectedModel();
        if (regionKey === 'spain' && region?.dataSources?.mosquitoAlertES?.enabled && selectedModel === 'mosquito-alert-municipalities') {
            const datePicker = document.getElementById('data-date-picker');
            const dateToLoad = datePicker && datePicker.value ? datePicker.value : new Date().toISOString().split('T')[0];
            await loadSpainMosquitoAlertData(dateToLoad, selectedModel);
        } else if (regionKey === 'barcelona' && region?.dataSources?.mosquitoAlertBCN?.enabled && !mapManager.layers.geotiff) {
            const datePicker = document.getElementById('data-date-picker');
            const dateToLoad = datePicker && datePicker.value ? datePicker.value : new Date().toISOString().split('T')[0];
            await loadBarcelonaMosquitoAlertData(dateToLoad);
        } else if (!mapManager.layers.risk && !mapManager.layers.geotiff) {
            await mapManager.loadRegion(regionKey);
        }

        mapManager.toggleLayer('observations', false);
        mapManager.toggleLayer('risk', true);
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
    if (!mapManager) {
        console.error('Map manager not initialized');
        return;
    }
    const region = CONFIG.regions[regionKey];
    if (!region) {
        console.error(`Region ${regionKey} not found`);
        return;
    }
    mapManager.currentRegion = regionKey;
    const riskLayerCheckbox = document.getElementById('risk-layer');
    const observationsLayerCheckbox = document.getElementById('observations-layer');
    const observationsLabel = observationsLayerCheckbox ? observationsLayerCheckbox.closest('label') : null;
    const rangeLayerCheckbox = document.getElementById('range-layer');
    const observationsLegendSection = document.getElementById('observations-legend-section');

    // Reset layer checkboxes to defaults when switching regions
    if (riskLayerCheckbox) {
        riskLayerCheckbox.checked = true;
    }
    if (observationsLayerCheckbox) {
        observationsLayerCheckbox.checked = false;
    }
    if (rangeLayerCheckbox) {
        rangeLayerCheckbox.checked = false;
    }

    // Ensure layers reflect default visibility when switching maps
    const supportsObservations = Boolean(
        region?.dataSources?.observationsUrl ||
        region?.dataSources?.mosquitoAlertES?.observationsUrl ||
        region?.dataSources?.mosquitoAlertBCN?.observationsUrl
    );
    if (observationsLegendSection) {
        observationsLegendSection.style.display = supportsObservations ? 'block' : 'none';
    }
    if (!supportsObservations) {
        mapManager.removeObservationLayer();
    }
    if (observationsLayerCheckbox) {
        observationsLayerCheckbox.disabled = !supportsObservations;
        observationsLayerCheckbox.checked = false;
    }
    if (observationsLabel) {
        observationsLabel.classList.toggle('disabled', !supportsObservations);
    }
    const selectedModel = getSelectedModel();
    const modelSelector = document.getElementById('model-selector');
    if (modelSelector) {
        const gridOption = modelSelector.querySelector('option[value="mosquito-alert-grid"]');
        const muniOption = modelSelector.querySelector('option[value="mosquito-alert-municipalities"]');
        if (regionKey === 'spain') {
            modelSelector.disabled = false;
            modelSelector.value = selectedModel;
            if (gridOption) {
                gridOption.disabled = false;
                gridOption.hidden = false;
                gridOption.textContent = 'Mosquito Alert 1km grid';
            }
            if (muniOption) {
                muniOption.textContent = 'Mosquito Alert Municipalities';
            }
        } else {
            modelSelector.value = 'mosquito-alert-municipalities';
            modelSelector.disabled = true;
            if (gridOption) {
                gridOption.disabled = true;
                gridOption.hidden = true;
            }
            if (muniOption) {
                muniOption.textContent = regionKey === 'barcelona' ? 'Mosquito Alert 20m grid' : 'Mosquito Alert Municipalities';
            }
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
    
    const latestReportLink = document.getElementById('latest-report-link');
    if (latestReportLink) {
        const hasReport = Boolean(region?.dataSources?.reportUrl || region?.dataSources?.reportFallbackUrl);
        if (hasReport) {
            latestReportLink.href = '#report-section';
            latestReportLink.removeAttribute('target');
            latestReportLink.removeAttribute('rel');
            latestReportLink.style.display = 'inline-block';
            const existingHandler = reportLinkHandlers.get(latestReportLink);
            if (existingHandler) {
                latestReportLink.removeEventListener('click', existingHandler);
            }
            const handler = function(e) {
                e.preventDefault();
                const reportSection = document.getElementById('report-section');
                if (reportSection) {
                    reportSection.scrollIntoView({ behavior: 'smooth' });
                }
            };
            reportLinkHandlers.set(latestReportLink, handler);
            latestReportLink.addEventListener('click', handler);
        } else {
            latestReportLink.href = '#';
            latestReportLink.style.display = 'none';
        }
    }
    
    // Update navigation
    document.querySelectorAll('.main-nav a').forEach(a => {
        a.classList.remove('active');
    });

    hideReportSection();

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
                newDatePicker.addEventListener('change', async function() {
                    if (mapManager.currentRegion !== regionKey) {
                        return;
                    }
                    if (regionKey === 'barcelona') {
                        await loadBarcelonaMosquitoAlertData(this.value);
                        if (CONFIG.regions.barcelona?.dataSources?.mosquitoAlertBCN?.observationsUrl) {
                            await loadObservationOverlay('barcelona');
                        }
                    } else if (regionKey === 'spain') {
                        const selectedModel = getSelectedModel();
                        await loadSpainMosquitoAlertData(this.value, selectedModel);
                        // For grid model, load observations here (municipalities model loads in map's load handler)
                        if (selectedModel === 'mosquito-alert-grid' && CONFIG.regions.spain?.dataSources?.mosquitoAlertES?.observationsUrl) {
                            await loadObservationOverlay('spain');
                        }
                    }
                });
                
                // Update info text based on region
                const infoText = dateSelectorSection.querySelector('.info-text');
                if (infoText) {
                    if (regionKey === 'barcelona') {
                        infoText.innerHTML = 'Data from <a href="https://github.com/Mosquito-Alert/bcn" target="_blank" rel="noopener noreferrer">MosquitoAlert BCN</a>';
                        infoText.style.display = 'block';
                    } else {
                        // Attribution intentionally hidden for Spain per product request
                        infoText.textContent = '';
                        infoText.style.display = 'none';
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

        if (supportsObservations) {
            // For Spain with municipalities model, observations are loaded in the Mapbox map's load handler
            // For other regions and Spain grid model, load observations here
            const isSpainMunicipalities = regionKey === 'spain' && 
                                         region.dataSources.mosquitoAlertES && 
                                         region.dataSources.mosquitoAlertES.enabled && 
                                         selectedModel === 'mosquito-alert-municipalities';
            if (!isSpainMunicipalities) {
                await loadObservationOverlay(regionKey);
            }
        }

        mapManager.toggleLayer('risk', riskLayerCheckbox ? riskLayerCheckbox.checked : true);
        mapManager.toggleLayer('observations', observationsLayerCheckbox ? observationsLayerCheckbox.checked : false);
        
        // Create visualization
        await visualization.createRiskChart(regionKey);
        await showRegionReport(regionKey);
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
 * Load and display MosquitoAlert observation overlays for supported regions
 * @param {string} regionKey - Region identifier
 */
async function loadObservationOverlay(regionKey) {
    const region = CONFIG.regions[regionKey];
    if (!region) return;

    const observationsUrl = region?.dataSources?.observationsUrl ||
        region?.dataSources?.mosquitoAlertES?.observationsUrl ||
        region?.dataSources?.mosquitoAlertBCN?.observationsUrl;

    if (!observationsUrl) {
        mapManager.removeObservationLayer();
        return;
    }

    if (mapManager.mbMap && !mapManager.mbMap.isStyleLoaded()) {
        mapManager.mbMap.once('load', () => loadObservationOverlay(regionKey));
        return;
    }

    if (!mapManager.map && !mapManager.mbMap) {
        return;
    }

    const checkbox = document.getElementById('observations-layer');
    const visible = checkbox ? checkbox.checked : false;

    try {
        const csvData = await dataLoader.loadCSV(observationsUrl);
        const features = (csvData || []).map(row => {
            const lat = parseFloat(row.lat ?? row.Latitude ?? row.latitude);
            const lon = parseFloat(row.lon ?? row.Longitude ?? row.longitude);
            const presenceRaw = row.presence ?? row.PRESENCE ?? row.Presence;
            const date = row.date || row.Date || '';
            const isPresent = typeof presenceRaw === 'string' ?
                presenceRaw.toLowerCase() === 'true' :
                Boolean(presenceRaw);

            // Only filter out invalid coordinates, not based on presence
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
                return null;
            }

            return {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [lon, lat]
                },
                properties: {
                    presence: isPresent,
                    date: date
                }
            };
        }).filter(Boolean);

        const geojson = {
            type: 'FeatureCollection',
            features
        };

        mapManager.addObservationLayer(geojson, visible, {
            fillColor: '#ffd92f',           // Yellow for presence points
            fillColorAbsence: '#a6cee3',    // Light blue for absence points
            strokeColor: '#000000',
            strokeWidth: 1.5,
            radius: regionKey === 'barcelona' ? 7 : 6,
            opacity: 0.85
        });
    } catch (error) {
        console.error('Failed to load observation overlay:', error);
    }
}

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
    const mapStats = document.getElementById('map-stats');
    if (modelSelection === 'mosquito-alert-grid') {
        try {
            await loadSpainMosquitoAlertGridData(date);
        } catch (error) {
            console.error('Error loading MosquitoAlert grid data:', error);
            if (mapStats) {
                mapStats.innerHTML = '<p class="error-message">Error loading 1km grid data. The data for this date may not be available yet.</p>';
            }
        }
        return;
    }
    
    const config = region.dataSources.mosquitoAlertES;
    const filename = config.filePattern.replace('{date}', date);
    const url = config.baseUrl + filename;
    
    try {
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
            if (mapManager.mbMap) {
                mapManager.mbMap.remove();
                mapManager.mbMap = null;
            }
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
                
                const showFeatureInfo = (e, layerId) => {
                    const queried = mbMap.queryRenderedFeatures(e.point, { layers: [layerId] });
                    const feature = (e.features && e.features[0]) || (queried && queried[0]);
                    if (!feature) {
                        popup.remove();
                        mbMap.getCanvas().style.cursor = '';
                        return;
                    }
                    const natcode = feature.properties?.NATCODE?.toString();
                    const info = municipalityLookup.get(natcode);
                    const name = info?.name || feature.properties?.NAMEUNIT || 'Municipality';
                    const value = info?.value;
                    const valueText = (value !== undefined && value !== null) ? Number(value).toFixed(4) : 'N/A';
                    
                    popup
                        .setLngLat(e.lngLat)
                        .setHTML(`<strong>${escapeHtml(name)}</strong><br>Predicted value: ${valueText}`)
                        .addTo(mbMap);
                    mbMap.getCanvas().style.cursor = 'pointer';
                };
                
                const hideFeatureInfo = () => {
                    popup.remove();
                    mbMap.getCanvas().style.cursor = '';
                };
                
                ['muni-high-res', 'muni-low-res'].forEach(layerId => {
                    mbMap.on('mousemove', layerId, (e) => showFeatureInfo(e, layerId));
                    mbMap.on('mouseleave', layerId, hideFeatureInfo);
                    mbMap.on('click', layerId, (e) => showFeatureInfo(e, layerId));
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
                
                // Load observations after map is ready
                if (CONFIG.regions.spain?.dataSources?.mosquitoAlertES?.observationsUrl) {
                    loadObservationOverlay('spain').catch(err => {
                        console.error('Failed to load observations:', err);
                    });
                }
            });
        } else {
            // Fallback message if Mapbox not available
            setBasemapSelectorAvailability(false, 'Basemap selection available (Leaflet view)');
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
        let observationsLoaded = false;
        try {
            // Fallback to Leaflet view so training observations can still be shown
            if (mapManager.mbMap) {
                mapManager.mbMap.remove();
                mapManager.mbMap = null;
            }
            mapManager.initMap();
            mapManager.map.setView(region.center, region.zoom);
            setBasemapSelectorAvailability(false, 'Basemap selection available (fallback view)');
            if (CONFIG.regions.spain?.dataSources?.mosquitoAlertES?.observationsUrl) {
                await loadObservationOverlay('spain');
                let featureCount = mapManager.getObservationFeatureCount();
                if (!featureCount && mapManager.layers.observations) {
                    await new Promise(requestAnimationFrame);
                    featureCount = mapManager.getObservationFeatureCount();
                }
                observationsLoaded = featureCount > 0;
            }
        } catch (fallbackError) {
            console.error('Fallback loading Spain observations failed:', fallbackError);
        }
        if (mapStats) {
            let html = '<p class="error-message">Error loading MosquitoAlertES data. The data for this date may not be available yet.</p>';
            if (observationsLoaded) {
                html += '<p class="info-message">Showing training observations while model data is unavailable.</p>';
            }
            mapStats.innerHTML = html;
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

    const mapContainer = document.getElementById('map');
    if (mapContainer) {
        mapContainer.innerHTML = '';
    }

    mapManager.initMap();
    mapManager.map.setView(region.center, region.zoom);
    setBasemapSelectorAvailability(false, 'Basemap selection available for GeoTIFF grid (Leaflet view)');

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

    const noDataValue = georaster?.noDataValue;

    mapManager.layers.geotiff = new GeoRasterLayer({
        georaster: georaster,
        opacity: mapManager.currentOpacity,
        pixelValuesToColorFn: function(pixelValues) {
            const pixelValue = pixelValues[0];
            if (
                !Number.isFinite(pixelValue) ||
                pixelValue <= 0 ||
                (noDataValue !== undefined && pixelValue === noDataValue)
            ) {
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
                <p><strong>Model:</strong> Mosquito Alert 20m grid</p>
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
