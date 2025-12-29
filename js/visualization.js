// Visualization class for charts and graphs
class Visualization {
    constructor() {
        this.chart = null;
        // Configuration constants
        this.CHART_OPACITY = 0.25; // 40 in hex = 0.25 alpha
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
        
        // Helper function to add alpha to hex color
        const addAlpha = (hexColor, alpha) => {
            const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
            return hexColor + alphaHex;
        };
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Vector Risk Index',
                        data: riskData,
                        borderColor: CONFIG.riskColors.very_high,
                        backgroundColor: addAlpha(CONFIG.riskColors.very_high, this.CHART_OPACITY),
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
