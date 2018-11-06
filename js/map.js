/******************************************************
 *
 * global variables for OpenLayers map generation
 *
 *****************************************************/

//collection of image base layers
var baseLayers = {};
//collection of image overlays
var imageOverlays = {};
//collection of vector overlays
var vectorOverlays = {};
//collection of sensor overlays
var sensorOverlays = {};
var sensorOverlaySources = {};
//overlay styles for legend, selection and highlight
var overlayStyles = {};
var overlayStylesSelect = {};
var overlayStylesHighlight = {};
//feature collections
var featureHighlight = new ol.Collection();
var featureHighlightSource = new ol.Collection();
var featureSelection = new ol.Collection();
var featureSelectionSource = new ol.Collection();
//array with properties that will not be shown in property details list
var noInfoProperties = ["geometry", "layerId"];
//collection of WMS layer capabilities documents
var capabilitiesDocument = {};
var capabilities = {};
//object storing available time values for time-enabled layers
var timeValues = {};
//object storing time selection for time-enabled layers
var timeSelection = {};
//object storing legend divs for WMS layers
var legends = {};
//div elements
var dom_coordDiv = document.getElementById("coord");
var jq_coordDiv = $("#coord");
var jq_legendDiv = $("#container_legend");
var jq_highlightDiv = $('#highlight_info');
var jq_graphDiv = $("#container_graph");
var jq_infoDiv = $("#container_info");
var jq_timeDiv = $("#container_time");
//D3 graph object
var d3Graph = new D3Graph("container_graph");
//initial view
var projection = new ol.proj.Projection({code: 'EPSG:3857', units: 'm', axisOrientation: 'neu'});
var center = ol.proj.transform([13.73, 51.05], ol.proj.get("EPSG:4326"), projection);
var zoom = 10;
var minZoom = 8;
var pointSize = 8;
var clusterDistance = 40;
//array with link identifiers for data download
var sensorHubDownloadAnchors = {};
var sensorHubMeasurementLinks = {};
var sensorHubMeasurements = {};
var sensorHubLatest = {};
//array with radolan timeseries
var radolanTimeseries = {};
//array with station forecasts
var stationForecasts = {};
var forecastDevices = ["550490","567221","550560","552210","583190","568350","568400","568160","554260","554210",
    "554220","552012","550110","550390","550302","550190","583090","583122","564290","560301","564201","560201",
    "567700","551510","551411","551420","583235","583251","567310","551801","551811","551820","576391","576401",
    "576410","550810","563290","562012","563460","562014","563880","563890","563950","563790","562031","562040",
    "564160","562070","530020"];
//symbol classes that change during selection (i.e. class [name]_selected exists)
var symbolSelected = [
    "sensor_sym_graph",
    "sensor_sym_process_vhs",
    "sensor_sym_process_ezg",
    "sensor_sym_process_rw"
];
//geoJSON formta for parsing and encoding GeoJSON
var geojson  = new ol.format.GeoJSON();

//set OCPU target URL
//ocpu.seturl("https://ocpu.geo.tu-dresden.de/ocpu/library/xtruso/R");
ocpu.seturl("https://extruso.bu.tu-dresden.de/R");

//append Array prototype function to sum over feature property array length (number of sensors per device)
Array.prototype.sumFeatureValueLength = function (arrayProperty) {
    var totalLength = 0;
    for (var i = 0, len = this.length; i < len; i++) {
        totalLength += this[i].get(arrayProperty).length;
    }
    return totalLength;
};

/**
 * create an ol style
 * @param type symbol type
 * @param strokeWidth stroke width
 * @param symbolSize symbol size
 * @param lightFill lihght fill color
 * @param dash line dash
 * @param colors style color palette
 * @returns * oject
 */
function f_createOLStyle(type, strokeWidth, symbolSize, lightFill, dash, colors){
    var style = new ol.style.Style();
    if(type.indexOf("line") !== -1)
        style.setStroke(new ol.style.Stroke({
            color: colors[10],
            width: strokeWidth,
            lineDash: dash
        }));
    if(type.indexOf("area") !== -1)
        style.setFill(new ol.style.Fill({
            color: hexToRGBa((lightFill ? colors[2] : colors[10]), 0.5)
        }));
    if(type.indexOf("point") !== -1)
        style.setImage(new ol.style.Circle({
            radius: symbolSize,
            fill: new ol.style.Fill({
                color: (lightFill ? colors[2] : colors[10])
            }),
            stroke: new ol.style.Stroke({
                color: colors[10],
                width: strokeWidth,
                lineDash: dash
            })
        }));
    return style;
}

//set forecast style
var forecastStyle = new ol.style.Style({
    text: new ol.style.Text({
        offsetX: pointSize + 3,
        text: '>',
        fill: new ol.style.Fill({
            color: colorPalette["blue"][10]
        }),
        stroke: new ol.style.Stroke({
            color: colorPalette["blue"][10],
            width: 1
        })
    })
});

/**
 * convert hexadecimal color to rgba string
 * @param hex hexadecimal color
 * @param opacity target opacity
 * @return {string|*} rgba string
 */
function hexToRGBa(hex, opacity){
    hex = hex.replace('#','');
    return 'rgba(' +
        parseInt(hex.substring(0,2), 16) + ',' +
        parseInt(hex.substring(2,4), 16) + ',' +
        parseInt(hex.substring(4,6), 16) + ',' +
        opacity + ')';
}

var defaultSelectionStyle = f_createOLStyle(["point","line","area"], 1, pointSize, true, undefined, colorPalette["amber"]);
var defaultHighlightStyle = f_createOLStyle(["point","line","area"], 1, pointSize, false, undefined, colorPalette["deepOrange"]);

//sensor phenomena
var phenomena = {
    "default": f_initPhenomenon("NA", "NA", "NA", false, "line", colorPalette["blueGrey"]),
    "precipitation":  f_initPhenomenon("precipitation", "P", "mm/h", true, "area", colorPalette["cyan"]),
    "precipitation_sum": f_initPhenomenon("precipitation sum", "P sum", "1000m³/h", true, "area", colorPalette["cyan"]),
    "relative humidity":  f_initPhenomenon("relative humidity", "H", "%", false, "line", colorPalette["teal"]),
    "air temperature":  f_initPhenomenon("air temperature", "T", "°C", false, "line", colorPalette["pink"]),
    "soil temperature":  f_initPhenomenon("soil temperature", "T", "°C", false, "line", colorPalette["brown"]),
    "discharge": f_initPhenomenon("discharge", "Q", "m³/s", false, "line", colorPalette["deepPurple"]),
    "discharge prediction": f_initPhenomenon("discharge forecast", "Q", "m³/s", false, "line", colorPalette["purple"]),
    "water level": f_initPhenomenon("water level", "W", "cm", false, "line", colorPalette["lightBlue"]),
    "global radiation": f_initPhenomenon("global radiation", "G", "W/m²", false, "line", colorPalette["orange"]),
    "wind speed": f_initPhenomenon("wind speed", "V", "m/s", false, "line", colorPalette["lightGreen"]),
    "atmospheric pressure": f_initPhenomenon("atmospheric pressure", "atm", "hPa", false, "line", colorPalette["lime"])
};

/**
 * create phenomenon
 * @param name full phenomenon name
 * @param short short phenomenon name
 * @param uom unit of measurement
 * @param inverse flag: inverse y-axis
 * @param type diagram type
 * @param colors color palette for graph
 * @return {*} theme object
 */
function f_initPhenomenon(name, short, uom, inverse, type, colors) {
    return {
        name: name,
        short: short,
        uom: uom,
        inverse: inverse,
        colors: colors,
        //D3 graph settings
        type: type,
        color: function(index) {
            if(type === "line") return colors[10 - index * 2];
            else if(type === "area") return colors[6 + index * 2];
        },
        c_index: 0 //used for D3 graph color enumeration
    }
}

/**
 * get time interval object
 * @param start start time
 * @param end end time
 * @return {{start: Date, end: Date, get: string}}
 */
function f_getInterval(start, end) {
    return {
        start: start,
        end: end,
        get: "start=" + (start !== "" ? start.toISOString() : "") + "&end=" + end.toISOString()
    }
}

/**
 * update sensor hub intervals
 */
var sensorHubIntervals = {};
var forecastIntervals = {};
function f_updateSensorHubIntervals() {
    var now = new Date();
    sensorHubIntervals = {
        "2w": f_getInterval(new Date(new Date().setDate(now.getDate() - 14)), now),
        "1m": f_getInterval(new Date(new Date().setDate(now.getDate() - 30)), now),
        "1y": f_getInterval(new Date(new Date().setYear(now.getFullYear() - 1)), now),
        "All": {start: null, end: now, get: ""}
    };
    forecastIntervals = {
        "6h": f_getInterval(now, new Date(new Date().setDate(now.getDate() + 1)))
    };
}
f_updateSensorHubIntervals();

/**
 * set of proxies to access services blocked by same-origin policy
 */
var proxies = {};
proxies["https://geodienste.sachsen.de/wms_geosn_dop-rgb/guest"] = "https://extruso.bu.tu-dresden.de/geosn_dop";
proxies["https://geodienste.sachsen.de/wms_geosn_hoehe/guest"] = "https://extruso.bu.tu-dresden.de/geosn_hoehe";
proxies["https://www.umwelt.sachsen.de/umwelt/infosysteme/wms/services/wasser/einzugsgebiete_utm"] = "https://extruso.bu.tu-dresden.de/lfulg_ezg";


/******************************************************
 *
 * OpenLayers map functions
 *
 *****************************************************/

/**
 * escape non-alphanumeric symbols from id to be applicable as jQuery selector
 * @param selector
 */
function f_escapeSelector(selector){
    return selector.replace(/[^a-zA-Z_\d]/g, "" );
}


/**
 * initialize a WMS layer
 * @param baseUrl WMS base url
 * @param layer WMS layer name
 * @param title WMS display title
 * @param visible flag: initial visibility
 * @param opacity display opacity for this layer
 * @param type WMS layer type ('base' for base layer and '' for overlay)
 * @param timeEnabled flag: WMS layer has time dimension
 * @param attribution OpenLayers attribution
 * @param zIndex initial z index
 */
function f_initWMSLayer(baseUrl, layer, title, visible, opacity, type, timeEnabled, attribution, zIndex) {
    //initialize ol WMS layer
    var wmsLayer = new ol.layer.Image({
        title: title,
        visible: visible,
        type: type,
        opacity: opacity,
        zIndex: zIndex,
        source: new ol.source.ImageWMS({
            url: baseUrl,
            params: {'FORMAT': 'image/png', 'VERSION': '1.1.0', 'STYLES': '', 'LAYERS': layer},
            attributions: attribution
        })
    });
    //set layer id
    wmsLayer.id = f_escapeSelector(baseUrl + ":" + layer);
    wmsLayer.name = layer;
    //add layer to corresponding collection
    if (type === 'base')
        baseLayers[wmsLayer.id] = wmsLayer;
    else
        imageOverlays[wmsLayer.id] = wmsLayer;
    //get capabilities document
    f_getCapabilities(baseUrl, wmsLayer.id, layer, wmsLayer, timeEnabled);
}

/**
 * set WMS legend
 * @param layerId layer id
 * @param layer WMS layer name
 * @param legendUrl URL of legend
 */
function f_setLegend(layerId, layer, legendUrl) {
    if(legendUrl === null)
        return;
    //add legend to jq_legendDiv
    var legend = $('<span class="legend_bottom"></span><img class="legend hidden" title="Legend for ' + layer + '" src="' + legendUrl + '" alt="Legend for ' + layer + '" />');
    legends[layerId] = legend;
    jq_legendDiv.append(legend);
}

function f_initWFSJSONLayer(baseUrl, layer, title, visible, opacity, attribution, zIndex, maxResolution, style) {
    //set layer id
    var layerId = f_escapeSelector(baseUrl + ":" + layer);
    //add style
    f_setOverlayStyles(layerId, style);
    //init URL
    var wfsUrl = (baseUrl.endsWith('?') ? baseUrl : baseUrl + "?") +
        "service=WFS" +
        "&version=1.0.0" +
        "&request=GetFeature" +
        "&outputformat=json" +
        "&typeName=" + layer;
    //init vector source
    var wfsSource = new ol.source.Vector({
        //url: function (extent) { return url + '&bbox=' + extent.join(',') + ',EPSG:3857'; },
        loader: function(extent, resolution, projection) {
            var proj = projection.getCode();
            var url = wfsUrl + '&bbox=' + extent.join(',') + ',' + proj;
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url);
            var onError = function() {
                wfsSource.removeLoadedExtent(extent);
            };
            xhr.onerror = onError;
            xhr.onload = function() {
                if (xhr.status === 200) {
                    var features = wfsSource.getFormat().readFeatures(xhr.responseText);
                    features.forEach(function(feature){
                        feature.set("layer", title);
                        feature.set("layerId", layerId);
                    });
                    wfsSource.addFeatures(features);
                } else {
                    onError();
                }
            };
            xhr.send();
        },
        format: new ol.format.GeoJSON(),
        strategy: ol.loadingstrategy.bbox,
        attributions: attribution
    });
    //init WFS layer
    var vectorLayer = new ol.layer.Vector({
        title: title,
        visible: visible,
        opacity: opacity,
        zIndex: zIndex,
        maxResolution: maxResolution,
        source: wfsSource,
        style: style
    });
    vectorLayer.id = layerId;
    vectorLayer.name = layer;
    vectorOverlays[layerId] = vectorLayer;
}

function f_initFeatureLayer(id, title, visible, opacity, zIndex, style) {
    //add style
    f_setOverlayStyles(id, style);
    //init vector layer
    var vectorLayer = new ol.layer.Vector({
        title: title,
        visible: visible,
        opacity: opacity,
        zIndex: zIndex,
        source: new ol.source.Vector({
            format: geojson
        }),
        style: style
    });
    vectorLayer.id = id;
    vectorLayer.name = title;
    vectorOverlays[vectorLayer.id] = vectorLayer;
}

/**
 *
 * @param phenomenon phenomenon/phenomena to request
 * @param network network(s) to request
 * @param extent spatial extent
 * @return {{size: number, query: {bool: {must: {match_all: {}}, filter: *[]}}}}
 */
function f_getSensorHubQuery(phenomenon, network, extent){

    extent = ol.proj.transformExtent(extent, projection, "EPSG:4326");

    //set filter terms
    var terms = [];
    if(network !== null) terms.push({terms: {"networkCode": Array.isArray(network) ? network : [network]}});
    if(phenomenon !== null) terms.push({terms: {"phenomenon": Array.isArray(phenomenon) ? phenomenon : [phenomenon]}});

    return {
        "size" : 10000,
        "query" : {
            "bool" : {
                "must" : {
                    "match_all" : {}
                },
                "filter" : [
                    {
                        "bool": {
                            "must" : terms
                        }
                    },
                    [{
                        "geo_bounding_box":{
                            "geometry" : {
                                "top_left" : {"lon":extent[0], "lat":extent[3]},
                                "bottom_right" : {"lon":extent[2], "lat":extent[1]}
                            }
                        }
                    }]
                ]
            }
        }
        //"_source" : ["geometry", "networkCode", "topic", "deviceCode", "sensorCode", "measuredProperty", "uom"]
    };
}

function f_initSensorHubLayer(url, searchAPI, phenomenon, network, title, visible, attribution, zIndex, style){

    //create id
    var id = f_escapeSelector(title);

    //init sensor loader for sensor hub data
    var deviceLoader = (searchAPI !== null ?
        f_getSensorLoaderFromSearchAPI(url, searchAPI, network, phenomenon, title, id) :
        f_getSensorLoaderFromURL(url, network, title, id));

    //init sensor source
    var deviceSource = new ol.source.Vector({
        format: geojson,
        loader: deviceLoader,
        zIndex: 100,
        strategy: ol.loadingstrategy.bbox,
        attributions: attribution
    });
    sensorOverlaySources[id] = deviceSource;

    //create cluster source
    var deviceCluster = new ol.source.Cluster({
        distance: clusterDistance,
        source: deviceSource,
        attributions: attribution
    });

    //init style
    f_setOverlayStyles(id, style);

    //init layer with cluster source
    var deviceLayer = new ol.layer.Vector({
        title: title,
        visible: visible,
        source: deviceCluster,
        style: function(cluster){
            //var size = feature.get('features').length;
            var size = cluster.get('features').sumFeatureValueLength("sensors");
            var styleId = f_getClusterStyleId(cluster);
            var fStyle = f_getOverlayStyleById(styleId, false, false);
            if(!fStyle){
                fStyle = style.clone();
                //set text to display number of sensors for device
                fStyle.setText(new ol.style.Text({
                    text: size.toString(),
                    fill: new ol.style.Fill({
                        color: style.getStroke().getColor()
                    })
                }));
                //set forecast style
                if(styleId.endsWith("true"))
                    fStyle = [fStyle, forecastStyle];
                f_setOverlayStyles(styleId, fStyle);
            }
            return fStyle
        },
        zIndex: zIndex
    });

    //add device layer to sensor overlays
    deviceLayer.id = id;
    deviceLayer.name = title;
    sensorOverlays[id] = deviceLayer;

}

/**
 * chekc, if cluster contains forecast device
 * @param cluster input cluster
 * @return {boolean} true, if cluster contains a forecast device
 */
function f_getClusterForecast(cluster) {
    var forecast = false;
    cluster.get('features').forEach(function(feature) {
        if(feature.get("forecast") === "true")
            forecast = true;
    });
    return forecast;
}

/**
 * get cluster style id
 * @param cluster input cluster
 * @return string style id
 */
function f_getClusterStyleId(cluster){
    return cluster.get('features')[0].get("layerId") +
        cluster.get('features').sumFeatureValueLength("sensors") +
        f_getClusterForecast(cluster);
}

/**
 * create loader function for OSM search API
 * @param url entry point url
 * @param searchAPI search API
 * @param network target network
 * @param phenomenon target phenomenon
 * @param layer layer name
 * @param layerId layer id
 * @return {Function} loader function
 */
function f_getSensorLoaderFromSearchAPI(url, searchAPI, network, phenomenon, layer, layerId) {
    return function(extent, resolution, projection) {
        $.ajax({
            url: searchAPI,
            type: "POST",
            dataType: "json",
            contentType: 'application/json',
            data: JSON.stringify(f_getSensorHubQuery(phenomenon, network, extent)),
            success: function (response) {

                //create feature layer
                var featureCollection = f_initSensorHubDeviceLayer();

                //init sensors
                var hits = response.hits.hits;
                hits.forEach(function (hit) {
                    var source = hit["_source"];
                    var geometry = {
                        type: 'Point',
                        coordinates: [source["geometry"].lon, source["geometry"].lat]
                    };
                    f_addSensorToDeviceLayer(
                        featureCollection,
                        url,
                        source["networkCode"],
                        source["deviceCode"],
                        geometry,
                        hit["_id"],
                        source["sensorCode"],
                        source["phenomenon"],
                        source["uom"],
                        layer,
                        layerId
                    );
                });
                sensorOverlaySources[layerId].addFeatures(geojson.readFeatures(featureCollection, {
                    featureProjection: projection
                }));
            },
            error: function(response) {
                console.log(response.responseText);
            }
        })
    }
}

/**
 * create loader function for recursive sensor traversal
 * @param url entry point url
 * @param network requested network
 * @param layer layer title
 * @param layerId layer id
 * @return {Function} loader function
 */
function f_getSensorLoaderFromURL(url, network, layer, layerId){
    return function(extent, resolution, projection) {

        //create feature layer
        var featureCollection = f_initSensorHubDeviceLayer();

        //define function to get information on sensors
        var getSensorInfo = function(sensorUrl, deviceInfo) {

            var deferred = $.Deferred();
            var deviceCode = deviceInfo["code"];
            var deviceGeometry = deviceInfo["geometry"]["coordinates"];

            $.get(sensorUrl, function(sensorInfo) {
                $.each(sensorInfo.items, function (j, sensor) {

                    //manually set phenomenon for VEREINT measurements
                    //TODO align with OSW implementation
                    var phenomenon,
                        uom;
                    if(sensor["name"] === 'temp') {phenomenon = "air temperature"; uom = "°C";}
                    else if(sensor["name"] === 'hum') {phenomenon = "relative humidity"; uom = "%";}
                    else if(sensor["name"] === 'prec') {phenomenon = "precipitation"; uom = "mm";}
                    else if(sensor["name"] === 'pressure') {phenomenon = "atmospheric pressure"; uom = "hPa";}
                    else {phenomenon = "undefined"; uom = "undefined";}

                    //add feature to collection
                    var geometry = {
                        type: 'Point',
                        coordinates: deviceGeometry
                    };
                    f_addSensorToDeviceLayer(
                        featureCollection,
                        url,
                        network,
                        deviceCode,
                        geometry,
                        deviceCode + "_" + sensor["name"],
                        sensor["name"],
                        phenomenon,
                        uom,
                        layer,
                        layerId
                    );
                });
                deferred.resolve();
            });
            return deferred.promise();
        };

        //define function to get information on devices and corresponding sensors
        var getDeviceInfo = function(deviceUrl) {
            var deferred = $.Deferred();
            $.get(deviceUrl, function(deviceInfo) {
                $.when(getSensorInfo(deviceInfo["sensors_url"], deviceInfo))
                    .then(function() {
                        deferred.resolve()
                    });
            });
            return deferred.promise();
        };

        //get network array for iteration
        var networks = Array.isArray(network) ? network : [network];

        //get information on provided devices and sensors for each network
        networks.forEach(function(network) {

            //traverse devices
            $.get(url + "/networks/" + network + "/devices", function(deviceSummary){

                //add device calls to array
                var deviceCalls = [];
                $.each(deviceSummary.items, function (i, device) {
                    deviceCalls.push(getDeviceInfo(device["href"]));
                });

                //add features after array of device calls is resolved
                $.when.apply($, deviceCalls).then(function() {
                    sensorOverlaySources[layerId].addFeatures(geojson.readFeatures(featureCollection, {
                        featureProjection: projection
                    }));
                });
            })
        });
    }
}

/**
 * initialize device layer for OpenLayers
 * @return {*} FeatureCollection
 */
function f_initSensorHubDeviceLayer() {
    return {
        type: 'FeatureCollection',
        features: []
    };
}

/**
 * initialize device feature
 * @param api
 * @param network
 * @param deviceId device id
 * @param device device name
 * @param geometry device geometry
 * @param layer layer title
 * @param layerId layer id
 * @return {*} Feature
 */
function f_initSensorHubDevice(deviceId, api, network, device, geometry, layer, layerId) {
    return {
        type: 'Feature',
        id: deviceId,
        geometry: geometry,
        properties: {
            name: device,
            api: api,
            network: network,
            layer: network,
            layerId: layerId,
            sensors: [],
            forecast: (network === "HWIMS" && forecastDevices.indexOf(device) !== -1) ? "true" : "false"
        }
    }
}

/**
 * initialize sensor
 * @param url
 * @param network
 * @param device
 * @param deviceId
 * @param sensorId
 * @param code sensor code
 * @param phenomenon measured phenomenon
 * @param uom measurement uom
 * @return {{id: *, code: *, phenomenon: *, uom: *}}
 */
function f_initSensorHubSensor(url, network, device, deviceId, sensorId, code, phenomenon, uom) {
    return {
        url: url,
        network: network,
        device: device,
        deviceId: deviceId,
        id: sensorId,
        code: code,
        phenomenon: phenomenon,
        uom: uom
    }
}


function f_addSensorToDeviceLayer(deviceLayer, url, network, device, geometry, sensorId, sensorCode, phenomenon, uom, layer, layerId) {

    var deviceId = network + "_" + device;

    //get device feature from device layer
    var feature = $.grep(deviceLayer.features, function(f){ return f.id === deviceId; })[0];

    //check, if device is already present; if not, create device feature
    if(feature === undefined){
        feature = f_initSensorHubDevice(deviceId, url, network, device, geometry, layer, layerId);
        deviceLayer.features.push(feature);
    }

    //create sensor
    var sensor = f_initSensorHubSensor(url, network, device, deviceId, sensorId, sensorCode, phenomenon, uom);

    //add sensor phenomenon theme
    sensor["phenomenon"] = (phenomena.hasOwnProperty(phenomenon) ? phenomena[phenomenon] : phenomena["default"]);

    //add sensor to device
    feature["properties"]["sensors"].push(sensor);
}


/**
 * get WMS layer capabilities
 * @param url capabilities url
 * @param layerId layer id
 * @param layer WMS layer
 * @param wmsLayer ol layer object
 * @param timeEnabled flag: layer has time dimension
 */
function f_getCapabilities(url, layerId, layer, wmsLayer, timeEnabled) {
	
	//change url, if a proxy is defined
	if(proxies[url] !== undefined)
		url = proxies[url];

    //get already registered capabilities
    if(capabilitiesDocument[url] !== undefined) {
        if(capabilitiesDocument[url] !== null)
            f_initCapabilities(capabilitiesDocument[url], layerId, layer, wmsLayer, timeEnabled);
        else
            setTimeout(f_getCapabilities.bind(null, url, layerId, layer, wmsLayer, timeEnabled), 250);
    }

    //read capabilities document from URL
    else {
        //set capabilities dummy object
        capabilitiesDocument[url] = null;
        var parser = new ol.format.WMSCapabilities();
        var request = url + '?service=wms&request=getCapabilities';
        $.get(request).done(function(data) {
            capabilitiesDocument[url] = parser.read(data);
            f_initCapabilities(capabilitiesDocument[url], layerId, layer, wmsLayer, timeEnabled);
        });

    }

}

function f_initCapabilities(capabilitiesDoc, layerId, layer, wmsLayer, timeEnabled) {
    var wmsTopLayer = capabilitiesDoc.Capability.Layer;
    var wmsLayerCapabilities = f_getLayerByName(wmsTopLayer.Layer, layer);
    if (wmsLayerCapabilities === null)
        return;
    //get dimension
    capabilities[layerId] = wmsLayerCapabilities;
    if (timeEnabled) {
        f_initTimeDimesion(wmsLayerCapabilities, layerId, layer);
        //change visibility of time selection
        wmsLayer.on('change:visible', function () {
            //set visibility for time selection
            if (this.getVisible())
                $(timeSelection[layerId].div_selector).removeClass('hidden');
            else
                $(timeSelection[layerId].div_selector).addClass('hidden');
        });
    }
    //get legend and set attribution
    var legendUrl = f_getLegendUrlFromCapabilities(wmsLayerCapabilities);
	//set proxy, if defined
    for(var proxy in proxies) {
        if (legendUrl.startsWith(proxy)){
            legendUrl = legendUrl.replace(proxy, proxies[proxy]);
			break;
		}
    }
    //only add legend, if URL is valid
    f_urlExists(legendUrl, function(exists){
        if(exists)
            f_setLegend(layerId, layer, legendUrl);
    });
    //change visibility of legend
    wmsLayer.on('change:visible', function () {
        //return if legend is not set
        if(legends[layerId] === undefined)
            return;
        //set visibility for time selection
        if (this.getVisible())
            legends[layerId].removeClass('hidden');
        else
            legends[layerId].addClass('hidden');
    });
}


/**
 * check, if URL is valid
 * @param url input url
 * @param callback
 */
function f_urlExists(url, callback){
    $.ajax({
        type: 'HEAD',
        url: url,
        success: function(){
            callback(true);
        },
        error: function() {
            callback(false);
        }
    });
}

/**
 * get legend url from layer capabilities
 * @param wmsLayerCapabilities layer capabilities
 * @returns layer legend url
 */
function f_getLegendUrlFromCapabilities(wmsLayerCapabilities) {
    if (wmsLayerCapabilities === null || !("Style" in wmsLayerCapabilities))
        return null;
    return f_getLegendUrlFromStyles(wmsLayerCapabilities.Style);
}

/**
 * get legend url from layer style definitions
 * @param styles layer style definitions
 * @returns layer legend url
 */
function f_getLegendUrlFromStyles(styles) {
    if (styles === null || styles.length !== 1)
        return null;
    return f_getLegendUrlFromStyle(styles[0]);
}

/**
 * get legend url from layer style definition
 * @param style layer style definition
 * @returns layer legend url
 */
function f_getLegendUrlFromStyle(style) {
    if (style === null || !("LegendURL" in style))
        return null;
    return f_getLegendUrlFromLegend(style.LegendURL[0]);
}

/**
 * get legend url from legend url object
 * @param legendURL legend url object
 * @returns layer legend url
 */
function f_getLegendUrlFromLegend(legendURL) {
    if(!("OnlineResource" in legendURL))
        return null;
    var resource = legendURL.OnlineResource;
    //replace http with https to prevent mixed content warning
    resource = resource.replace(/^http:\/\//i, 'https://');
    return resource;
}

/**
 * initialize time dimension for WMS layer
 * @param wmsLayerCapabilities WMS layer capabilities
 * @param layerId layer id
 * @param layer WMS layer name
 */
function f_initTimeDimesion(wmsLayerCapabilities, layerId, layer) {
    //init selector object
    f_initTimeSelector(layerId, layer);
    //append selection divs for display
    f_displayTimeSelection(layerId, layer);
    //get dimension
    var dimension = f_getDimension(wmsLayerCapabilities, "time")
    if (dimension === null)
        return;
    var defaultValue = new Date(dimension.default);
    //parse date values
    timeValues[layerId] = f_getDateArray(dimension.values, ",");
    //parse date values
    f_initTimeSelection(layerId, defaultValue);
}

/**
 * get WMS layer capabilities from capabilities document
 * @param wmsLayers WMS top layers
 * @param layer target layer name
 * @returns WMS layer capabilites or null, if no matching layer was found
 */
function f_getLayerByName(wmsLayers, layer) {
    var numberOfLayers = wmsLayers.length;
    for (var i = 0; i < numberOfLayers; i++) {
        if (wmsLayers[i].Name === layer)
            return wmsLayers[i];
        else if (wmsLayers[i].Layer !== undefined) {
            var wmsLayer = f_getLayerByName(wmsLayers[i].Layer, layer);
            if (wmsLayer !== null)
                return wmsLayer;
        }
    }
    return null;
}

/**
 * get dimension from WMS layer capabilities
 * @param wmsLayer WMS layer capabilities
 * @param name dimension name
 * @returns time dimension
 */
function f_getDimension(wmsLayer, name) {
    if (wmsLayer.Dimension === null)
        return null;
    var numberOfDimensions = wmsLayer.Dimension.length;
    for (var i = 0; i < numberOfDimensions; i++) {
        if (wmsLayer.Dimension[i].name === name)
            return wmsLayer.Dimension[i];
    }
}

/**
 * initialize time selection display
 * @param layerId layer id
 * @param layer layer name
 */
function f_displayTimeSelection(layerId, layer) {
    $('#container_time').append('<div id="time_' + layer + '" class="container_time_layer hidden">' +
        '   <div class="time_section time_steps">' +
        '       <div class="time_title">Time selection for <b>' + layer + '</b></div>\n' +
        '       <a href="#" class="time_step" title="previous" onclick="f_timeStep(\'' + layerId + '\', -1)">&#x23f4;</a>' +
        '       <a href="#" class="time_step" title="first" onclick="f_timeStep(\'' + layerId + '\', -2)">&#x23ee;</a>' +
        '   </div>' +
        '   <div class="time_section" title="Hours">\n' +
        '       <div class="time_label">H</div>\n' +
        '       <div id="' + timeSelection[layerId].selection[3].div_name + '"></div>\n' +
        '   </div>\n' +
        '   <div class="time_section" title="Minutes">\n' +
        '       <div class="time_label_adjust">&nbsp;</div>\n' +
        '       <div id="' + timeSelection[layerId].selection[4].div_name + '"></div>\n' +
        '       <div class="time_label">M</div>\n' +
        '   </div>\n' +
        '   <div class="time_section" title="Day">\n' +
        '       <div class="time_label_adjust">&nbsp;</div>\n' +
        '       <div id="' + timeSelection[layerId].selection[2].div_name + '"></div>\n' +
        '       <div class="time_label">D</div>\n' +
        '   </div>\n' +
        '   <div class="time_section" title="Month">\n' +
        '       <div class="time_label">M</div>\n' +
        '       <div id="' + timeSelection[layerId].selection[1].div_name + '"></div>\n' +
        '   </div>\n' +
        '   <div class="time_section" title="Year">\n' +
        '       <div class="time_label_adjust" >&nbsp;</div>\n' +
        '       <div id="' + timeSelection[layerId].selection[0].div_name + '"></div>\n' +
        '       <div class="time_label">Y</div>\n' +
        '   </div>\n' +
        '   <div class="time_section time_steps">' +
        '       <div class="time_label_adjust">&nbsp;</div>\n' +
        '       <a href="#" class="time_step" title="last" onclick="f_timeStep(\'' + layerId + '\', 2)">&#x23ed;</a>' +
        '       <a href="#" class="time_step" title="next" onclick="f_timeStep(\'' + layerId + '\', 1)">&#x23f5;</a>' +
        '   </div>' +
        '</div>');
}

/**
 * initialize time selector object for layer
 * @param layerId layer id
 * @param layer layer name
 */
function f_initTimeSelector(layerId, layer) {
    var escapedLayer = f_jQueryEscape(layer);
    timeSelection[layerId] = {};
    timeSelection[layerId].div_name = layer;
    timeSelection[layerId].div_selector = '#time_' + escapedLayer;
    timeSelection[layerId].selection = [];
    timeSelection[layerId].selection[0] = {
        'title': 'year',
        'div_name': layer + '_year',
        'div_selector': '#' + escapedLayer + '_year',
        'timeFunction': 'getFullYear',
        'values': [],
        'selected': null
    };
    timeSelection[layerId].selection[1] = {
        'title': 'month',
        'div_name': layer + '_month',
        'div_selector': '#' + escapedLayer + '_month',
        'timeFunction': 'getMonth',
        'values': [],
        'selected': null
    };
    timeSelection[layerId].selection[2] = {
        'title': 'date',
        'div_name': layer + '_date',
        'div_selector': '#' + escapedLayer + '_date',
        'timeFunction': 'getDate',
        'values': [],
        'selected': null
    };
    timeSelection[layerId].selection[3] = {
        'title': 'hours',
        'div_name': layer + '_hours',
        'div_selector': '#' + escapedLayer + '_hours',
        'timeFunction': 'getHours',
        'values': [],
        'selected': null
    };
    timeSelection[layerId].selection[4] = {
        'title': 'minutes',
        'div_name': layer + '_minutes',
        'div_selector': '#' + escapedLayer + '_minutes',
        'timeFunction': 'getMinutes',
        'values': [],
        'selected': null
    };
    timeSelection[layerId].filteredValues = [];
    timeSelection[layerId].isComplete = function () {
        return timeSelection[layerId].filteredValues.length === 1;
    };
}

/**
 * set time selection for particular layer and index
 * @param layerId layer id
 * @param index dimension index (0 = year, 1 = month, 2 = day, 3 = hours, 4 = minutes)
 * @param value value to be selected
 */
function f_setTimeSelection(layerId, index, value) {
    if (timeSelection[layerId].selection[index].selected === value)
        return;
    timeSelection[layerId].selection[index].selected = value;
    timeSelection[layerId].filteredValues = f_filterTimeValues(layerId);
    //change WMS timestamp, if time selection is complete
    if (timeSelection[layerId].isComplete() === true)
        imageOverlays[layerId].getSource().updateParams({'TIME': timeSelection[layerId].filteredValues[0].toISOString()});
}

/**
 * escape jQuery selector (escapes CSS characters '[' ':' '.' '[' ']')
 * @param selector input selector
 * @returns escaped selector
 */
function f_jQueryEscape(selector) {
    return selector.replace(/([:.\[])/g, "\\$1");
}

/**
 * initialize current time selection
 * @param layerId layer id
 * @param value Date value
 */
function f_initTimeSelection(layerId, value) {
    //get array of available years
    timeSelection[layerId].selection[0].values = f_getDateElementArray(timeValues[layerId], timeSelection[layerId].selection[0].timeFunction);
    //init default value, if input value is a valid Date
    if (value instanceof Date && !isNaN(value.valueOf())) {
        for (var i = 0; i < timeSelection[layerId].selection.length; i++) {
            f_updateTimeSelection(layerId, i, value[timeSelection[layerId].selection[i].timeFunction]());
        }
    }
    //start with selection of year
    else
        f_updateTimeSelection(layerId, 0, null);
}

/**
 * get array of Date elements from string
 * @param values String representation of time array
 * @param separator element separator
 * @returns {Array} Date elements
 */
function f_getDateArray(values, separator) {
    var sArray = values.split(separator);
    var dArray = [];
    for (var i = 0; i < sArray.length; i++) {
        var date = new Date(sArray[i]);
        if (date !== null)
            dArray.push(date);
    }
    dArray.sort(function (a, b) {
        return a - b;
    });
    return dArray;
}

/**
 * get array of date sub-elements
 * @param dArray array of Date elements
 * @param dateFunction date funtino to extract sub-element
 * @returns {Array} date sub-elements
 */
function f_getDateElementArray(dArray, dateFunction) {
    var dateElements = [];
    for (var i = 0; i < dArray.length; i++) {
        var date = dArray[i];
        var dateElement = date[dateFunction]();
        if (dateElements.indexOf(dateElement) === -1)
            dateElements.push(dateElement);
    }
    dateElements.sort(function (a, b) {
        return a - b;
    });
    return dateElements;
}

/**
 * filter current Date elements based on current selection for layer in timeSelection[layerId]
 * @param layerId layer id
 * @returns {Array} filtered Date values matching the current selection
 */
function f_filterTimeValues(layerId) {
    var filteredValues = [];
    for (var i = 0; i < timeValues[layerId].length; i++) {
        var timestamp = timeValues[layerId][i];
        var filter = true;
        for (var j = 0; j < timeSelection[layerId].selection.length; j++) {
            var selected = timeSelection[layerId].selection[j].selected;
            if (selected !== null && timestamp[timeSelection[layerId].selection[j].timeFunction]() !== selected)
                filter = false;
        }
        if (filter)
            filteredValues.push(timestamp);
    }
    return filteredValues;
}

/**
 * update time selection for layer
 * @param layerId layer id
 * @param index index for selected time sub-element
 * @param selectedValue value to be selected
 */
function f_updateTimeSelection(layerId, index, selectedValue) {
    //remove selection for this and higher indices
    for (var i = index; i < timeSelection[layerId].selection.length; i++) {
        f_unselectTime(layerId, i);
    }
    //set selected value, if there is only one element to select
    if (selectedValue === null && timeSelection[layerId].selection[index].values.length === 1)
        selectedValue = timeSelection[layerId].selection[index].values[0];
    //set current selection
    var timeSelectionDiv = $(timeSelection[layerId].selection[index].div_selector);
    f_setTimeSelection(layerId, index, selectedValue);
    //add child elements with possible time values
    for (i = 0; i < timeSelection[layerId].selection[index].values.length; i++) {
        var value = timeSelection[layerId].selection[index].values[i];
        if (selectedValue !== null && value !== selectedValue)
            continue;
        var valueDiv = $('<div class="time_element' +
            (value === selectedValue ? ' time_element_selected' : '') +
            '" onclick="f_updateTimeSelection(\'' + layerId + '\',' + index + ',' + value + ')">' +
            f_getTimeValueDisplay(index, value) +
            '</div>');
        timeSelectionDiv.append(valueDiv);
    }
    //set style to selected
    timeSelectionDiv.parent().find('.time_label').addClass('time_label_active');
    //display child elements, if selectedValue is not null
    if (selectedValue !== null && timeSelection[layerId].selection[index + 1] !== void 0) {
        timeSelection[layerId].selection[index + 1].values = f_getDateElementArray(timeSelection[layerId].filteredValues, timeSelection[layerId].selection[index + 1].timeFunction);
        f_updateTimeSelection(layerId, index + 1, null);
    }
}

/**
 * set time selection to defined value
 * @param layerId id of time-enabled layer
 * @param value target time value
 */
function f_timeStep(layerId, value){
    //first value
    if(value === -2)
        f_initTimeSelection(layerId, timeValues[layerId]['timestamp']);
    //last value
    else if(value === 2)
        f_initTimeSelection(layerId, timeValues[layerId][timeValues[layerId].length - 1]);
    else {
        //return if current selection is incomplete
        if(!timeSelection[layerId].isComplete)
            return;
        //get current value
        var currentValue = timeSelection[layerId].filteredValues[0];
        //get index of current value in list of values
        var index = timeValues[layerId].indexOf(currentValue);
        //previous value (if current selection is not the first value)
        if(value === -1 && index >= 1)
            f_initTimeSelection(layerId, timeValues[layerId][index - 1]);
        //next value (if current selection is not the last value)
        else if(value === 1 && index < timeValues[layerId].length - 1)
            f_initTimeSelection(layerId, timeValues[layerId][index + 1]);
    }
}

/**
 * get value for display
 * @param index index for time sub-element
 * @param value value to be displayed
 * @returns display value
 */
function f_getTimeValueDisplay(index, value) {

    //increase month number to set range from [0,11] to [1,12]
    if(index === 1)
        value += 1;

    //append preceding zero for one-number digits
    if(value <= 9)
        value = '0' + value;

    return value;
}

/**
 * unselect current time selection
 * @param layerId layer id
 * @param index index for time sub-element
 */
function f_unselectTime(layerId, index) {
    f_setTimeSelection(layerId, index, null);
    $(timeSelection[layerId].selection[index].div_selector).find('.time_element').remove();
    $(timeSelection[layerId].selection[index].div_selector).parent().find('.time_label').removeClass('time_label_active');
}

/******************************************************
 *
 * OpenLayers map definition
 *
 *****************************************************/

baseLayers['OpenStreetMap'] = new ol.layer.Tile({title: 'OpenStreetMap', type: 'base', source: new ol.source.OSM(), zIndex: 0});
f_initWMSLayer("https://geodienste.sachsen.de/wms_geosn_dop-rgb/guest", "sn_dop_020", dictionaries[lang]["OL_Base_Ortho"], false, 1, 'base', false, 'Orthophoto &copy; GeoSN. ', 0);
f_initWMSLayer("https://geodienste.sachsen.de/wms_geosn_hoehe/guest", "Gelaendehoehe", dictionaries[lang]["OL_Base_DEM"], false, 1, 'base', false, 'Elevation model &copy; GeoSN. ', 0);

//f_initWMSLayer("https://www.umwelt.sachsen.de/umwelt/infosysteme/wms/services/wasser/einzugsgebiete_utm", "0", "Haupteinzugsgebiete (LfULG)", false, 0.75, '', false, 'Haupteinzugsgebiete &copy; LfULG. ', 1);
//f_initWMSLayer("https://www.umwelt.sachsen.de/umwelt/infosysteme/wms/services/wasser/einzugsgebiete_utm", "1", "Teileinzugsgebiete (LfULG)", false, 1, '', false, 'Teileinzugsgebiete &copy; LfULG. ', 2);

f_initWMSLayer("https://maps.dwd.de/geoserver/ows", "dwd:SF-Produkt", dictionaries[lang]["OL_WMS_RadolanSF"], false, 0.75, '', true, 'Radar Precipitation (SF) &copy; DWD. ', 3);
f_initWMSLayer("https://maps.dwd.de/geoserver/ows", "dwd:RX-Produkt", dictionaries[lang]["OL_WMS_RadolanRX"], false, 0.75, '', true, 'Radar Reflectivity (RX) &copy; DWD. ', 5);
f_initWMSLayer("https://maps.dwd.de/geoserver/ows", "dwd:FX-Produkt", dictionaries[lang]["OL_WMS_RadolanFX"], false, 0.75, '', true, 'Radar Reflectivity (FX) &copy; DWD. ', 4);

f_initWFSJSONLayer("https://extruso.bu.tu-dresden.de/geoserver/wfs", "xtruso:catchments", dictionaries[lang]["OL_WFS_CatchmentMain"], false, .3, "Haupteinzugsgebiete &copy; LfULG. ", 10, 1000,  f_createOLStyle(['line','area'], 1, 0, true, false, colorPalette["lightBlue"]));
f_initWFSJSONLayer("https://extruso.bu.tu-dresden.de/geoserver/wfs", "xtruso:subcatchments", dictionaries[lang]["OL_WFS_CatchmentSub"], false, .3, "Teileinzugsgebiete &copy; LfULG. ", 11, 100,  f_createOLStyle(['line','area'], 1, 0, true, false, colorPalette["lightBlue"]));

f_initWFSJSONLayer("https://extruso.bu.tu-dresden.de/geoserver/wfs", "xtruso:rivers_main", dictionaries[lang]["OL_WFS_RiverMain"], false, 1, "Flussläufe &copy; LfULG. ", 10, 1000,  f_createOLStyle(['line','area'], 1, 0, true, false, colorPalette["blue"]));
f_initWFSJSONLayer("https://extruso.bu.tu-dresden.de/geoserver/wfs", "xtruso:rivers_all", dictionaries[lang]["OL_WFS_RiverAll"], false, 1, "Gewässernetzwerk &copy; LfULG. ", 11, 100,  f_createOLStyle(['line','area'], 1, 0, true, false, colorPalette["cyan"]));

f_initSensorHubLayer("https://api.sensorhub-tud-test.smart-rain.de/v0", null, null, "vereint", dictionaries[lang]["OL_Sensor_Vereint"], true, "Sensors &copy; SensorHub. ", 20, f_createOLStyle(["point","line"], 1, pointSize, true, undefined, colorPalette["green"]));
f_initSensorHubLayer("https://api.sensorhub-tud-test.smart-rain.de/v0", null, null, "student", dictionaries[lang]["OL_Sensor_Student"], false, "Sensors &copy; SensorHub. ", 20, f_createOLStyle(["point","line"], 1, pointSize, true, undefined, colorPalette["lightGreen"]));

f_initSensorHubLayer("https://api.opensensorweb.de/v0", "https://search.opensensorweb.de/v0/sensor/_search", ["discharge","water level"], null, dictionaries[lang]["OL_Sensor_Gauge"], true, "Sensors &copy; SensorHub. ", 20, f_createOLStyle(["point","line"], 1, pointSize, true, undefined, colorPalette["blue"]));
f_initSensorHubLayer("https://api.opensensorweb.de/v0", "https://search.opensensorweb.de/v0/sensor/_search", ["precipitation","relative humidity","air temperature","global radiation", "wind speed", ""], null, dictionaries[lang]["OL_Sensor_Meteo"], true, "Sensors &copy; SensorHub. ", 20, f_createOLStyle(["point","line"], 1, pointSize, true, undefined, colorPalette["lightBlue"]));

//f_initSensorHubLayer("https://api.opensensorweb.de/v0", "https://search.opensensorweb.de/v0/sensor/_search", null, "HWIMS", "LHWZ Pegeldaten", true, "Sensors &copy; SensorHub. ", 20, f_createOLStyle(["point"], 1, 4, true, undefined, colorPalette["deepPurple"]));
//f_initSensorHubLayer("https://api.opensensorweb.de/v0", "https://search.opensensorweb.de/v0/sensor/_search", null, "BAFG", "BAFG Pegeldaten", true, "Sensors &copy; SensorHub. ", 20, f_createOLStyle(["point"], 1, 4, true, undefined, colorPalette["deepPurple"]));
//f_initSensorHubLayer("https://api.opensensorweb.de/v0", "https://search.opensensorweb.de/v0/sensor/_search", null, "AMMS_WETTERDATEN", "AMMS Wetterdaten", true, "Sensors &copy; SensorHub. ", 20, f_createOLStyle(["point"], 1, 4, true, undefined, colorPalette["blue"]));

f_initFeatureLayer("ProcessingResults", dictionaries[lang]["OL_Processing_Results"], true, .5, 40, f_createOLStyle(["point","line","area"], 1, pointSize, true, false, colorPalette["deepOrange"]));

/**
 * create layerswitcher object (is referenced from ol3-layerswitcher for rendering onchange)
 */
var layerSwitcher = new ol.control.LayerSwitcher();

/**
 * create map object
 * @type {ol.Map}
 */
var map = new ol.Map({
    controls: ol.control.defaults().extend([
        new ol.control.MousePosition({
            className: 'custom-mouse-position',
            projection: 'EPSG:4326',
            target: dom_coordDiv,
            coordinateFormat: ol.coordinate.createStringXY(5),
            undefinedHTML: ''
        }),
        layerSwitcher
    ]),
    layers: [
        new ol.layer.Group({
            title: dictionaries[lang]["OL_Basemap"],
            layers: Object.keys(baseLayers).map(function (key) {
                return baseLayers[key];
            })
        }),
        new ol.layer.Group({
            title: dictionaries[lang]["OL_Image"],
            layers: Object.keys(imageOverlays).map(function (key) {
                return imageOverlays[key];
            })
        }),
        new ol.layer.Group({
            title: dictionaries[lang]["OL_Vector"],
            layers: Object.keys(vectorOverlays).map(function (key) {
                return vectorOverlays[key];
            })
        }),
        new ol.layer.Group({
            title: dictionaries[lang]["OL_Sensors"],
            layers: Object.keys(sensorOverlays).map(function (key) {
                return sensorOverlays[key];
            })
        })
    ],
    target: 'map',
    view: new ol.View({
        projection: projection,
        center: center,
        zoom: zoom,
        minZoom: minZoom
    }),
    interactions: ol.interaction.defaults().extend([
        f_getSelectInteraction(),
        f_getBBoxInteraction(),
        f_getHighlightInteraction()
    ])
});

/**
 * initialize overlay styles
 * @param id overlay id
 * @param style default style
 */
function f_setOverlayStyles(id, style){
    overlayStyles[id] = style;
    if(Array.isArray(style)) {
        overlayStylesSelect[id] = [];
        overlayStylesHighlight[id] = [];
        style.forEach(function(s) {
            overlayStylesSelect[id].push(f_getInteractionStyle(s, true));
            overlayStylesHighlight[id].push(f_getInteractionStyle(s, false));
        })
    }
    else {
        overlayStylesSelect[id] = f_getInteractionStyle(style, true);
        overlayStylesHighlight[id] = f_getInteractionStyle(style, false);
    }
}

/**
 * set overlay selection style
 * @param style default style
 * @param selection flag: get selection style, else highlight style
 */
function f_getInteractionStyle(style, selection){

    var newStyle = new ol.style.Style();
    var strokeColor = selection ? colorPalette["amber"][10] : colorPalette["deepOrange"][10];
    var fillColor = selection ? colorPalette["amber"][2] : colorPalette["deepOrange"][2];

    if(style.getStroke() !== null)
        newStyle.setStroke(new ol.style.Stroke({
            color: strokeColor,
            width: style.getStroke().getWidth(),
            lineDash: style.getStroke().getLineDash()
        }));

    if(style.getFill() !== null)
        newStyle.setFill(new ol.style.Fill({
            color: hexToRGBa(fillColor, 0.5)
        }));

    if(style.getImage() !== null)
        newStyle.setImage(new ol.style.Circle({
            radius: style.getImage().getRadius(),
            fill: style.getImage().getFill() !== null ? new ol.style.Fill({
                color: selection ? fillColor : style.getImage().getFill().getColor() }) : null,
            stroke: new ol.style.Stroke({
                color: strokeColor,
                width: style.getImage().getStroke().getWidth() + 1,
                lineDash: style.getImage().getStroke().getLineDash()
            })
        }));

    if(style.getText() !== null)
        newStyle.setText(new ol.style.Text({
            text: style.getText().getText(),
            offsetX: style.getText().getOffsetX(),
            offsetY: style.getText().getOffsetY(),
            fill: new ol.style.Fill({
                color: selection ? strokeColor : (style.getText().getFill().getColor())
            }),
            stroke: style.getText().getStroke()
        }));

    return newStyle;

}

/**
 * get sensor or vector overlay style by id
 * @param id layer id
 * @param select flag: get selection style
 * @param highlight flag: get highlight style
 * @return ol.style
 */
function f_getOverlayStyleById(id, select, highlight) {
    if(select) return overlayStylesSelect.hasOwnProperty(id) ? overlayStylesSelect[id] : defaultSelectionStyle;
    else if(highlight) return overlayStylesHighlight.hasOwnProperty(id) ? overlayStylesHighlight[id] : defaultHighlightStyle;
    else return overlayStyles.hasOwnProperty(id) ? overlayStyles[id] : null;
}

/**
 * get stroke color from style
 * @param style inpur style
 * @return {*} stroke color
 */
function f_getStrokeColor(style) {
    if(style === null) return null;
    if(style.getStroke() !== null)
        return style.getStroke().getColor();
    else if(style.getImage() !== null && style.getImage().getStroke() !== null)
        return style.getImage().getStroke().getColor();
    else return null;
}

/**
 * get fill color from style
 * @param style input style
 * @return {*} fill color
 */
function f_getFillColor(style) {
    if(style === null) return null;
    if(style.getFill() !== null)
        return style.getFill().getColor();
    else if(style.getImage() !== null && style.getImage().getFill() !== null)
        return style.getImage().getFill().getColor();
    else return null;
}

/**
 * update info container, if length of selected feature source changed
 */
function f_updateFeatureInfo(refresh) {
    if(refresh)
        f_refreshView();
    if (featureSelectionSource.getLength() > 0)
        f_updateInfoDiv(true, f_getHTMLFeatureInfo(featureSelectionSource, "*", true, true));
    else
        f_updateInfoDiv(false, "");
}

function f_refreshView() {
    //clear measurements
    sensorHubMeasurements = {};
    sensorHubLatest = {};
    //update intervals
    f_updateSensorHubIntervals();
    //refresh elements, if selected (trigger click twice)
    $(".refreshable").each(function(){
        if($(this).attr('class').includes("_selected"))
            $(this).trigger("click").trigger("click")
    })
    //refresh latest measurements
    f_setLatestMeasurements();
}

//register refresh function
$("#refresh").click(function(){
    f_updateFeatureInfo(true);
});

/**
 * update feature selection source, if length of selected features changed
 */
featureSelection.on('change:length', function (evt) {
    featureSelectionSource.clear();
    featureSelection.forEach(function(selection) {
        if(selection.get('features') !== undefined){
            var features = selection.get('features');
            features.forEach(function(feature) {
                featureSelectionSource.push(feature);
            })
        }
        else
            featureSelectionSource.push(selection)
    });
    f_updateFeatureInfo(false);
});

/**
 * get select interaction
 */
function f_getSelectInteraction() {
    return new ol.interaction.Select({
        condition: ol.events.condition.click,
        multi: true,
        style: function(feature) {
            //get style id
            var id = feature.get('features') !== undefined ? f_getClusterStyleId(feature) : feature.get("layerId");
            //get overlay style
            return f_getOverlayStyleById(id, true, false);
        },
        filter: function (feature, layer) {
            return !(!layer || !(layer.id in vectorOverlays || layer.id in sensorOverlays));
        },
        features: featureSelection
    });
}

/**
 * get bbox selection
 */
function f_getBBoxInteraction() {
    var interactionBBox = new ol.interaction.DragBox({
        condition: ol.events.condition.platformModifierKeyOnly,
    });
    interactionBBox.on('boxend', function() {
        var extent = interactionBBox.getGeometry().getExtent();
        //add features from vector overlays
        for (var layer in vectorOverlays) {
            if(vectorOverlays[layer].getVisible() === true){
                vectorOverlays[layer].getSource().forEachFeatureIntersectingExtent(extent, function (feature) {
                    featureSelection.push(feature);
                });
            }
        }
        //add features from sensor overlays
        for (layer in sensorOverlays) {
            if(sensorOverlays[layer].getVisible() === true){
                sensorOverlaySources[layer].forEachFeatureIntersectingExtent(extent, function (feature) {
                    featureSelection.push(feature);
                });
            }
        }
    });
    interactionBBox.on('boxstart', function() {
        featureSelection.clear();
    });
    return interactionBBox;
}

/**
 * update feature highlight source, if length of highlighted features changed
 */
featureHighlight.on('change:length', function (evt) {
    featureHighlightSource.clear();
    featureHighlight.forEach(function(highlight) {
        if(highlight.get('features') !== undefined){
            var features = highlight.get('features');
            features.forEach(function(feature) {
                featureHighlightSource.push(feature);
            })
        }
        else
            featureHighlightSource.push(highlight)
    });
});

/**
* get highlight interaction
*/
function f_getHighlightInteraction() {
    var interactionHighlight = new ol.interaction.Select({
        condition: ol.events.condition.pointerMove,
        multi: true,
        style: function(feature) {
            //get style id
            var id = feature.get('features') !== undefined ? f_getClusterStyleId(feature) : feature.get("layerId");
            //get overlay style
            return f_getOverlayStyleById(id, false, true);
        },
        layers: function (layer) {
            return layer && (layer.id in vectorOverlays || layer.id in sensorOverlays);
        },
        features: featureHighlight
    });
    interactionHighlight.on('select', function () {
        if (featureHighlightSource.getLength() > 0) {
            var featureNames = "";
            var limit = 0;
            featureHighlightSource.forEach(function(f) {
                limit++;
                if(limit < 5)
                    featureNames += f_getHTMLFeatureId(f, "name", true, false).append($('<br>')).html();
                else if(limit >= 5)
                    featureNames += '.';
                //else: ignore
            });
            jq_highlightDiv.fadeIn(100);
            jq_highlightDiv.html(featureNames);
        } else {
            jq_highlightDiv.html('&nbsp;');
            jq_highlightDiv.hide();
        }
    });
    return interactionHighlight;
}

/**
 * get feature by id
 * @param featureId
 */
function f_getFeatureById(featureId) {
    var feature = null;
    this.featureSelectionSource.forEach(function (f) {
        if (f.getId() === featureId)
            feature = f;
    });
    return feature;
}

/**
 * highlight feature (used for hover on feature id)
 * @param featureId feature id
 */
function f_highlightFeatureById(featureId){
    f_clearHighlight();
    var feature = f_getFeatureById(featureId);
    if(feature !== null)
        featureHighlight.push(feature);
}

/**
 * clear highlight
 */
function f_clearHighlight() {
    featureHighlight.clear();
    jq_highlightDiv.html('&nbsp;');
    jq_highlightDiv.hide();
}

/**
 * get HTML feature info
 * @param features input features
 * @param properties visible properties ("*" for all properties)
 * @param showLayer flag: show layer name id available
 * @param highlight flag: set highlight interaction for hover
 * @returns string feature info string
 */
function f_getHTMLFeatureInfo(features, properties, showLayer, highlight) {

    var jq_infoDiv = $('<div>');
    features.forEach(function(f) {

        //create feature info div
        var jq_featureInfo = $('<div>', {
            'class': 'info_item'
        }).append($('<hr>'));

        //append layer id
        jq_featureInfo.append(f_getHTMLFeatureId(f, "name", showLayer, highlight));

        //set selected properties
        var f_properties =
            (f.get("sensors") === undefined ?
                (properties === "*" ? f.getKeys() : properties) : []);

        //add feature properties
        var jq_featureProperty = $('<div>', {
            'class': 'property_div'
        });

        //print properties
        f_properties.forEach(function(property) {
            if (noInfoProperties.indexOf(property) !== -1)
                return;
            jq_featureProperty.append($('<span>', {
                'class': 'property_name',
                text: property + ": "
            }));
            jq_featureProperty.append($('<span>', {
                'class': 'property_value',
                text: f.get(property)
            }));
            jq_featureProperty.append($('<br>'));
        });

        //init SensorHub information
        if(f.get("sensors") !== undefined && f.get("sensors").length > 0) {

            //get sorted sensor array
            var sensors = f.get("sensors").sort(function(a,b){
                return a["phenomenon"]["short"] > b["phenomenon"]["short"];
            });

            //append sensor icon
            sensors.forEach(function (sensor) {
                jq_featureProperty.append(f_getSensorItem(sensor));
            });

            //append sensor details
            sensors.forEach(function (sensor) {
                jq_featureProperty.append(f_getSensorDetails(f, sensor));
            });

        }

        //init RADOLAN timeseries processing
        if(["Polygon", "MultiPolygon"].indexOf(f.getGeometry().getType()) !== -1) {

            //init div
            var jq_details = $('<div>', {
                id: f.getId() + "_details"
            }).css('border-left', "10px solid white")
                .css('overflow', "hidden")
                .css('padding-left', "5px");

            jq_details.append($('<div>', {
                'class': 'property_name lang',
                'data-lang': 'OL_Process',
                text: dictionaries[lang]['OL_Process']
            }).css("margin-left", "0").css("clear", "both"));

            for(var interval in sensorHubIntervals) {
                jq_details.append(f_getRADOLANTimeseriesLink(f, interval));
            }
            jq_featureProperty.append(jq_details);
        }

        jq_featureInfo.append(jq_featureProperty);
        jq_infoDiv.append(jq_featureInfo);

    });

    return jq_infoDiv;
}

/**
 * get identifier for device details
 * @param sensor input sensor
 * @return {string} identifier for sensor details
 */
function f_getDetailsIdentifier(sensor) {
    return f_escapeSelector(sensor["id"]) + "_details";
}

/**
* get identifier for latest sensor values
* @param sensor input sensor
* @return {string} identifier for latets sensor values
*/
function f_getLatestIdentifier(sensor) {
    return f_escapeSelector(sensor["id"]) + "_latest";
}

/**
 * get sensor info div
 * @param sensor input sensor
 * @return {jQuery}
 */
function f_getSensorItem(sensor) {

    return $('<div>', {
        'class': 'sensor_div'
    }).append($('<div>', {
        id: f_escapeSelector(sensor["id"]),
        'class': 'sensor_info',
        title: "Sensor code: " + sensor["code"],
        text: sensor["phenomenon"]["short"],
        click: function(){
            //swap class
            $(this).toggleClass("sensor_info_selected");
            var jq_details = $("#" + f_getDetailsIdentifier(sensor));
            var currentHeight = jq_details.height();
            var newHeight = (currentHeight === 0 ? jq_details[0].scrollHeight : 0);
            var newMargin = (currentHeight === 0 ? 5 : 0);
            jq_details.css("height", newHeight + "px");
            jq_details.css("margin-bottom", newMargin + "px");
            jq_details.css("padding-left", newMargin + "px");
        }
    })
        .css('background-color', sensor["phenomenon"]['colors'][2])
        .append($('<div>', {
            id: f_getLatestIdentifier(sensor),
            'class': 'sensor_latest',
            'data-url': f_getSensorHubLink(sensor, false, null)
        }))
    );
}

/**
 * set latest measurements
 */
function f_setLatestMeasurements(){
    $(".sensor_latest").each(function(){
        //check if value is cached
        var id = this.id;
        if(sensorHubLatest.hasOwnProperty(this.id))
            this.innerHTML = sensorHubLatest[id];
        else {
            $.get({
                url: this.dataset.url,
                id: id,
                success: function(result) {
                    var value = result["sensor_stats"]["latest_value"];
                    if(value === undefined)
                        return;
                    if(value.length > 6) value = value.substring(0, 6);
                    sensorHubLatest[this.id] = value;
                    document.getElementById(this.id).innerHTML = sensorHubLatest[this.id];
                },
                error: function (response) {
                    console.log(response.responseText);
                }
            });
        }
    });
}

/**
 * get measurement identifier for measurement download
 * @param sensor measurement sensor
 * @param interval interval
 * @return {*} measurement id
 */
function f_getMeasurementId(sensor, interval){
    return f_escapeSelector(sensor["id"]) + "_" + interval;
}

function f_getSensorDetails(device, sensor) {

    //init details div
    var details = $('<div>', {
        id: f_getDetailsIdentifier(sensor),
        'class': 'sensor_details'
    }).css('border-left', "10px solid " + sensor["phenomenon"]['colors'][2]);

    //init sensor hub links for each interval
    for(var interval in sensorHubIntervals) {
        sensorHubMeasurementLinks[f_getMeasurementId(sensor,interval)] = f_getSensorHubLink(sensor, true, sensorHubIntervals[interval]);
    }

    //append sensor name with link to further information
    details.append($('<a>', {
        'class': 'lang_t',
        'data-lang-t': "OL_Sensor_Details",
        title: dictionaries[lang]["OL_Sensor_Details"],
        'href': f_getSensorHubLink(sensor, false, null),
        click: function(){
            window.open(this.href);
            return false;
        }}).append($('<span>', {
            'class': 'property_name',
            text: "Sensor: "
        }).css("margin-left", "0")).append($('<span>', {
            'class': 'property_value lang',
            'data-lang': 'OL_Phen_' + sensor["phenomenon"]["name"],
            text: dictionaries[lang]['OL_Phen_' + sensor["phenomenon"]["name"]]
         })).append($('<br>'))
    );

    //append download title
    details.append($('<div>', {
        'class': 'property_name lang',
        'data-lang': 'OL_Sensor_Download',
        text: dictionaries[lang]['OL_Sensor_Download']
    }).css("margin-left", "0").css("clear", "both"));

    //append download item for each interval
    for(interval in sensorHubIntervals) {
        details.append(f_getDownloadLink(sensor, interval));
    }

    //append graph title
    details.append($('<div>', {
        'class': 'property_name lang',
        'data-lang': 'OL_Sensor_Graph',
        text: dictionaries[lang]['OL_Sensor_Graph']
    }).css("margin-left", "0").css("clear", "both"));

    //append graph selection for each interval
    for(interval in sensorHubIntervals) {
        details.append(f_getGraphLink(sensor, interval));
    }

    //append processing
    var processes = [];

    //append catchment processing for HWIMS layer
    if(sensor["network"] === "HWIMS")
        processes.push(f_getCatchmentProcessLink(device));

    //append forecast link
    if(sensor["phenomenon"]["name"] === "discharge" && forecastDevices.indexOf(device.get("name")) > -1)
        processes.push(f_getForecastLink(sensor));

    //append processes, if not empty
    if(processes.length > 0){
        //append processing title
        details.append($('<div>', {
            'class': 'property_name lang',
            'data-lang': 'OL_Process',
            text: dictionaries[lang]['OL_Process']
        }).css("margin-left", "0").css("clear", "both"));
        processes.forEach(function(process){
            details.append(process);
        })
    }

    return details;
}

/**
 * get download link for measurements
 * @param sensor input sensor
 * @param interval requested interval
 * @return {jQuery} download symbol
 */
function f_getDownloadLink(sensor, interval) {

    //init link
    var measurementId = f_getMeasurementId(sensor, interval);

    var downloadLink = $('<a>', {
        id: measurementId + "_a_link"
    }).css("display", "none");
    downloadLink.downloadUrl = sensorHubMeasurementLinks[measurementId];
    downloadLink.format = "text/csv";
    downloadLink.filename = "measurements_" + measurementId + ".csv";
    sensorHubDownloadAnchors[measurementId] = downloadLink;

    //init final download link
    return ($('<div>', {
        'class': 'lang_t sensor_sym sensor_sym_download',
        'data-lang-t': "OL_Sensor_Download_" + interval,
        title: dictionaries[lang]["OL_Sensor_Download_" + interval],
        'data-id': measurementId,
        id: measurementId + "_a",
        text: interval,
        click: function (evt) {
            if(evt.target.attributes["data-id"] === undefined) return;
            var id = evt.target.attributes["data-id"].value;
            var downloadAnchor = sensorHubDownloadAnchors[id];
            $.ajax({
                url: downloadAnchor.downloadUrl,
                type: 'GET',
                dataType: 'binary',
                headers: {
                    Accept: downloadAnchor.format,
                    'Content-Type': downloadAnchor.format
                },
                processData: false,
                id: id,
                success: function (result) {
                    var anchor = sensorHubDownloadAnchors[this.id];
                    var windowUrl = window.URL || window.webkitURL;
                    var url = windowUrl.createObjectURL(result);
                    anchor.prop('href', url);
                    anchor.prop('download', anchor.filename);
                    anchor.get(0).click();
                    windowUrl.revokeObjectURL(url);
                }
            });
        }
    }).append(downloadLink));
}

/**
 * get graph link for measurements
 * @param sensor input sensor
 * @param interval requested interval
 * @return {jQuery} graph link
 */
function f_getGraphLink(sensor, interval) {
    var measurementId = f_getMeasurementId(sensor, interval);
    return ($('<div>', {
        'class': 'lang_t sensor_sym sensor_sym_graph refreshable',
        'data-lang-t': "OL_Sensor_Graph_" + interval,
        'data-interval': interval,
        'data-id': measurementId,
        title: dictionaries[lang]["OL_Sensor_Graph_" + interval],
        text: interval,
        id: measurementId + "_g",
        click: function(evt){
            var interval = evt.target.attributes["data-interval"].value;
            var id = evt.target.attributes["data-id"].value;
            //reset graph container
            jq_graphDiv.empty();
            //close graph, if shown already
            if(d3Graph.activeGraph(id)){
                f_removeGraph(id);
                //hide graph container, if no graph is displayed
                if(d3Graph.numberOfGraphs() === 0)
                    f_updateGraphDiv(false);
                return;
            }
            //show graph for selected sensor
            f_updateGraphDiv(true);
            //check, if measurements are available in cache
            if(sensorHubMeasurements[id] !== undefined && sensorHubMeasurements[id].length > 0){
                f_addGraph(id, sensor["code"], sensorHubMeasurements[id], sensorHubIntervals[interval], sensor["phenomenon"]);
            }
            //request measurements
            else {
                var url = sensorHubMeasurementLinks[id];
                $.ajax({
                    headers: {
                        Accept : "text/csv; charset=utf-8",
                        "Content-Type": "text/csv; charset=utf-8"
                    },
                    url: url,
                    type: 'GET',
                    id: id,
                    interval: interval,
                    success: function (result) {
                        f_setMeasurements(this.id, result);
                        f_addGraph(this.id, sensor["code"], sensorHubMeasurements[this.id], sensorHubIntervals[this.interval], sensor["phenomenon"]);
                    }
                });
            }
        }
    }));
}

/**
 * get catchment processing link for device
 * @param device input device
 * @return {jQuery} catchment process link
 */
function f_getCatchmentProcessLink(device) {
    return ($('<div>', {
        'class': 'lang_t lang sensor_sym sensor_sym_process_ezg',
        'data-lang': "OL_Process_Catchment_Abbr",
        'data-lang-t': "OL_Process_Catchment",
        'data-id': device.get("name"),
        title: dictionaries[lang]["OL_Process_Catchment"],
        text: dictionaries[lang]["OL_Process_Catchment_Abbr"],
        click: function (evt) {
            var id = evt.target.attributes["data-id"].value;
            var request = ocpu.call("x.app.catchment.upstream", {'station.id': id, 'geometry': true, 'dissolve': true, 'as.json': true}, function(session) {
                session.getObject(function(result){
                    f_clearHighlight();
                    var features = geojson.readFeatures(decodeURI(result));
                    if(features !== null && features.length === 1) {
                        features[0].setId("catchment_" + id);
                        features[0].layer = "Processing Results";
                        features[0].layerId = "ProcessingResults";
                        vectorOverlays["ProcessingResults"].getSource().addFeature(features[0]);
                    }
                });
            }).fail(function(){
                console.log("Error: " + request.responseText);
            });
        }
    }));
}

/**
 * get forecast link for sensor
 * @param sensor input sensor
 * @return {jQuery} forecast link
 */
function f_getForecastLink(sensor) {
    var measurementId = f_getMeasurementId(sensor, "forecast_6h");
    return ($('<div>', {
        'class': 'lang_t lang sensor_sym sensor_sym_process_vhs',
        'data-lang': "OL_Process_Forecast_Abbr",
        'data-lang-t': "OL_Process_Forecast",
        'data-id': measurementId,
        title: dictionaries[lang]["OL_Process_Forecast"],
        text: dictionaries[lang]["OL_Process_Forecast_Abbr"],
        id: measurementId + "_g",
        click: function (evt) {
            var id = evt.target.attributes["data-id"].value;
            jq_graphDiv.empty();
            //close graph, if shown already
            if(d3Graph.activeGraph(id)){
                f_removeGraph(id);
                //hide graph container, if no graph is displayed
                if(d3Graph.numberOfGraphs() === 0)
                    f_updateGraphDiv(false);
                return;
            }
            //show graph for selected sensor
            f_updateGraphDiv(true);
            //check, if measurements are available in cache
            if(stationForecasts[id] !== undefined && stationForecasts[id].length > 0){
                f_addGraph(id, sensor["code"], stationForecasts[id], forecastIntervals['6h'], phenomena["discharge prediction"]);
            }
            else {
                //request OCPU
                var request = ocpu.call("x.octave.flood_nn", {'gauge': $(this).data('deviceCode')}, function (session) {
                    session.getObject(function (result) {
                        f_setStationForecast(id, result);
                        f_addGraph(id, sensor["code"], stationForecasts[id], forecastIntervals['6h'], phenomena["discharge prediction"]);
                    });
                }).fail(function () {
                    console.log("Error: " + request.responseText);
                });
            }
        }
    }).data('deviceCode', sensor["device"]));
}

/**
 * get link to RADOLAN Timeseries
 * @param feature input feature
 * @param interval requested interval
 */
function f_getRADOLANTimeseriesLink(feature, interval) {
    var measurementId = f_escapeSelector(feature.getId() + "_RW_" + interval);
    return ($('<div>', {
        'class': 'lang_t sensor_sym sensor_sym_process_rw',
        'data-lang-t': "OL_Process_RadolanRW_" + interval,
        'data-interval': interval,
        'data-id': measurementId,
        title: dictionaries[lang]["OL_Process_RadolanRW_" + interval],
        text: interval,
        id: measurementId + "_g",
        click: function (evt) {
            var id = evt.target.attributes["data-id"].value;
            var interval = evt.target.attributes["data-interval"].value;
            var timeframe = sensorHubIntervals[interval];
            jq_graphDiv.empty();
            //close graph, if shown already
            if(d3Graph.activeGraph(id)){
                f_removeGraph(id);
                //hide graph container, if no graph is displayed
                if(d3Graph.numberOfGraphs() === 0)
                    f_updateGraphDiv(false);
                return;
            }
            //show graph for selected sensor
            f_updateGraphDiv(true);
            //check, if measurements are available in cache
            if(radolanTimeseries[id] !== undefined && radolanTimeseries[id].length > 0){
                f_addGraph(id, "RADOLAN RW", radolanTimeseries[id], timeframe, phenomena["precipitation_sum"]);
            }
            else {
                //adjust timeframe
                if(timeframe['start'] === null)
                    timeframe['start'] = new Date("2005-01-01 00:00:00Z");
                //set polygon mask
                var mask = geojson.writeFeature($(this).data('feature'));
                //request OCPU
                var req = ocpu.call("x.app.radolan.timeseries", {'t.start': f_getRADOLANTimestamp(timeframe['start']), 't.end': f_getRADOLANTimestamp(timeframe['end']), 'extent': mask}, function(session) {
                    session.getObject(function(result){
                        f_setRADOLANMeasurements(id, result);
                        f_addGraph(id, "RADOLAN RW", radolanTimeseries[id], timeframe, phenomena["precipitation_sum"]);
                    });
                }).fail(function () {
                    console.log("Error: " + request.responseText);
                });
            }
        }
    }).data('feature', feature));
}

/**
 * add SensorHub measurements to cache
 * @param id graph identifier
 * @param csv measurements from sensor
 */
function f_setMeasurements(id, csv) {

    //parse measurement values for D3
    sensorHubMeasurements[id] = d3.csvParse(csv, function(d) {
        return {
            'timestamp': d3.isoParse(d.begin),
            'value': +d.v
        };
    });

}

/**
 * add RADOLAN measurements to cache
 * @param id measurements identifier
 * @param ocpu measurements from OCPU
 */
function f_setRADOLANMeasurements(id, ocpu) {

    //parse measurement values
    var measurements = [];
    for(var i=0; i<ocpu.length; i++){
        measurements.push({
            'timestamp': f_parseUNIXTimestamp(ocpu[i]['timestamp']),
            'value': ocpu[i]['sum']
        })
    }
    radolanTimeseries[id] = measurements;

}


/**
 * add forecast measurements to cache
 * @param id measurements identifier
 * @param ocpu measurements from OCPU
 */
function f_setStationForecast(id, ocpu) {

    //parse measurement values
    var measurements = [];
    for(var i=0; i<ocpu.length; i++){
        measurements.push({
            'timestamp': new Date(Date.parse(ocpu[i]['timestamp'] + '+00:00')),
            'value': ocpu[i]['value']
        })
    }
    stationForecasts[id] = measurements;

}


/**
 * parse timestamp from R
 * @param timestamp seconds since 01.01.1970
 */
function f_parseUNIXTimestamp(timestamp){
    return new Date(timestamp * 1000);
}

/**
 * format RADOLAN timestamp
 * @param timestamp input Date
 */
function f_getRADOLANTimestamp(timestamp) {
    return timestamp.toISOString().replace("T"," ").replace("Z","");
}

/**
 * get Link to SensorHub
 * @param sensor input sensor
 * @param measurements flag: link to raw measurements
 * @param interval time interval for measurements
 * @returns {string} link to SensorHub
 */
function f_getSensorHubLink(sensor, measurements, interval){
    var url = sensor["url"] +
        "/networks/" + sensor["network"] +
        "/devices/" + sensor["device"] +
        "/sensors/" + sensor["code"];
    if(!measurements)
        return url;
    //add measurement request
    return url + "/measurements/raw?" + interval['get'];
}

/**
 * initialize measurement graph
 * @param id measurement id
 * @param sensor sensor name
 * @param measurements input measurements
 * @param timeframe graph timeframe
 * @param phenomenon measured phenomenon
 */
function f_addGraph(id, sensor, measurements, timeframe, phenomenon) {

    //get measurements
    if(measurements === undefined || measurements.length === 0)
        return;

    //set symbol background
    var symbol = document.getElementById(id + "_g");
    symbolSelected.forEach(function(className){
        if(symbol.classList.contains(className))
            f_switchClass(symbol, className + "_selected", className);
    });

    //add graph to display
    d3Graph.addGraph(id, sensor, measurements, timeframe, null, phenomenon);
}

/**
 * initialize measurement graph
 * @param id graph id
 */
function f_removeGraph(id) {

    //set symbol background
    var symbol = document.getElementById(id + "_g");
    symbolSelected.forEach(function(className){
        if(symbol.classList.contains(className + "_selected"))
            f_switchClass(symbol, className, className + "_selected");
    });

    //remove graph
    d3Graph.removeGraph(id);
}

/**
 * switch element class
 * @param element input dom element
 * @param classAdd class added to element
 * @param classRemove class removed from element
 */
function f_switchClass(element, classAdd, classRemove) {
    //first add then remove to avoid removal from class selector prior to adding the new class
    element.classList.add(classAdd);
    element.classList.remove(classRemove);
}

/**
 * get HTML representation of a feature id
 * @param feature input feature
 * @param property feature property to be displayed
 * @param showLayer flag: show layer name
 * @param highlight flag: set highlight interaction for hover
 * @returns div element
 */
function f_getHTMLFeatureId(feature, property, showLayer, highlight){

    //set propery text, use feature id if property is null
    var txt = (feature.get(property) !== undefined ? feature.get(property) : feature.getId());

    //init element
    var jq_id = $('<div>', {
        'class': 'property_id'
    });

    //add layer string, if requested and available
    var layer = (showLayer && feature.get("layer") !== undefined ? feature.get("layer") + ": " : null);
    if(layer !== null)
        jq_id.append($('<span>', {
            'class': 'property_layer',
            text: layer
        }));

    //append feature txt
    jq_id.append(txt);

    //add feature highlight on hover, if requested and feature id is defined
    if (highlight && feature.getId() !== undefined) {
        jq_id.mouseover(function() {
            f_highlightFeatureById(feature.getId())
        });
        jq_id.mouseout(function() {
            f_clearHighlight();
        });
    }
    return jq_id;
}

/**
 * open/close feature property information on click on feature id
 */
$(function () {
    jq_infoDiv.on('click', '.property_id', function(){
        $(this).next('.property_div').slideToggle(300);
    });
});

/**
 * set sortable layers in legend
 * @param id layer group id in legend
 */
function f_setSortableOverlays(id) {
    $('#' + id).sortable({
        //function called each time the layer list is sorted
        stop: function(ev, ui) {
            var items = $(id).sortable('refreshPositions').children();
            f_sortLayers(items, id);
        }
    });
}

/**
 * sort overlays based on input array with layer ids
 * @param items sorted list of overlays
 * @param id layer group id in legend
 */
function f_sortLayers(items, id) {
    var currentSort = [];
    $.each(items, function () {
        currentSort.push($(this).children("input").attr("id"));
    });
    currentSort.reverse();
    var overlays = [];
    if(id === "imageOverlays")
        overlays = imageOverlays;
    else if(id === "vectorOverlays")
        overlays = vectorOverlays;
    //resort layers on map
    for (var layer in overlays) {
        overlays[layer].setZIndex((jQuery.inArray(overlays[layer].id, currentSort)) + 1);
    }
}

/**
 * update info div
 * @param show flag: show info
 * @param html html content
 */
function f_updateInfoDiv(show, html) {

    var jq_zoomDiv = $(".ol-zoom");

    //set offset for info div
    var width = (show ? 0.15 * window.innerWidth : 0);

    //set left margins
    var coord_left = 40 + width;
    var legend_left = width;
    var graph_left = width;
    var zoom_left = 10 + width;

    //set element left margins
    jq_coordDiv.css({ left : coord_left + "px" });
    jq_legendDiv.css({ left : legend_left + "px" });
    jq_graphDiv.css({ left : graph_left + "px" });
    jq_zoomDiv.css({ left : zoom_left + "px" });

    //check for previously visible/selected elements
    if(show) {
        //get sensor details in html
        var html_details = html[0].getElementsByClassName("sensor_details");
        var html_info = html[0].getElementsByClassName("sensor_info");
        //identify open elements
        jq_infoDiv.find(".sensor_details").each(function() {
            //set html height, if > 0
            if(this.offsetHeight > 0){
                //set details visible
                for(var i = 0; i < html_details.length; i++){
                    if(html_details[i].id === this.id){
                        html_details[i].style.height = this.offsetHeight + "px";
                        html_details[i].style.marginBottom = "5px";
                        html_details[i].style.paddingLeft = "5px";
                        break;
                    }
                }
                //set sensor_info selected
                var sensorItemId = this.id.replace("_details", "");
                for(i = 0; i < html_info.length; i++){
                    if(html_info[i].id === sensorItemId){
                        html_info[i].classList.add("sensor_info_selected");
                        break;
                    }
                }
            }
        });
        //switch symbol selection, if previously visible
        symbolSelected.forEach(function(className){
            //get new elements by className
            var elements = html[0].getElementsByClassName(className);
            //iterate currently selected elements
            jq_infoDiv.find("." + className + "_selected").each(function() {
                for(var i = 0; i < elements.length; i++){
                    //add selection class, if ids match
                    if(elements[i].id === this.id) {
                        f_switchClass(elements[i], className + "_selected", className);
                        break;
                    }
                }
            });
        });
    }

    //update HTML content
    jq_infoDiv.html(html);

    //update info width
    jq_infoDiv.css("width", width + "px");

    //update latest values
    f_setLatestMeasurements();

    //hide graph, if !show
    if(!show) f_updateGraphDiv(false);
}

/**
 * update graph div
 * @param show flag: show graph
 */
function f_updateGraphDiv(show) {

    //set offset for info div
    var height = (show ? d3Graph.getContainerHeight() : 0);

    //set bottom margins
    var legend_bottom = height;
    var time_bottom = + 40 + height;

    //set element bottom margins
    jq_legendDiv.css( { bottom : legend_bottom + "px" } );
    jq_timeDiv.css( { bottom : time_bottom + "px" } );
    $(".ol-attribution").css( { bottom : legend_bottom + "px" } );

    //update graph height
    jq_graphDiv.css("height", height + "px");

    //update size
    if(!show) {
        jq_graphDiv.empty();
        d3Graph.empty(true);
    }
}

/**
 * set margin for highlight overlay
 */
$(function () {
    $(document)
        .mousemove( function(e) {
            if(jq_highlightDiv.is(":visible")) {
                var maxRight = $(window).width() - jq_highlightDiv.width() - 15;
                jq_highlightDiv.css({'bottom': $(window).height() - e.pageY + 5, 'left': (e.pageX < maxRight ? e.pageX + 5 : maxRight)});
            }
        });
    $(window).resize(function() {
        //reset d3 margins
        d3Graph.setSize();
    });
});