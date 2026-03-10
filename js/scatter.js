export function createScatter() {

  const svg = d3.select("#scatter");
  const width = +svg.attr("width");
  const height = +svg.attr("height");

  const margin = { top:40, right:40, bottom:60, left:70 };

  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const g = svg.append("g")
    .attr("transform",`translate(${margin.left}, ${margin.top})`);

  const tooltip = d3.select(".tooltip");

  function update(data) {

    g.selectAll("*").remove();
    svg.selectAll(".axis-label").remove();

    const x = d3.scaleLinear()
    .domain(d3.extent(data, d => d.fuel))
    .range([0, plotWidth])
    .nice();

    const y = d3.scaleLinear()
    .domain(d3.extent(data, d=>d.co2))
    .range([plotHeight, 0])
    .nice();

    g.append("g")
    .attr("transform", `translate(0, ${plotHeight})`)
    .call(d3.axisBottom(x));

    g.append("g")
    .call(d3.axisLeft(y));

    svg.append("text")
    .attr("class", "axis-label")
    .attr("x", width/2)
    .attr("y", height-10)
    .attr("text-anchor", "middle")
    .text("Fuel Consumption Combined (L/100km)");

    svg.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height/2)
    .attr("y", 15)
    .attr("text-anchor", "middle")
    .text("CO₂ Emissions (g/km)");

    g.selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", d => x(d.fuel))
    .attr("cy", d => y(d.co2))
    .attr("r", d => d.engine*2)
    .attr("fill", "steelblue")

    .on("mouseover", (event, d) => {
      tooltip
      .style("opacity", 1)
      .html(`
        <strong>${d.make} ${d.model}</strong><br/>
        ${d.vehicleclass}<br>
        Engine: ${d.engine} L<br>
        Cylinder: ${d.cyl}
      `);

      d3.select(event.currentTarget).attr("fill", "orange");
    })

    .on("mousemove", (event) => {
      tooltip
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 20) + "px");
    })

    .on("mouseout", (event) => {
      tooltip.style("opacity", 0);
      d3.select(event.currentTarget).attr("fill", "steelblue");
    });
  }

  function highlightMakes(selected) {
    g.selectAll("circle")
      .attr("opacity", d => {
        if (selected.length === 0) return 1;
        return selected.includes(d.make) ? 1 : 0.2;
      });
  }

  return {update, highlightMakes};

}
