// Main application logic
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
    const temperatureLayerCheckbox = document.getElementById('temperature-layer');
    const humidityLayerCheckbox = document.getElementById('humidity-layer');
    
    if (riskLayerCheckbox) {
        riskLayerCheckbox.addEventListener('change', function() {
            mapManager.toggleLayer('risk', this.checked);
        });
    }
    
    if (temperatureLayerCheckbox) {
        temperatureLayerCheckbox.addEventListener('change', function() {
            mapManager.toggleLayer('temperature', this.checked);
        });
    }
    
    if (humidityLayerCheckbox) {
        humidityLayerCheckbox.addEventListener('change', function() {
            mapManager.toggleLayer('humidity', this.checked);
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
    
    // Show/hide date selector for Spain with MosquitoAlertES data
    const dateSelectorSection = document.getElementById('date-selector-section');
    if (dateSelectorSection) {
        if (regionKey === 'spain' && region.dataSources.mosquitoAlertES && region.dataSources.mosquitoAlertES.enabled) {
            dateSelectorSection.style.display = 'block';
            // Set default date to today
            const datePicker = document.getElementById('data-date-picker');
            if (datePicker && !datePicker.value) {
                const today = new Date().toISOString().split('T')[0];
                datePicker.value = today;
                
                // Add event listener for date changes
                datePicker.addEventListener('change', function() {
                    loadSpainMosquitoAlertData(this.value);
                });
            }
        } else {
            dateSelectorSection.style.display = 'none';
        }
    }
    
    try {
        // Load map data
        await mapManager.loadRegion(regionKey);
        
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
    console.log('Loading MosquitoAlertES data for date:', date);
    
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
            mapStats.innerHTML = '<p>Loading data for ' + date + '...</p>';
        }
        
        // Note: This is a placeholder implementation
        // Full implementation would:
        // 1. Fetch the JSON data from the URL
        // 2. Convert municipality data to GeoJSON features
        // 3. Load municipality boundaries to join with prediction data
        // 4. Display on map with appropriate styling
        // 5. Update statistics
        
        console.log('Would load data from:', url);
        
        if (mapStats) {
            mapStats.innerHTML = `
                <p><strong>Region:</strong> Spain</p>
                <p><strong>Date:</strong> ${date}</p>
                <p><strong>Data Source:</strong> MosquitoAlertES</p>
                <p class="info-message">Full data integration coming soon. See <a href="${config.baseUrl}" target="_blank">MosquitoAlertES repository</a> for data details.</p>
            `;
        }
        
    } catch (error) {
        console.error('Error loading MosquitoAlertES data:', error);
        const mapStats = document.getElementById('map-stats');
        if (mapStats) {
            mapStats.innerHTML = '<p class="error-message">Error loading MosquitoAlertES data.</p>';
        }
    }
}
