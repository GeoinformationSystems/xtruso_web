//set host URL
//var host = "https://extruso.bu.tu-dresden.de";
var host = "http://localhost:8080/xtruso_web";

//dictionaries
var dictionaries = {
    de: {
        text: "Deutsch",
        title: "Seite auf Deutsch",
        OL_Phen_title: "Variable",
        OL_Phen_default: "NA",
        OL_Phen_precipitation: "Niederschlag",
        OL_Phen_precipitation_sum: "Niederschlagssumme",
        "OL_Phen_relative humidity": "Relative Luftfeuchte",
        "OL_Phen_air temperature": "Lufttemperatur",
        "OL_Phen_soil temperature": "Bodentemperatur",
        OL_Phen_discharge: "Durchfluss",
        "OL_Phen_discharge prediction": "Abflussvorhersage",
        "OL_Phen_water level": "Pegelstand",
        "OL_Phen_global radiation": "Globalstrahlung",
        "OL_Phen_wind speed": "Windgeschwindigkeit",
        "OL_Phen_atmospheric pressure": "Luftdruck",
        OL_Sensors: "In situ Sensoren",
        OL_Vector: "Vektordaten",
        OL_Image: "Rasterdaten",
        OL_Basemap: "Basiskarte",
        OL_Base_DEM: 'Höhenmodell (SN)',
        OL_Base_Ortho: 'Orthophotos (SN)',
        OL_WFS_RiverMain: "Flussläufe (SN)",
        OL_WFS_RiverAll: "Gewässernetz (SN)",
        OL_WFS_CatchmentMain: "Haupteinzugsgebiete (SN)",
        OL_WFS_CatchmentSub: "Teileinzugsgebiete (SN)",
        OL_WMS_RadolanSF: "Radarniederschlag (24h Mittel)",
        OL_WMS_RadolanRX: "Radarreflektivität (5min Werte)",
        OL_WMS_RadolanFX: "Radarreflektivität (2h Vorhersage)",
        OL_Processing_Results: "Prozessergebnisse",
        OL_Sensor_Vereint: "VEREINT Projekt",
        OL_Sensor_Student: "Studentenseminar",
        OL_Sensor_Gauge: "Hydrologische Messdaten",
        OL_Sensor_Meteo: "Meteorologische Messdaten",
        OL_Sensor_Details: "Details zum Sensor",
        OL_Sensor_Download: "Download von Messungen",
        OL_Sensor_Download_2w: "Download von Messungen (2 Wochen)",
        OL_Sensor_Download_1m: "Download von Messungen (1 Monat)",
        OL_Sensor_Download_1y: "Download von Messungen (1 Jahr)",
        OL_Sensor_Download_All: "Download von Messungen (Alle)",
        OL_Sensor_Graph: "Graph anzeigen",
        OL_Sensor_Graph_2w: "Graph anzeigen (2 Wochen)",
        OL_Sensor_Graph_1m: "Graph anzeigen (1 Monat)",
        OL_Sensor_Graph_1y: "Graph anzeigen (1 Jahr)",
        OL_Sensor_Graph_All: "Graph anzeigen (Alle)",
        OL_Process: "Berechnungen",
        OL_Process_Catchment: "Berechne Einzugsgebiet (Sachsen)",
        OL_Process_Catchment_Abbr: "EZG",
        OL_Process_Forecast: "Berechne Vorhersage (6h, datengetrieben)",
        OL_Process_Forecast_Abbr: "Vhs",
        OL_Process_RadolanRW_2w: "Berechne RADOLAN RW (P, 2 Wochen, in 1000m³)",
        OL_Process_RadolanRW_1m: "Berechne RADOLAN RW (P, 1 Monat, in 1000m³)",
        OL_Process_RadolanRW_1y: "Berechne RADOLAN RW (P, 1 Jahr, in 1000m³)",
        OL_Process_RadolanRW_All: "Berechne RADOLAN RW (P, Alle, in 1000m³)",
        MX_logo_link: 'Link zur Publikation',
        MX_logo_bibtex: 'Kopiere Bibtex in Zwischenablage',
        MX_logo_details: 'Zeige/Verstecke Details',
        MX_logo_editclass: 'Editiere Klassifikation',
        MX_01_acqhmed_main: 'Erfassung hydro-\nmeteorologischer\nDaten',
        MX_02_provhmed_main: 'Bereitstellung hydro-\nmeteorologischer\nZeitreihen',
        MX_03_acqhmod_main: 'Erfassung hydro-\nmorphologischer\nDaten',
        MX_04_mod_main: 'Hydro-\nmeteorologische\nModellierung',
        MX_05_inf_main: 'Informations-\ninfrastruktur',
        MX_0101_radar_sub2: 'Bodenradar',
        MX_0102_photo_sub2: 'Photogrammetrie',
        MX_0103_lcsens_sub2: 'Low-cost Sensorik',
        MX_0104_cs_sub2: 'Citizen Science',
        MX_0201_timeseries_sub2: 'Erstellung von\nZeitreihen',
        MX_0202_qa_sub2: 'Qualitätssicherung',
        MX_0301_rs_sub2: 'Photogrammetrie und\nFernerkundung',
        MX_0302_uav_sub2: 'Unmanned Aerial\nVehicle (UAV)',
        MX_0303_uwv_sub2: 'Unmanned Water\nVehicle (UWV)',
        MX_0401_hydmod_sub1: 'Hydrologische\nModellierung',
        MX_0402_metmod_sub1: 'Meteorologische\nModelling',
        MX_040201_disagg_sub2: 'Disaggregation von\nRadardaten',
        MX_040202_moist_sub2: 'Bodenfeuchte-\nmodellierung',
        MX_040101_datamod_sub2: 'Datengetriebene\nModellierung',
        MX_040102_detmod_sub2: 'Konzeptionelle\nModellierung',
        MX_0501_prov_sub1: 'Informations-\nbereitstellung',
        MX_0502_interact_sub1: 'Nutzerinteraktion',
        MX_050101_manage_sub2: 'Datenmanagement',
        MX_050102_vis_sub2: 'Visualisierung',
        MX_050103_warn_sub2: 'Hochwasser-\nwarnung',
        MX_050104_analy_sub2: 'Hochwasser-\nanalyse',
        MX_050105_fusion_sub2: 'Geodatenfusion',
        MX_050201_feedback_sub2: 'Nutzerfeedback',
        MX_050202_processing_sub2: 'Ad hoc\nDatenverarbeitung',
        MX_050203_adapt_sub2: 'Adaptive Modellierung'
    },
    en: {
        text: "English",
        title: "English version",
        OL_Phen_title: "Phenomenon",
        OL_Phen_default: "NA",
        OL_Phen_precipitation: "Precipitation",
        OL_Phen_precipitation_sum: "Precipitation sum",
        "OL_Phen_relative humidity": "Relative humidity",
        "OL_Phen_air temperature": "Air temperature",
        "OL_Phen_soil temperature": "Soil temperature",
        OL_Phen_discharge: "Discharge",
        "OL_Phen_discharge prediction": "Discharge prediction",
        "OL_Phen_water level": "Water level",
        "OL_Phen_global radiation": "global radiation",
        "OL_Phen_wind speed": "Wind speed",
        "OL_Phen_atmospheric pressure": "Atmospheric pressure",
        OL_Sensors: "In situ sensors",
        OL_Vector: "Vector data",
        OL_Image: "Raster data",
        OL_Basemap: "Basemap",
        OL_Base_DEM: 'Digital elevation model (SN)',
        OL_Base_Ortho: 'Orthophotos (SN)',
        OL_WFS_RiverMain: "Main rivers (SN)",
        OL_WFS_RiverAll: "River network (SN)",
        OL_WFS_CatchmentMain: "Main catchments (SN)",
        OL_WFS_CatchmentSub: "Subcatchments (SN)",
        OL_WMS_RadolanSF: "Radar precipitation (24h average)",
        OL_WMS_RadolanRX: "Radar reflectivity (5min values)",
        OL_WMS_RadolanFX: "Radar reflectivity (2h forecast)",
        OL_Processing_Results: "Processing results",
        OL_Sensor_Vereint: "VEREINT project",
        OL_Sensor_Student: "Student seminar",
        OL_Sensor_Gauge: "Hydrological measurements",
        OL_Sensor_Meteo: "Meteorological measurements",
        OL_Sensor_Details: "Sensor details",
        OL_Sensor_Download: "Measurement download",
        OL_Sensor_Download_2w: "Measurement download (2 Weeks)",
        OL_Sensor_Download_1m: "Measurement download (1 Month)",
        OL_Sensor_Download_1y: "Measurement download (1 Year)",
        OL_Sensor_Download_All: "Measurement download (All)",
        OL_Sensor_Graph: "Display graph",
        OL_Sensor_Graph_2w: "Display graph (2 Weeks)",
        OL_Sensor_Graph_1m: "Display graph (1 Month)",
        OL_Sensor_Graph_1y: "Display graph (1 Year)",
        OL_Sensor_Graph_All: "Display graph (All)",
        OL_Process: "Computations",
        OL_Process_Catchment: "Compute catchment (Saxony)",
        OL_Process_Catchment_Abbr: "Cmt",
        OL_Process_Forecast: "Compute forecast (6h, data-driven)",
        OL_Process_Forecast_Abbr: "Fcst",
        OL_Process_RadolanRW_2w: "Compute RADOLAN RW (P, 2 Weeks, in 1000m³)",
        OL_Process_RadolanRW_1m: "Compute RADOLAN RW (P, 1 Month, in 1000m³)",
        OL_Process_RadolanRW_1y: "Compute RADOLAN RW (P, 1 Year, in 1000m³)",
        OL_Process_RadolanRW_All: "Compute RADOLAN RW (P, All, in 1000m³)",
        MX_logo_link: 'go to publication',
        MX_logo_bibtex: 'copy bibtex entry to clipboard',
        MX_logo_details: 'show/hide details',
        MX_logo_editclass: 'edit classification',
        MX_01_acqhmed_main: 'Acquisition of\nhydro-meteorological\ndata',
        MX_02_provhmed_main: 'Provision of\nhydro-meteorological\ntime series',
        MX_03_acqhmod_main: 'Acquisition of\nhydro-morphological\ndata',
        MX_04_mod_main: 'Hydro-meteorological\nmodelling',
        MX_05_inf_main: 'Information\ninfrastructure',
        MX_0101_radar_sub2: 'Ground radar',
        MX_0102_photo_sub2: 'Photogrammetry',
        MX_0103_lcsens_sub2: 'Low-cost sensors',
        MX_0104_cs_sub2: 'Citizen Science',
        MX_0201_timeseries_sub2: 'Time series\ngeneration',
        MX_0202_qa_sub2: 'Quality assurance',
        MX_0301_rs_sub2: 'Photogrammetry and\nremote sensing',
        MX_0302_uav_sub2: 'Unmanned Aerial\nVehicle (UAV)',
        MX_0303_uwv_sub2: 'Unmanned Water\nVehicle (UWV)',
        MX_0401_hydmod_sub1: 'Hydrological\nmodelling',
        MX_0402_metmod_sub1: 'Meteorological\nmodelling',
        MX_040201_disagg_sub2: 'Disaggregation of\nradar data',
        MX_040202_moist_sub2: 'Soil moisture\nmodelling',
        MX_040101_datamod_sub2: 'Data driven\nmodelling',
        MX_040102_detmod_sub2: 'Conceptual\nmodelling',
        MX_0501_prov_sub1: 'Information\nprovision',
        MX_0502_interact_sub1: 'User interaction',
        MX_050101_manage_sub2: 'Data management',
        MX_050102_vis_sub2: 'Visualization',
        MX_050103_warn_sub2: 'Flash flood\nwarning',
        MX_050104_analy_sub2: 'Flash flood\nanalysis',
        MX_050105_fusion_sub2: 'Spatial data fusion',
        MX_050201_feedback_sub2: 'User feedback',
        MX_050202_processing_sub2: 'ad hoc data\nprocessing',
        MX_050203_adapt_sub2: 'Adaptive modelling'
    }
};

//language key
var lang = null;
//default language
var defaultLanguage = "de";

//get language from KV-pairs
var params = decodeURIComponent(window.location.search.substring(1)).split('&');
for (var i = 0; i < params.length; i++) {
    var kv = params[i].split('=');
    if(kv[0] === "lang" && dictionaries.hasOwnProperty(kv[1]))
        lang = kv[1]
}
if(lang === null)
    lang = defaultLanguage;

/**
 * load navigation
 */
$(function () {

    //init menu
    $("#navigation").append("<header>\n" +
        "    <div id=\"language\"></div>\n" +
        "    <div id=\"logo\">EXTRUSO</div>\n" +
        "    <nav class=\"site-navigation\">\n" +
        "        <ul class=\"menu-list de\">\n" +
        "            <li><a href=\"" + host + "/?lang=de\">Home</a></li>\n" +
        "            <li><a href=\"" + host + "/news/?lang=de\">Aktuelles</a></li>\n" +
        "            <li><a href=\"" + host + "/map/?lang=de\">Karte</a></li>\n" +
        "            <li><a href=\"" + host + "/projektinfo/?lang=de\">Projektinformationen</a></li>\n" +
        "            <li><a href=\"" + host + "/publications/?lang=de\">Publikationen</a></li>\n" +
        "        </ul>\n" +
        "        <ul class=\"menu-list en\">\n" +
        "            <li><a href=\"" + host + "/?lang=en\">Home</a></li>\n" +
        "            <li><a href=\"" + host + "/news/?lang=en\">News</a></li>\n" +
        "            <li><a href=\"" + host + "/map/?lang=en\">Map</a></li>\n" +
        "            <li><a href=\"" + host + "/projektinfo/?lang=en\">Projectinfo</a></li>\n" +
        "            <li><a href=\"" + host + "/publications/?lang=en\">Publications</a></li>\n" +
        "        </ul>\n" +
        "    </nav>\n" +
        "</header>");

    //set language
    f_setDictionary(lang);
});

/**
 * load footer
 */
$(function () {
    $("#footer").append("<footer>\n" +
        "   <div class=\"content white\" style=\"line-height: 4em;text-align: center;\">\n" +
        "       &copy; EXTRUSO\n" +
        "   </div>\n" +
        "</footer>");
});

/**
 * load funding info
 */
$(function () {
    $("#funding").append("<div class=\"content container\">\n" +
        "    <div class=\"flex-container\">\n" +
        "       <div class=\"flex-item-fun\"><img src=\"https://extruso.bu.tu-dresden.de/img/logo-extruso.png\"></div>\n" +
        "       <div class=\"flex-item-fun\"><a href=\"https://tu-dresden.de\"><img src=\"https://extruso.bu.tu-dresden.de/img/logo-tud.png\"></a></div>\n" +
        "       <div class=\"flex-item-fun\"><a href=\"http://www.esf.de\"><img src=\"https://extruso.bu.tu-dresden.de/img/logo-esf.png\"></a></div>\n" +
        "    </div>\n" +
        "</div>");
});

/**
 * add show/hide events
 */
(function ($) {
    $.each(['show', 'hide'], function (i, ev) {
        var el = $.fn[ev];
        $.fn[ev] = function () {
            this.trigger(ev);
            return el.apply(this, arguments);
        };
    });
})(jQuery);

/**
 * expand/collapse article content
 */
$(function () {
    $(".article_title").click(function () {
        var $title = $(this);
        $title.next().slideToggle(500);
        $title.toggleClass("collapsed");
        $title.toggleClass("expanded");
    });
});

/**
 * ajax loading GIF
 */
$(document)
    .ajaxStart(function () {
        $('#loading_overlay').show();
    })
    .ajaxStop(function () {
        $('#loading_overlay').hide();
    });

//set active dictionary
function f_setDictionary(lang_key){

    //check, if dictionary key exists
    if(!dictionaries.hasOwnProperty(lang_key)){
        console.log("unknown dictionary");
        return;
    }

    //change active language
    lang = lang_key;

    //hide all elements not belonging to language key + add corresponding language selector
    var lDiv = $('#language');
    lDiv.empty();
    for (var key in dictionaries) {
        if(key !== lang_key && dictionaries.hasOwnProperty(key)) {
            //hide elements
            $("." + key).each(function() {
                $(this).hide();
            });
            //append language switch
            lDiv.append($('<a>', {
                id: key,
                text: dictionaries[key]["text"],
                title: dictionaries[key]["title"],
                click: function () {
                    f_setDictionary(this.id);
                }
            }));
        }
    }

    //translate all texts with class .lang and data-lang attribute
    $(".lang").each(function() {
        var key = $(this).attr("data-lang");
        $(this).text(dictionaries[lang][key]);
    });

    //translate all titles with class .lang and data-lang attribute
    $(".lang_t").each(function() {
        var key = $(this).attr("data-lang-t");
        $(this)[0].title = dictionaries[lang][key];
    });

    //set all items visible with class = lang_key
    $("." + lang).each(function() {
        $(this).show();
    });

    //set MX items, if publications are active
    if(document.getElementById("container_mxGraph") !== null)
        f_setMXDictionary();

}

//color palette
var colorPalette = {
    red: ["#f44336","#ffebee","#ffcdd2","#ef9a9a","#e57373","#ef5350","#f44336","#e53935","#d32f2f","#c62828","#b71c1c","#ff8a80","#ff5252","#ff1744","#d50000"],
    pink: ["#e91e63","#fce4ec","#f8bbd0","#f48fb1","#f06292","#ec407a","#e91e63","#d81b60","#c2185b","#ad1457","#880e4f","#ff80ab","#ff4081","#f50057","#c51162"],
    purple: ["#9c27b0","#f3e5f5","#e1bee7","#ce93d8","#ba68c8","#ab47bc","#9c27b0","#8e24aa","#7b1fa2","#6a1b9a","#4a148c","#ea80fc","#e040fb","#d500f9","#aa00ff"],
    deepPurple: ["#673ab7","#ede7f6","#d1c4e9","#b39ddb","#9575cd","#7e57c2","#673ab7","#5e35b1","#512da8","#4527a0","#311b92","#b388ff","#7c4dff","#651fff","#6200ea"],
    indigo: ["#3f51b5","#e8eaf6","#c5cae9","#9fa8da","#7986cb","#5c6bc0","#3f51b5","#3949ab","#303f9f","#283593","#1a237e","#8c9eff","#536dfe","#3d5afe","#304ffe"],
    blue: ["#2196f3","#e3f2fd","#bbdefb","#90caf9","#64b5f6","#42a5f5","#2196f3","#1e88e5","#1976d2","#1565c0","#0d47a1","#82b1ff","#448aff","#2979ff","#2962ff"],
    lightBlue: ["#03a9f4","#e1f5fe","#b3e5fc","#81d4fa","#4fc3f7","#29b6f6","#03a9f4","#039be5","#0288d1","#0277bd","#01579b","#80d8ff","#40c4ff","#00b0ff","#0091ea"],
    cyan: ["#00bcd4","#e0f7fa","#b2ebf2","#80deea","#4dd0e1","#26c6da","#00bcd4","#00acc1","#0097a7","#00838f","#006064","#84ffff","#18ffff","#00e5ff","#00b8d4"],
    teal: ["#009688","#e0f2f1","#b2dfdb","#80cbc4","#4db6ac","#26a69a","#009688","#00897b","#00796b","#00695c","#004d40","#a7ffeb","#64ffda","#1de9b6","#00bfa5"],
    green: ["#4caf50","#e8f5e9","#c8e6c9","#a5d6a7","#81c784","#66bb6a","#4caf50","#43a047","#388e3c","#2e7d32","#1b5e20","#b9f6ca","#69f0ae","#00e676","#00c853"],
    lightGreen: ["#8bc34a","#f1f8e9","#dcedc8","#c5e1a5","#aed581","#9ccc65","#8bc34a","#7cb342","#689f38","#558b2f","#33691e","#ccff90","#b2ff59","#76ff03","#64dd17"],
    lime: ["#cddc39","#f9fbe7","#f0f4c3","#e6ee9c","#dce775","#d4e157","#cddc39","#c0ca33","#afb42b","#9e9d24","#827717","#f4ff81","#eeff41","#c6ff00","#aeea00"],
    yellow: ["#ffeb3b","#fffde7","#fff9c4","#fff59d","#fff176","#ffee58","#ffeb3b","#fdd835","#fbc02d","#f9a825","#f57f17","#ffff8d","#ffff00","#ffea00","#ffd600"],
    amber: ["#ffc107","#fff8e1","#ffecb3","#ffe082","#ffd54f","#ffca28","#ffc107","#ffb300","#ffa000","#ff8f00","#ff6f00","#ffe57f","#ffd740","#ffc400","#ffab00"],
    orange: ["#ff9800","#fff3e0","#ffe0b2","#ffcc80","#ffb74d","#ffa726","#ff9800","#fb8c00","#f57c00","#ef6c00","#e65100","#ffd180","#ffab40","#ff9100","#ff6d00"],
    deepOrange: ["#ff5722","#fbe9e7","#ffccbc","#ffab91","#ff8a65","#ff7043","#ff5722","#f4511e","#e64a19","#d84315","#bf360c","#ff9e80","#ff6e40","#ff3d00","#dd2c00"],
    brown: ["#795548","#efebe9","#d7ccc8","#bcaaa4","#a1887f","#8d6e63","#795548","#6d4c41","#5d4037","#4e342e","#3e2723"],
    grey: ["#9e9e9e","#fafafa","#f5f5f5","#eeeeee","#e0e0e0","#bdbdbd","#9e9e9e","#757575","#616161","#424242","#212121"],
    blueGrey: ["#607d8b","#eceff1","#cfd8dc","#b0bec5","#90a4ae","#78909c","#607d8b","#546e7a","#455a64","#37474f","#263238"]
};