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
//highlight features
var vectorHighlight = [];
//collection of WMS layer capabilities documents
var capabilitiesDocument = {};
var capabilities = {};
//object storing available time values for time-enabled layers
var timeValues = {};
//object storing time selection for time-enabled layers
var timeSelection = {};
//object storing legend divs for WMS layers
var legends = {};
//coordinate div
var coordDiv = "coord"

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
    //add legend to container_legend
    var legend = $('<span class="legend_bottom"></span><img class="legend hidden" title="Legend for ' + layer + '" src="' + legendUrl + '" alt="Legend for ' + layer + '" />');
    legends[layerId] = legend;
    $('#container_legend').append(legend);
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
            format: new ol.format.GeoJSON(),
            strategy: ol.loadingstrategy.bbox,
            attributions: attribution
        }),
        style: style
    });
    vectorLayer.id = f_escapeSelector(baseUrl + ":" + layer);
    vectorLayer.name = layer;
    vectorOverlays[vectorLayer.id] = vectorLayer;
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
    urlExists(legendUrl, function(exists){
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
        f_initTimeSelection(layerId, timeValues[layerId][0]);
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

var style_ezg = new ol.style.Style({
    stroke: new ol.style.Stroke({color: '#003C88', width: 1}),
    fill: new ol.style.Fill({color: '#0070C0'})
});
var style_ezg_highlight = new ol.style.Style({
    stroke: new ol.style.Stroke({color: '#ff2626', width: 1}),
    fill: new ol.style.Fill({color: 'rgba(255,38,38,.3)'})
});

var projection = new ol.proj.Projection({code: 'EPSG:3857', units: 'm', axisOrientation: 'neu'});
var center = ol.proj.transform([13.73, 51.05], ol.proj.get("EPSG:4326"), projection);

baseLayers['OpenStreetMap'] = new ol.layer.Tile({title: 'OpenStreetMap', type: 'base', source: new ol.source.OSM(), zIndex: 0});
//f_initWMSLayer("https://geodienste.sachsen.de/wms_geosn_dop-rgb/guest", "sn_dop_020", "Orthophoto SN", false, 1, 'base', false, 'Orthophoto &copy; GeoSN. ', 0);
//f_initWMSLayer("https://geodienste.sachsen.de/wms_geosn_hoehe/guest", "Gelaendehoehe", "Höhenmodell SN", false, 1, 'base', false, 'Höhenmodell &copy; GeoSN. ', 0);

//f_initWMSLayer("https://www.umwelt.sachsen.de/umwelt/infosysteme/wms/services/wasser/einzugsgebiete_utm", "0", "Haupteinzugsgebiete (LfULG)", false, 0.75, '', false, 'Haupteinzugsgebiete &copy; LfULG. ', 1);
//f_initWMSLayer("https://www.umwelt.sachsen.de/umwelt/infosysteme/wms/services/wasser/einzugsgebiete_utm", "1", "Teileinzugsgebiete (LfULG)", false, 1, '', false, 'Teileinzugsgebiete &copy; LfULG. ', 2);

f_initWMSLayer("https://maps.dwd.de/geoserver/ows", "dwd:SF-Produkt", "Niederschlag - 24h Mittel", false, 0.75, '', true, 'Radarkomposit &copy; DWD. ', 3);
f_initWMSLayer("https://maps.dwd.de/geoserver/ows", "dwd:RX-Produkt", "Niederschlag - 5min", false, 0.75, '', true, 'Radarkomposit &copy; DWD. ', 5);
f_initWMSLayer("https://maps.dwd.de/geoserver/ows", "dwd:FX-Produkt", "Niederschlag - 2h Vorhersage", false, 0.75, '', true, 'Radarvorhersage &copy; DWD. ', 4);

f_initWFSJSONLayer("https://extruso.bu.tu-dresden.de/geoserver/wfs", "xtruso:main-catchments", "Haupteinzugsgebiete SN", false, .5, "Haupteinzugsgebiete &copy; LfULG. ", 10, 1000,  style_ezg);
f_initWFSJSONLayer("https://extruso.bu.tu-dresden.de/geoserver/wfs", "xtruso:sub-catchments", "Teileinzugsgebiete SN", false, .5, "Teileinzugsgebiete &copy; LfULG. ", 11, 100,  style_ezg);

var default_view = new ol.View({projection: projection, center: center, zoom: 10});

var map = new ol.Map({
    controls: ol.control.defaults().extend([f_getMousePositionControl(coordDiv, "4326")]),
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
        })
    ],
    target: 'map',
    view: default_view
});

/*map.on('postrender', function(event){
    console.log(map.getView().getResolution());
});*/

//mouse position control for map
function f_getMousePositionControl(div, epsg) {
    return new ol.control.MousePosition({
        className: 'custom-mouse-position',
        projection: 'EPSG:' + epsg,
        target: document.getElementById(div),
        coordinateFormat: ol.coordinate.createStringXY(5),
        undefinedHTML: ''
    });
}

var layerSwitcher = new ol.control.LayerSwitcher();
map.addControl(layerSwitcher);

var feature_overlay = new ol.layer.Vector({
    source: new ol.source.Vector(),
    map: map,
    style: style_ezg_highlight
});

function f_getFeatureInfo(feature) {
    return feature.name + ": " + feature.getId();
    //info.innerHTML = 'Gewässer: ' + (gewaesser === null ? "n.a." : gewaesser) + '<br />Fläche: ' + feature.get('AREA').toFixed(2) + ' ha';
}

function f_displayVectorInfo(pixel) {
    var features = [];
    var changed = false;
    map.forEachFeatureAtPixel(pixel, function (feature, layer) {
        feature.name = layer.name;
        features.push(feature);
    }, {layerFilter: function (layer) {
        return layer.id in vectorOverlays;
    }});
    var infoDiv = document.getElementById('info');
    if (features.length > 0) {
        infoDiv.style.visibility = "visible";
        //check for features that need to be removed from highlight
        var i = vectorHighlight.length
        while(i--){
            if(features.indexOf(vectorHighlight[i]) === -1) {
                vectorHighlight.splice(i, 1);
                changed = true;
            }
        }
        //check for features that need to be added to highlight
        var info = [];
        i = features.length
        while(i--) {
            info.push(f_getFeatureInfo(features[i]));
            if(vectorHighlight.indexOf(features[i]) === -1) {
                vectorHighlight.push(features[i]);
                changed = true
            }
        }
        infoDiv.innerHTML = info.join('<br>') || '(unknown)';
    } else {
        infoDiv.innerHTML = '&nbsp;';
        infoDiv.style.visibility = "hidden";
        if(vectorHighlight.length > 0) {
            vectorHighlight.length = 0
            changed = true
        }
    }
    //add highlight features to overlay
    if(changed){
        feature_overlay.getSource().clear();
        feature_overlay.getSource().addFeatures(features)
    }
};

map.on('pointermove', function (evt) {
    if (evt.dragging)
        return;
    var pixel = map.getEventPixel(evt.originalEvent);
    f_displayVectorInfo(pixel);
});

/**
 * set sortable layer in legend
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
 * get opacity slider for specified layer
 * @param lyr input layer
 * @param lyrId layer id
 * @param visible flag: layer is checked
 */
function f_getOpacitySlider(lyr, lyrId, visible){
    var slider = $(document.createElement('li'));
    slider.attr("id", lyrId + "_slider");
    slider.className = "slider";
    slider.slider({
        min: 0,
        max: 100,
        step: 5,
        value: lyr.getOpacity() * 100,
        slide: function(event, ui) {
            lyr.setOpacity(ui.value / 100);
        }
    });
    //set slider visibility
    if(visible)
        slider.show();
    else
        slider.hide();
    return slider[0];
}