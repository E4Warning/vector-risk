// Visualization class for charts and graphs
class Visualization {
    constructor() {
        this.chart = null;
        // Configuration constants
        this.CHART_OPACITY = 0.25; // 40 in hex = 0.25 alpha
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

        // Load CSV data
        const csvData = await dataLoader.loadCSV(region.dataSources.csv);

        // Prepare chart data - extract all arrays in single iteration
        const labels = [];
        const riskData = [];
        const temperatureData = [];
        const humidityData = [];
        
        csvData.forEach(item => {
            labels.push(item.date || '');
            riskData.push(parseFloat(item.risk_level || 0));
            temperatureData.push(parseFloat(item.temperature || 0));
            humidityData.push(parseFloat(item.humidity || 0));
        });

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
                        label: 'Risk Level',
                        data: riskData,
                        borderColor: CONFIG.riskColors.very_high,
                        backgroundColor: addAlpha(CONFIG.riskColors.very_high, this.CHART_OPACITY),
                        tension: 0.4,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Temperature (°C)',
                        data: temperatureData,
                        borderColor: '#ff9800',
                        backgroundColor: addAlpha('#ff9800', this.CHART_OPACITY),
                        tension: 0.4,
                        yAxisID: 'y1',
                        hidden: true
                    },
                    {
                        label: 'Humidity (%)',
                        data: humidityData,
                        borderColor: '#2196f3',
                        backgroundColor: addAlpha('#2196f3', this.CHART_OPACITY),
                        tension: 0.4,
                        yAxisID: 'y1',
                        hidden: true
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
                        text: `Risk Trends for ${region.name}`
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
                                    label += context.parsed.y.toFixed(1);
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
                            text: 'Risk Level'
                        },
                        min: 0,
                        max: 100
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Temperature / Humidity'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
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
