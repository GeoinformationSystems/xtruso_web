//array of articles to be displayed
var articles = {};
//array of bibtex-formatted articles parsed from file
var articles_bibtex = {};
//container for article display
var articles_container = $("#container_articles");

//global mxGraph objects
var mxModel;
var mxGraph;
var mxParent;
//array for generated mxGraph objects
var mxElements = {};

//flag: edit classifications
var editClassifications = true;

//pre-defined anchors for box connections
var mxAnchors = {
    top: new mxConnectionConstraint(new mxPoint(.5, 0)),
    right: new mxConnectionConstraint(new mxPoint(1, .5)),
    bottom: new mxConnectionConstraint(new mxPoint(.5, 1)),
    left: new mxConnectionConstraint(new mxPoint(0, .5)),
    topleft: new mxConnectionConstraint(new mxPoint(0, 0)),
    bottomleft: new mxConnectionConstraint(new mxPoint(0, 1)),
    topright: new mxConnectionConstraint(new mxPoint(1, 0)),
    bottomright: new mxConnectionConstraint(new mxPoint(1, 1))
};

//init
$(function() {
    f_initGraph();
    f_initPublications();
});

/**
 * switch language for MX items
 */
function f_setMXDictionary() {

    //change icon titles
    var link_icons = document.getElementsByClassName('link');
    for (var i = 0; i < link_icons.length; i++){
        link_icons[i].title = dictionaries[lang]['MX_logo_link'];
    }
    var bibtex_icons = document.getElementsByClassName('bibtex');
    for (i = 0; i < bibtex_icons.length; i++){
        bibtex_icons[i].title = dictionaries[lang]['MX_logo_bibtex'];
    }
    var details_icons = document.getElementsByClassName('details');
    for (i = 0; i < details_icons.length; i++){
        details_icons[i].title = dictionaries[lang]['MX_logo_details'];
    }
    var editclass_icons = document.getElementsByClassName('editclass');
    for (i = 0; i < editclass_icons.length; i++){
        editclass_icons[i].title = dictionaries[lang]['MX_logo_editclass'];
    }

    //set graph values
    for (var key in mxElements) {
        if (dictionaries[lang].hasOwnProperty(key))
            mxModel.setValue(mxElements[key], dictionaries[lang][key]);
    }
}

/**
 * initialize mxGraph container
 * @param container container div
 */
function f_initGraph() {

    // browser check
    if (!mxClient.isBrowserSupported()) {
        mxUtils.error('Browser is not supported!', 200, false);
        return;
    }

    //init global mxGraph variables
    mxModel = new mxGraphModel();
    mxGraph = new mxGraph(document.getElementById('container_mxGraph'), mxModel);
    mxParent = mxGraph.getDefaultParent();

    /**
     * connect tow vertices with edge
     * @param sourceId souce vertex id
     * @param targetId target vertex id
     * @param sourceAnchor source anchor position
     * @param targetAnchor target anchor position
     * @return {*} mx edge
     */
    function f_connectVertices(sourceId, targetId, sourceAnchor, targetAnchor) {
        var source = mxElements[sourceId];
        var target = mxElements[targetId];
        var id = sourceId + '_' + targetId;
        var edge = mxGraph.createEdge(mxParent, id, '', source, target, 'conn_' + f_getClassificationType(targetId));
        mxGraph.connectCell(edge, source, true, sourceAnchor);
        mxGraph.connectCell(edge, target, false, targetAnchor);
        mxElements[id] = mxGraph.addEdge(edge, mxParent);
    }

    /**
     * add vertex to mxGraph
     * @param id vertex id
     * @param x x-offset
     * @param y y-offset
     * @param sizeX x-size
     * @param sizeY y-size
     */
    function f_addVertex(id, x, y, sizeX, sizeY) {
        mxElements[id] = mxGraph.insertVertex(mxParent, id, null, x, y, sizeX, sizeY, 'task_' + f_getClassificationType(id));
    }

    // enable rubberband selection
    new mxRubberband(mxGraph);

    //override selection style
    mxVertexHandler.prototype.createSelectionShape = function(bounds) {
        var shape = new mxRectangleShape(bounds, null, '#FFFF00');
        shape.strokewidth = 1;
        shape.isDashed = false;
        shape.isRounded = true;
        return shape;
    };
    mxConstants.EDGE_SELECTION_DASHED = false;
    mxConstants.EDGE_SELECTION_COLOR = '#FFFF00';
    mxConstants.EDGE_SELECTION_STROKEWIDTH = 1;

    //set basic interactions
    mxGraph.setCellsMovable(false);
    mxGraph.setCellsResizable(false);
    mxGraph.setCellsBendable(false);
    mxGraph.setCellsEditable(false);
    mxGraph.setCellsDisconnectable(false);

    //init styles
    f_initBoxStyle('task_main', 'white', '#338dcd', '#338dcd', 1, 14);
    f_initBoxStyle('task_sub1', '#338dcd', 'white', '#338dcd', 1, 12);
    f_initBoxStyle('task_sub2', 'black', 'white', '#afc1cd', 1, 12);
    f_initLineStyle('conn_main', '#338dcd', 2, mxConstants.EDGESTYLE_ORTHOGONAL, mxConstants.ARROW_CLASSIC, true);
    f_initLineStyle('conn_sub1', '#338dcd', 1, mxConstants.EDGESTYLE_ORTHOGONAL, false, false);
    f_initLineStyle('conn_sub2', '#afc1cd', 1, mxConstants.EDGESTYLE_ORTHOGONAL, false, false);

    // create and display model
    mxModel.beginUpdate();
    try {

        //main tasks
        f_addVertex('MX_01_acqhmed_main', 600, 55, 150, 60);
        f_addVertex('MX_02_provhmed_main', 600, 160, 150, 60);
        f_addVertex('MX_03_acqhmod_main', 400, 55, 150, 60);
        f_addVertex('MX_04_mod_main', 200, 160, 150, 60);
        f_addVertex('MX_05_inf_main', 400, 260, 150, 60);
        f_connectVertices('MX_01_acqhmed_main', 'MX_02_provhmed_main', mxAnchors.bottom, mxAnchors.top);
        f_connectVertices('MX_02_provhmed_main', 'MX_04_mod_main', mxAnchors.left, mxAnchors.right);
        f_connectVertices('MX_03_acqhmod_main', 'MX_04_mod_main', mxAnchors.left, mxAnchors.top);
        f_connectVertices('MX_03_acqhmod_main', 'MX_05_inf_main', mxAnchors.bottom, mxAnchors.top);
        f_connectVertices('MX_04_mod_main', 'MX_05_inf_main', mxAnchors.bottom, mxAnchors.left);
        f_connectVertices('MX_02_provhmed_main', 'MX_05_inf_main', mxAnchors.bottom, mxAnchors.right)

        //subtasks for the acquisition of hydro-meteorological data
        f_addVertex('MX_0101_radar_sub2', 700, 0, 150, 30);
        f_addVertex('MX_0102_photo_sub2', 800, 35, 150, 30);
        f_addVertex('MX_0103_lcsens_sub2', 800, 70, 150, 30);
        f_addVertex('MX_0104_cs_sub2', 800, 105, 150, 30);
        f_connectVertices('MX_01_acqhmed_main', 'MX_0101_radar_sub2', mxAnchors.right, mxAnchors.bottom);
        f_connectVertices('MX_01_acqhmed_main', 'MX_0102_photo_sub2', mxAnchors.right, mxAnchors.left);
        f_connectVertices('MX_01_acqhmed_main', 'MX_0103_lcsens_sub2', mxAnchors.right, mxAnchors.left);
        f_connectVertices('MX_01_acqhmed_main', 'MX_0104_cs_sub2', mxAnchors.right, mxAnchors.left);

        //subtasks for the provision of hydro-meteorological time series
        f_addVertex('MX_0201_timeseries_sub2', 800, 175, 150, 30);
        f_addVertex('MX_0202_qa_sub2', 800, 210, 150, 30);
        f_connectVertices('MX_02_provhmed_main', 'MX_0201_timeseries_sub2', mxAnchors.right, mxAnchors.left);
        f_connectVertices('MX_02_provhmed_main', 'MX_0202_qa_sub2', mxAnchors.right, mxAnchors.left);

        //subtasks for the acquisition of hydro-morphological data
        f_addVertex('MX_0301_rs_sub2', 160, 0, 150, 30);
        f_addVertex('MX_0302_uav_sub2', 320, 0, 150, 30);
        f_addVertex('MX_0303_uwv_sub2', 480, 0, 150, 30);
        f_connectVertices('MX_03_acqhmod_main', 'MX_0301_rs_sub2', mxAnchors.top, mxAnchors.bottom);
        f_connectVertices('MX_03_acqhmod_main', 'MX_0302_uav_sub2', mxAnchors.top, mxAnchors.bottom);
        f_connectVertices('MX_03_acqhmod_main', 'MX_0303_uwv_sub2', mxAnchors.top, mxAnchors.bottom);

        //subtasks for hydro-meteorological modelling
        f_addVertex('MX_0402_metmod_sub1', 100, 110, 150, 30);
        f_addVertex('MX_0401_hydmod_sub1', 100, 240, 150, 30);
        f_connectVertices('MX_04_mod_main', 'MX_0402_metmod_sub1', mxAnchors.left, mxAnchors.bottom);
        f_connectVertices('MX_04_mod_main', 'MX_0401_hydmod_sub1', mxAnchors.left, mxAnchors.top);

        f_addVertex('MX_040201_disagg_sub2', 0, 70, 150, 30);
        f_addVertex('MX_040202_moist_sub2', 0, 150, 150, 30);
        f_addVertex('MX_040101_datamod_sub2', 0, 205, 150, 30);
        f_addVertex('MX_040102_detmod_sub2', 0, 275, 150, 30);
        f_connectVertices('MX_0402_metmod_sub1', 'MX_040201_disagg_sub2', mxAnchors.left, mxAnchors.bottom);
        f_connectVertices('MX_0402_metmod_sub1', 'MX_040202_moist_sub2', mxAnchors.left, mxAnchors.top);
        f_connectVertices('MX_0401_hydmod_sub1', 'MX_040101_datamod_sub2', mxAnchors.left, mxAnchors.bottom);
        f_connectVertices('MX_0401_hydmod_sub1', 'MX_040102_detmod_sub2', mxAnchors.left, mxAnchors.top);

        //subtasks for information infrastructure
        f_addVertex('MX_0501_prov_sub1', 300, 362, 150, 30);
        f_addVertex('MX_0502_interact_sub1', 500, 362, 150, 30);
        f_connectVertices('MX_05_inf_main', 'MX_0501_prov_sub1', mxAnchors.bottom, mxAnchors.top);
        f_connectVertices('MX_05_inf_main', 'MX_0502_interact_sub1', mxAnchors.bottom, mxAnchors.top);

        f_addVertex('MX_050101_manage_sub2', 210, 310, 150, 30);
        f_addVertex('MX_050102_vis_sub2', 120, 345, 150, 30);
        f_addVertex('MX_050103_warn_sub2', 120, 380, 150, 30);
        f_addVertex('MX_050104_analy_sub2', 210, 415, 150, 30);
        f_connectVertices('MX_0501_prov_sub1', 'MX_050101_manage_sub2', mxAnchors.left, mxAnchors.bottom);
        f_connectVertices('MX_0501_prov_sub1', 'MX_050102_vis_sub2', mxAnchors.left, mxAnchors.right);
        f_connectVertices('MX_0501_prov_sub1', 'MX_050103_warn_sub2', mxAnchors.left, mxAnchors.right);
        f_connectVertices('MX_0501_prov_sub1', 'MX_050104_analy_sub2', mxAnchors.left, mxAnchors.top);

        f_addVertex('MX_050203_adapt_sub2', 590, 310, 150, 30);
        f_addVertex('MX_050201_feedback_sub2', 680, 345, 150, 30);
        f_addVertex('MX_050202_processing_sub2', 680, 380, 150, 30);
        f_addVertex('MX_050105_fusion_sub2', 400, 415, 150, 30);
        f_connectVertices('MX_0502_interact_sub1', 'MX_050203_adapt_sub2', mxAnchors.right, mxAnchors.bottom);
        f_connectVertices('MX_0502_interact_sub1', 'MX_050201_feedback_sub2', mxAnchors.right, mxAnchors.left);
        f_connectVertices('MX_0502_interact_sub1', 'MX_050202_processing_sub2', mxAnchors.right, mxAnchors.left);
        f_connectVertices('MX_0502_interact_sub1', 'MX_050105_fusion_sub2', mxAnchors.bottom, mxAnchors.right);
        f_connectVertices('MX_0501_prov_sub1', 'MX_050105_fusion_sub2', mxAnchors.bottom, mxAnchors.left);


    }
    finally {
        // update display
        mxModel.endUpdate();
    }

    //init selection listener
    mxGraph.getSelectionModel().addListener(mxEvent.CHANGE, function(sender, evt)
    {
        var identifier = [];
        var selection = mxGraph.getSelectionCells();

        //select connected vertices for each selected edge
        for(var i = 0; i < selection.length; i++){
            if(selection[i].isEdge())
                mxGraph.addSelectionCells([selection[i].source, selection[i].target])
        }

        //update selection
        selection = mxGraph.getSelectionCells();

        //select target vertices for each connected edge (subtopic selection)
        var added = true;
        while(added) {
            added = false;
            for (i = 0; i < selection.length; i++) {
                if (selection[i].isEdge())
                    continue;
                for (var j = 0; j < selection[i].edges.length; j++) {
                    //add subtopic (target of connected edge), if not yet selected and not a main topic
                    if (selection[i].edges[j].source === selection[i] && selection.indexOf(selection[i].edges[j].target) === -1 && f_getClassificationType(selection[i].edges[j].target.id) !== 'main') {
                        mxGraph.addSelectionCells([selection[i].edges[j].target]);
                        added = true;
                    }
                }
            }
            //update selection
            selection = mxGraph.getSelectionCells();
        }

        //add selected identifiers for article filtering
        for(i = 0; i < selection.length; i++){
            if(selection[i] !== undefined && selection[i].hasOwnProperty("id"))
                identifier.push(selection[i].id);
        }
        f_filterPublications(identifier)
    });

    //set hover mouse listener
    f_addMouseOver();
}

/**
 * create box style
 * @param name style name
 * @param color_txt text color
 * @param color_bgr background color
 * @param color_str stroke color
 * @param width_str stroke width
 * @param font_size
 */
function f_initBoxStyle(name, color_txt, color_bgr, color_str, width_str, font_size) {
    var style = {};
    style[mxConstants.STYLE_SHAPE] = mxConstants.SHAPE_RECTANGLE;
    style[mxConstants.STYLE_ROUNDED] = true;
    style[mxConstants.STYLE_FONTSIZE] = font_size;
    style[mxConstants.STYLE_STROKEWIDTH]= width_str;
    style[mxConstants.STYLE_STROKECOLOR]= color_str;
    style[mxConstants.STYLE_FONTCOLOR]= color_txt;
    style[mxConstants.STYLE_FILLCOLOR]= color_bgr;
    mxGraph.getStylesheet().putCellStyle(name, style);
}

/**
 * create line style
 * @param name style name
 * @param color_str stroke color
 * @param width_str stroke width
 * @param edge edge style
 * @param arrow line arrow
 * @param rounded flag: rounded line
 */
function f_initLineStyle(name, color_str, width_str, edge, arrow, rounded) {
    var style = {};
    style[mxConstants.STYLE_STROKECOLOR] = color_str;
    style[mxConstants.STYLE_STROKEWIDTH] = width_str;
    style[mxConstants.STYLE_EDGE] = edge;
    style[mxConstants.STYLE_ROUNDED] = rounded;
    style[mxConstants.STYLE_ENDARROW] = arrow;
    mxGraph.getStylesheet().putCellStyle(name, style);
}

/**
 * add mouseover effect on hover for each mxGraph object
 */
function f_addMouseOver(){
    mxGraph.addMouseListener({
        //set tmp cell
        cell: null,
        mouseMove: function(sender, me) {
            //check, if selected cell changed
            var currentCell = me.getCell();
            if (me.getCell() !== this.cell) {
                if (this.cell !== null) {
                    this.dragLeave(me.getEvent(), this.cell);
                }
                this.cell = currentCell;
                if (this.cell !== null) {
                    this.dragEnter(me.getEvent(), this.cell);
                }
            }
        },
        dragEnter: function(evt, cell) {
            f_updateStyle(this.cell, true);
            f_highlightPublications(this.cell.id);
        },
        dragLeave: function(evt, cell) {
            f_clearHighlightPublications();
            f_updateStyle(cell, false);
        },
        mouseDown: function(sender, me) {
            //do nothing
        },
        mouseUp: function(sender, me) {
            //do nothing
        }
    });
}

/**
 * highlight publication view
 * @param mxIdentifier selected identifier from model
 */
function f_highlightPublications(mxIdentifier) {
    for(var id in articles){
        if(articles_bibtex[id]['xtruso_componentArray'].indexOf(mxIdentifier) !== -1)
            articles[id].addClass('highlight');
    }
}

/**
 * highlight mx components
 * @param mxIdentifier selected identifier from model
 */
function f_highlightMXComponents(mxIdentifier) {
    for(var i = 0; i < mxIdentifier.length; i++) {
        f_updateStyle(mxModel.getCell(mxIdentifier[i]), true)
    }
}

/**
 * highlight mx components
 * @param mxIdentifier selected identifier from model
 */
function f_clearHighlightMX(mxIdentifier) {
    for(var i = 0; i < mxIdentifier.length; i++) {
        f_updateStyle(mxModel.getCell(mxIdentifier[i]), false)
    }
}

/**
 * set cell style
 * @param cell mx cell
 * @param highlight flag: highlight on/off
 */
function f_updateStyle(cell, highlight){
    var cellState = mxGraph.view.getState(cell);
    if(cellState === null)
        return;
    cellState.style[mxConstants.STYLE_STROKECOLOR] = highlight ? 'red' : (f_getClassificationType(cell.id) === 'sub2' ? '#afc1cd' : '#338dcd');
    cellState.style[mxConstants.STYLE_STROKEWIDTH] = highlight ? 2 : 1;
    cellState.shape.apply(cellState);
    cellState.shape.redraw();
}

/**
 * update publication view
 * @param mxIdentifier selected identifiers from model
 */
function f_filterPublications(mxIdentifier) {
    loop_outer: for(var id in articles){
        if(mxIdentifier.length === 0) {
            articles[id].fadeIn('fast');
            continue;
        }
        for(var i = 0; i < mxIdentifier.length; i++) {
            if (articles_bibtex[id]['xtruso_componentArray'].indexOf(mxIdentifier[i]) !== -1) {
                articles[id].fadeIn('fast');
                continue loop_outer;
            }
        }
        articles[id].fadeOut('fast')
    }
}

/**
 * clear all highlighted articles
 */
function f_clearHighlightPublications() {
    for(var id in articles){
        articles[id].removeClass('highlight');
    }
}

/**
 * initialize articles
 * @returns {{}} articles
 */
function f_initPublications() {

    //open Bibtex file and parse elemetns
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function() {
        if (this.readyState === 4 && this.status === 200) {

            //parse Bibtex
            f_parseBibtexFile(this.responseText);

            //create Articles
            f_createArticles();

            //sort based on year/title
            var articleArray = Object.values(articles);
            articleArray.sort(function(a, b) {
                if(a[0].id.substring(0,4) > b[0].id.substring(0,4)) return false;
                else return a[0].id.substring(4) > b[0].id.substring(4);
            });

            //append articles to container
            for(var i = 0; i < articleArray.length; i++) {
                articles_container.append(articleArray[i])
            }

            //set dictionary entries
            f_setMXDictionary();
        }
    };
    xmlhttp.open("GET", "resources/xtruso.bib", true);
    xmlhttp.send();
}

/**
 * parse Bibtex file
 * @param fileTxt input Bibtex file text
 * @returns {Array} array with bibtex entries
 */
function f_parseBibtexFile(fileTxt) {

    /**
     * create new bibtex entry
     * @param index entry index
     * @param line line starting with @
     * @returns {{}} new bibtex entry with bibType
     */
    function f_createBibtexEntry(index, line) {
        var entry = {};
        entry.bibType = line.replace(/[@{\s]/g, "");
        return entry;
    }

    /**
     * add bibtex property
     * @param entry bibtex entry to which property is added
     * @param line bibtex text line
     */
    function f_addBibtexProperty(entry, line) {
        //parse each property line of the entry
        var property = line.substring(0, line.indexOf("=")).trim();
        var value = line.substring(line.indexOf("="));
        entry[property] = value.substring(value.indexOf("{") + 1, value.lastIndexOf("}"));
    }

    /**
     * determine bibtex id
     * @param entry bibtex entry
     */
    function f_determineBibId(entry) {
        return entry['year'] + "_" + entry['title'].replace(/[,\\.\s]/g, "").substring(0, 10) + "_" + entry['authors_pretty'].replace(/[,\\.\s]/g, "");
    }

    /**
     * finalize bibtex entry (add extra attributes)
     * @param entry bibtex entry
     */
    function f_finalizeBibtexEntry(entry) {

        //add pretty author string
        var authors_pretty = [];
        var authors = entry['author'].split("and");
        for(var i = 0; i < authors.length; i++){
            if(authors[i].indexOf(",") !== -1)
                authors_pretty.push(authors[i].split(",")[1].trim() + " " + authors[i].split(",")[0].trim());
            else
                authors_pretty.push(authors[i].trim())
        }
        //format author string depending on number of authors
        if(authors.length === 1)
            entry['authors_pretty'] = authors_pretty[0];
        else if(authors.length > 3)
            entry['authors_pretty'] = authors_pretty[0] + " et al.";
        else
            entry['authors_pretty'] = authors_pretty.slice(0, authors_pretty.length - 1).join(", ") + " and " + authors_pretty[authors_pretty.length - 1];

        //add doi url, if only doi is set
        if(!entry.hasOwnProperty('url') && entry.hasOwnProperty('doi'))
            entry['url'] = "https://dx.doi.org/" + entry['doi'];

        //add xtruso component array
        if(entry.hasOwnProperty('xtruso_component'))
            entry['xtruso_componentArray'] = entry['xtruso_component'] !== '' ? entry['xtruso_component'].split(",").map(function(s) { return String.prototype.trim.apply(s); }) : [];
        return entry;
    }

    //read line by line
    var lines = fileTxt.split('\n');
    var nesting = 0;

    //create bibtex objects
    for(var i = 0; i < lines.length; i++){
        var line = lines[i].trim();
        //increase nesting level by occurrences of "{"
        nesting += (line.split("{").length - 1);
        //reduce nesting level by occurrences of "}"
        nesting -= (line.split("}").length - 1);
        //add current entry, if nesting level is 0
        if(nesting === 0 && typeof entry !== 'undefined') {
            entry = f_finalizeBibtexEntry(entry);
            entry.id = f_determineBibId(entry);
            articles_bibtex[entry.id] = entry;
        }
        //init new entry, if line starts with @
        else if(line.startsWith("@"))
            var entry = f_createBibtexEntry(i, line);
        //add bibtex property, if line contains "="
        else if(line.indexOf("=") !== -1)
            f_addBibtexProperty(entry, line);
    }

}

/**
 * create articles from bibtex array
 */
function f_createArticles() {

    //iterate bibtex entries
    for(var id in articles_bibtex) {

        var entry = articles_bibtex[id];

        //create article element for publication
        var article = $('<article>', {
            id: entry.id,
            'class': 'publication'
        }).append($('<h3>', {
            text: entry.title
        })).append($('<p>')
            .append($('<span>', {
                text: entry.authors_pretty,
                'class': 'author'
            }))
            .append($('<span>', {
                text: " " + entry.year,
                'class': 'year'
            }))
        );

        //append abstract
        if(entry.hasOwnProperty('abstract')) {
            article.append($('<p>', {
                'class': 'abstract abstract_short abstract_' + entry.id,
                text: entry.abstract
            }));
        }

        //append p for icons
        article.append('<p>');

        //append link to document
        if(entry.hasOwnProperty('url'))
            article.children().last().append($('<a>', {
                'class': 'link',
                href: entry.url,
                click: function(){
                    window.open(this.href);
                    return false;
                }
            }));

        //append bibtex icon
        article.children().last().append($('<a>', {
                id: 'get_bibtex_' + entry.id,
                'class': 'bibtex',
                click: function(){
                    $(this).animate().fadeTo( "fast" , 0.5).fadeTo( "fast" , 1);
                    var entry = articles_bibtex[this.id.substring(11)];
                    var bibtex = f_getBibtex(entry, true);
                    var input = $("<textarea>", {
                        text: bibtex
                    });
                    $("body").append(input);
                    input.select();
                    document.execCommand("copy");
                    input.remove();
                }
            }))

            //append show details icon
            .append($('<a>', {
                id: 'toggle_details_' + entry.id,
                'class': 'details show_details',
                click: function(){
                    var element = $(this);
                    var abstract = $('.abstract_' + this.id.substring(15));
                    var abstractHeight = abstract.prop('scrollHeight');
                    if(element.hasClass('show_details')){
                        element.removeClass("show_details");
                        element.addClass("hide_details");
                        if(abstract.length > 0) {
                            //set abstract to full height
                            abstract.removeClass('abstract_short');
                            if (abstract.height() < abstractHeight) {
                                abstract.animate({height: abstractHeight}, 500);
                                abstract.css('max-height', abstractHeight);
                                abstract.removeClass('abstract_short');
                            }
                        }
                    }
                    else {
                        element.removeClass("hide_details");
                        element.addClass("show_details");
                        if(abstract.length > 0)
                        //set abstract to max-height{
                            abstract.addClass('abstract_short');
                        if (abstract.height() > 115)
                            abstract.animate({height: 115}, 500);
                    }
                }
            }));

        //append edit classification icon
        if(editClassifications)
            article.children().last().append($('<a>', {
                id: 'editclass_' + entry.id,
                'class': 'editclass',
                click: function(){
                    var overlay = $('#overlay');
                    var article = articles_bibtex[this.id.substring(10)];

                    //create form
                    var form = $('<form>').append($('<h3>', {
                        id: 'form_' + this.id,
                        text: article.title
                    }));

                    //get available classifications
                    var classes = []
                    for(entry in dictionaries[lang]){
                        if(entry.startsWith('MX'))
                            classes.push(entry);
                    }

                    //sort classes
                    classes.sort(function(a, b) {
                        return a.split('_')[1].localeCompare(b.split('_')[1]);
                    });

                    //create inputs
                    for(var i = 0; i < classes.length; i++) {
                        var currentClass = f_getClassificationType(classes[i]);
                        form.append('<label class="checkbox_' + currentClass + '">' +
                            '<input type="checkbox" value="' + classes[i] + '"' + (article['xtruso_componentArray'].indexOf(classes[i]) !== -1 ? 'checked="checked"' : '') + ' onchange="f_toggleClassification(this,\'' + this.id.substr(10) + '\')" />' + dictionaries[lang][classes[i]] +
                            '</label>');
                        if(i < classes.length - 1 && f_getClassificationType(classes[i+1]) !== currentClass)
                            form.append('<br>');
                    }

                    //append submit button
                    form.append('<br>').append($('<input>', {
                        type: 'button',
                        'class': 'button',
                        value: 'Exit',
                        click: function(){
                            $('#overlay').empty().hide();
                        }
                    }));

                    //append download button
                    form.append($('<input>', {
                        type: 'button',
                        'class': 'button',
                        value: 'Exit & Download',
                        click: function(){
                            f_downloadBibtex();
                            $('#overlay').empty().hide();
                        }
                    }));

                    //append form to overlay
                    overlay.append(form);
                    overlay.show();
                }
            }));

        //init mouseover events to highlight mx components
        article.mouseover(function(){
            f_highlightMXComponents(articles_bibtex[this.id]['xtruso_componentArray']);
        });
        article.mouseout(function(){
            f_clearHighlightMX(articles_bibtex[this.id]['xtruso_componentArray']);
        });

        //add article to global var
        articles[entry.id] = article;

    }
}

/**
 * get formatted bibtex from entry
 * @param entry input entry
 * @return string formatted bibtex string
 */
function f_getBibtex(entry, excludeClassification) {
    var excludenProperties = ["bibType", "id", "xtruso_component", "xtruso_componentArray", "authors_pretty"];
    var bibtex = "@" + entry.bibType + " {\n";
    for(var property in entry) {
        if(excludenProperties.indexOf(property) !== -1)
            continue;
        bibtex += "\t" + property + " = {" + entry[property] + "},\n"
    }
    if(!excludeClassification)
        bibtex += "\txtruso_component = {" + entry['xtruso_componentArray'].join(',') + "},\n";
    bibtex += "}\n";
    return(bibtex);
}

/**
 * get classification type for mxVertex
 * @param id vertex identifier
 * @return {string} classification (main, sub1, sub2)
 */
function f_getClassificationType(id) {
    return id.substr(id.length - 4);
}

/**
 * toggle article classification
 * @param checkbox classification checkbox
 * @param id article id
 */
function f_toggleClassification(checkbox, id) {
    if(checkbox.checked)
        articles_bibtex[id]['xtruso_componentArray'].push(checkbox.value);
    else
        articles_bibtex[id]['xtruso_componentArray'].pop(checkbox.value);
}

/**
 * download bibtex file with edited selected classification
 */
function f_downloadBibtex(){
    //generate bibtex
    var bibtex = '';
    for(entry in articles_bibtex){
        bibtex += f_getBibtex(articles_bibtex[entry], false);
    }
    //download
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(bibtex));
    element.setAttribute('download', 'xtruso.bib');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}