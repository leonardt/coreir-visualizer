var mode = "Directed"
var with_ports = true
var engine = "dot"
var free_colors = []
for (var i = 0; i < 12; i++) {
    free_colors.push(i)
}
var index_map = {}
var checked_set = new Set();
function clear_checked_set() {
    checked_set.forEach(function (d) {
        free_colors.push(index_map[d])
        index_map[d] = undefined
    })
    checked_set.clear()
}
function render() {
    var module_instance_node_map = {}
    module_instance_map_file = "module_instance_map"
    if (mode == "Combinational") {
        module_instance_map_file += "-combview"
    }
    var curr_module = undefined
    var comb_instance_map = {}
    d3.json(module_instance_map_file, function(module_instance_map) {
        var history = []
        function attributer (d) {
            if (d.attributes.class == 'node') {
                var instance_module_map = module_instance_map[curr_module]
                var this_module = instance_module_map[d.key]
                if (!this_module) {
                    return
                }
                if (mode == "Combinational") {
                    this_module = this_module.replace("_snk", "").replace("_src", "").replace("_comb", "")
                    orig_instance = d.key.replace("_comb", "").replace("_src", "").replace("_snk", "")
                    if (!(orig_instance in comb_instance_map)) {
                        comb_instance_map[orig_instance] = []
                    }
                    comb_instance_map[orig_instance].push(d3.select(this))
                }
                if (!(this_module in module_instance_node_map)) {
                    module_instance_node_map[this_module] = []
                }
                module_instance_node_map[this_module].push(d3.select(this))
                d3.select(this).on('dblclick', function(_) {
                    history.push(this_module)
                    draw_history(history)
                    dot_file = "build/" + this_module
                    if (mode == "Combinational") {
                        dot_file += "-combview"
                    } else if (mode == "Undirected") {
                        dot_file += "-undirected"
                    }
                    if (!with_ports) {
                        dot_file += "-noports"
                    }
                    d3.text(dot_file + ".dot" + '?' + Math.floor(Math.random() * 1000), function(dot) {
                        curr_module = this_module;
                        console.log(dot_file);
                        module_instance_node_map = {}
                        graph.attributer(attributer);
                        graph.renderDot(dot, function () {
                            clear_checked_set()
                            draw_checkboxes(this_module)
                        });
                    });
                })
            } else if (d.tag == 'path') {
                if (mode == "Undirected") {
                    edge = d.parent.key.split("--")
                } else {
                    edge = d.parent.key.split("->")
                }
                for (var i = 0; i < 2; i++) {
                    node = edge[i];
                    if (!(node in edge_map)) {
                        edge_map[node] = []
                    }
                    edge_map[node].push(d3.select(this))
                    instance = node.split(":")[0]
                    if (!(instance in instance_edge_map)){
                        instance_edge_map[instance] = []
                    }
                    instance_edge_map[instance].push(d3.select(this))
                }
                d3.select(this).on('mouseover', function(path) {
                    d3.select(this).attr('stroke-width', 3).attr('stroke', 'red')
                })
                d3.select(this).on('mouseout', function(path) {
                    d3.select(this).attr('stroke-width', 1).attr('stroke', 'black')
                })
            } else if (d.tag == 'text' && d.parent.attributes.class == 'node') {
                var key = d.parent.key + ":" + d.children[0].text
                d3.select(this).on('mouseover', function(port) {
                    if (key in edge_map) {
                        for (var i = 0; i < edge_map[key].length; i++ ) {
                            edge_map[key][i].attr('stroke-width', 3).attr('stroke', 'red')
                        }
                    } else if (d.parent.key in instance_edge_map) {
                        for (var i = 0; i < instance_edge_map[d.parent.key].length; i++ ) {
                            instance_edge_map[d.parent.key][i].attr('stroke-width', 3).attr('stroke', 'red')
                        }
                    }
                    if (mode == "Combinational") {
                        inst = d.parent.key.replace("_src", "").replace("_snk", "").replace("_comb", "")
                        if (inst in comb_instance_map) {
                            for (i in comb_instance_map[inst]) {
                                sel = comb_instance_map[inst][i]
                                sel.selectAll('polygon').each(function (d) {
                                    d3.select(this).attr('orig-fill', d3.select(this).attr('fill'))
                                    d3.select(this).attr('fill', '#a89984')
                                })
                            }
                        }
                    }
                })
                d3.select(this).on('mouseout', function(port) {
                    if (key in edge_map) {
                        for (var i = 0; i < edge_map[key].length; i++ ) {
                            edge_map[key][i].attr('stroke-width', 1).attr('stroke', 'black')
                        }
                    } else if (d.parent.key in instance_edge_map) {
                        for (var i = 0; i < instance_edge_map[d.parent.key].length; i++ ) {
                            instance_edge_map[d.parent.key][i].attr('stroke-width', 1).attr('stroke', 'black')
                        }
                    }
                    if (mode == "Combinational") {
                        inst = d.parent.key.replace("_src", "").replace("_snk", "").replace("_comb", "")
                        if (inst in comb_instance_map) {
                            for (i in comb_instance_map[inst]) {
                                sel = comb_instance_map[inst][i]
                                sel.selectAll('polygon').each(function (d) {

                                    orig_fill = d3.select(this).attr('orig-fill')
                                    d3.select(this).attr('fill', orig_fill)
                                })
                            }
                        }
                    }
                })
            } else if (d.tag == "svg") {
                var selection = d3.select(this);
                var width = window.innerWidth - 30;
                var height = window.innerHeight - 30;
                selection
                    .attr("width", width)
                    .attr("height", height)
                    .attr("viewBox", "0 0 " + width + " " + height);
                d.attributes.width = width;
                d.attributes.height = height;
                d.attributes.viewBox = "0 0 " + width + " " + height;
            }
        }

        function draw_history(data) {
            history_div = d3.select('#history')
            history_text = history_div.selectAll('div').data(data)
            history_text
                .enter()
                .append('div')
                .text(function(d, i) {
                    if (i > 0) {
                        return "\u2514  " + d
                    } else {
                        return d
                    }
                })
                .attr('x', function (d, i) {
                    return i
                })
                .attr('y', 20)
                .style('padding-left', function (d, i) { 
                    return (i - 1) * 21 + "px"
                })
                .on('click', function (d, i) {
                    history.splice(i+1)
                    draw_history(history)
                    module = history[history.length - 1]
                    dot_file = "build/" + module
                    if (mode == "Combinational") {
                        dot_file += "-combview"
                    } else if (mode == "Undirected") {
                        dot_file += "-undirected"
                    }
                    if (!with_ports) {
                        dot_file += "-noports"
                    }
                    d3.text(dot_file + ".dot" + '?' + Math.floor(Math.random() * 1000), function(dot) {
                        curr_module = module;
                        module_instance_node_map = {}
                        graph.attributer(attributer);
                        graph.renderDot(dot, function () {
                            clear_checked_set()
                            draw_checkboxes(module)
                        });
                    });
                })
            history_text.exit().remove()
        }

        function draw_checkboxes(top_module) {
            var module_set = new Set();
            for (var module in module_instance_map[top_module]) {
                var curr_module = module_instance_map[top_module][module]
                if (mode == "Combinational") {
                    curr_module = curr_module.replace("_snk", "").replace("_src", "").replace("_comb", "")
                }
                module_set.add(curr_module)
            }
            module_checkboxes =
                d3.select("#legend").selectAll('div').data([...module_set], function (d) { return d })

            function click_listener (d, i) {
                if (d3.select(this).property("checked")) {
                    checked_set.add(d)
                    index = free_colors.pop()
                    fill = d3.schemeSet3[index]
                    background_color = fill
                    index_map[d] = index
                } else {
                    checked_set.delete(d)
                    fill = "none"
                    background_color = "#FFFFFF"
                    free_colors.push(index_map[d])
                    index_map[d] = undefined
                }
                d3.select(this.parentNode).style('background-color', background_color)
                for (i in module_instance_node_map[d]) {
                    sel = module_instance_node_map[d][i]
                    sel.selectAll('polygon').each(function (d) {
                        d3.select(this).attr('fill', fill)
                    })
                }
            }
            module_checkboxes
                .selectAll('input')
                .each(function (d, i) {
                    if (checked_set.has(d)) {
                        index = index_map[d]
                        fill = d3.schemeSet3[index]
                        d3.select(this.parentNode).style('background-color', fill)
                        for (i in module_instance_node_map[d]) {
                            sel = module_instance_node_map[d][i]
                            sel.selectAll('polygon').each(function (d) {
                                d3.select(this).attr('fill', fill)
                            })
                        }
                        d3.select(this).property("checked", true)
                    } else {
                        d3.select(this).property("checked", false)
                        d3.select(this.parentNode).style('background-color', "#FFFFFF")
                    }
                })
                .on('click', click_listener)

            module_checkboxes
                .enter()
                .append('div')
                .append('label')
                .text(function(d) { return d })
                .append('input')
                .attr('type', 'checkbox')
                .on('click', click_listener)

            module_checkboxes.exit().each(function (d) {
                if (checked_set.has(d)) {
                    checked_set.delete(d)
                    free_colors.push(index_map[d])
                }
            }).remove()
        }

        d3.text('top_module', function(top_module) {
            if (top_module == '') {
                return
            }
            curr_module = top_module
            dot_file = "build/" + top_module
            if (mode == "Combinational") {
                dot_file += "-combview"
            } else if (mode == "Undirected") {
                dot_file += "-undirected"
            }
            if (!with_ports) {
                dot_file += "-noports"
            }
            d3.text(dot_file + ".dot" + '?' + Math.floor(Math.random() * 1000), function(dot) {
                console.log(dot_file);
                edge_map = {}
                instance_edge_map = {}
                graph_div = d3.select('#graph')
                graph_div.select('svg').remove()
                graph = graph_div
                    .graphviz()
                    // .zoom(false)
                    // .tweenPaths(false)
                    // .tweenShapes(false)
                    .growEnteringEdges(false)
                    .convertEqualSidedPolygons(false)
                    .transition(function () {
                        return d3.transition('transition')
                            .ease(d3.easePoly)
                            .delay(40)
                            .duration(500);
                    })
                    .engine(engine)
                    .attributer(attributer);
                graph.renderDot(dot, function() {
                    draw_checkboxes(top_module)
                });
                history.push(top_module)
                draw_history(history)
            })
        })

        d3.select('button#export').on('click', function() {
          var config = {
            filename: history[history.length - 1],
          }
          d3_save_svg.save(d3.select('svg').node(), config);
        });
    })
}

d3.select("#engine").on("change", function() {
    engine = d3.event.target.value
    render()
});

d3.select("#view-controls-mode").on("change", function() {
    mode = d3.event.target.value
    render()
});
d3.select("#view-mode-with-ports").on("change", function() {
    with_ports = this.checked
    render()
});
render()
