// Visualization class for charts and graphs
class Visualization {
    constructor() {
        this.chart = null;
        // Configuration constants
        this.CHART_OPACITY = 0.25; // 40 in hex = 0.25 alpha
        // Store event listeners for cleanup
        this.citywideCheckboxListener = null;
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

        // Show series selector
        this.setupSeriesSelector('barcelona', districtData);

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
                        display: true,
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

        // Show series selector
        this.setupSeriesSelector('spain', ccaaData);

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
                        display: true,
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
    }

    /**
     * Setup series selector UI
     * @param {string} regionType - 'barcelona' or 'spain'
     * @param {Array} data - District or CCAA data
     */
    setupSeriesSelector(regionType, data) {
        const seriesSelectorSection = document.getElementById('series-selector-section');
        const citywideLabel = document.getElementById('series-citywide-label');
        const citywideCheckbox = document.getElementById('series-citywide');
        const additionalSeriesList = document.getElementById('additional-series-list');
        
        if (!seriesSelectorSection || !additionalSeriesList) {
            return;
        }
        
        // Show the section
        seriesSelectorSection.style.display = 'block';
        
        // Update citywide label
        if (citywideLabel) {
            citywideLabel.textContent = regionType === 'barcelona' ? 'Barcelona Citywide' : 'Spain Countrywide';
        }
        
        // Store reference to this for use in event listeners
        const self = this;
        
        // Setup citywide checkbox listener
        if (citywideCheckbox) {
            // Remove existing listener if it exists
            if (this.citywideCheckboxListener) {
                citywideCheckbox.removeEventListener('change', this.citywideCheckboxListener);
            }
            
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
        additionalSeriesList.innerHTML = '';
        
        // Get unique series names
        const seriesNames = new Set();
        data.forEach(item => {
            const name = item.District || item.NAMEUNIT || item.district || item.name || item.ccaa;
            if (name) {
                seriesNames.add(name);
            }
        });
        
        console.log(`Setting up series selector for ${regionType}:`, seriesNames.size, 'series found');
        
        // Create checkboxes for each series
        let index = 1; // 0 is citywide
        Array.from(seriesNames).sort().forEach(name => {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `series-checkbox-${index}`;
            checkbox.dataset.index = index;
            
            // Add event listener
            checkbox.addEventListener('change', function() {
                if (self.chart) {
                    const meta = self.chart.getDatasetMeta(this.dataset.index);
                    meta.hidden = !this.checked;
                    self.chart.update();
                }
            });
            
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(' ' + name));
            additionalSeriesList.appendChild(label);
            
            index++;
        });
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
