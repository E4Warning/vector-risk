// Configuration for data sources and regions
const CONFIG = {
    regions: {
        spain: {
            name: 'Spain',
            type: 'country',
            center: [40.4637, -3.7492],
            zoom: 6,
            dataSources: {
                geojson: 'data/spain-risk.geojson',
                csv: 'data/spain-timeseries.csv',
                geotiff: 'data/spain-risk.tif'
            }
        },
        brazil: {
            name: 'Brazil',
            type: 'country',
            center: [-14.2350, -51.9253],
            zoom: 4,
            dataSources: {
                geojson: 'data/brazil-risk.geojson',
                csv: 'data/brazil-timeseries.csv',
                geotiff: 'data/brazil-risk.tif'
            }
        },
        barcelona: {
            name: 'Barcelona',
            type: 'city',
            center: [41.3851, 2.1734],
            zoom: 11,
            dataSources: {
                geojson: 'data/barcelona-risk.geojson',
                csv: 'data/barcelona-timeseries.csv',
                geotiff: 'data/barcelona-risk.tif'
            }
        },
        'rio-de-janeiro': {
            name: 'Rio de Janeiro',
            type: 'city',
            center: [-22.9068, -43.1729],
            zoom: 11,
            dataSources: {
                geojson: 'data/rio-risk.geojson',
                csv: 'data/rio-timeseries.csv',
                geotiff: 'data/rio-risk.tif'
            }
        }
    },
    
    // Default map settings
    defaultCenter: [20, 0],
    defaultZoom: 2,
    
    // Risk color scale
    riskColors: {
        'very_low': '#4575b4',
        'low': '#91bfdb',
        'medium': '#fee090',
        'high': '#fc8d59',
        'very_high': '#d73027'
    },
    
    // Tile layer options
    tileLayer: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }
};
