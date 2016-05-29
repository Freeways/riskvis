var margin = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0
},
width = width - margin.left - margin.right,
        height = height - margin.top - margin.bottom;
var tooltip = d3.select("#vis").append("div").attr("class", "tooltip hidden");
var cveByProduct = [];

var n = 6,
        m = 10,
        padding = 6,
        radius = d3.scale.sqrt().range([0, 12]),
        color = d3.scale.category10().domain(d3.range(m)),
        x = d3.scale.ordinal().domain(d3.range(m)).rangePoints([0, width], 1);
d3.json("http://localhost:1337/cve", function (data) {
  data.forEach(function (d) {
    console.log(d.vendor);
    if (cveByProduct[d.vendor] == null) {
      cveByProduct[d.vendor] = 1;
    } else {
      cveByProduct[d.vendor] = cveByProduct[d.vendor] + 1;
    }
  });

  var nodes = [];
  for (var cve in cveByProduct) {
    nodes.push({
      name: cve,
      radius: radius(cveByProduct[cve]),
      color: color(cveByProduct[cve]),
      weight: cveByProduct[cve],
      cx: width / 2,
      cy: height / 2,
      size: cveByProduct[cve]
    });
  }

  console.log(nodes);
  var force = d3.layout.force()
          .nodes(nodes)
          .size([width, height])
          .gravity(.3)
          .charge(0)
          .on("tick", tick)
          .start();

  var svg = d3.select("#vis").append("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
          .append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var node = svg.selectAll(".node")
          .data(nodes)
          .enter().append("g")
          .attr("class", "node")
          .call(force.drag)
          .on("mousemove", function (d) {
            var mouse = d3.mouse(svg.node()).map(function (d) {
              return parseInt(d);
            });
            tooltip.classed("hidden", false)
                    .attr("style", "left:" + (mouse[0] + 30) + "px;top:" + (mouse[1] + 6) + "px")
                    .html('<b>' + d.name + '</b>');
          })
          .on("mouseout", function () {
            tooltip.classed("hidden", true);
          });

  circle = node.append("circle")
          .attr("r", function (d) {
            return d.radius;
          })
          .style("fill", function (d) {
            return d.color;
          });

  text = node.append("text")
          .attr("dx", function (d) {
            return -1 * d.size;
          })
          .attr("dy", ".25em")
          .style("font-size", function (d) {
            return 4 * Math.sqrt(d.radius);
          })
          .text(function (d) {
            console.log(d);
            return d.size;
          });

  function tick(e) {
    circle.each(gravity(.2 * e.alpha))
            .each(collide(.5))
            .attr("cx", function (d) {
              return d.x;
            })
            .attr("cy", function (d) {
              return d.y;
            });
    text.each(gravity(.2 * e.alpha))
            .each(collide(.5))
            .attr("x", function (d) {
              return d.x;
            })
            .attr("y", function (d) {
              return d.y;
            });
  }

// Move nodes toward cluster focus.
  function gravity(alpha) {
    return function (d) {
      d.y += (d.cy - d.y) * alpha;
      d.x += (d.cx - d.x) * alpha;
    };
  }

// Resolve collisions between nodes.
  function collide(alpha) {
    var quadtree = d3.geom.quadtree(nodes);
    return function (d) {
      var r = d.radius + radius.domain()[1] + padding,
              nx1 = d.x - r,
              nx2 = d.x + r,
              ny1 = d.y - r,
              ny2 = d.y + r;
      quadtree.visit(function (quad, x1, y1, x2, y2) {
        if (quad.point && (quad.point !== d)) {
          var x = d.x - quad.point.x,
                  y = d.y - quad.point.y,
                  l = Math.sqrt(x * x + y * y),
                  r = d.radius + quad.point.radius + (d.color !== quad.point.color) * padding;
          if (l < r) {
            l = (l - r) / l * alpha;
            d.x -= x *= l;
            d.y -= y *= l;
            quad.point.x += x;
            quad.point.y += y;
          }
        }
        return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
      });
    };
  }
});