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

    //set margins for graph and context
    this.display.chart = { top: this.display.height * 0.05, bottom: this.display.height * 0.2 };
    this.display.context = { top: this.display.height * 0.85, bottom: this.display.height * 0.05 };
    this.display.chart.height = this.display.height - this.display.chart.top - this.display.chart.bottom;
    this.display.context.height = this.display.height - this.display.context.top - this.display.context.bottom;
    this.display.context.translate_y = 0.8 * this.display.height;

    //set bar width for context
    this.barWidth = 2;

    //set measurement density for linear graph
    this.valueWidth = 0.2;

    //init variable for visible and maximum timeframe
    this.visibleTimeframe = null;
    this.totalTimeframe = null;

    //set colors for different graphs
    this.display.chart.colors = d3.scaleOrdinal(d3.schemeCategory10);

    //selection function for tooltip
    this.bisectDate = d3.bisector(function(d) { return d['timestamp']; }).left;

    //time format for tooltip
    this.timeLocale = "de-DE";
    this.timeOptions = { };

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
     * @param measurements xy values to be drawn (x = time)
     * @param totalTimeframe total timeframe
     * @param visibleTimeframe visible timeframe
     */
    this.addGraph = function(id, name, measurements, totalTimeframe, visibleTimeframe) {

        if(id === undefined || measurements === undefined || measurements.length === 0)
            return;

        //create graph object
        var graph = {};
        graph.id = id;
        graph.name = name;

        //set measurements and timeframe
        graph.measurements = measurements;
        graph.totalTimeframe = totalTimeframe !== null ? totalTimeframe : {start: d3.min(measurements, function(d) {return d['timestamp']}), end: d3.max(measurements, function(d) {return d['timestamp']})};
        graph.visibleTimeframe = visibleTimeframe !== null ? visibleTimeframe : (this.visibleTimeframe !== null ? this.visibleTimeframe : graph.totalTimeframe);

        graph.yMin = d3.min(measurements, function(d) {return d['value']; });
        graph.yMax = d3.max(measurements, function(d) {return d['value']; });

        //add graph to collection and update view
        this.graphs.push(graph);

        this.updateView(null);

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
            this.updateView(null);

    };

    /**
     * update graph view
     */
    this.updateView = function(visibleTimeframe) {

        //set current visible timeframe
        if(visibleTimeframe !== null)
            this.visibleTimeframe = visibleTimeframe;
        else {
            var visibleMin = null, visibleMax = null, totalMin = null, totalMax = null;
            this.graphs.forEach(function(graph) {
                if(visibleMin === null || visibleMin > graph.visibleTimeframe['start']) visibleMin = graph.visibleTimeframe['start'];
                if(visibleMax === null || visibleMax < graph.visibleTimeframe['end']) visibleMax = graph.visibleTimeframe['end'];
                if(totalMin === null || totalMin > graph.totalTimeframe['start']) totalMin = graph.totalTimeframe['start'];
                if(totalMax === null || totalMax < graph.totalTimeframe['end']) totalMax = graph.totalTimeframe['end'];
            });
            this.visibleTimeframe = {start: visibleMin, end: visibleMax};
            this.totalTimeframe = {start: totalMin, end: totalMax};
        }

        //reset current view
        this.reset();

        var activeD3 = this;

        var numOfGraphs = this.graphs.length;

        //adjust display width
        this.display.left = 10 + numOfGraphs * 35;
        this.display.width = this.container.width() - this.display.left - this.display.right;

        this.chart.attr("width", this.display.width);
        this.context.attr("width", this.display.width);

        //define clip path to prevent graph overlaying the axes
        this.svg.append("defs").append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("width", this.display.width)
            .attr("height", this.display.chart.height);

        //adjust chart and context translation
        this.chart.attr("transform", "translate(" + this.display.left + "," + this.display.chart.top + ")");
        this.context.attr("transform", "translate(" + this.display.left + "," + this.display.context.translate_y + ")");

        //define axes for each graph
        this.graphs.forEach(function(graph, i) {

            //init timeline data
            graph.contextValues = this.getMeasurementValues(graph.measurements, this.barWidth);

            //init linear graph data
            graph.measurementValues = this.getMeasurementValues(graph.measurements, this.valueWidth);

            //init single measurements data
            graph.xySingleValues = this.getSingleValues(graph.measurementValues);

            //set measurements color range
            graph.chartColor = this.display.chart.colors(i);
            graph.contextColor = this.getColorScale(graph.chartColor, graph.yMin, graph.yMax);

            //define y scale and axis
            graph.chart = { yScale: d3.scaleLinear().range([this.display.chart.height, 0]) };
            var yMargin = (graph.yMax - graph.yMin) / 10;
            graph.chart.yScale.domain([Math.max(0, graph.yMin - yMargin), graph.yMax + yMargin]);
            graph.chart.yAxis = d3.axisLeft(graph.chart.yScale);

        }, this);

        //define x scale and axis
        this.chart.xScale = d3.scaleTime().range([0, this.display.width]);
        this.chart.xScale.domain([this.visibleTimeframe['start'], this.visibleTimeframe['end']]);
        this.chart.xAxis = d3.axisBottom(this.chart.xScale);

        this.context.xScale = d3.scaleTime().range([0, this.display.width]);
        this.context.xScale.domain([this.totalTimeframe['start'], this.totalTimeframe['end']]);

        //append charts
        this.graphs.forEach(function(graph, i) {

            graph.chart.line = this.getLineChart(this.chart.xScale, graph.chart.yScale, 'value');

            //set uncertainty range (max)
            if(graph.measurementValues[0].hasOwnProperty('vmax')) {
                graph.chart.max = this.getAreaChart(this.chart.xScale, graph.chart.yScale, 'vmax');
                this.chart.append("path")
                    .datum(graph.measurementValues)
                    .attr("class", "area " + "area_max_" + i)
                    .style("fill", graph.chartColor)
                    .style("opacity", 0.4)
                    .attr("d", graph.chart.max);
            }

            //set uncertainty range (min)
            if(graph.measurementValues[0].hasOwnProperty('vmin')) {
                graph.chart.min = this.getAreaChart(this.chart.xScale, graph.chart.yScale, 'vmin');
                this.chart.append("path")
                    .datum(graph.measurementValues)
                    .attr("class", "area " + "area_min_" + i)
                    .style("fill", '#FFFFFF')
                    .attr("d", graph.chart.min);
            }

            //append line chart
            this.chart.append("path")
                .datum(graph.measurementValues)
                .attr("class", "line " + "line_" + i)
                .style("stroke", graph.chartColor)
                .attr("d", graph.chart.line);

            //append area chart
            /*this.chart.append("path")
                .datum(graph.measurementValues)
                .attr("class", "area " + "area_" + i)
                .style("fill", graph.chartColor)
                .style("opacity", 0.2)
                .attr("d", graph.chart.area);*/

            //append circles for values surrounded by null
            this.appendSingleValues(graph, this.chart, i);

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
            //set height for each context
            var height = this.display.context.height / this.graphs.length;
            //append context chart to context view
            this.context.selectAll()
                .data(graph.contextValues)
                .enter().append("rect")
                .attr("x", function(d) { return activeD3.context.xScale(d['timestamp']); }, activeD3)
                .attr("y", this.display.context.height + height * i)
                .attr("width", this.barWidth + 1)
                .attr("height", height)
                .style("stroke", "none")
                .style("fill", function(d) { return graph.contextColor(d['value']); });

        }, this);

        //init zoom and brush
        this.brush = this.getBrush();
        this.zoom = this.getZoom();
        //append brush action to context
        this.context.append("g")
            .attr("class", "brush")
            .attr("transform", "translate(0," + this.display.context.height + ")")
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
            .on("mouseout", function() {
                activeD3.hideTooltip();
            }, activeD3);

        //append zoom functionality
        d3.select("#graph_overlay").call(this.zoom);

    };

    /**
     * get line chart
     * @param xScale x axis scale function
     * @param yScale y axis scale function
     * @param value name of value property
     */
    this.getLineChart = function(xScale, yScale, value) {
        return d3.line()
            .defined(function(d) { return d[value]; })
            .curve(d3.curveStepBefore)
            .x(function(d) { return xScale(d['timestamp']); })
            .y(function(d) { return yScale(d[value]); })
    };

    /**
     * get area chart
     * @param xScale x axis scale function
     * @param yScale y axis scale function
     * @param value name of value property
     */
    this.getAreaChart = function(xScale, yScale, value) {
        return d3.area()
            .defined(function(d) { return d[value]; })
            .curve(d3.curveStepBefore)
            .x(function(d) { return xScale(d['timestamp']); })
            .y1(function(d) { return yScale(d[value]); })
            .y0(this.display.chart.height);
    };

    /**
     * append single values to chart
     * @param graph input graph
     * @param chart mxParent chart
     * @param index current graph index
     */
    this.appendSingleValues = function(graph, chart, index) {
        //do nothing, if no single values are present
        if(graph.xySingleValues.length === 0)
            return;
        //remove previous collection
        if(graph.singleValues !== undefined)
            graph.singleValues.remove();
        //create new collection for circles
        graph.singleValues = this.chart.selectAll("dot_" + index)
            .data(graph.xySingleValues)
            .enter().append("circle")
            .attr("r", 1)
            .attr("cx", function (d) { return chart.xScale(d['timestamp']); })
            .attr("cy", function (d) { return graph.chart.yScale(d['value']); })
            .style("fill", graph.chartColor)
            .attr("class", "dot " + "dot_" + index);
    };

    /**
     * initialize graph SVG containers
     */
    this.init = function() {

        //add svg element to graph container
        this.svg = d3.select("#" + div).append('svg')
            .attr("width", this.container.width())
            .attr("height", this.container.height());

        //define context element
        this.context = this.svg.append("g")
            .attr("class", "d3Timeline");

        //define chart element
        this.chart = this.svg.append("g")
            .attr("class", "d3Chart")

    };

    /**
     * show tooltip on mouseover
     * @param mousePosition mouse location
     */
    this.showTooltip = function(mousePosition) {

        //set tooltip info for each graph
        this.graphs.forEach(function(graph, i) {

            //get closest timestamp
            var mouse_x = d3.mouse(mousePosition)[0];
            var closest = this.getClosestMeasurement(graph.measurements, this.chart.xScale.invert(mouse_x));
            //get y position
            var mouse_y = d3.mouse(mousePosition)[1] + this.display.chart.top;

            //update tooltip text
            graph.tooltipText
                .style('opacity', 1)
                .attr('x', this.chart.xScale(closest['timestamp']) + 3)
                .attr('y', mouse_y - 10 - i * 15)
                .style("fill", graph.chartColor);
            this.setTooltipText(graph.tooltipText, closest);

            //reset x-position of tooltip text, if out-of-bounds
            var textNode = graph.tooltipText.node();
            var textBounds = textNode.getBBox();
            var x_max = this.display.width - textBounds.width;
            if(mouse_x > x_max)
                graph.tooltipText.attr('x', x_max);

            //update tooltip text background
            graph.tooltipTextBG
                .attr("x", textBounds.x)
                .attr("y", textBounds.y)
                .attr("width", textBounds.width)
                .attr("height", textBounds.height)
                .style("fill", "white")
                .style("opacity", ".75");
            //update tooltip line
            graph.tooltipLine
                .attr("x1", this.chart.xScale(closest['timestamp'])).attr("x2", this.chart.xScale(closest['timestamp']))
                .attr("y1", graph.chart.yScale(closest['value']) + this.display.chart.top)
                .style("opacity", 1)
                .style("stroke", graph.chartColor);

        }, this);

    };

    /**
     * set tooltip text
     * @param textBox input text box
     * @param closest closest measurement
     */
    this.setTooltipText = function(textBox, closest){
        textBox.html(null);
        textBox.append("tspan")
            .text(this.formatDate(closest['timestamp']) + ": ");
        textBox.append("tspan")
            .style('font-weight', 'bold')
            .text(closest['value']);
    };

    /**
     * hide tooltip info
     */
    this.hideTooltip = function() {
        this.graphs.forEach(function(graph) {
            graph.tooltipText.style("opacity", 0);
            graph.tooltipLine.style("opacity", 0);
            graph.tooltipTextBG.style("opacity", 0);
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
     * @param measurements input values
     * @param date input timestamp
     * @returns {*} closest date
     */
    this.getClosestMeasurement = function(measurements, date) {
        var target = this.bisectDate(measurements, date, 1),
            d0 = measurements[target - 1],
            d1 = measurements[target];
        //check for first/last value of measurements
        if(d0 === undefined)
            return d1;
        else if(d1 === undefined)
            return d0;
        //check for null
        var i ;
        if(d0['value'] === null) {
            i = 2;
            while (d0['value'] === null)
                d0 = measurements[target - i++];
        }
        if(d1['value'] === null) {
            i = 1;
            while (d1['value'] === null)
                d1 = measurements[target + i++];
        }
        //get closest measurement
        return date - d0['timestamp'] > d1['timestamp'] - date ? d1 : d0;

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
     * get values for context visualization, aggregates to intervals
     * @param measurements input measurements
     * @param valueWidth display width for each value
     * @return Array values to be used for measurement visualization
     */
    this.getMeasurementValues = function(measurements, valueWidth) {

        //aggregate to intervals, if display width is smaller than number of measurements to be displayed
        //includes factor to prevent interval creation for only slightly larger number of measurements
        if(this.display.width < measurements.length * valueWidth * 0.8) {

            //define temporal dimension of target interval
            var tStart = measurements[0]['timestamp'].getTime();
            var tEnd = measurements[measurements.length - 1]['timestamp'].getTime();
            var tInterval = ((tEnd - tStart) / this.display.width) * valueWidth;

            //loop through intervals and assign measurements within that interval
            var intervalMeasurements = [];
            var i = 0;
            var j = 0;
            for (var t = tStart + tInterval; t <= tEnd; t += tInterval) {

                //create interval measurement arrays
                tmpTimestamps = [];
                tmpValues = [];

                //from remaining measurements, assign all leq end of interval
                while(measurements[j] !== undefined && measurements[j]['timestamp'].getTime() <= t){
                    tmpTimestamps.push(measurements[j]['timestamp']);
                    tmpValues.push(measurements[j]['value']);
                    j++;
                }

                //check for values
                if (tmpTimestamps.length > 0) {

                    //get value sum
                    var vsum = 0;
                    for(var v = 0; v < tmpValues.length; v++) {
                        vsum += tmpValues[v];
                    }

                    //add new measurements with interval statistics (default: last timestamp with average value)
                    intervalMeasurements.push({
                        'timestamp': t,
                        'value': vsum / tmpValues.length,
                        'tmin': Math.min.apply(Math, tmpTimestamps),
                        'tmax': Math.max.apply(Math, tmpTimestamps),
                        'vmin': Math.min.apply(Math, tmpValues),
                        'vmax': Math.max.apply(Math, tmpValues)
                    });
                }

                //next interval
                i++;
            }

            //reset measurements
            measurements = intervalMeasurements
        }

        //get median time interval between measurements
        var samplingIntervals = [];
        for (i = 1; i < measurements.length; i++) {
            samplingIntervals.push(measurements[i]['timestamp'] - measurements[i - 1]['timestamp']);
        }

        //set maximum allowed gap for visualization (twice the median interval)
        var maxGap = samplingIntervals[Math.floor(samplingIntervals.length / 2)] * 2;

        //check for gaps
        var lastValidMeasurement = measurements[0];
        var numOfGaps = 0;
        var measurementsWithMarkedGap = [];
        for (i = 0; i < measurements.length; i++) {

            //add null value, if duration between timestamps is larger than allowed gap
            if(measurements[i]["timestamp"] - lastValidMeasurement["timestamp"] > maxGap) {
                measurementsWithMarkedGap[i + numOfGaps++] = {
                    "timestamp": new Date(measurements[i]['timestamp'] - maxGap),
                    "value": null
                };
            }

            //add current measurement
            measurementsWithMarkedGap[i + numOfGaps] = measurements[i];
            lastValidMeasurement = measurements[i];
        }

        return measurementsWithMarkedGap;
    };


    /**
     * get values for circle visualization, if line is not defined left and right of value
     * @param measurements
     */
    this.getSingleValues = function(measurements){
        var xySingleValues = [];
        var maxIndex = measurements.length - 1;
        for (var j = 0; j < measurements.length; j++) {
            //add first value, if second value is null
            if(j === 0 && measurements.length > 1 && measurements[1]['value'] === null)
                xySingleValues.push(measurements[j]);
            //add last value, if previous value is null
            else if(j === maxIndex && measurements.length > 1 && measurements[maxIndex - 1]['value'] === null)
                xySingleValues.push(measurements[j]);
            //add value, if previous and next value is null
            else if(j !== 0 && j !== maxIndex && measurements[j-1]['value'] === null && measurements[j+1]['value'] === null)
                xySingleValues.push(measurements[j]);
        }
        return xySingleValues;
    };

    /**
     * get color scale for context visualization
     * @param color corresponding chart color
     * @param min min value
     * @param max max value
     */
    this.getColorScale = function(color, min, max) {
        return d3.scaleLinear()
            .domain([min, max])
            .range(["#dcdcdc", color]);
    };

    /**
     * define D3 brush (used to select time interval in context view)
     */
    this.getBrush = function() {
        var currentD3 = this;
        return d3.brushX()
            .extent([[0, 0], [currentD3.display.width, currentD3.display.context.height]])
            .on("brush end", function () {
                if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom")
                    return; // ignore brush-by-zoom
                var s = d3.event.selection || currentD3.context.xScale.range();
                currentD3.chart.xScale.domain(s.map(currentD3.context.xScale.invert, currentD3.context.xScale));
                currentD3.updateAfterZoomBrush();
                currentD3.svg.select("#graph_overlay").call(currentD3.zoom.transform, d3.zoomIdentity
                    .scale(currentD3.display.width / (s[1] - s[0]))
                    .translate(-s[0], 0));
            }, currentD3);
    };

    /**
     * define D3 zoom (used to zoom in focus view)
     */
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
                currentD3.chart.xScale.domain(t.rescaleX(currentD3.context.xScale).domain());
                currentD3.updateAfterZoomBrush();
                currentD3.context.select(".brush").call(currentD3.brush.move, currentD3.chart.xScale.range().map(t.invertX, t));
            }, currentD3);
    };

    /**
     * update view after zoom or brush interaction
     */
    this.updateAfterZoomBrush = function() {

        //update graph display
        this.graphs.forEach(function(graph, i) {

            this.chart.select(".line_" + i).attr("d", graph.chart.line);
            if(graph.chart.min !== undefined)
                this.chart.select(".area_max_" + i).attr("d", graph.chart.max);
            if(graph.chart.min !== undefined)
                this.chart.select(".area_min_" + i).attr("d", graph.chart.min);
            this.appendSingleValues(graph, this.chart, i);

        }, this);

        //reset timeframe
        this.visibleTimeframe = {start: this.chart.xScale.domain()[0], end: this.chart.xScale.domain()[1]};

        this.chart.select(".axis--x").call(this.chart.xAxis);
    };

    /**
     * format time string for graph tooltip
     * @param date input date
     * @returns {string} formatted time string
     */
    this.formatDate = function(date){
        return date.toLocaleString(this.timeLocale, this.timeOptions);
    };

}