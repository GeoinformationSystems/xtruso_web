/**
 * D3 graph object
 * @param div graph container div name
 */
function D3Graph(div) {

    //array for graph objects
    this.graphs = [];

    //get graph container object
    this.container = $("#" + div);

    //set size and margins for display container
    this.display = { height: this.container.height() * 0.95, left: 10, right: 20};
    this.display.width = this.container.width() - this.display.left - this.display.right;

    //set margins for graph and timeline
    this.display.chart = { top: this.display.height * 0.05, bottom: this.display.height * 0.2 };
    this.display.timeline = { top: this.display.height * 0.85, bottom: this.display.height * 0.05 };
    this.display.chart.height = this.display.height - this.display.chart.top - this.display.chart.bottom;
    this.display.timeline.height = this.display.height - this.display.timeline.top - this.display.timeline.bottom;
    this.display.timeline.translate_y = 0.8 * this.display.height;

    //set bar width for timeline
    this.barWidth = 2;

    //set colors for different graphs
    this.display.chart.colors = d3.scaleOrdinal(d3.schemeCategory10);

    //selection function for tooltip
    this.bisectDate = d3.bisector(function(d) { return d[0]; }).left;

    /**
     * check if graph id is among the active graphs
     * @param id graph id
     */
    this.activeGraph = function(id){
        for(var i=0; i<this.graphs.length; i++) {
            if(this.graphs[i].id === id)
                return true;
        }
        return false;
    };

    /**
     * get number of graphs
     */
    this.numberOfGraphs = function(){
        return this.graphs.length;
    };

    /**
     * add graph
     * @param id graph identifier
     * @param name name of the graph for display
     * @param xyValues xy values to be drawn (x = time)
     */
    this.addGraph = function(id, name, xyValues) {

        if(id === undefined || xyValues === undefined || xyValues.length === 0)
            return;

        //create graph object
        var graph = {};
        graph.id = id;
        graph.name = name;

        //add values
        graph.xyValues = xyValues;

        //get min and max for xy values
        graph.xMin = d3.min(xyValues, function(d) {return d[0]; });
        graph.xMax = d3.max(xyValues, function(d) {return d[0]; });
        graph.yMin = d3.min(xyValues, function(d) {return d[1]; });
        graph.yMax = d3.max(xyValues, function(d) {return d[1]; });

        //add graph to collection and update view
        this.graphs.push(graph);

        this.updateView();

    };

    /**
     * remove graph
     * @param id graph identifier
     */
    this.removeGraph = function(id) {

        var removed = false;
        this.graphs.forEach(function(graph, i) {
            if(graph.id === id) {
                this.graphs.splice(i, 1);
                removed = true
            }
        }, this);

        if(removed)
            this.updateView();

    };

    /**
     * update graph view
     */
    this.updateView = function() {

        //reset current view
        this.reset();

        var activeD3 = this;

        var numOfGraphs = this.graphs.length;
        var xMin = null, xMax = null;

        //adjust display width
        this.display.left = 10 + numOfGraphs * 35;
        this.display.width = this.container.width() - this.display.left - this.display.right;

        this.chart.attr("width", this.display.width);
        this.timeline.attr("width", this.display.width);

        //define clip path to prevent graph overlaying the axes
        this.svg.append("defs").append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("width", this.display.width)
            .attr("height", this.display.chart.height);

        //adjust chart and timeline translation
        this.chart.attr("transform", "translate(" + this.display.left + "," + this.display.chart.top + ")");
        this.timeline.attr("transform", "translate(" + this.display.left + "," + this.display.timeline.translate_y + ")");

        //define axes for each graph
        this.graphs.forEach(function(graph, i) {

            //set min and max X
            if(xMin === null || xMin > graph.xMin)
                xMin = graph.xMin;
            if(xMax === null || xMax < graph.xMax)
                xMax = graph.xMax;

            //init timeline data
            graph.timelineValues = this.getTimelineValues(graph.xyValues);

            //set timeline color range
            graph.chartColor = this.display.chart.colors(i);
            graph.timelineColor = this.getColorScale(graph.chartColor, graph.yMin, graph.yMax);

            //define y scale and axis
            graph.chart = { yScale: d3.scaleLinear().range([this.display.chart.height, 0]) };
            var yMargin = (graph.yMax - graph.yMin) / 10;
            graph.chart.yScale.domain([Math.max(0, graph.yMin - yMargin), graph.yMax + yMargin]);
            graph.chart.yAxis = d3.axisLeft(graph.chart.yScale);

        }, this);

        //define x scale and axis
        this.chart.xScale = d3.scaleTime().range([0, this.display.width]);
        this.chart.xScale.domain([xMin, xMax]);
        this.chart.xAxis = d3.axisBottom(this.chart.xScale);

        this.timeline.xScale = d3.scaleTime().range([0, this.display.width]);
        this.timeline.xScale.domain(this.chart.xScale.domain());

        //append charts
        this.graphs.forEach(function(graph, i) {

            graph.chart.line = this.getLineChart(this.chart.xScale, graph.chart.yScale);

            //append line chart
            this.chart.append("path")
                .datum(graph.xyValues)
                .attr("class", "line " + "line_" + i)
                .style("stroke", graph.chartColor)
                .attr("d", graph.chart.line);

            //append y-axis
            this.chart.append("g")
                .attr("class", "axis axis--y axis_" + i)
                .style("fill", graph.chartColor)
                .attr("transform", "translate(" + -35 * i + ")")
                .call(graph.chart.yAxis);

        }, this);

        //append x-axis to chart view
        this.chart.append("g")
            .attr("class", "axis axis--x")
            .attr("transform", "translate(0," + this.display.chart.height + ")")
            .call(this.chart.xAxis);

        //add timeline graphs
        this.graphs.forEach(function(graph, i) {
            //set height for each timeline
            var height = this.display.timeline.height / this.graphs.length;
            //append timeline chart to timeline view
            this.timeline.selectAll()
                .data(graph.timelineValues)
                .enter().append("rect")
                .attr("x", function(d) { return activeD3.timeline.xScale(d[0]); }, activeD3)
                .attr("y", this.display.timeline.height + height * i)
                .attr("width", this.barWidth)
                .attr("height", height)
                .style("stroke", "none")
                .style("fill", function(d) { return graph.timelineColor(d[1]); });

        }, this);

        //init zoom and brush
        this.brush = this.getBrush();
        this.zoom = this.getZoom();

        //append brush action to context
        this.timeline.append("g")
            .attr("class", "brush")
            .attr("transform", "translate(0," + this.display.timeline.height + ")")
            .call(this.brush)
            .call(this.brush.move, this.chart.xScale.range());

        //initialize tooltip for each graph
        this.graphs.forEach(function(graph) {
            //add tooltip container for each graph
            graph.tooltipContainer = this.chart.append("g")
                .attr("transform", "translate(" + 0 + "," + -this.display.chart.top + ")");
            //append tooltip line
            graph.tooltipLine = graph.tooltipContainer.append("line")
                .attr("class", "tooltip_line")
                .attr("x1", 10).attr("x2", 10)
                .attr("y1", 0).attr("y2", this.display.chart.height + this.display.chart.top);
            //append tooltip text background
            graph.tooltipTextBG = graph.tooltipContainer.append("rect");
            //append tooltip text
            graph.tooltipText = graph.tooltipContainer.append('text')
                .attr("class", "tooltip_text")
                .attr('y', 12);
        }, this);

        //append overlay for tooltip and zoom
        this.svg.append("rect")
            .attr("id", "graph_overlay")
            .attr("width", this.display.width)
            .attr("height", this.display.chart.height)
            .attr("transform", "translate(" + this.display.left + "," + this.display.chart.top + ")")
            .on("mousemove", function(){
                activeD3.showTooltip(this);
            }, activeD3)
            .on("mouseout", this.hideTooltip());

        //append zoom functionality
        d3.select("#graph_overlay").call(this.zoom);

    };

    /**
     * get line chart
     * @param xScale x axis scale function
     * @param yScale y axis scale function
     */
    this.getLineChart = function(xScale, yScale) {
        return d3.line()
            .defined(function(d) { return d[1] !== null; })
            .curve(d3.curveMonotoneX)
            .x(function(d) { return xScale(d[0]); })
            .y(function(d) { return yScale(d[1]); })
    };

    /**
     * get area chart
     * @param xScale x axis scale function
     * @param yScale y axis scale function
     */
    this.getAreaChart = function(xScale, yScale) {
        return d3.area()
            .defined(function(d) { return d[1] !== null; })
            .curve(d3.curveMonotoneX)
            .x(function(d) { return xScale(d[0]); })
            .y1(function(d) { return yScale(d[1]); })
            .y0(this.display.chart.height);
    };

    this.init = function() {

        //add svg element to graph container
        this.svg = d3.select("#" + div).append('svg')
            .attr("width", this.container.width())
            .attr("height", this.container.height());

        //define timeline element
        this.timeline = this.svg.append("g")
            .attr("class", "d3Timeline");

        //define chart element
        this.chart = this.svg.append("g")
            .attr("class", "d3Chart")

    };

    this.showTooltip = function(mousePosition) {

        //set tooltip info for each graph
        this.graphs.forEach(function(graph, i) {

            //get closest timestamp
            var mouse_x = d3.mouse(mousePosition)[0];
            var closest = this.getClosestMeasurement(graph.xyValues, this.chart.xScale.invert(mouse_x));
            //get y position
            var mouse_y = d3.mouse(mousePosition)[1] + this.display.chart.top;
            //update tooltip text
            graph.tooltipText
                .text(this.getTooltipText(graph.name, closest))
                .style("opacity", 1)
                .attr('x', this.chart.xScale(closest[0]) + 3)
                .attr('y', mouse_y - 10 - i * 15)
                .style("fill", graph.chartColor);
            //update tooltip text background
            var textNode = graph.tooltipText.node();
            var textBounds = textNode.getBBox();
            graph.tooltipTextBG
                .attr("x", textBounds.x)
                .attr("y", textBounds.y)
                .attr("width", textBounds.width)
                .attr("height", textBounds.height)
                .style("fill", "white")
                .style("opacity", ".75");
            //update tooltip line
            graph.tooltipLine
                .attr("x1", this.chart.xScale(closest[0])).attr("x2", this.chart.xScale(closest[0]))
                .attr("y1", graph.chart.yScale(closest[1]) + this.display.chart.top)
                .style("opacity", 1)
                .style("stroke", graph.chartColor);

        }, this);

    };

    /**
     * get tooltip text for mouse location
     * @param graphName name of the graph
     * @param closest closest measurement
     */
    this.getTooltipText = function(graphName, closest) {
        return closest[0] + "@" + graphName + ": " + closest[1]
    };

    this.hideTooltip = function() {
        this.graphs.forEach(function(graph) {
            graph.tooltipText.style("opacity", 0);
            graph.tooltipLine.style("opacity", 0);
        });
    };

    /**
     * reset container
     */
    this.reset = function() {
        this.empty(false);
        this.init();
    };

    /**
     * empty container
     */
    this.empty = function(emptyGraphs) {
        this.container.empty();
        if(emptyGraphs)
            this.graphs = [];
    };

    /**
     * show container
     */
    this.show = function() {
        this.container.show();
    };

    /**
     * hide container
     */
    this.hide = function() {
        this.container.hide();
    };

    /**
     * get measurement closest to given timestamp
     * @param xyValues input values
     * @param date input timestamp
     * @returns {*} closest date
     */
    this.getClosestMeasurement = function(xyValues, date) {
        var target = this.bisectDate(xyValues, date, 1),
            d0 = xyValues[target - 1],
            d1 = xyValues[target];
        //check for first/last value of timeline
        if(d0 === undefined)
            return d1;
        else if(d1 === undefined)
            return d0;
        //check for null
        var i ;
        if(d0[1] === null) {
            i = 2;
            while (d0[1] === null)
                d0 = xyValues[target - i++];
        }
        if(d1[1] === null) {
            i = 1;
            while (d1[1] === null)
                d1 = xyValues[target + i++];
        }
        //get closest measurement
        return date - d0[0] > d1[0] - date ? d1 : d0;

    };

    /**
     * get graph by id
     * @param graphId requested graph id
     * @returns graph or null, if no matching graph was found
     */
    this.getGraphById = function(graphId) {
        this.graphs.forEach(function(graph) {
            if(graph.id === graphId)
                return graph;
        });
        return null;
    };

    /**
     * get measurements for context visualization, aggregates to reasonable number of measurements
     */
    this.getTimelineValues = function(xyValues) {
        //define target interval
        var interval = (xyValues.length / this.display.width) * this.barWidth;
        //create target value intervals
        var valueIntervals = [];
        for (var j = 0; j < xyValues.length; j++) {
            var targetIndex = Math.round(j / interval);
            if (valueIntervals[targetIndex] === undefined)
                valueIntervals[targetIndex] = [];
            valueIntervals[targetIndex].push(xyValues[j]);
        }
        //aggregate intervals
        var timelineValues = [];
        for (j = 0; j < valueIntervals.length; j++) {
            //fill gaps
            if (valueIntervals[j] === undefined)
                valueIntervals[j] = valueIntervals[j - 1];
            //add new measurement
            timelineValues.push({
                0: valueIntervals[j][0][0],
                1: Math.max.apply(Math, valueIntervals[j].map(function (d) {
                    return d[1];
                }))
            });
        }
        return timelineValues;
    };

    /**
     * get color scale for timeline visualization
     * @param color corresponding chart color
     * @param min min value
     * @param max max value
     */
    this.getColorScale = function(color, min, max) {
        return d3.scaleLinear()
            .domain([min, max])
            .range(["#dcdcdc", color]);
    };

    //define D3 brush (used to select time interval in context view)
    this.getBrush = function() {
        var currentD3 = this;
        return d3.brushX()
            .extent([[0, 0], [currentD3.display.width, currentD3.display.timeline.height]])
            .on("brush end", function () {
                if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom")
                    return; // ignore brush-by-zoom
                var s = d3.event.selection || currentD3.timeline.xScale.range();
                currentD3.chart.xScale.domain(s.map(currentD3.timeline.xScale.invert, currentD3.timeline.xScale));
                currentD3.graphs.forEach(function(graph, i) {
                    currentD3.chart.select(".line_" + i).attr("d", graph.chart.line);
                }, currentD3);
                currentD3.chart.select(".axis--x").call(currentD3.chart.xAxis);
                currentD3.svg.select("#graph_overlay").call(currentD3.zoom.transform, d3.zoomIdentity
                    .scale(currentD3.display.width / (s[1] - s[0]))
                    .translate(-s[0], 0));
            }, currentD3);
    };

    //define D3 zoom (used to zoom in focus view)
    this.getZoom = function() {
        var currentD3 = this;
        return d3.zoom()
            .scaleExtent([1, Infinity])
            .translateExtent([[0, 0], [currentD3.display.width, currentD3.display.chart.height]])
            .extent([[0, 0], [currentD3.display.width, currentD3.display.chart.height]])
            .on("zoom", function() {
                if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush")
                    return; // ignore zoom-by-brush
                var t = d3.event.transform;
                currentD3.chart.xScale.domain(t.rescaleX(currentD3.timeline.xScale).domain());
                currentD3.graphs.forEach(function(graph, i) {
                    currentD3.chart.select(".line_" + i).attr("d", graph.chart.line);
                }, currentD3);
                currentD3.chart.select(".axis--x").call(currentD3.chart.xAxis);
                currentD3.timeline.select(".brush").call(currentD3.brush.move, currentD3.chart.xScale.range().map(t.invertX, t));
            }, currentD3);
    }

}