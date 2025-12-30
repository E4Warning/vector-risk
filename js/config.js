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
                geotiff: 'data/spain-risk.tif',
                timeseries: 'https://raw.githubusercontent.com/Mosquito-Alert/MosquitoAlertES/main/data/time_profile_country.json',
                ccaaTimeseries: 'https://raw.githubusercontent.com/Mosquito-Alert/MosquitoAlertES/main/data/time_profile_ccaas.json',
                mosquitoAlertES: {
                    enabled: true,
                    baseUrl: 'https://raw.githubusercontent.com/Mosquito-Alert/MosquitoAlertES/main/data/',
                    filePattern: 'muni_preds_{date}.json',
                    description: 'Data from MosquitoAlertES - Citizen science mosquito surveillance',
                    municipalityBoundariesLowRes: 'mapbox://johnrbpalmer.4bfv6pbn',
                    municipalityBoundariesHighRes: 'mapbox://johnrbpalmer.48qdct4s',
                    municipalitySourceLayerLowRes: 'spain_municipality_boundaries-7m7u82',
                    municipalitySourceLayerHighRes: 'spain_municipality_boundaries-dzvpt0',
                    mapboxAccessToken: 'pk.eyJ1Ijoiam9obnJicGFsbWVyIiwiYSI6ImFRTXhoaHcifQ.UwIptK0Is5dJdN8q-1djww',
                    maxVRI: 0.3
                }
            },
            comingSoon: false
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
            },
            comingSoon: true
        },
        jamaica: {
            name: 'Jamaica',
            type: 'country',
            center: [18.1096, -77.2975],
            zoom: 8,
            dataSources: {
                geojson: 'data/jamaica-risk.geojson',
                csv: 'data/jamaica-timeseries.csv',
                geotiff: 'data/jamaica-risk.tif'
            },
            comingSoon: true
        },
        barcelona: {
            name: 'Barcelona',
            type: 'city',
            center: [41.3851, 2.1734],
            zoom: 11,
            dataSources: {
                geojson: 'data/barcelona-risk.geojson',
                csv: 'data/barcelona-timeseries.csv',
                geotiff: 'data/barcelona-risk.tif',
                timeseries: 'https://raw.githubusercontent.com/Mosquito-Alert/bcn/refs/heads/main/data/bcn_time_profile_data.json',
                districtTimeseries: 'https://raw.githubusercontent.com/Mosquito-Alert/bcn/refs/heads/main/data/bcn_district_means.json',
                mosquitoAlertBCN: {
                    enabled: true,
                    baseUrl: 'https://raw.githubusercontent.com/Mosquito-Alert/bcn/main/data/',
                    filePattern: 'vri{date}.tif',
                    description: 'Data from MosquitoAlert BCN - High-resolution vector risk index',
                    mapboxAccessToken: 'pk.eyJ1Ijoiam9obnJicGFsbWVyIiwiYSI6ImFRTXhoaHcifQ.UwIptK0Is5dJdN8q-1djww',
                    mapboxStyleId: 'johnrbpalmer/cklcc4q673pe517k4n5co81sn',
                    maxVRI: 0.5
                }
            },
            comingSoon: false
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
            },
            comingSoon: true
        },
        kingston: {
            name: 'Kingston',
            type: 'city',
            center: [17.9714, -76.7930],
            zoom: 11,
            dataSources: {
                geojson: 'data/kingston-risk.geojson',
                csv: 'data/kingston-timeseries.csv',
                geotiff: 'data/kingston-risk.tif'
            },
            comingSoon: true
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

    // Mosquito observation source (public nightly data used by the official Mosquito Alert map)
    observationsSource: {
        // Data repository used by https://map.mosquitoalert.com (nightly snapshots)
        baseUrl: 'https://raw.githubusercontent.com/mosquitoalert/data/master/',
        // Fallback file used when a date-specific file is not available
        fallbackFile: 'observations.geojson',
        speciesPropertyCandidates: ['species', 'taxon', 'taxa', 'taxon_name'],
        datePropertyCandidates: ['event_date', 'observed_at', 'created_at', 'timestamp']
    },
    
    // Tile layer options
    tileLayer: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
    
    // Available basemaps
    basemaps: {
        osm: {
            name: 'OpenStreetMap',
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        },
        'osm-light': {
            name: 'Light Street Map',
            url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            maxZoom: 19
        },
        satellite: {
            name: 'Satellite',
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            maxZoom: 19
        },
        topo: {
            name: 'Topographic',
            url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
            attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
            maxZoom: 17
        }
    }
};
