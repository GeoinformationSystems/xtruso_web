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
//feature collections
var featureHighlight = new ol.Collection();
var featureSelection = new ol.Collection();
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
//array with link identifiers for data download
var sensorHubDownloadAnchors = {};
var sensorHubMeasurementLinks = {};
var sensorHubMeasurements = {};
//array with radolan timeseries
var radolanTimeseries = {};
//array with station forecasts
var stationForecasts = {};
var supportedDevices = ["550490","567221","550560","552210","583190","568350","568400","568160","554260","554210",
    "554220","552012","550110","550390","550302","550190","583090","583122","564290","560301","564201","560201",
    "567700","551510","551411","551420","583235","583251","567310","551801","551811","551820","576391","576401",
    "576410","550810","563290","562012","563460","562014","563880","563890","563950","563790","562031","562040",
    "564160","562070","530020"];
var styleForecast = f_createStyle('#0070C0', 1, '#003C88', 4, false, true);
var styleNoForecast = f_createStyle('#0070C0', 1, '#003C88', 4, false, false);
var f_forecastStyle = function(feature, res){
    if(feature.get('parameter') === "discharge" && supportedDevices.indexOf(feature.get('device')) > -1)
        return styleForecast;
    else return styleNoForecast;
};
//array with measurement intervals that can be requested for download
var now = new Date();
//geoJSON formta for parsing and encoding GeoJSON
var geojson  = new ol.format.GeoJSON();

//set OCPU target URL
//ocpu.seturl("https://ocpu.geo.tu-dresden.de/ocpu/library/xtruso/R");
ocpu.seturl("https://extruso.bu.tu-dresden.de/R");

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

var sensorHubDownloadIntervals = {
    "14d": f_getInterval(new Date(new Date().setDate(now.getDate() - 14)), now),
    //"28d": f_getInterval(new Date(new Date().setDate(now.getDate() - 28)), now),
    "1y": f_getInterval(new Date(new Date().setYear(now.getFullYear() - 1)), now),
    "All": {start: null, end: now, get: ""}
};

var forecastIntervals = {
    "6h": f_getInterval(now, new Date(new Date().setDate(now.getDate() + 1)))
};

//measured OSW properties
var oswProperties = {
    "height": "water level",
    "flow": "discharge",
    "precipitation": "precipitation"
};

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
    return selector.replace(/[^a-zA-Z\d]/g, "" );
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
    //init URL
    var url = (baseUrl.endsWith('?') ? baseUrl : baseUrl + "?") +
        "service=WFS" +
        "&version=1.0.0" +
        "&request=GetFeature" +
        "&outputformat=json" +
        "&typeName=" + layer;
    //init WFS layer
    var vectorLayer = new ol.layer.Vector({
        title: title,
        visible: visible,
        opacity: opacity,
        zIndex: zIndex,
        maxResolution: maxResolution,
        source: new ol.source.Vector({
            url: function (extent) {
                return url + '&bbox=' + extent.join(',') + ',EPSG:3857';
            },
            format: geojson,
            strategy: ol.loadingstrategy.bbox,
            attributions: attribution
        }),
        style: style
    });
    vectorLayer.id = f_escapeSelector(baseUrl + ":" + layer);
    vectorLayer.name = layer;
    vectorOverlays[vectorLayer.id] = vectorLayer;
}

function f_initFeatureLayer(id, title, visible, opacity, zIndex, style) {
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

function f_getSensorHubQuery(network, extent){
    extent = ol.proj.transformExtent(extent, projection, "EPSG:4326");
    return {
        "size" : 10000,
        "query" : {
            "bool" : {
                "must" : {
                    "match_all" : {}
                },
                "filter" : [{
                    "terms":{ "networkCode":[network] }
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
        },
        "_source" : ["geometry", "networkCode", "topic", "deviceCode", "sensorCode", "measuredProperty", "uom"]
    };
}

function f_initSensorHubLayer(url, network, title, visible, attribution, zIndex, style){

    var searchAPI = url.replace("api", "search") + "/sensor/_search"

    //init layer with empty source
    var sensorLayer = new ol.layer.Vector({
        title: title,
        visible: visible,
        source: new ol.source.Vector(),
        style: f_forecastStyle,
        zIndex: zIndex
    });
    sensorLayer.id = f_escapeSelector(network);
    sensorLayer.name = network;
    sensorOverlays[network] = sensorLayer;
    //init ol loader for sensor hub data
    var sensorLoader = function(extent, resolution, projection) {
        $.ajax({
            url: searchAPI,
            type: "POST",
            dataType: "json",
            contentType: 'application/json',
            data: JSON.stringify(f_getSensorHubQuery(network, extent)),
            success: function(response){
                var featureCollection = {
                    type: 'FeatureCollection',
                    features: []
                };
                var featureObjects = response.hits.hits;
                featureObjects.forEach(function(featureObject){
                    var featureSource = featureObject["_source"];
                    featureCollection.features.push({
                        type: 'Feature',
                        id: featureSource["sensorCode"],
                        geometry: {
                            type: 'Point',
                            coordinates: [ featureSource["geometry"].lon, featureSource["geometry"].lat ]
                        },
                        properties: {
                            sensorHubAPI: url,
                            sensor: featureSource["sensorCode"],
                            device: featureSource["deviceCode"],
                            network: featureSource["networkCode"],
                            parameter: oswProperties[featureSource["measuredProperty"]],
                            uom: featureSource["uom"]
                        }
                    });
                });
                sensorOverlays[network].getSource().addFeatures(geojson.readFeatures(featureCollection, {
                    featureProjection: projection
                }));
            }
        })
    };
    //init sensor source
    var sensorSource = new ol.source.Vector({
        format: geojson,
        attribution: attribution,
        loader: sensorLoader,
        zIndex: 100,
        strategy: ol.loadingstrategy.bbox
    });
    //set sensor layer source
    sensorLayer.setSource(sensorSource);
}


function f_initSensorHubDevices(url, network, title, visible, attribution, zIndex, style){

    //init layer with empty source
    var sensorLayer = new ol.layer.Vector({
        title: title,
        visible: visible,
        source: new ol.source.Vector(),
        style: style,
        zIndex: zIndex
    });
    sensorLayer.id = f_escapeSelector(network);
    sensorLayer.name = network;
    sensorOverlays[network] = sensorLayer;

    //init ol loader for sensor hub data
    var sensorLoader = function(extent, resolution, projection) {

        //create feature collection
        var featureCollection = {
            type: 'FeatureCollection',
            features: []
        };

        //define function to get information on sensors
        var getSensorInfo = function(sensorUrl, deviceInfo) {
            var deferred = $.Deferred();
            var deviceCode = deviceInfo["code"];
            var deviceName = deviceInfo["name"];
            var deviceDescription = deviceInfo["description"];
            var deviceGeometry = deviceInfo["geometry"]["coordinates"];

            $.get(sensorUrl, function(sensorInfo) {
                $.each(sensorInfo.items, function (j, sensor) {

                    //manually set parameter for VEREINT measurements
                    //TODO align with OSW implementation
                    var parameter;
                    if(sensor["name"] === 'temp') parameter = "temperature";
                    else if(sensor["name"] === 'hum') parameter = "humidity";
                    else if(sensor["name"] === 'prec') parameter = "precipitation";
                    else(parameter = "undefined");

                    //add feature to collection
                    featureCollection.features.push({
                        type: 'Feature',
                        id: deviceCode + "_" + sensor["name"],
                        geometry: {
                            type: 'Point',
                            coordinates: deviceGeometry
                        },
                        properties: {
                            sensorHubAPI: url,
                            sensor: sensor["name"],
                            device: deviceCode,
                            name: deviceName + "_" + sensor["name"],
                            parameter: parameter,
                            description: deviceDescription,
                            network: network
                        }
                    });
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

        //get information on provided devices and sensors
        $.get(url + "/networks/" + network + "/devices", function(deviceSummary){

            //add device calls to array
            var deviceCalls = [];
            $.each(deviceSummary.items, function (i, device) {
                deviceCalls.push(getDeviceInfo(device["href"]));
            });

            //add features after array of device calls is resolved
            $.when.apply($, deviceCalls).then(function() {
                sensorOverlays[network].getSource().addFeatures(geojson.readFeatures(featureCollection, {
                    featureProjection: projection
                }));
            });
        })
    };

    //init sensor source
    var sensorSource = new ol.source.Vector({
        format: geojson,
        attribution: attribution,
        loader: sensorLoader,
        zIndex: 100,
        strategy: ol.loadingstrategy.bbox
    });
    //set sensor layer source
    sensorLayer.setSource(sensorSource);
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

/**
 * create an ol style
 * @param strokeColor stroke color
 * @param strokeWidth stroke width
 * @param fillColor fill color
 * @param radius image (circle) radius
 * @param lineDash flag: dashed stroke
 * @param forecasted extra symbol for forecasted timeseries
 * @returns * oject
 */
function f_createStyle(strokeColor, strokeWidth, fillColor, radius, lineDash, forecasted){
    var style = new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: strokeColor,
            width: strokeWidth,
            lineDash: lineDash
        }),
        fill: new ol.style.Fill({
            color: fillColor
        }),
        image: new ol.style.Circle({
            radius: radius,
            fill: new ol.style.Fill({
                color: strokeColor
            }),
            stroke: new ol.style.Stroke({
                color: strokeColor,
                width: strokeWidth,
                lineDash: lineDash
            })
        })
    });

    if(forecasted){
        style.setText(new ol.style.Text({
            offsetX: 7,
            offsetY: -7,
            text: 'f',
            stroke: new ol.style.Stroke({
                color: "#FF0000",
                width: 1
            })
        }))
    }

    return style;
}


baseLayers['OpenStreetMap'] = new ol.layer.Tile({title: 'OpenStreetMap', type: 'base', source: new ol.source.OSM(), zIndex: 0});
f_initWMSLayer("https://geodienste.sachsen.de/wms_geosn_dop-rgb/guest", "sn_dop_020", "Orthophoto SN", false, 1, 'base', false, 'Orthophoto &copy; GeoSN. ', 0);
f_initWMSLayer("https://geodienste.sachsen.de/wms_geosn_hoehe/guest", "Gelaendehoehe", "Elevation model SN", false, 1, 'base', false, 'Elevation model &copy; GeoSN. ', 0);

//f_initWMSLayer("https://www.umwelt.sachsen.de/umwelt/infosysteme/wms/services/wasser/einzugsgebiete_utm", "0", "Haupteinzugsgebiete (LfULG)", false, 0.75, '', false, 'Haupteinzugsgebiete &copy; LfULG. ', 1);
//f_initWMSLayer("https://www.umwelt.sachsen.de/umwelt/infosysteme/wms/services/wasser/einzugsgebiete_utm", "1", "Teileinzugsgebiete (LfULG)", false, 1, '', false, 'Teileinzugsgebiete &copy; LfULG. ', 2);

f_initWMSLayer("https://maps.dwd.de/geoserver/ows", "dwd:SF-Produkt", "Radar Precipitation - 24h Avg", false, 0.75, '', true, 'Radar Precipitation (SF) &copy; DWD. ', 3);
f_initWMSLayer("https://maps.dwd.de/geoserver/ows", "dwd:RX-Produkt", "Radar Reflectivity - 5min", false, 0.75, '', true, 'Radar Reflectivity (RX) &copy; DWD. ', 5);
f_initWMSLayer("https://maps.dwd.de/geoserver/ows", "dwd:FX-Produkt", "Radar Reflectivity - 2h Prediction", false, 0.75, '', true, 'Radar Reflectivity (FX) &copy; DWD. ', 4);

f_initWFSJSONLayer("https://extruso.bu.tu-dresden.de/geoserver/wfs", "xtruso:catchments", "Haupteinzugsgebiete SN", false, .3, "Haupteinzugsgebiete &copy; LfULG. ", 10, 1000,  f_createStyle('#003C88', 1, '#0070C0', 0, false, false));
f_initWFSJSONLayer("https://extruso.bu.tu-dresden.de/geoserver/wfs", "xtruso:subcatchments", "Teileinzugsgebiete SN", false, .3, "Teileinzugsgebiete &copy; LfULG. ", 11, 100,  f_createStyle('#003C88', 1, '#0070C0', 0, false, false));

f_initWFSJSONLayer("https://extruso.bu.tu-dresden.de/geoserver/wfs", "xtruso:rivers_main", "Flussläufe SN", false, 1, "Flussläufe &copy; LfULG. ", 10, 1000,  f_createStyle('#0059CF', 1, '#0059CF', 0, false, false));
f_initWFSJSONLayer("https://extruso.bu.tu-dresden.de/geoserver/wfs", "xtruso:rivers_all", "Gewässernetzwerk SN", false, 1, "Gewässernetzwerk &copy; LfULG. ", 11, 100,  f_createStyle('#0059CF', 1, '#0059CF', 0, false, false));

f_initSensorHubDevices("https://api.sensorhub-tud-test.smart-rain.de/v0", "vereint", "VEREINT Crowdsourcing", true, "Sensors &copy; SensorHub. ", 20, f_createStyle('#7e36c0', 1, '#470088', 4, false, false));
f_initSensorHubDevices("https://api.sensorhub-tud-test.smart-rain.de/v0", "student", "Studentenseminar", false, "Sensors &copy; SensorHub. ", 20, f_createStyle('#7e36c0', 1, '#470088', 4, false, false));


f_initSensorHubLayer("https://api.opensensorweb.de/v0", "HWIMS", "LHWZ Pegeldaten", true, "Sensors &copy; SensorHub. ", 20, f_createStyle('#0070C0', 1, '#003C88', 4, false, false));
f_initSensorHubLayer("https://api.opensensorweb.de/v0", "BAFG", "BAFG Pegeldaten", true, "Sensors &copy; SensorHub. ", 20, f_createStyle('#0070C0', 1, '#003C88', 4, false, false));

f_initFeatureLayer("ProcessingResults", "Processing results", true, .5, 40, f_createStyle('#C02A20', 1, '#880000', 0, false, false));

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
            title: 'Base Maps',
            layers: Object.keys(baseLayers).map(function (key) {
                return baseLayers[key];
            })
        }),
        new ol.layer.Group({
            title: 'Image Overlays',
            layers: Object.keys(imageOverlays).map(function (key) {
                return imageOverlays[key];
            })
        }),
        new ol.layer.Group({
            title: 'Vector Overlays',
            layers: Object.keys(vectorOverlays).map(function (key) {
                return vectorOverlays[key];
            })
        }),
        new ol.layer.Group({
            title: 'Sensor Overlays',
            layers: Object.keys(sensorOverlays).map(function (key) {
                return sensorOverlays[key];
            })
        })
    ],
    target: 'map',
    view: new ol.View({projection: projection, center: center, zoom: zoom}),
    interactions: ol.interaction.defaults().extend([
        f_getSelectInteraction(),
        f_getBBoxInteraction(),
        f_getHighlightInteraction()
    ])
});

/**
 * update info container, if length of selected features changed
 */
featureSelection.on('change:length', function (evt) {
    if (featureSelection.getLength() > 0) {
        jq_infoDiv.html('');
        jq_infoDiv.append(f_getHTMLFeatureInfo(featureSelection, "*", true, true));
        jq_infoDiv.fadeIn(100);
    } else {
        jq_infoDiv.html('');
        jq_infoDiv.hide();
    }
});

/**
 * get select interaction
 */
function f_getSelectInteraction() {
    return new ol.interaction.Select({
        condition: ol.events.condition.click,
        multi: true,
        style: f_createStyle('#ffbf00', 2, 'rgba(255,190,0,0.1)', 4, [], false),
        filter: function (feature, layer) {
            if (!layer || !(layer.id in vectorOverlays || layer.id in sensorOverlays))
                return false;
            if (feature.layer === undefined)
                feature.layer = layer.name;
            return true;
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
                sensorOverlays[layer].getSource().forEachFeatureIntersectingExtent(extent, function (feature) {
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
* get highlight interaction
*/
function f_getHighlightInteraction() {
    var interactionHighlight = new ol.interaction.Select({
        condition: ol.events.condition.pointerMove,
        multi: true,
        style: f_createStyle('#ff0000', 3, 'rgba(255,0,0,0.1)', 4, [], false),
        layers: function (layer) {
            return layer && (layer.id in vectorOverlays || layer.id in sensorOverlays);
        },
        features: featureHighlight
    });
    interactionHighlight.on('select', function () {
        if (featureHighlight.getLength() > 0) {
            var featureNames = "";
            featureHighlight.forEach(function(f) {
                featureNames += f_getHTMLFeatureName(f, false).append($('<br>')).html();
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
    this.featureSelection.forEach(function (f) {
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

    var infoDiv = $('<div>');
    features.forEach(function(f) {

        //create element with feature id as text
        var featureInfoDiv = $('<div>', {
            'class': 'info_item'
        }).append($('<hr>')).append(f_getHTMLFeatureId(f, showLayer, highlight));

        //add properties
        var featurePropertyDiv = $('<div>', {
            'class': 'property_div'
        });
        var f_properties = (properties === "*" ? f.getProperties() : properties);
        for (var property in f_properties) {
            if (!property || property === 'geometry' || property === 'sensorHubAPI')
                continue;
            featurePropertyDiv.append($('<span>', {
                'class': 'property_name',
                text: property + ": "
            }));
            featurePropertyDiv.append($('<span>', {
                'class': 'property_value',
                text: f.get(property)
            }));
            featurePropertyDiv.append($('<br>'));
        }

        //init SensorHub information
        if(properties.length !== 0 && f.get("sensor") !== undefined){

            var sensorHubAPI = f.get('sensorHubAPI')
            var networkCode = f.get('network');
            var deviceCode = f.get('device');
            var sensorCode = f.get('sensor');
            f.parameter = f.get('parameter');

            //add API link for sensor information
            featurePropertyDiv.append($('<a>', {
                'class': 'property_name property_link property_info',
                'href': f_getSensorHubLink(sensorHubAPI, networkCode, deviceCode, sensorCode, false, null),
                text: 'Sensor Information',
                click: function(){
                    window.open(this.href);
                    return false;
                }
            })).append($('<br>'));

            //init divs for download and graph display
            var downloadDiv = $('<span>', {'class': 'property_links'});
            var graphDiv = $('<span>', {'class': 'property_links'});

            //create download and graph links for each interval
            for(var interval in sensorHubDownloadIntervals) {

                //create graph measurement id
                var graphId = deviceCode + "_" + sensorCode + "_" +  interval;

                //get SensorHub Link
                sensorHubMeasurementLinks[graphId] = f_getSensorHubLink(sensorHubAPI, networkCode, deviceCode, sensorCode, true, sensorHubDownloadIntervals[interval]);

                //init data download link
                var downloadLink = $('<a>', {
                    id: "a_" + graphId
                });
                downloadLink.downloadUrl = sensorHubMeasurementLinks[graphId];
                downloadLink.format = "text/csv";
                downloadLink.filename = "measurements_" + graphId + ".csv";
                sensorHubDownloadAnchors[graphId] = downloadLink;

                //create download link
                downloadDiv.append($('<span>', {
                    'class': 'property_link property_link_selection',
                    text: interval,
                    id: graphId,
                    click: function(evt){
                        var downloadAnchor = sensorHubDownloadAnchors[evt.target.id];
                        $.ajax({
                            url: downloadAnchor.downloadUrl,
                            type: 'GET',
                            dataType: 'binary',
                            headers: {
                                Accept: downloadAnchor.format,
                                'Content-Type': downloadAnchor.format
                            },
                            processData: false,
                            id: evt.target.id,
                            success: function(result) {
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

                //create graph initialization link
                graphDiv.append($('<span>', {
                    'class': 'property_link property_link_selection',
                    text: interval,
                    id: graphId,
                    //set graph
                    click: function(evt){
                        //reset graph container
                        jq_graphDiv.empty();
                        //close graph, if shown already
                        if(d3Graph.activeGraph(evt.target.id)){
                            f_removeGraph(evt.target.id);
                            //hide graph container, if no graph is displayed
                            if(d3Graph.numberOfGraphs() === 0)
                                jq_graphDiv.fadeOut(100);
                            return;
                        }
                        //show graph for selected sensor
                        jq_graphDiv.fadeIn(100);
                        //check, if measurements are available in cache
                        if(sensorHubMeasurements[evt.target.id] !== undefined && sensorHubMeasurements[evt.target.id].length > 0){
                            f_addGraph(evt.target.id, sensorCode, sensorHubMeasurements[evt.target.id], sensorHubDownloadIntervals[evt.target.textContent], f.parameter);
                        }
                        //request measurements
                        else {
                            var url = sensorHubMeasurementLinks[evt.target.id];
                            $.ajax({
                                headers: {
                                    Accept : "text/csv; charset=utf-8",
                                    "Content-Type": "text/csv; charset=utf-8"
                                },
                                url: url,
                                type: 'GET',
                                id: evt.target.id,
                                interval: evt.target.textContent,
                                success: function (result) {
                                    f_setMeasurements(this.id, result);
                                    f_addGraph(this.id, sensorCode, sensorHubMeasurements[this.id], sensorHubDownloadIntervals[this.interval], f.parameter);
                                }
                            });
                        }
                    }
                }));
            }

            //create download links for definded measurement intervals
            featurePropertyDiv.append($('<span>', {
                'class': 'property_name property_download',
                text: "Download: "
            })).append(downloadDiv).append($('<br>'));

            //create graph links
            featurePropertyDiv.append($('<span>', {
                'class': 'property_name property_graph',
                text: "Graph: "
            })).append(graphDiv).append($('<br>'));

            //init upstream area selection for HWIMS stations
            if(f.parameter === "discharge" || f.parameter === "water level") {

                //add link to highlight upstream catchment
                featurePropertyDiv.append($('<span>', {
                    'class': 'property_name property_link property_process',
                    text: 'Get upstream catchment',
                    id: sensorCode,
                    //set graph
                    click: function (evt) {

                        var req = ocpu.call("x.app.catchment.upstream", {'station.id': $(this).data('deviceCode'), 'geometry': true, 'dissolve': true, 'as.json': true}, function(session) {

                            session.getObject(function(result){
                                f_clearHighlight();
                                var features = geojson.readFeatures(decodeURI(result));
                                if(features !== null && features.length === 1) {
                                    features[0].setId(features[0].get('id'));
                                    features[0].layer = "upstream catchment";
                                    vectorOverlays["ProcessingResults"].getSource().addFeature(features[0]);
                                }
                            });

                        }).fail(function(){
                            console.log("Error: " + req.responseText);
                        });
                    }
                }).data('deviceCode', deviceCode)).append($('<br>'));

                //add link to forecast, if supported
                if(f.parameter === "discharge" && supportedDevices.indexOf(deviceCode) > -1) {

                    featurePropertyDiv.append($('<span>', {
                        'class': 'property_name property_link property_process',
                        text: 'Get 6h forecast (data-driven)',
                        id: sensorCode + 'forecast',
                        //set graph
                        click: function (evt) {

                            //reset graph container
                            jq_graphDiv.empty();
                            //close graph, if shown already
                            if (d3Graph.activeGraph(evt.target.id)) {
                                f_removeGraph(evt.target.id);
                                //hide graph container, if no graph is displayed
                                if (d3Graph.numberOfGraphs() === 0)
                                    jq_graphDiv.fadeOut(100);
                                return;
                            }
                            //show graph div
                            jq_graphDiv.fadeIn(100);
                            //check, if measurements are available in cache
                            if (stationForecasts[evt.target.id] !== undefined && stationForecasts[evt.target.id].length > 0) {
                                f_addGraph(evt.target.id, sensorCode, stationForecasts[evt.target.id], forecastIntervals['6h'], f.parameter);
                            }
                            //request forecast
                            else {
                                //set timeframe
                                var timeframe = forecastIntervals['6h'];

                                //request OCPU
                                var req = ocpu.call("x.octave.flood_nn", {'gauge': $(this).data('deviceCode')}, function (session) {

                                    session.getObject(function (result) {
                                        f_setStationForecast(evt.target.id, result);
                                        f_addGraph(evt.target.id, sensorCode, stationForecasts[evt.target.id], timeframe, "discharge_pred");
                                    });

                                }).fail(function () {
                                    console.log("Error: " + req.responseText);
                                });
                            }
                        }
                    }).data('deviceCode', deviceCode)).append($('<br>'))
                }
            }
        }

        //init RADOLAN timeseries links for polygon data
        if(f.getGeometry().getType() === "MultiPolygon" || f.getGeometry().getType() === "Polygon") {

            f.parameter = "precipitation_sum";

            //init RADOLAN timeseries links
            var radolanRWDiv = $('<span>', {'class': 'property_links'});
            for(interval in sensorHubDownloadIntervals) {
                //create link id
                var radolanId = f.getId() + "_radolanRW_" +  interval;

                //create graph initialization link
                radolanRWDiv.append($('<span>', {
                    'class': 'property_link property_link_selection',
                    text: interval,
                    id: radolanId,
                    //set graph
                    click: function(evt){
                        //reset graph container
                        jq_graphDiv.empty();
                        //close graph, if shown already
                        if(d3Graph.activeGraph(evt.target.id)){
                            f_removeGraph(evt.target.id);
                            //hide graph container, if no graph is displayed
                            if(d3Graph.numberOfGraphs() === 0)
                                jq_graphDiv.fadeOut(100);
                            return;
                        }
                        //show graph div
                        jq_graphDiv.fadeIn(100);
                        //check, if measurements are available in cache
                        if(radolanTimeseries[evt.target.id] !== undefined && radolanTimeseries[evt.target.id].length > 0){
                            f_addGraph(evt.target.id, "radolan", radolanTimeseries[evt.target.id], sensorHubDownloadIntervals[evt.target.textContent], f.parameter);
                        }
                        //request timeseries
                        else {
                            //set timeframe
                            var timeframe = sensorHubDownloadIntervals[evt.target.textContent];
                            if(timeframe['start'] === null)
                                timeframe['start'] = new Date("2005-01-01 00:00:00Z");

                            var mask = geojson.writeFeature($(this).data('feature'));

                            //request OCPU
                            var req = ocpu.call("x.app.radolan.timeseries", {'t.start': f_getRADOLANTimestamp(timeframe['start']), 't.end': f_getRADOLANTimestamp(timeframe['end']), 'extent': mask}, function(session) {
                                session.getObject(function(result){
                                    f_setRADOLANMeasurements(evt.target.id, result);
                                    f_addGraph(evt.target.id, "radolan", radolanTimeseries[evt.target.id], timeframe, f.parameter);
                                });

                            }).fail(function(){
                                console.log("Error: " + req.responseText);
                            });
                        }
                    }
                }).data('feature', f));
            }

            //create graph links
            featurePropertyDiv.append($('<span>', {
                'class': 'property_name property_process',
                text: "RADOLAN RW graph: "
            })).append(radolanRWDiv).append($('<br>'));

        }

        featureInfoDiv.append(featurePropertyDiv);
        infoDiv.append(featureInfoDiv);

    });

    return infoDiv;
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
 * @param networkCode sensor network
 * @param deviceCode device identifier
 * @param sensorCode sensor identifier
 * @param measurements flag: link to raw measurements
 * @param interval time interval for measurements
 * @returns {string} link to SensorHub
 */
function f_getSensorHubLink(sensorHubAPI, networkCode, deviceCode, sensorCode, measurements, interval){
    var url = sensorHubAPI + "/networks/" + networkCode + "/devices/" + deviceCode + "/sensors/" + sensorCode;
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
 * @param type graph type
 */
function f_addGraph(id, sensor, measurements, timeframe, type) {

    //get measurements
    if(measurements === undefined || measurements.length === 0)
        return;

    d3Graph.addGraph(id, sensor, measurements, timeframe, null, type);
}

/**
 * initialize measurement graph
 * @param graphId graph id
 */
function f_removeGraph(graphId) {
    d3Graph.removeGraph(graphId);
}

/**
 * get HTML representation of a feature id
 * @param feature input feature
 * @param showLayer flag: show layer name
 * @param highlight flag: set highlight interaction for hover
 * @returns div element
 */
function f_getHTMLFeatureId(feature, showLayer, highlight){

    var featureId = feature.getId();
    var idDiv = $('<div>', {
        'class': 'property_id'
    });
    //add layer name, if requested and available
    if(showLayer && feature.layer !== undefined)
        idDiv.append($('<span>', {
            'class': 'property_layer',
            text: feature.layer + ": "
        }));
    //add feature id
    idDiv.append(featureId);
    //add feature highlight on hover, if requested and fid is available
    if (highlight && featureId !== undefined) {
        idDiv.mouseover(function() {
            f_highlightFeatureById(featureId)
        });
        idDiv.mouseout(function() {
            f_clearHighlight();
        });
    }
    return idDiv;
}

/**
 * get HTML representation of a feature name
 * @param feature input feature
 * @param showLayer flag: show layer name
 * @returns div element
 */
function f_getHTMLFeatureName(feature, showLayer){
    if(feature.get("name") === undefined)
        return f_getHTMLFeatureId(feature, showLayer, false);
    var nameDiv = $('<div>', {
        'class': 'property_id'
    });
    //add layer name, if requested and available
    if(showLayer && feature.layer !== undefined)
        nameDiv.append($('<span>', {
            'class': 'property_layer',
            text: feature.layer + ": "
        }));
    //add feature name
    nameDiv.append(feature.get("name"));
    return nameDiv;
}

/**
 * open/close feature property information on click on feature id
 */
$(function () {
    jq_infoDiv.on('click', '.property_id', function(){
        $(this).next('.property_div').slideToggle(500);
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
 * change position of elements, if certain elements are shown/hidden
 */

$(function () {
    var jq_zoomDiv = $(".ol-zoom");
    function f_resetLeft(){
        jq_coordDiv.css( { left : "3.5em" } );
        jq_legendDiv.css( { left : "0" } );
        jq_graphDiv.css( { left : "0" } );
        jq_zoomDiv.css( { left : ".5em" } );
    }
    function f_resetBottom(){
        jq_legendDiv.css( { bottom : "0" } );
        jq_timeDiv.css( { bottom : "3em" } );
    }
    jq_infoDiv
        .on('show', function() {
            //reset left margin
            f_resetLeft();
            //determine width of info container, add width to left margin of elements
            var width = jq_infoDiv.width();
            jq_coordDiv.css( { left : parseInt(jq_coordDiv.position().left) + width + "px" } );
            jq_legendDiv.css( { left : width + "px" } );
            jq_graphDiv.css( { left : width - 1 + "px" } );
            jq_zoomDiv.css( { left : parseInt(jq_zoomDiv.position().left) + width + "px" } );
        })
        .on("hide", function() {
            f_resetLeft();
            jq_graphDiv.hide();
            jq_graphDiv.empty();
        });
    jq_graphDiv
        .on('show', function() {
            //reset left margin
            f_resetBottom();
            //determine height of graph container, add height to bottom margin of elements
            var height = jq_graphDiv.height();
            jq_legendDiv.css( { bottom : height + "px" } );
            jq_timeDiv.css( { bottom : height + "px" } );
        })
        .on("hide", function() {
            f_resetBottom();
            d3Graph.empty(true);
        });
    $(document)
        .mousemove( function(e) {
            if(jq_highlightDiv.is(":visible")) {
                var maxRight = $(window).width() - jq_highlightDiv.width() - 15;
                jq_highlightDiv.css({'bottom': $(window).height() - e.pageY + 5, 'left': (e.pageX < maxRight ? e.pageX + 5 : maxRight)});
            }
        });

});