/***
 * Get week number of a given Date
 */
Date.prototype.getWeek = function() {
    var d = new Date(+this);
    d.setHours(0,0,0);
    d.setDate(d.getDate()+4-(d.getDay()||7));
    return Math.ceil((((d-new Date(d.getFullYear(),0,1))/8.64e7)+1)/7);
};

/**
 * Get the {Date} corresponding to the first day of the week number given in argument
 * @returns {Date}
 * @param w
 */
function getDayOfWeek(w) {
    var simple = new Date(new Date().getFullYear(), 0, 1 + (w - 1) * 7);
    var dow = simple.getDay();
    var ISOweekStart = simple;
    if (dow <= 4)
        ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else
        ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    return ISOweekStart;
}

var cur_week = new Date().getWeek();

var data = [
    {"task": "aaaaaaaaaaaaaaaaaaAAAAAAAAAAAAaaaaaaaaAAAAAAAAAAAAAAAAAAAAAAAAAAAAAaaa", "from": "w25", "to": "w26", "done": false},
    {"task": "B", "from": "w19", "to": "w21", "done": true, "child": "E"},
    {"task": "C", "from": "w23", "to": "w24", "done": false, "child": "aaaaaaaaaaaaaaaaaaAAAAAAAAAAAAaaaaaaaaAAAAAAAAAAAAAAAAAAAAAAAAAAAAAaaa", "load": "12"},
    {"task": "Dqflsdkjpoaijerfoiajzfjqkjdklqjxcgbajdiogfjaopzjigildjsgqqqqqqq", "from": "w22", "to": "w22", "done": false, "child": "aaaaaaaaaaaaaaaaaaAAAAAAAAAAAAaaaaaaaaAAAAAAAAAAAAAAAAAAAAAAAAAAAAAaaa"},
    {"task": "E", "from": "w22", "to": "w24", "done": false},
    {"task": "F", "from": "w20", "to": "w21", "done": true, "child": "G"},
    {"task": "G", "from": "w25", "to": "w25", "done": false, "load": "3"},
    {"task": "H", "from": "w20", "to": "w21", "done": false, "child": "C"},
    {"task": "I", "from": "w19", "to": "w19", "done": false, "child": "H"},
    {"task": "J", "from": "w27", "to": "w27", "done": false}
];

/**
 * Build column headers depending on the minimum from and maximum to fields of all tasks
 */
var columns = ["Task"];
var min = 55;
var max = 0;
var sep_idx = 0;
for (var i = 0; i < data.length; i++) {
    if (parseInt(data[i].from.substr(1)) < min)
        min = parseInt(data[i].from.substr(1));
    if (parseInt(data[i].to.substr(1)) > max)
        max = parseInt(data[i].to.substr(1));
}
if (max < cur_week) {
    for (var i = min; i <= max; i++)
        columns.push("w"+i);
    columns.push("...");
    sep_idx = columns.length - 1;
    for (var i = cur_week; i <= cur_week; i++)
        columns.push("w"+i);
} else if (max >= cur_week) {
    for (var i = min; i <= max; i++)
        columns.push("w"+i);
}
var start = columns[0].substr(1);

//Get the tasks with no child
var with_no_child = 0;
for (var i = 0; i < data.length; i++) {
    if (!data[i].hasOwnProperty("child"))
        with_no_child++;
}

/***
 * Rebuild data to get chained tasks that belong to the same sub-graph
 */
function find_node(task) {
    for (var i = 0; i < data.length; i++) {
        if (data[i].task == task)
            return data[i];
    }
    return null;
}

function get_parent(node) {
    for (var i = 0; i < data.length; i++) {
        if (data[i].child == node.task) {
            //console.debug("Found parent's of "+node.task+": "+data[i].task);
            return data[i];
        }
    }
    return null;
}

function pick_not_seen() {
    for (var i = 0; i < data.length; i++) {
        if (nodes.indexOf(data[i].task) == -1)
            return data[i];
    }
    return null;
}

var nodes = [];
function graph(node) {
    if (!node.hasOwnProperty("child")) {
        //console.debug("Node "+node.task+" has no child");
        nodes.push(node.task);
        //console.debug(nodes);
        var parent = get_parent(node);
        if (parent != null) {
            //console.debug("Explore node " + node.task + " parent's " + parent.task);
            graph(parent);
        }
    } else {
        //console.debug("Node "+node.task+" has child");
        var child_idx = nodes.indexOf(node.child);
        if (child_idx > -1) {
            //console.debug("Insert node "+node.task+" before its child "+node.child);
            nodes.splice(child_idx, 0, node.task);
            //console.debug(nodes);
        } else {
            //console.debug("Explore node "+node.task+" child's "+node.child);
            graph(find_node(node.child));
        }
        var parent = get_parent(node);
        if (parent != null) {
            //console.debug("Explore node "+node.task+" parent's "+parent.task+" after its insertion");
            graph(parent);
        }
        else {
            //console.debug("Node "+node.task+" has no parent picking a not yet explored node");
            var not_seen = pick_not_seen();
            if (not_seen != null)
                graph(not_seen);
        }
    }
}

//Rebuild data to get chained tasks that belong to the same sub-graph in order to got no messed-up links between tasks
graph(data[0]);
var ordered_data = [];
for (i = 0; i < nodes.length; i++) {
    ordered_data.push(find_node(nodes[i]));
}
//console.debug(ordered_data);
data = ordered_data;

/***
 * Fill the background of a cell: if behind schedule fill is red otherwise it's blue.
 * @param d
 * @param i
 * @param j
 * @returns {*}
 */
function fill_cell(d, i, j) {
    var line_data = data[j];
    var idx_start = columns.indexOf(line_data.from);
    var idx_stop = columns.indexOf(line_data.to);
    //console.debug("data: "+line_data.from+"/"+line_data.to+" - start: "+idx_start+" stop: "+idx_stop);
    var classes = "cell";
    if (i >= idx_start && i <= idx_stop) {
        if (!line_data.done && line_data.to.substr(1) >= cur_week) {
            classes += " on-schedule";
        } else if (!line_data.done && line_data.to.substr(1) < cur_week) {
            classes += " behind-schedule";
            return classes;
        }
        if (i == columns.indexOf("w" + cur_week)) {
            classes += " now";
        }
        if (line_data.done)
            classes = "done";
        return classes;
    }
    return null;
}

/**
 * Main function that draw the Gantt chart with data contained in the data array
 */
function gantt() {
    //svg contains the table. We need svg in order to draw SVG elements on top of the table like arrows etc.
    var svg = d3.select("body")
        .append("svg")
        .attr({
                  'width': 1000,
                  'height': 400
              });

    //create arrow marker tip
    var marker = svg.append("defs").append("marker")
        .attr({
                  "id": "arrow",
                  "viewBox": "0 0 12 12",
                  "refX": 3,
                  "refY": 6.5,
                  "markerWidth": 13,
                  "markerHeight": 13,
                  "orient": "auto"
              })
        .append("path")
        .attr("d", "M2,2 L2,11 L10,6 L2,2")
        .attr("class", "marker");
    //console.debug(marker);

    //create container for <table>
    var fo = svg.append("foreignObject")
        .attr({
                  'x': 0,
                  'y': 0,
                  'width': 1000,
                  'height': 300,
                  'class': 'gantt-table'
              });

    //create the table skeleton
    var table = fo.append('xhtml:table');
    var thead = table.append("thead"),
        tbody = table.append("tbody");
    thead.selectAll("th").data(columns).enter().append("th").text(function(d) {
        var d_of_w = getDayOfWeek(d.substr(1));
        if (!isNaN(d_of_w)) {
            return getDayOfWeek(d.substr(1)).getDate()+"/"+parseInt(getDayOfWeek(d.substr(1)).getMonth()+1);
        } else
            return d;
    });
    tbody.selectAll("tr").data(data).enter().append("tr");

    //fill the cell according to whether we are behind the schedule or not
    d3.selectAll("tbody tr").selectAll("td")
        .data(columns).enter()
        .append("td")
        .text(function (d, i, j) {
                  if (i && columns.indexOf(data[j].from) == i)
                      return data[j].load;
              })
        .attr("class", fill_cell);
    //set the text of the first cell (i.e. task name) into a <span>
    d3.selectAll("tbody tr").selectAll("td:first-child")
        .append("span")
        .text(function(d, i, j) { return data[j].task; });

    // FIXME: Use d3 instead but don't know how to do it...
    $("table tr td:first-child span").each(function() {
        var ori = $(this).html();
        var html_split = "";
        for (var i = 0; i < $(this).html().length; i++) {
           html_split += "<span>"+ori.charAt(i)+"</span>";
        }
        $(this).html(html_split);
        var chars = [];
        $(this).find("span").each(function() { chars.push({'char': $(this).html(), 'len': $(this).width()}); });
        // FIXME: get the configured width at css level instead
        var max_len = 300;
        var new_len = 0;
        var last_idx = 0;
        for (var i = 0; i < chars.length; i++) {
            if (new_len + parseInt(chars[i].len) < max_len - parseInt($(this).css('font-size'))) {
                new_len += parseInt(chars[i].len);
                last_idx = i;
            } else {
                break;
            }
        }
        if (last_idx == 0) { last_idx = 1; }
        //console.debug("New len of "+ori+": "+new_len);
        //console.debug("Last idx of "+ori+": "+last_idx);
        if (last_idx < chars.length) {
            var truncated = "";
            for (var i = 0; i <= last_idx; i++) {
                truncated += chars[i].char;
            }
            truncated += "<span class='truncate'>#</span>";
            //console.debug("Truncated: "+truncated);
            $(this).html(truncated);
        }
    });

    //compute a sizes array to get every single element size. Needed to draw svg elements
    //like links between tasks and arrow tips at the right place
    var sizes = [];
    d3.selectAll("thead th")
        .each(function(d, i, j) {
                  if (sizes.length <= j)
                      sizes.push([]);
                  sizes[j].push({"w": parseInt(d3.select(this).style("width")) + 2, "h": parseInt(d3.select(this).style("height")) + 2})
              });
    d3.selectAll("tbody tr").selectAll("td")
        .each(function(d, i, j) {
                  if (sizes.length <= j+1)
                      sizes.push([]);
                  sizes[j+1].push({"w": parseInt(d3.select(this).style("width")), "h": parseInt(d3.select(this).style("height"))});
              });
    //console.log(sizes);

    //Draw links and arrow tips for parent-child relations
    //TODO: Parametrize the modifications done to x1, y1, x2 and y2 according to the table border/margin setup
    d3.selectAll("tbody tr").selectAll("td")
        .each(function(d, i, j) {
                  var line_data = data[j];
                  var idx_stop = columns.indexOf(line_data.to);
                  if (line_data.hasOwnProperty("child") && i == idx_stop) {
                      //Coordinates of the beginning of the arrow is the end of the task schedule
                      var x1=0, y1=0;
                      for (var k = 0; k < i + 1; k++) {
                          x1 += sizes[j][k].w + 2;
                      }
                      x1 += 1.5;
                      for (var k = 0; k <= j + 1; k++) {
                          y1 += sizes[k][idx_stop].h + 2;
                      }
                      y1 -= sizes[j][idx_stop].h / 2 - 1;
                      //console.debug(line_data.task + " has child: " + line_data.child + " - start position: x=" + x1 + ",y=" + y1);

                      //Coordinates of the end of the arrow is the beginning of the task's child schedule
                      var child_idx = 0;
                      for (var k = 0; k < data.length; k++) {
                          if (data[k].task == line_data.child) {
                              child_idx = k;
                              break;
                          }
                      }

                      //Drawing a link is applicable only if the end of the parent task
                      //is before the start of the child task
                      if (parseInt(data[child_idx].from.substr(1)) <= parseInt(line_data.to.substr(1)))
                          return null;

                      var child_idx_start = columns.indexOf(data[child_idx].from);
                      var x2=0, y2=0;
                      for (var k = 0; k < child_idx_start; k++) {
                          x2 += sizes[child_idx][k].w + 2;
                      }
                      x2 -= 5;
                      for (var k = 0; k <= child_idx + 1; k++) {
                          y2 += sizes[k][child_idx_start].h + 2;
                      }
                      y2 -= sizes[child_idx][child_idx_start].h / 2 - 1;
                      var points;
                      if (x2 > x1 + 6) {
                          points = x1+","+y1+", "+parseInt(x1+((x2-x1)/2))+","+y1+", "+parseInt(x1+((x2-x1)/2))+","+y2+", "+x2+","+y2;
                      } else {
                          if (y2 < y1)
                              points = parseInt(x1-sizes[j][i].w/2)+","+parseInt(y1-sizes[j][i].h/2-2)+", "+parseInt(x1-sizes[j][i].w/2)+","+y2+", "+x2+","+y2;
                          else
                              points = parseInt(x1-sizes[j][i].w/2)+","+parseInt(y1+sizes[j][i].h/2)+", "+parseInt(x1-sizes[j][i].w/2)+","+y2+", "+x2+","+y2;
                      }
                      //console.debug(points);
                      svg.append("polyline")
                          .attr("class", "link")
                          .attr("points", points)
                          .attr("marker-end", "url(#arrow)");
                  }
              });
}

$(document).ready(function() {
    gantt();
});
