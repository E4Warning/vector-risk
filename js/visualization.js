// Visualization class for charts and graphs
class Visualization {
    constructor() {
        this.chart = null;
        // Configuration constants
        this.CHART_OPACITY = 0.25; // 40 in hex = 0.25 alpha
        // Store event listeners for cleanup
        this.citywideCheckboxListener = null;
        this.legendToggleListener = null;
        this.legendCloseListener = null;
        this.DEFAULT_SERIES_COLOR = '#888';
    }

    /**
     * Helper function to add alpha channel to hex color
     * @param {string} hexColor - Hex color code
     * @param {number} alpha - Alpha value between 0 and 1
     * @returns {string} Hex color with alpha
     */
    addAlpha(hexColor, alpha) {
        const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
        return hexColor + alphaHex;
    }

    /**
     * Load time series data from URL or fallback to CSV
     * @param {Object} region - Region configuration object
     * @returns {Promise<Array>} Chart data
     */
    async loadTimeSeriesData(region) {
        if (region.dataSources.timeseries) {
            try {
                const response = await fetch(region.dataSources.timeseries);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return await response.json();
            } catch (error) {
                console.error('Error loading time series data:', error);
                // Fallback to CSV if JSON fails
                return await dataLoader.loadCSV(region.dataSources.csv);
            }
        } else {
            // Use CSV data if no timeseries URL configured
            return await dataLoader.loadCSV(region.dataSources.csv);
        }
    }

    /**
     * Create or update a risk chart
     * @param {string} regionKey - Region key
     */
    async createRiskChart(regionKey) {
        const canvas = document.getElementById('riskChart');
        if (!canvas) return;

        const region = CONFIG.regions[regionKey];
        if (!region) return;

        // Check if we should load district/CCAA data
        if (regionKey === 'barcelona' && region.dataSources.districtTimeseries) {
            await this.createDistrictChart(regionKey, region);
        } else if (regionKey === 'spain' && region.dataSources.ccaaTimeseries) {
            await this.createCCAAChart(regionKey, region);
        } else {
            await this.createSimpleChart(regionKey, region);
        }
    }

    /**
     * Create a simple time series chart (citywide/countrywide)
     * @param {string} regionKey - Region key
     * @param {Object} region - Region configuration
     */
    async createSimpleChart(regionKey, region) {
        const canvas = document.getElementById('riskChart');
        if (!canvas) return;

        // Hide series selector for simple charts
        const seriesSelectorSection = document.getElementById('series-selector-section');
        if (seriesSelectorSection) {
            seriesSelectorSection.style.display = 'none';
        }
        
        // Hide legend toggle button for simple charts
        const toggleBtn = document.getElementById('toggle-legend-btn');
        if (toggleBtn) {
            toggleBtn.style.display = 'none';
        }
        
        // Hide legend popup for simple charts
        const legendPopup = document.getElementById('legend-popup');
        if (legendPopup) {
            legendPopup.style.display = 'none';
        }

        // Load time series data
        const chartData = await this.loadTimeSeriesData(region);

        // Prepare chart data
        const labels = [];
        const riskData = [];
        
        if (Array.isArray(chartData)) {
            // Handle both JSON array and CSV data
            chartData.forEach(item => {
                // For JSON data, try 'date' or 'week' or 'period' field
                const dateLabel = item.date || item.week || item.period || item.time || '';
                labels.push(dateLabel);
                
                // For risk, try various field names
                const riskValue = parseFloat(item.risk_level || item.vri || item.risk || item.value || item.ma_prob_mean || item.ma_prob_max || 0);
                riskData.push(riskValue);
            });
        }

        // Destroy existing chart
        if (this.chart) {
            this.chart.destroy();
        }

        // Create new chart
        const ctx = canvas.getContext('2d');
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Vector Risk Index',
                        data: riskData,
                        borderColor: CONFIG.riskColors.very_high,
                        backgroundColor: this.addAlpha(CONFIG.riskColors.very_high, this.CHART_OPACITY),
                        tension: 0.4,
                        yAxisID: 'y'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    title: {
                        display: true,
                        text: `Vector Risk Time Series for ${region.name}`
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y.toFixed(2);
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Vector Risk Index'
                        },
                        min: 0
                    }
                }
            }
        });
    }

    /**
     * Create district time series chart for Barcelona
     * @param {string} regionKey - Region key
     * @param {Object} region - Region configuration
     */
    async createDistrictChart(regionKey, region) {
        const canvas = document.getElementById('riskChart');
        if (!canvas) return;

        // Load citywide data
        const citywideData = await this.loadTimeSeriesData(region);
        
        // Load district data
        let districtData = [];
        try {
            const response = await fetch(region.dataSources.districtTimeseries);
            if (response.ok) {
                districtData = await response.json();
                console.log('Barcelona district data loaded:', districtData.length, 'items');
            } else {
                console.warn('Failed to load Barcelona district data:', response.status);
            }
        } catch (error) {
            console.error('Error loading district data:', error);
        }

        // Prepare datasets
        const datasets = [];
        
        // Add citywide data
        const citywideLabels = [];
        const citywideValues = [];
        if (Array.isArray(citywideData)) {
            citywideData.forEach(item => {
                citywideLabels.push(item.date || item.week || item.period || item.time || '');
                citywideValues.push(parseFloat(item.risk_level || item.vri || item.risk || item.value || item.ma_prob_mean || item.ma_prob_max || 0));
            });
        }
        
        datasets.push({
            label: 'Barcelona Citywide',
            data: citywideValues,
            borderColor: CONFIG.riskColors.very_high,
            backgroundColor: this.addAlpha(CONFIG.riskColors.very_high, this.CHART_OPACITY),
            tension: 0.4,
            hidden: false
        });

        // Group district data by district
        const districtGroups = {};
        districtData.forEach(item => {
            const districtName = item.District || item.NAMEUNIT || item.district || 'Unknown';
            if (!districtGroups[districtName]) {
                districtGroups[districtName] = [];
            }
            districtGroups[districtName].push(item);
        });

        // Create a dataset for each district
        const districtColors = [
            CONFIG.riskColors.high,
            CONFIG.riskColors.medium,
            CONFIG.riskColors.low,
            '#e67e22', '#9b59b6', '#1abc9c', '#34495e', '#f39c12', '#16a085', '#c0392b'
        ];
        
        let colorIndex = 0;
        for (const [districtName, items] of Object.entries(districtGroups)) {
            const districtValues = items.map(item => parseFloat(item.value || item.ma_prob_mean || 0));
            const color = districtColors[colorIndex % districtColors.length];
            
            datasets.push({
                label: districtName,
                data: districtValues,
                borderColor: color,
                backgroundColor: this.addAlpha(color, this.CHART_OPACITY),
                tension: 0.4,
                hidden: true // Start hidden
            });
            
            colorIndex++;
        }

        // Destroy existing chart
        if (this.chart) {
            this.chart.destroy();
        }

        // Create new chart
        const ctx = canvas.getContext('2d');
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: citywideLabels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    title: {
                        display: true,
                        text: `Barcelona Vector Risk Time Series by District`
                    },
                    legend: {
                        display: false, // Start hidden due to many series
                        position: 'top',
                        onClick: (e, legendItem, legend) => {
                            const index = legendItem.datasetIndex;
                            const chart = legend.chart;
                            const meta = chart.getDatasetMeta(index);
                            meta.hidden = !meta.hidden;
                            chart.update();
                            
                            // Update checkbox state
                            const checkbox = document.getElementById(`series-checkbox-${index}`);
                            if (checkbox) {
                                checkbox.checked = !meta.hidden;
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y.toFixed(3);
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Vector Risk Index'
                        },
                        min: 0
                    }
                }
            }
        });
        
        // Build legend & selector UI
        this.setupSeriesSelector('barcelona');
        
        // Setup legend toggle button
        this.setupLegendToggle();
    }

    /**
     * Create CCAA time series chart for Spain
     * @param {string} regionKey - Region key
     * @param {Object} region - Region configuration
     */
    async createCCAAChart(regionKey, region) {
        const canvas = document.getElementById('riskChart');
        if (!canvas) return;

        // Load countrywide data
        const countrywideData = await this.loadTimeSeriesData(region);
        
        // Load CCAA data
        let ccaaData = [];
        try {
            const response = await fetch(region.dataSources.ccaaTimeseries);
            if (response.ok) {
                ccaaData = await response.json();
                console.log('Spain CCAA data loaded:', ccaaData.length, 'items');
            } else {
                console.warn('Failed to load Spain CCAA data:', response.status);
            }
        } catch (error) {
            console.error('Error loading CCAA data:', error);
        }

        // Prepare datasets
        const datasets = [];
        
        // Add countrywide data
        const countrywideLabels = [];
        const countrywideValues = [];
        if (Array.isArray(countrywideData)) {
            countrywideData.forEach(item => {
                countrywideLabels.push(item.date || item.week || item.period || item.time || '');
                countrywideValues.push(parseFloat(item.risk_level || item.vri || item.risk || item.value || item.ma_prob_mean || item.ma_prob_max || 0));
            });
        }
        
        datasets.push({
            label: 'Spain Countrywide',
            data: countrywideValues,
            borderColor: CONFIG.riskColors.very_high,
            backgroundColor: this.addAlpha(CONFIG.riskColors.very_high, this.CHART_OPACITY),
            tension: 0.4,
            hidden: false
        });

        // Group CCAA data by CCAA
        const ccaaGroups = {};
        ccaaData.forEach(item => {
            const ccaaName = item.NAMEUNIT || item.name || item.ccaa || 'Unknown';
            if (!ccaaGroups[ccaaName]) {
                ccaaGroups[ccaaName] = [];
            }
            ccaaGroups[ccaaName].push(item);
        });

        // Create a dataset for each CCAA
        const ccaaColors = [
            CONFIG.riskColors.high,
            CONFIG.riskColors.medium,
            CONFIG.riskColors.low,
            '#e67e22', '#9b59b6', '#1abc9c', '#34495e', '#f39c12', '#16a085', '#c0392b',
            '#7f8c8d', '#d35400', '#8e44ad', '#27ae60', '#2980b9', '#e74c3c', '#95a5a6'
        ];
        
        let colorIndex = 0;
        for (const [ccaaName, items] of Object.entries(ccaaGroups)) {
            const ccaaValues = items.map(item => parseFloat(item.ma_prob_mean || item.value || 0));
            const color = ccaaColors[colorIndex % ccaaColors.length];
            
            datasets.push({
                label: ccaaName,
                data: ccaaValues,
                borderColor: color,
                backgroundColor: this.addAlpha(color, this.CHART_OPACITY),
                tension: 0.4,
                hidden: true // Start hidden
            });
            
            colorIndex++;
        }

        // Destroy existing chart
        if (this.chart) {
            this.chart.destroy();
        }

        // Create new chart
        const ctx = canvas.getContext('2d');
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: countrywideLabels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    title: {
                        display: true,
                        text: `Spain Vector Risk Time Series by Autonomous Community`
                    },
                    legend: {
                        display: false, // Start hidden due to many series
                        position: 'top',
                        onClick: (e, legendItem, legend) => {
                            const index = legendItem.datasetIndex;
                            const chart = legend.chart;
                            const meta = chart.getDatasetMeta(index);
                            meta.hidden = !meta.hidden;
                            chart.update();
                            
                            // Update checkbox state
                            const checkbox = document.getElementById(`series-checkbox-${index}`);
                            if (checkbox) {
                                checkbox.checked = !meta.hidden;
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y.toFixed(3);
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Vector Risk Index'
                        },
                        min: 0
                    }
                }
            }
        });
        
        // Build legend & selector UI
        this.setupSeriesSelector('spain');
        
        // Setup legend toggle button
        this.setupLegendToggle();
    }

    /**
     * Setup series selector UI inside the legend popup
     * @param {string} regionType - 'barcelona' or 'spain'
     */
    setupSeriesSelector(regionType) {
        const seriesSelectorSection = document.getElementById('series-selector-section');
        const citywideLabel = document.getElementById('series-citywide-label');
        const citywideCheckbox = document.getElementById('series-citywide');
        const additionalSeriesList = document.getElementById('additional-series-list');
        
        // Guard: ensure popup container and chart are ready
        if (!seriesSelectorSection || !additionalSeriesList || !this.chart || !this.chart.data || !this.chart.data.datasets) {
            return;
        }
        
        // Show the section inside the legend popup
        seriesSelectorSection.style.display = 'block';
        
        // Update citywide label
        if (citywideLabel) {
            citywideLabel.textContent = regionType === 'barcelona' ? 'Barcelona Citywide' : 'Spain Countrywide';
        }
        
        // Store reference to this for use in all event listeners
        const self = this;
        
        // Setup citywide checkbox listener
        if (citywideCheckbox) {
            // Remove existing listener if it exists
            if (this.citywideCheckboxListener) {
                citywideCheckbox.removeEventListener('change', this.citywideCheckboxListener);
            }
            
            // Set initial state based on chart visibility
            const citywideMeta = this.chart.getDatasetMeta(0);
            citywideCheckbox.checked = !citywideMeta.hidden;
            
            // Create and store new listener
            this.citywideCheckboxListener = function() {
                if (self.chart) {
                    const meta = self.chart.getDatasetMeta(0); // Index 0 is citywide
                    meta.hidden = !this.checked;
                    self.chart.update();
                }
            };
            
            citywideCheckbox.addEventListener('change', this.citywideCheckboxListener);
        }
        
        // Clear existing series
        additionalSeriesList.querySelectorAll('input[type="checkbox"]').forEach(input => {
            if (input._handler) {
                input.removeEventListener('change', input._handler);
            }
        });
        additionalSeriesList.innerHTML = '';
        
        const datasets = this.chart.data.datasets;
        console.log(`Setting up series selector for ${regionType}:`, datasets.length - 1, 'series found');
        
        // Create checkboxes for each non-citywide series based on chart datasets
        datasets.forEach((dataset, index) => {
            if (index === 0) return;
            
            const label = document.createElement('label');
            label.className = 'legend-entry';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `series-checkbox-${index}`;
            checkbox.dataset.index = index;
            
            const meta = this.chart.getDatasetMeta(index);
            checkbox.checked = !meta.hidden;
            
            // Color swatch for legend
            const swatch = document.createElement('span');
            swatch.className = 'legend-color-swatch';
            swatch.style.backgroundColor = dataset.borderColor || dataset.backgroundColor || this.DEFAULT_SERIES_COLOR;
            swatch.setAttribute('role', 'img');
            swatch.setAttribute('aria-label', `${dataset.label || 'Series'} color`);
            
            // Add event listener
            const onCheckboxChange = function() {
                if (self.chart) {
                    const datasetIndex = Number(this.dataset.index);
                    const meta = self.chart.getDatasetMeta(datasetIndex);
                    meta.hidden = !this.checked;
                    self.chart.update();
                }
            };
            
            checkbox._handler = onCheckboxChange;
            checkbox.addEventListener('change', onCheckboxChange);
            
            label.appendChild(checkbox);
            label.appendChild(swatch);
            label.appendChild(document.createTextNode(dataset.label || `Series ${index}`));
            additionalSeriesList.appendChild(label);
        });
    }

    /**
     * Setup legend toggle button for charts with many series
     */
    setupLegendToggle() {
        const toggleBtn = document.getElementById('toggle-legend-btn');
        const legendPopup = document.getElementById('legend-popup');
        
        if (!toggleBtn || !legendPopup) {
            return;
        }
        
        // Show the toggle button
        toggleBtn.style.display = 'inline-block';
        
        // Store reference to this for event listener
        const self = this;
        const btn = toggleBtn;
        const btnText = document.getElementById('legend-btn-text');
        const popup = legendPopup;
        const closeBtn = document.getElementById('legend-close-btn');
        
        const updateButtonText = (visible) => {
            if (btnText) {
                btnText.textContent = visible ? 'Hide Selector' : 'Select Series';
            }
        };
        
        const hidePopup = () => {
            popup.style.display = 'none';
            updateButtonText(false);
        };
        
        const showPopup = () => {
            popup.style.display = 'block';
            updateButtonText(true);
        };
        
        // Remove existing listeners if present
        if (this.legendToggleListener) {
            btn.removeEventListener('click', this.legendToggleListener);
        }
        if (this.legendCloseListener && closeBtn) {
            closeBtn.removeEventListener('click', this.legendCloseListener);
        }
        
        // Add click event listener
        this.legendToggleListener = function() {
            const isVisible = popup.style.display === 'block';
            if (isVisible) {
                hidePopup();
            } else {
                showPopup();
            }
        };
        btn.addEventListener('click', this.legendToggleListener);
        
        if (closeBtn) {
            this.legendCloseListener = hidePopup;
            closeBtn.addEventListener('click', this.legendCloseListener);
        }
        
        // Ensure initial state
        hidePopup();
    }

    /**
     * Create a simple bar chart for risk comparison
     * @param {Object} data - Data for the chart
     */
    createBarChart(data) {
        const canvas = document.getElementById('riskChart');
        if (!canvas) return;

        if (this.chart) {
            this.chart.destroy();
        }

        const ctx = canvas.getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Risk Level',
                    data: data.values,
                    backgroundColor: [
                        CONFIG.riskColors.very_low,
                        CONFIG.riskColors.low,
                        CONFIG.riskColors.medium,
                        CONFIG.riskColors.high,
                        CONFIG.riskColors.very_high
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }

    /**
     * Destroy the current chart
     */
    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }
}

// Create global instance
const visualization = new Visualization();
