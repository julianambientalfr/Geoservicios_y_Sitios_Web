// ============================================================
// VISOR DE SERVICIOS GEOGRÁFICOS - DEPARTAMENTO DE BOYACÁ
// Adaptación del visor original para utilizar los datos locales
// disponibles en webapp/datos/15_BOYACA/.
// ============================================================

// Crear el mapa centrado inicialmente en Tunja, Boyacá.
const map = L.map('map').setView([5.5353, -73.3678], 8);

// Capa base OpenStreetMap.
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
}).addTo(map);

// Servicio WMS del Marco Geoestadístico Nacional del DANE.
const geoserverUrl = 'https://geoportal.dane.gov.co/mparcgis/services/MGN2024/Serv_CapasMGN_2024/MapServer/WMSServer';

// Código DANE de Boyacá.
const BOYACA_CCDGO = '15';

// Capa WMS de departamentos.
const departamentosWMS = L.tileLayer.wms(geoserverUrl, {
    layers: '8',
    format: 'image/png',
    transparent: true,
    attribution: 'DANE - Departamento Administrativo Nacional de Estadística'
}).addTo(map);

// Archivo GeoJSON departamental incluido en el proyecto.
const departamentosWFSUrl = 'datos/departamentos.geojson';
let departamentosGeoJSON;

// Capa WMS de municipios.
const municipiosWMS = L.tileLayer.wms(geoserverUrl, {
    layers: '7',
    format: 'image/png',
    transparent: true,
    attribution: 'DANE - Departamento Administrativo Nacional de Estadística'
});

// Capas base disponibles.
const baseMaps = {
    'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }),
    'Satélite': L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { attribution: 'Tiles &copy; Esri' }
    )
};

// Capas superpuestas iniciales.
const overlayMaps = {
    'Departamentos': departamentosWMS,
    'Municipios': municipiosWMS
};

// Control de capas.
const controlLayer = L.control.layers(baseMaps, overlayMaps, {
    collapsed: false
}).addTo(map);

// Agregar OpenStreetMap como capa base predeterminada.
baseMaps['OpenStreetMap'].addTo(map);

// Cargar el GeoJSON departamental y filtrar Boyacá.
fetch(departamentosWFSUrl)
    .then(response => {
        if (!response.ok) {
            throw new Error(`No se pudo cargar ${departamentosWFSUrl}: HTTP ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        departamentosGeoJSON = L.geoJSON(data, {
            filter: feature =>
                String(feature.properties?.dpto_ccdgo) === BOYACA_CCDGO,
            style: {
                color: '#232323',
                weight: 2,
                fillColor: '#e8f881',
                fillOpacity: 0.35
            },
            onEachFeature: onEachFeature
        });

        const boyacaBounds = departamentosGeoJSON.getBounds();

        if (!boyacaBounds.isValid()) {
            throw new Error(
                'No se encontró Boyacá en datos/departamentos.geojson. Revisa el campo dpto_ccdgo y el código 15.'
            );
        }

        departamentosGeoJSON.addTo(map);
        controlLayer.addOverlay(departamentosGeoJSON, 'Boyacá (GeoJSON)');

        // Limitar las teselas WMS a la extensión de Boyacá.
        departamentosWMS.options.bounds = boyacaBounds;
        departamentosWMS.redraw();
        municipiosWMS.options.bounds = boyacaBounds;

        // Ajustar el encuadre al departamento.
        map.fitBounds(boyacaBounds);
    })
    .catch(error => {
        console.error('Error cargando el GeoJSON departamental:', error);
    });

// ============================================================
// CAPAS DETALLADAS DE BOYACÁ
// Se cargan desde webapp/datos/15_BOYACA/.
// Cada GeoJSON se descarga al activar su capa (carga diferida).
// ============================================================

const boyacaDataDir = 'datos/15_BOYAC%C3%81/';

// Capas temáticas disponibles en la carpeta de Boyacá.
const capasBoyaca = [
    {
        file: 'Administrativo_P.geojson',
        label: 'Topónimos administrativos',
        color: '#c62828',
        radio: 4
    },
    {
        file: 'Administrativo_R.geojson',
        label: 'Regiones administrativas',
        estilo: { color: '#8e24aa', weight: 1.5, fillColor: '#ce93d8', fillOpacity: 0.25 }
    },
    {
        file: 'Banco_Arena.geojson',
        label: 'Bancos de arena',
        estilo: { color: '#a1887f', weight: 1, fillColor: '#d7ccc8', fillOpacity: 0.55 }
    },
    {
        file: 'Bosque.geojson',
        label: 'Bosques',
        estilo: { color: '#1b5e20', weight: 1, fillColor: '#66bb6a', fillOpacity: 0.4 }
    },
    {
        file: 'Construccion_P.geojson',
        label: 'Construcciones',
        color: '#6d4c41',
        radio: 3
    },
    {
        file: 'Curva_Nivel.geojson',
        label: 'Curvas de nivel',
        estilo: { color: '#8d6e63', weight: 0.8 }
    },
    {
        file: 'Drenaje_Sencillo.geojson',
        label: 'Drenaje sencillo',
        estilo: { color: '#1e88e5', weight: 1 }
    },
    {
        file: 'Isla.geojson',
        label: 'Islas',
        estilo: { color: '#00838f', weight: 1, fillColor: '#80deea', fillOpacity: 0.5 }
    },
    {
        file: 'Orografia.geojson',
        label: 'Orografía',
        color: '#795548',
        radio: 4,
        estilo: { color: '#795548', weight: 1.2, fillColor: '#bcaaa4', fillOpacity: 0.35 }
    },
    {
        file: 'Via.geojson',
        label: 'Vías',
        estilo: { color: '#e65100', weight: 1.5 }
    }
];

// Escapar valores antes de insertarlos en los popups.
function escaparHTML(valor) {
    return String(valor)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

// Construir un popup con los atributos disponibles.
function popupBoyaca(props) {
    const entradas = Object.entries(props || {})
        .filter(([, valor]) => valor !== null && valor !== undefined && valor !== '')
        .slice(0, 10);

    if (entradas.length === 0) {
        return '<div>Sin atributos disponibles</div>';
    }

    const filas = entradas.map(([campo, valor]) =>
        `<p style="margin:2px 0"><strong>${escaparHTML(campo)}:</strong> ${escaparHTML(valor)}</p>`
    );

    return `<div>${filas.join('')}</div>`;
}

// Cargar una capa GeoJSON local dentro de su grupo.
function cargarCapaBoyaca(cfg) {
    fetch(boyacaDataDir + cfg.file)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} al solicitar ${cfg.file}`);
            }
            return response.json();
        })
        .then(data => {
            const capa = L.geoJSON(data, {
                style: cfg.estilo || {
                    color: cfg.color || '#455a64',
                    weight: 1.2,
                    fillColor: cfg.color || '#90a4ae',
                    fillOpacity: 0.35
                },
                pointToLayer: (feature, latlng) => L.circleMarker(latlng, {
                    radius: cfg.radio || 4,
                    color: cfg.color || '#455a64',
                    fillColor: cfg.color || '#90a4ae',
                    weight: 1,
                    fillOpacity: 0.8
                }),
                onEachFeature: (feature, layer) => {
                    if (feature.properties) {
                        layer.bindPopup(popupBoyaca(feature.properties));
                    }
                }
            });

            capa.addTo(cfg._group);
            console.info(`Capa cargada correctamente: ${cfg.file}`);
        })
        .catch(error => {
            cfg._loaded = false;
            console.error(`Error cargando la capa ${cfg.file}:`, error);
        });
}

// Registrar las capas temáticas en el control.
capasBoyaca.forEach(cfg => {
    cfg._group = L.layerGroup();
    cfg._loaded = false;
    controlLayer.addOverlay(cfg._group, cfg.label);
});

// Descargar cada GeoJSON solo cuando el usuario activa su capa.
map.on('overlayadd', event => {
    const cfg = capasBoyaca.find(capa => capa._group === event.layer);

    if (cfg && !cfg._loaded) {
        cfg._loaded = true;
        cargarCapaBoyaca(cfg);
    }
});

// Popup e interacciones para la capa departamental.
function onEachFeature(feature, layer) {
    if (feature.properties) {
        const nombre = feature.properties.dpto_cnmbr || 'Boyacá';
        const codigo = feature.properties.dpto_ccdgo || BOYACA_CCDGO;

        layer.bindPopup(`
            <div style="text-align:center;">
                <h3>${escaparHTML(nombre)}</h3>
                <p><strong>Código DANE:</strong> ${escaparHTML(codigo)}</p>
            </div>
        `);
    }

    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: zoomToFeature
    });
}

// Resaltar la entidad al pasar el cursor.
function highlightFeature(event) {
    const layer = event.target;

    layer.setStyle({
        weight: 5,
        color: '#666',
        fillOpacity: 0.7
    });

    layer.bringToFront();
}

// Restaurar el estilo original.
function resetHighlight(event) {
    const layer = event.target;

    layer.setStyle({
        weight: 2,
        color: '#232323',
        fillOpacity: 0.35
    });
}

// Acercar el mapa a la entidad seleccionada.
function zoomToFeature(event) {
    map.fitBounds(event.target.getBounds());
}

// Control de escala.
L.control.scale({
    position: 'bottomleft',
    metric: true,
    imperial: false
}).addTo(map);

// Panel informativo.
const info = L.control({ position: 'topleft' });

info.onAdd = function () {
    this._div = L.DomUtil.create('div', 'info');
    this._div.innerHTML = `
        <h4>Boyacá - Servicios Geográficos</h4>
        <p>Visualización del departamento y sus municipios</p>
        <p><small>Datos: DANE e IGAC | Visor cartográfico</small></p>
    `;
    return this._div;
};

info.addTo(map);

// Control de búsqueda.
const searchControl = L.control({ position: 'topright' });

searchControl.onAdd = function () {
    const div = L.DomUtil.create('div', 'search-control');

    div.innerHTML = `
        <input type="text" id="search-input" placeholder="Buscar departamento...">
        <button id="search-button" type="button">Buscar</button>
    `;

    L.DomEvent.disableClickPropagation(div);
    return div;
};

searchControl.addTo(map);

// Buscar una entidad dentro del GeoJSON departamental.
const searchButton = document.getElementById('search-button');
const searchInput = document.getElementById('search-input');

function buscarDepartamento() {
    const searchText = searchInput.value.trim().toLowerCase();

    if (!searchText || !departamentosGeoJSON) {
        return;
    }

    let encontrado = null;

    departamentosGeoJSON.eachLayer(layer => {
        const nombre = String(layer.feature?.properties?.dpto_cnmbr || '').toLowerCase();

        if (!encontrado && nombre.includes(searchText)) {
            encontrado = layer;
        }
    });

    if (encontrado) {
        map.fitBounds(encontrado.getBounds());
        encontrado.openPopup();
    } else {
        alert(`No se encontró el departamento: ${searchInput.value}`);
    }
}

searchButton.addEventListener('click', buscarDepartamento);

searchInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
        buscarDepartamento();
    }
});

// Marcador de Tunja, capital de Boyacá.
const tunjaMarker = L.marker([5.5353, -73.3678])
    .addTo(map)
    .bindPopup('<b>Tunja</b><br>Capital del departamento de Boyacá');
