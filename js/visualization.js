// Visualization class for charts and graphs
class Visualization {
    constructor() {
        this.chart = null;
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

        // Prepare chart data
        const labels = csvData.map(item => item.date || '');
        const riskData = csvData.map(item => parseFloat(item.risk_level || 0));
        const temperatureData = csvData.map(item => parseFloat(item.temperature || 0));
        const humidityData = csvData.map(item => parseFloat(item.humidity || 0));

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
                        label: 'Risk Level',
                        data: riskData,
                        borderColor: CONFIG.riskColors.very_high,
                        backgroundColor: CONFIG.riskColors.very_high + '40',
                        tension: 0.4,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Temperature (°C)',
                        data: temperatureData,
                        borderColor: '#ff9800',
                        backgroundColor: '#ff980040',
                        tension: 0.4,
                        yAxisID: 'y1',
                        hidden: true
                    },
                    {
                        label: 'Humidity (%)',
                        data: humidityData,
                        borderColor: '#2196f3',
                        backgroundColor: '#2196f340',
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
