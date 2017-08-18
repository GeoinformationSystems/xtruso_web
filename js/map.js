/******************************************************
 *
 * global variables for OpenLayers map generation
 *
 *****************************************************/

//collection of image base layers
var baseLayers = {};
//collection of image overlays
var overlays = {};
//collection of WMS layer capabilities documents
var capabilities = {};
//object storing available time values for time-enabled layers
var timeValues = {};
//object storing time selection for time-enabled layers
var timeSelection = {};
//object storing legend divs for WMS layers
var legends = {};


/******************************************************
 *
 * OpenLayers map functions
 *
 *****************************************************/

/**
 * initialize a WMS layer
 * @param url WMS base url
 * @param layer WMS layer name
 * @param title WMS display title
 * @param visible flag: initial visibility
 * @param opacity display opacity for this layer
 * @param type WMS layer type ('base' for base layer and '' for overlay)
 * @param timeEnabled flag: WMS layer has time dimension
 * @param attribution OpenLayers attribution
 * @param zIndex initial z index
 */
function f_initWMSLayer(url, layer, title, visible, opacity, type, timeEnabled, attribution, zIndex) {
    //initialize ol WMS layer
    var wmsLayer = new ol.layer.Image({
        title: layer + ": " + title,
        visible: visible,
        type: type,
        opacity: opacity,
        zIndex: zIndex,
        source: new ol.source.ImageWMS({
            url: url,
            params: {'FORMAT': 'image/png', 'VERSION': '1.1.0', 'STYLES': '', 'LAYERS': layer},
            attributions: attribution
        })
    });
    //set layer id
    wmsLayer.id = ol.control.LayerSwitcher.uuid();
    //add layer to corresponding collection
    if (type === 'base')
        baseLayers[layer] = wmsLayer;
    else
        overlays[layer] = wmsLayer;
    //get capabilities document
    capabilities[layer] = f_getCapabilities(url, layer, wmsLayer, timeEnabled);
}

/**
 * set WMS legend
 * @param layer WMS layer name
 * @param legendUrl URL of legend
 */
function f_setLegend(layer, legendUrl) {
    if(legendUrl === null)
        return;
    //add legend to container_legend
    var legend = $('<span class="legend_bottom"></span><img class="legend hidden" title="Legend for ' + layer + '" src="' + legendUrl + '" alt="Legend for ' + layer + '" />');
    legends[layer] = legend;
    $('#container_legend').append(legend);
}

function f_initGeoJSONLayer(url, style, title, visible) {
    return new ol.layer.Vector({
        title: title,
        visible: visible,
        source: new ol.source.Vector({
            url: url,
            format: new ol.format.GeoJSON()
        }),
        style: style
    });
}

/**
 * set of proxies to access services blocked by same-origin policy
 */
var proxies = {};
proxies["https://geodienste.sachsen.de/wms_geosn_dop-rgb/guest"] = "https://extruso.bu.tu-dresden.de/geosn_dop";
proxies["https://geodienste.sachsen.de/wms_geosn_hoehe/guest"] = "https://extruso.bu.tu-dresden.de/geosn_hoehe";
proxies["https://www.umwelt.sachsen.de/umwelt/infosysteme/wms/services/wasser/einzugsgebiete_utm"] = "https://extruso.bu.tu-dresden.de/lfulg_ezg";

/**
 * get WMS layer capabilities
 * @param url capabilities url
 * @param layer WMS layer
 * @param wmsLayer ol layer object
 * @param timeEnabled flag: layer has time dimension
 */
function f_getCapabilities(url, layer, wmsLayer, timeEnabled) {
    //change url, if a proxy is defined
    if(proxies[url] !== undefined)
        url = proxies[url];
    var parser = new ol.format.WMSCapabilities();
    var request = url + '?service=wms&request=getCapabilities';
    $.get(request).done(function(data) {
        var capabilities = parser.read(data);
        var wmsTopLayer = capabilities.Capability.Layer;
        var wmsLayerCapabilities = f_getLayerByName(wmsTopLayer.Layer, layer);
        if (wmsLayerCapabilities === null)
            return;
        //get dimension
        capabilities[layer] = wmsLayerCapabilities;
        if (timeEnabled) {
            f_initTimeDimesion(wmsLayerCapabilities, layer);
            //change visibility of time selection
            wmsLayer.on('change:visible', function () {
                //set visibility for time selection
                if (this.getVisible())
                    $(timeSelection[layer].div_selector).removeClass('hidden');
                else
                    $(timeSelection[layer].div_selector).addClass('hidden');
            });
        }
        //get legend and set attribution
        var legendUrl = f_getLegendUrlFromCapabilities(wmsLayerCapabilities);
        //only add legend, if URL is valid
        urlExists(url, function(exists){
            if(exists)
                f_setLegend(layer, legendUrl);
        });
        //change visibility of legend
        wmsLayer.on('change:visible', function () {
            //return if legend is not set
            if(legends[layer] === undefined)
                return;
            //set visibility for time selection
            if (this.getVisible())
                legends[layer].removeClass('hidden');
            else
                legends[layer].addClass('hidden');
        });
    });
}

/**
 * check, if URL is valid
 * @param url input url
 * @param callback
 */
function urlExists(url, callback){
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
 * @param layer WMS layer name
 */
function f_initTimeDimesion(wmsLayerCapabilities, layer) {
    //init selector object
    f_initTimeSelector(layer);
    //append selection divs for display
    f_displayTimeSelection(layer);
    //get dimension
    var dimension = f_getDimension(wmsLayerCapabilities, "time")
    if (dimension === null)
        return;
    var defaultValue = new Date(dimension.default);
    //parse date values
    timeValues[layer] = f_getDateArray(dimension.values, ",");
    //parse date values
    f_initTimeSelection(layer, defaultValue);
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
 * @param layer layer name
 */
function f_displayTimeSelection(layer) {
    $('#container_time').append('<div id="time_' + layer + '" class="container_time_layer hidden">' +
        '   <div class="time_section time_steps">' +
        '       <div class="time_title">Time selection for <b>' + layer + '</b></div>\n' +
        '       <a href="#" class="time_step" title="previous" onclick="f_timeStep(\'' + layer + '\', -1)">&#x23f4;</a>' +
        '       <a href="#" class="time_step" title="first" onclick="f_timeStep(\'' + layer + '\', -2)">&#x23ee;</a>' +
        '   </div>' +
        '   <div class="time_section" title="Hours">\n' +
        '       <div class="time_label">H</div>\n' +
        '       <div id="' + timeSelection[layer].selection[3].div_name + '"></div>\n' +
        '   </div>\n' +
        '   <div class="time_section" title="Minutes">\n' +
        '       <div class="time_label_adjust">&nbsp;</div>\n' +
        '       <div id="' + timeSelection[layer].selection[4].div_name + '"></div>\n' +
        '       <div class="time_label">M</div>\n' +
        '   </div>\n' +
        '   <div class="time_section" title="Day">\n' +
        '       <div class="time_label_adjust">&nbsp;</div>\n' +
        '       <div id="' + timeSelection[layer].selection[2].div_name + '"></div>\n' +
        '       <div class="time_label">D</div>\n' +
        '   </div>\n' +
        '   <div class="time_section" title="Month">\n' +
        '       <div class="time_label">M</div>\n' +
        '       <div id="' + timeSelection[layer].selection[1].div_name + '"></div>\n' +
        '   </div>\n' +
        '   <div class="time_section" title="Year">\n' +
        '       <div class="time_label_adjust" >&nbsp;</div>\n' +
        '       <div id="' + timeSelection[layer].selection[0].div_name + '"></div>\n' +
        '       <div class="time_label">Y</div>\n' +
        '   </div>\n' +
        '   <div class="time_section time_steps">' +
        '       <div class="time_label_adjust">&nbsp;</div>\n' +
        '       <a href="#" class="time_step" title="last" onclick="f_timeStep(\'' + layer + '\', 2)">&#x23ed;</a>' +
        '       <a href="#" class="time_step" title="next" onclick="f_timeStep(\'' + layer + '\', 1)">&#x23f5;</a>' +
        '   </div>' +
        '</div>');
}

/**
 * initialize time selector object for layer
 * @param layer layer name
 */
function f_initTimeSelector(layer) {
    var escapedLayer = f_jQueryEscape(layer);
    timeSelection[layer] = {};
    timeSelection[layer].div_name = layer;
    timeSelection[layer].div_selector = '#time_' + escapedLayer;
    timeSelection[layer].selection = [];
    timeSelection[layer].selection[0] = {
        'title': 'year',
        'div_name': layer + '_year',
        'div_selector': '#' + escapedLayer + '_year',
        'utcFunction': 'getUTCFullYear',
        'values': [],
        'selected': null
    };
    timeSelection[layer].selection[1] = {
        'title': 'month',
        'div_name': layer + '_month',
        'div_selector': '#' + escapedLayer + '_month',
        'utcFunction': 'getUTCMonth',
        'values': [],
        'selected': null
    };
    timeSelection[layer].selection[2] = {
        'title': 'date',
        'div_name': layer + '_date',
        'div_selector': '#' + escapedLayer + '_date',
        'utcFunction': 'getUTCDate',
        'values': [],
        'selected': null
    };
    timeSelection[layer].selection[3] = {
        'title': 'hours',
        'div_name': layer + '_hours',
        'div_selector': '#' + escapedLayer + '_hours',
        'utcFunction': 'getUTCHours',
        'values': [],
        'selected': null
    };
    timeSelection[layer].selection[4] = {
        'title': 'minutes',
        'div_name': layer + '_minutes',
        'div_selector': '#' + escapedLayer + '_minutes',
        'utcFunction': 'getUTCMinutes',
        'values': [],
        'selected': null
    };
    timeSelection[layer].filteredValues = [];
    timeSelection[layer].isComplete = function () {
        return timeSelection[layer].filteredValues.length === 1;
    };
}

/**
 * set time selection for particular layer and index
 * @param layer layer name
 * @param index dimension index (0 = year, 1 = month, 2 = day, 3 = hours, 4 = minutes)
 * @param value value to be selected
 */
function f_setTimeSelection(layer, index, value) {
    if (timeSelection[layer].selection[index].selected === value)
        return;
    timeSelection[layer].selection[index].selected = value;
    timeSelection[layer].filteredValues = f_filterTimeValues(layer);
    if (timeSelection[layer].isComplete() === true)
        overlays[layer].getSource().updateParams({'TIME': timeSelection[layer].filteredValues[0].toISOString()});
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
 * @param layer layer name
 * @param value Date value
 */
function f_initTimeSelection(layer, value) {
    //get array of available years
    timeSelection[layer].selection[0].values = f_getDateElementArray(timeValues[layer], timeSelection[layer].selection[0].utcFunction);
    //init default value, if input value is a valid Date
    if (value instanceof Date && !isNaN(value.valueOf())) {
        for (var i = 0; i < timeSelection[layer].selection.length; i++) {
            f_updateTimeSelection(layer, i, value[timeSelection[layer].selection[i].utcFunction]());
        }
    }
    //start with selection of year
    else
        f_updateTimeSelection(layer, 0, null);
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
 * filter current Date elements based on current selection for layer in timeSelection[layer]
 * @param layer layer name
 * @returns {Array} filtered Date values matching the current selection
 */
function f_filterTimeValues(layer) {
    var filteredValues = [];
    for (var i = 0; i < timeValues[layer].length; i++) {
        var timestamp = timeValues[layer][i];
        var filter = true;
        for (var j = 0; j < timeSelection[layer].selection.length; j++) {
            var selected = timeSelection[layer].selection[j].selected;
            if (selected !== null && timestamp[timeSelection[layer].selection[j].utcFunction]() !== selected)
                filter = false;
        }
        if (filter)
            filteredValues.push(timestamp);
    }
    return filteredValues;
}

/**
 * update time selection for layer
 * @param layer layer name
 * @param index index for selected time sub-element
 * @param selectedValue value to be selected
 */
function f_updateTimeSelection(layer, index, selectedValue) {
    //remove selection for this and higher indices
    for (var i = index; i < timeSelection[layer].selection.length; i++) {
        f_unselectTime(layer, i);
    }
    //set selected value, if there is only one element to select
    if (selectedValue === null && timeSelection[layer].selection[index].values.length === 1)
        selectedValue = timeSelection[layer].selection[index].values[0];
    //set current selection
    var timeSelectionDiv = $(timeSelection[layer].selection[index].div_selector);
    f_setTimeSelection(layer, index, selectedValue);
    //add child elements with possible time values
    for (i = 0; i < timeSelection[layer].selection[index].values.length; i++) {
        var value = timeSelection[layer].selection[index].values[i];
        if (selectedValue !== null && value !== selectedValue)
            continue;
        var valueDiv = $('<div class="time_element' +
            (value === selectedValue ? ' time_element_selected' : '') +
            '" onclick="f_updateTimeSelection(\'' + layer + '\',' + index + ',' + value + ')">' +
            f_getTimeValueDisplay(index, value) +
            '</div>');
        timeSelectionDiv.append(valueDiv);
    }
    //set style to selected
    timeSelectionDiv.parent().find('.time_label').addClass('time_label_active');
    //display child elements, if selectedValue is not null
    if (selectedValue !== null && timeSelection[layer].selection[index + 1] !== void 0) {
        timeSelection[layer].selection[index + 1].values = f_getDateElementArray(timeSelection[layer].filteredValues, timeSelection[layer].selection[index + 1].utcFunction);
        f_updateTimeSelection(layer, index + 1, null);
    }
}

/**
 * set time selection to defined value
 * @param layer name of time-enabled layer
 * @param value target time value
 */
function f_timeStep(layer, value){
    //first value
    if(value === -2)
        f_initTimeSelection(layer, timeValues[layer][0]);
    //last value
    else if(value === 2)
        f_initTimeSelection(layer, timeValues[layer][timeValues[layer].length - 1]);
    else {
        //return if current selection is incomplete
        if(!timeSelection[layer].isComplete)
            return;
        //get current value
        var currentValue = timeSelection[layer].filteredValues[0];
        //get index of current value in list of values
        var index = timeValues[layer].indexOf(currentValue);
        //previous value (if current selection is not the first value)
        if(value === -1 && index >= 1)
            f_initTimeSelection(layer, timeValues[layer][index - 1]);
        //next value (if current selection is not the last value)
        else if(value === 1 && index < timeValues[layer].length - 1)
            f_initTimeSelection(layer, timeValues[layer][index + 1]);
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

    //account for time zone offset (UTC vs CET or CEST)
    var offset = new Date().getTimezoneOffset();
    var hDiff = (offset / 60).toFixed(0);
    var mDiff = offset - (hDiff * 60);
    if(index === 3)
        value = value - hDiff;
    else if(index === 4)
        value = value - mDiff;

    //append preceding zero for one-number digits
    if(value <= 9)
        value = '0' + value;

    return value;
}

/**
 * unselect current time selection
 * @param layer layer name
 * @param index index for time sub-element
 */
function f_unselectTime(layer, index) {
    f_setTimeSelection(layer, index, null);
    $(timeSelection[layer].selection[index].div_selector).find('.time_element').remove();
    $(timeSelection[layer].selection[index].div_selector).parent().find('.time_label').removeClass('time_label_active');
}

/******************************************************
 *
 * OpenLayers map definition
 *
 *****************************************************/

var style_ezg = new ol.style.Style({
    stroke: new ol.style.Stroke({color: '#0070C0', width: 1}),
    fill: new ol.style.Fill({color: 'rgba(0,112,192,0.5)'})
});
var style_ezg_highlight = new ol.style.Style({
    stroke: new ol.style.Stroke({color: '#DD2222', width: 1}),
    fill: new ol.style.Fill({color: 'rgba(221,34,34,0.3)'})
});

var projection = new ol.proj.Projection({code: 'EPSG:3857', units: 'm', axisOrientation: 'neu'});
var center = ol.proj.transform([13.73, 51.05], ol.proj.get("EPSG:4326"), projection);

baseLayers['OpenStreetMap'] = new ol.layer.Tile({title: 'OpenStreetMap', type: 'base', source: new ol.source.OSM(), zIndex: 0});
f_initWMSLayer("https://geodienste.sachsen.de/wms_geosn_dop-rgb/guest", "sn_dop_020", "Orthophoto (GeoSN)", false, 1, 'base', false, 'Orthophoto &copy; LfULG. ', 0);
f_initWMSLayer("https://geodienste.sachsen.de/wms_geosn_hoehe/guest", "Gelaendehoehe", "Höhenmodell (GeoSN)", false, 1, 'base', false, 'Höhenmodell &copy; LfULG. ', 0);

f_initWMSLayer("https://www.umwelt.sachsen.de/umwelt/infosysteme/wms/services/wasser/einzugsgebiete_utm", "0", "Haupteinzugsgebiete (LfULG)", false, 0.75, '', false, 'Haupteinzugsgebiete &copy; LfULG. ', 1);
f_initWMSLayer("https://www.umwelt.sachsen.de/umwelt/infosysteme/wms/services/wasser/einzugsgebiete_utm", "1", "Teileinzugsgebiete (LfULG)", false, 1, '', false, 'Teileinzugsgebiete &copy; LfULG. ', 2);

f_initWMSLayer("https://maps.dwd.de/geoserver/ows", "dwd:SF-Produkt", "Radarkomposit (24h, DWD)", false, 0.75, '', true, 'Radarkomposit &copy; DWD. ', 3);
f_initWMSLayer("https://maps.dwd.de/geoserver/ows", "dwd:FX-Produkt", "Radarvorhersage (2h, DWD)", false, 0.75, '', true, 'Radarvorhersage &copy; DWD. ', 4);
f_initWMSLayer("https://maps.dwd.de/geoserver/ows", "dwd:RX-Produkt", "Radarkomposit (5min, DWD)", false, 0.75, '', true, 'Radarkomposit &copy; DWD. ', 5);

//TODO: Vector overlays
var layer_ezg_extruso = f_initGeoJSONLayer("https://extruso.bu.tu-dresden.de/sites/default/files/geodata/EZG_gesamt.geojson", style_ezg, "Pilot-Einzugsgebiete", false);
var layer_ezg_extruso_highlight;

var default_view = new ol.View({projection: projection, center: center, zoom: 10});

var map = new ol.Map({
    controls: ol.control.defaults(),
    layers: [
        new ol.layer.Group({
            title: 'Kartengrundlage',
            layers: Object.keys(baseLayers).map(function (key) {
                return baseLayers[key];
            })
        }),
        new ol.layer.Group({
            title: 'Overlays',
            layers: Object.keys(overlays).map(function (key) {
                return overlays[key];
            })
        })
    ],
    target: 'map',
    view: default_view
});

var layerSwitcher = new ol.control.LayerSwitcher();
map.addControl(layerSwitcher);

var layer_ezg_extruso_overlay = new ol.layer.Vector({
    source: new ol.source.Vector(),
    map: map,
    style: style_ezg_highlight
});

//TODO: generalize for vector data
var displayEZGInfo = function (pixel) {
    var feature = map.forEachFeatureAtPixel(pixel, function (feature) {
        return feature;
    });
    var info = document.getElementById('info');
    if (feature) {
        var gewaesser = feature.get('GEWAESSER');
        info.style.visibility = "visible";
        info.innerHTML = 'Gewässer: ' + (gewaesser === null ? "n.a." : gewaesser) + '<br />Fläche: ' + feature.get('AREA').toFixed(2) + ' ha';
    } else {
        info.innerHTML = '&nbsp;';
        info.style.visibility = "hidden";
    }
    if (feature !== layer_ezg_extruso_highlight) {
        if (layer_ezg_extruso_highlight) {
            layer_ezg_extruso_overlay.getSource().removeFeature(layer_ezg_extruso_highlight);
        }
        if (feature) {
            layer_ezg_extruso_overlay.getSource().addFeature(feature);
        }
        layer_ezg_extruso_highlight = feature;
    }
};

map.on('pointermove', function (evt) {
    if (evt.dragging || layer_ezg_extruso.visible === false) {
        return;
    }
    var pixel = map.getEventPixel(evt.originalEvent);
    displayEZGInfo(pixel);
});

/**
 * sort overlays based on input array with layer ids
 * @param currentSort input ids
 */
function f_sortLayers(currentSort) {
    for (var layer in overlays) {
        overlays[layer].setZIndex((jQuery.inArray(overlays[layer].id, currentSort)) + 1);
    }
}



// $(function() {
//     var values = f_getDateArray("2017-08-09T09:05:00.000Z,2017-08-09T09:10:00.000Z,2017-08-09T09:15:00.000Z,2017-08-09T09:20:00.000Z,2017-08-09T09:25:00.000Z,2017-08-09T09:30:00.000Z,2017-08-09T09:35:00.000Z,2017-08-09T09:40:00.000Z,2017-08-09T09:45:00.000Z,2017-08-09T09:50:00.000Z,2017-08-09T09:55:00.000Z,2017-08-09T10:00:00.000Z,2017-08-09T10:05:00.000Z,2017-08-09T10:10:00.000Z,2017-08-09T10:15:00.000Z,2017-08-09T10:20:00.000Z,2017-08-09T10:25:00.000Z,2017-08-09T10:30:00.000Z,2017-08-09T10:35:00.000Z,2017-08-09T10:40:00.000Z,2017-08-09T10:45:00.000Z,2017-08-09T10:50:00.000Z,2017-08-09T10:55:00.000Z,2017-08-09T11:00:00.000Z,2017-08-09T11:05:00.000Z,2017-08-09T11:10:00.000Z,2017-08-09T11:15:00.000Z,2017-08-09T11:20:00.000Z,2017-08-09T11:25:00.000Z,2017-08-09T11:30:00.000Z,2017-08-09T11:35:00.000Z,2017-08-09T11:40:00.000Z,2017-08-09T11:45:00.000Z,2017-08-09T11:50:00.000Z,2017-08-09T11:55:00.000Z,2017-08-09T12:00:00.000Z,2017-08-09T12:05:00.000Z,2017-08-09T12:10:00.000Z,2017-08-09T12:15:00.000Z,2017-08-09T12:20:00.000Z,2017-08-09T12:25:00.000Z,2017-08-09T12:30:00.000Z,2017-08-09T12:35:00.000Z,2017-08-09T12:40:00.000Z,2017-08-09T12:45:00.000Z,2017-08-09T12:50:00.000Z,2017-08-09T12:55:00.000Z,2017-08-09T13:00:00.000Z,2017-08-09T13:05:00.000Z,2017-08-09T13:10:00.000Z,2017-08-09T13:15:00.000Z,2017-08-09T13:20:00.000Z,2017-08-09T13:25:00.000Z,2017-08-09T13:30:00.000Z,2017-08-09T13:35:00.000Z,2017-08-09T13:40:00.000Z,2017-08-09T13:45:00.000Z,2017-08-09T13:50:00.000Z,2017-08-09T13:55:00.000Z,2017-08-09T14:00:00.000Z,2017-08-09T14:05:00.000Z,2017-08-09T14:10:00.000Z,2017-08-09T14:15:00.000Z,2017-08-09T14:20:00.000Z,2017-08-09T14:25:00.000Z,2017-08-09T14:30:00.000Z,2017-08-09T14:35:00.000Z,2017-08-09T14:40:00.000Z,2017-08-09T14:45:00.000Z,2017-08-09T14:50:00.000Z,2017-08-09T14:55:00.000Z,2017-08-09T15:00:00.000Z,2017-08-09T15:05:00.000Z,2017-08-09T15:10:00.000Z,2017-08-09T15:15:00.000Z,2017-08-09T15:20:00.000Z,2017-08-09T15:25:00.000Z,2017-08-09T15:30:00.000Z,2017-08-09T15:35:00.000Z,2017-08-09T15:40:00.000Z,2017-08-09T15:45:00.000Z,2017-08-09T15:50:00.000Z,2017-08-09T15:55:00.000Z,2017-08-09T16:00:00.000Z,2017-08-09T16:05:00.000Z,2017-08-09T16:10:00.000Z,2017-08-09T16:15:00.000Z,2017-08-09T16:20:00.000Z,2017-08-09T16:25:00.000Z,2017-08-09T16:30:00.000Z,2017-08-09T16:35:00.000Z,2017-08-09T16:40:00.000Z,2017-08-09T16:45:00.000Z,2017-08-09T16:50:00.000Z,2017-08-09T16:55:00.000Z,2017-08-09T17:00:00.000Z,2017-08-09T17:05:00.000Z,2017-08-09T17:10:00.000Z,2017-08-09T17:15:00.000Z,2017-08-09T17:20:00.000Z,2017-08-09T17:25:00.000Z,2017-08-09T17:30:00.000Z,2017-08-09T17:35:00.000Z,2017-08-09T17:40:00.000Z,2017-08-09T17:45:00.000Z,2017-08-09T17:50:00.000Z,2017-08-09T17:55:00.000Z,2017-08-09T18:00:00.000Z,2017-08-09T18:05:00.000Z,2017-08-09T18:10:00.000Z,2017-08-09T18:15:00.000Z,2017-08-09T18:20:00.000Z,2017-08-09T18:25:00.000Z,2017-08-09T18:30:00.000Z,2017-08-09T18:35:00.000Z,2017-08-09T18:40:00.000Z,2017-08-09T18:45:00.000Z,2017-08-09T18:50:00.000Z,2017-08-09T18:55:00.000Z,2017-08-09T19:00:00.000Z,2017-08-09T19:05:00.000Z,2017-08-09T19:10:00.000Z,2017-08-09T19:15:00.000Z,2017-08-09T19:20:00.000Z,2017-08-09T19:25:00.000Z,2017-08-09T19:30:00.000Z,2017-08-09T19:35:00.000Z,2017-08-09T19:40:00.000Z,2017-08-09T19:45:00.000Z,2017-08-09T19:50:00.000Z,2017-08-09T19:55:00.000Z,2017-08-09T20:00:00.000Z,2017-08-09T20:05:00.000Z,2017-08-09T20:10:00.000Z,2017-08-09T20:15:00.000Z,2017-08-09T20:20:00.000Z,2017-08-09T20:25:00.000Z,2017-08-09T20:30:00.000Z,2017-08-09T20:35:00.000Z,2017-08-09T20:40:00.000Z,2017-08-09T20:45:00.000Z,2017-08-09T20:50:00.000Z,2017-08-09T20:55:00.000Z,2017-08-09T21:00:00.000Z,2017-08-09T21:05:00.000Z,2017-08-09T21:10:00.000Z,2017-08-09T21:15:00.000Z,2017-08-09T21:20:00.000Z,2017-08-09T21:25:00.000Z,2017-08-09T21:30:00.000Z,2017-08-09T21:35:00.000Z,2017-08-09T21:40:00.000Z,2017-08-09T21:45:00.000Z,2017-08-09T21:50:00.000Z,2017-08-09T21:55:00.000Z,2017-08-09T22:00:00.000Z,2017-08-09T22:05:00.000Z,2017-08-09T22:10:00.000Z,2017-08-09T22:15:00.000Z,2017-08-09T22:20:00.000Z,2017-08-09T22:25:00.000Z,2017-08-09T22:30:00.000Z,2017-08-09T22:35:00.000Z,2017-08-09T22:40:00.000Z,2017-08-09T22:45:00.000Z,2017-08-09T22:50:00.000Z,2017-08-09T22:55:00.000Z,2017-08-09T23:00:00.000Z,2017-08-09T23:05:00.000Z,2017-08-09T23:10:00.000Z,2017-08-09T23:15:00.000Z,2017-08-09T23:20:00.000Z,2017-08-09T23:25:00.000Z,2017-08-09T23:30:00.000Z,2017-08-09T23:35:00.000Z,2017-08-09T23:40:00.000Z,2017-08-09T23:45:00.000Z,2017-08-09T23:50:00.000Z,2017-08-09T23:55:00.000Z,2017-08-10T00:00:00.000Z,2017-08-10T00:05:00.000Z,2017-08-10T00:10:00.000Z,2017-08-10T00:15:00.000Z,2017-08-10T00:20:00.000Z,2017-08-10T00:25:00.000Z,2017-08-10T00:30:00.000Z,2017-08-10T00:35:00.000Z,2017-08-10T00:40:00.000Z,2017-08-10T00:45:00.000Z,2017-08-10T00:50:00.000Z,2017-08-10T00:55:00.000Z,2017-08-10T01:00:00.000Z,2017-08-10T01:05:00.000Z,2017-08-10T01:10:00.000Z,2017-08-10T01:15:00.000Z,2017-08-10T01:20:00.000Z,2017-08-10T01:25:00.000Z,2017-08-10T01:30:00.000Z,2017-08-10T01:35:00.000Z,2017-08-10T01:40:00.000Z,2017-08-10T01:45:00.000Z,2017-08-10T01:50:00.000Z,2017-08-10T01:55:00.000Z,2017-08-10T02:00:00.000Z,2017-08-10T02:05:00.000Z,2017-08-10T02:10:00.000Z,2017-08-10T02:15:00.000Z,2017-08-10T02:20:00.000Z,2017-08-10T02:25:00.000Z,2017-08-10T02:30:00.000Z,2017-08-10T02:35:00.000Z,2017-08-10T02:40:00.000Z,2017-08-10T02:45:00.000Z,2017-08-10T02:50:00.000Z,2017-08-10T02:55:00.000Z,2017-08-10T03:00:00.000Z,2017-08-10T03:05:00.000Z,2017-08-10T03:10:00.000Z,2017-08-10T03:15:00.000Z,2017-08-10T03:20:00.000Z,2017-08-10T03:25:00.000Z,2017-08-10T03:30:00.000Z,2017-08-10T03:35:00.000Z,2017-08-10T03:40:00.000Z,2017-08-10T03:45:00.000Z,2017-08-10T03:50:00.000Z,2017-08-10T03:55:00.000Z,2017-08-10T04:00:00.000Z,2017-08-10T04:05:00.000Z,2017-08-10T04:10:00.000Z,2017-08-10T04:15:00.000Z,2017-08-10T04:20:00.000Z,2017-08-10T04:25:00.000Z,2017-08-10T04:30:00.000Z,2017-08-10T04:35:00.000Z,2017-08-10T04:40:00.000Z,2017-08-10T04:45:00.000Z,2017-08-10T04:50:00.000Z,2017-08-10T04:55:00.000Z,2017-08-10T05:00:00.000Z,2017-08-10T05:05:00.000Z,2017-08-10T05:10:00.000Z,2017-08-10T05:15:00.000Z,2017-08-10T05:20:00.000Z,2017-08-10T05:25:00.000Z,2017-08-10T05:30:00.000Z,2017-08-10T05:35:00.000Z,2017-08-10T05:40:00.000Z,2017-08-10T05:45:00.000Z,2017-08-10T05:50:00.000Z,2017-08-10T05:55:00.000Z,2017-08-10T06:00:00.000Z,2017-08-10T06:05:00.000Z,2017-08-10T06:10:00.000Z,2017-08-10T06:15:00.000Z,2017-08-10T06:20:00.000Z,2017-08-10T06:25:00.000Z,2017-08-10T06:30:00.000Z,2017-08-10T06:35:00.000Z,2017-08-10T06:40:00.000Z,2017-08-10T06:45:00.000Z,2017-08-10T06:50:00.000Z,2017-08-10T06:55:00.000Z,2017-08-10T07:00:00.000Z,2017-08-10T07:05:00.000Z,2017-08-10T07:10:00.000Z,2017-08-10T07:15:00.000Z,2017-08-10T07:20:00.000Z,2017-08-10T07:25:00.000Z,2017-08-10T07:30:00.000Z,2017-08-10T07:35:00.000Z,2017-08-10T07:40:00.000Z,2017-08-10T07:45:00.000Z,2017-08-10T07:50:00.000Z,2017-08-10T07:55:00.000Z,2017-08-10T08:00:00.000Z,2017-08-10T08:05:00.000Z,2017-08-10T08:10:00.000Z,2017-08-10T08:15:00.000Z,2017-08-10T08:20:00.000Z,2017-08-10T08:25:00.000Z,2017-08-10T08:30:00.000Z,2017-08-10T08:35:00.000Z,2017-08-10T08:40:00.000Z,2017-08-10T08:45:00.000Z,2017-08-10T08:50:00.000Z,2017-08-10T08:55:00.000Z,2017-08-10T09:00:00.000Z,2017-08-10T09:05:00.000Z");
//
//     var min = values[0];
//     var max = values[values.length - 1]
//     var range = max - min;
//     var defaultValue = max;
//     $("#time").html(defaultValue);
//     var slider = $("#timeslider").slider({
//         slide: function (event, ui) {
//             var includeLeft = event.keyCode !== $.ui.keyCode.RIGHT;
//             var includeRight = event.keyCode !== $.ui.keyCode.LEFT;
//             var currentValue = findNearest(includeLeft, includeRight, ui.value);
//             slider.slider('option', 'value', currentValue);
//             $("#time").html(currentValue);
//             return false;
//         },
//         create: function(event, ui){
//             $(this).slider('value', defaultValue);
//         }
//     })
//         .each(function () {
//             for (var i = 0; i < values.length; i++) {
//                 var el = $('<label class="label_tooltip" title="' + values[i] + '">|</label>').css('left', ((values[i] - min) / range * 100) + '%');
//                 //$("#timeslider").append(el);
//             }
//         })
//     function findNearest(includeLeft, includeRight, value) {
//         var nearest = null;
//         var diff = null;
//         for (var i = 0; i < values.length; i++) {
//             if ((includeLeft && values[i] <= value) || (includeRight && values[i] >= value)) {
//                 var newDiff = Math.abs(value - values[i]);
//                 if (diff === null || newDiff < diff) {
//                     nearest = values[i];
//                     diff = newDiff;
//                 }
//             }
//         }
//         return nearest;
//     }
// });
// $(document).tooltip();
// $(document).ready(function(){
//     $(document).tooltip({
//         tooltipClass: "tooltip"
//     });
// });
