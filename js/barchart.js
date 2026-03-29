export function createBarchart(store) {
  const svg = d3.select("#barchart");
  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const tooltip = d3.select(".tooltip");

  svg
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const data = store.getState().manufacturerStats;

  const margin = { top: 36, right: 100, bottom: 244, left: 72 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const brushLaneY = innerHeight + 116;
  const brushLaneHeight = 18;

  const root = svg
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  const gridLayer = root.append("g").attr("class", "grid-layer");
  const barLayer = root.append("g").attr("class", "bar-layer");
  const lineLayer = root.append("g").attr("class", "line-layer");
  const pointLayer = root.append("g").attr("class", "point-layer");
  const brushLane = root.append("g").attr("class", "brush-lane");
  const xAxis = root
    .append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0, ${innerHeight})`);
  const yAxisLeft = root.append("g").attr("class", "y-axis-left");
  const yAxisRight = root
    .append("g")
    .attr("class", "y-axis-right")
    .attr("transform", `translate(${innerWidth}, 0)`);

  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", height - 24)
    .attr("text-anchor", "middle")
    .attr("fill", "#334155")
    .text("Vehicle make");

  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", 18)
    .attr("text-anchor", "middle")
    .attr("fill", "#334155")
    .text("Model count");

  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", width - 6)
    .attr("text-anchor", "middle")
    .attr("fill", "#c65d2e")
    .text("Average CO2 (g/km)");

  const x = d3
    .scaleBand()
    .domain(data.map(d => d.make))
    .range([0, innerWidth])
    .padding(0.18);

  const yCount = d3
    .scaleLinear()
    .domain([0, d3.max(data, d => d.count)])
    .range([innerHeight, 0])
    .nice();

  const avgExtent = d3.extent(data, d => d.avgCO2);
  const yCO2 = d3
    .scaleLinear()
    .domain([Math.max(0, avgExtent[0] - 12), avgExtent[1] + 16])
    .range([innerHeight, 0])
    .nice();

  brushLane
    .append("rect")
    .attr("x", 0)
    .attr("y", brushLaneY)
    .attr("width", innerWidth)
    .attr("height", brushLaneHeight)
    .attr("fill", "rgba(15, 118, 110, 0.08)")
    .attr("rx", 10);

  let brushingProgrammatically = false;

  function handleBrushEnd(event) {
    if (brushingProgrammatically) {
      return;
    }

    if (!event.selection) {
      store.setBrushedMakes([]);
      return;
    }

    const [x0, x1] = event.selection;
    const selectedMakes = data
      .filter(d => {
        const midpoint = (x(d.make) ?? 0) + x.bandwidth() / 2;
        return midpoint >= x0 && midpoint <= x1;
      })
      .map(d => d.make);

    store.setBrushedMakes(selectedMakes);
  }

  const brush = d3
    .brushX()
    .extent([
      [0, brushLaneY],
      [innerWidth, brushLaneY + brushLaneHeight]
    ])
    .on("end", handleBrushEnd);

  const brushSelection = brushLane.append("g").attr("class", "brush").call(brush);

  gridLayer
    .call(d3.axisLeft(yCount).ticks(6).tickSize(-innerWidth).tickFormat(""))
    .call(selection => selection.select(".domain").remove())
    .call(selection =>
      selection.selectAll("line").attr("stroke", "rgba(71, 85, 105, 0.16)")
    );

  yAxisLeft.call(d3.axisLeft(yCount).ticks(6));
  yAxisRight.call(d3.axisRight(yCO2).ticks(5));
  const labelStep = innerWidth < 520 ? 5 : innerWidth < 700 ? 4 : innerWidth < 860 ? 3 : 2;

  xAxis
    .call(d3.axisBottom(x))
    .call(selection =>
      selection
        .selectAll("text")
        .text((d, index) => (index % labelStep === 0 ? d : ""))
        .attr("transform", "rotate(-60)")
        .attr("text-anchor", "end")
        .attr("dx", "-0.45em")
        .attr("dy", "0.45em")
        .attr("font-size", labelStep > 2 ? 9.5 : 10.5)
    );

  const lineGenerator = d3
    .line()
    .x(d => (x(d.make) ?? 0) + x.bandwidth() / 2)
    .y(d => yCO2(d.avgCO2))
    .curve(d3.curveMonotoneX);

  lineLayer
    .append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "#d97745")
    .attr("stroke-width", 2.6)
    .attr("opacity", 0.9)
    .attr("d", lineGenerator);

  const bars = barLayer
    .selectAll("rect")
    .data(data)
    .join("rect")
    .attr("x", d => x(d.make))
    .attr("y", d => yCount(d.count))
    .attr("width", x.bandwidth())
    .attr("height", d => innerHeight - yCount(d.count))
    .attr("rx", 4)
    .style("cursor", "pointer")
    .on("mouseenter", (event, d) => {
      tooltip
        .style("opacity", 1)
        .html(
          `<strong>${d.make}</strong>
          ${d.count} model variants<br/>
          Avg CO2: ${d3.format(".1f")(d.avgCO2)} g/km<br/>
          Click to set the primary crown make`
        );
    })
    .on("mousemove", event => {
      tooltip
        .style("left", `${event.pageX + 14}px`)
        .style("top", `${event.pageY - 18}px`);
    })
    .on("mouseleave", () => {
      tooltip.style("opacity", 0);
    })
    .on("click", (event, d) => {
      event.stopPropagation();
      store.setPrimaryMake(d.make);
    });

  const linePoints = pointLayer
    .selectAll("circle")
    .data(data)
    .join("circle")
    .attr("cx", d => (x(d.make) ?? 0) + x.bandwidth() / 2)
    .attr("cy", d => yCO2(d.avgCO2))
    .attr("r", 4.4)
    .attr("fill", "#fff7ed")
    .attr("stroke", "#d97745")
    .attr("stroke-width", 2)
    .style("cursor", "pointer")
    .on("mouseenter", (event, d) => {
      tooltip
        .style("opacity", 1)
        .html(
          `<strong>${d.make}</strong>
          Avg CO2: ${d3.format(".1f")(d.avgCO2)} g/km<br/>
          Click to set the primary crown make`
        );
    })
    .on("mousemove", event => {
      tooltip
        .style("left", `${event.pageX + 14}px`)
        .style("top", `${event.pageY - 18}px`);
    })
    .on("mouseleave", () => {
      tooltip.style("opacity", 0);
    })
    .on("click", (event, d) => {
      event.stopPropagation();
      store.setPrimaryMake(d.make);
    });

  store.subscribe(state => {
    const brushedMakes = new Set(state.brushedMakes);
    const hasBrush = brushedMakes.size > 0;

    bars
      .attr("fill", d => {
        if (d.make === state.primaryMake) return "#11736a";
        if (d.make === state.secondaryMake) return "#c65d2e";
        return "#9cc8c2";
      })
      .attr("stroke", d => {
        if (d.make === state.primaryMake) return "#0f172a";
        if (d.make === state.secondaryMake) return "#7c2d12";
        return "none";
      })
      .attr("stroke-width", d => {
        if (d.make === state.primaryMake) return 1.4;
        if (d.make === state.secondaryMake) return 1.2;
        return 0;
      })
      .attr("opacity", d => {
        if (!hasBrush) return 0.92;
        return brushedMakes.has(d.make) ? 0.96 : 0.28;
      });

    linePoints
      .attr("r", d => {
        if (d.make === state.primaryMake) return 6;
        if (d.make === state.secondaryMake) return 5.2;
        return 4.4;
      })
      .attr("fill", d => {
        if (d.make === state.primaryMake) return "#d97745";
        if (d.make === state.secondaryMake) return "#fed7aa";
        return "#fff7ed";
      })
      .attr("stroke", d => {
        if (d.make === state.secondaryMake) return "#c65d2e";
        return "#d97745";
      })
      .attr("opacity", d => {
        if (!hasBrush) return 1;
        return brushedMakes.has(d.make) ? 1 : 0.22;
      });

    xAxis
      .selectAll("text")
      .attr("fill", d => {
        if (d === state.primaryMake) return "#0f172a";
        if (d === state.secondaryMake) return "#9a3412";
        if (hasBrush && !brushedMakes.has(d)) return "#94a3b8";
        return "#475569";
      })
      .attr("font-weight", d => {
        if (d === state.primaryMake) return 700;
        if (d === state.secondaryMake) return 700;
        return 500;
      });

    if (!hasBrush) {
      brushingProgrammatically = true;
      brushSelection.call(brush.move, null);
      brushingProgrammatically = false;
    }
  });
}
