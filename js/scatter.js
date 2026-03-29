import { FUEL_TYPE_COLORS, FUEL_TYPE_LABELS } from "./data.js";

function expandExtent(extent, fallback) {
  if (!extent || extent[0] == null || extent[1] == null) {
    return fallback;
  }

  if (extent[0] === extent[1]) {
    const padding = extent[0] === 0 ? 1 : Math.abs(extent[0]) * 0.12;
    return [extent[0] - padding, extent[1] + padding];
  }

  return extent;
}

function matchesFocus(point, car) {
  return Boolean(car) && point.sourceId === car.id;
}

export function createScatter(store) {
  const svg = d3.select("#scatter");
  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const tooltip = d3.select(".tooltip");

  svg
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const margin = { top: 38, right: 42, bottom: 112, left: 98 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const root = svg
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  const gridLayer = root.append("g").attr("class", "grid-layer");
  const xAxis = root
    .append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0, ${plotHeight})`);
  const yAxis = root.append("g").attr("class", "y-axis");
  const pointsLayer = root.append("g").attr("class", "points-layer");
  const emptyLayer = root.append("g").attr("class", "empty-layer");
  const countLabel = root
    .append("text")
    .attr("class", "sample-count")
    .attr("x", plotWidth)
    .attr("y", -16)
    .attr("text-anchor", "end")
    .attr("fill", "#5f6f7d")
    .attr("font-size", 12)
    .attr("font-weight", 600);

  svg
    .append("text")
    .attr("class", "axis-label")
    .attr("x", width / 2)
    .attr("y", height - 24)
    .attr("text-anchor", "middle")
    .attr("fill", "#334155")
    .text("Combined fuel consumption (L/100 km)");

  svg
    .append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", 32)
    .attr("text-anchor", "middle")
    .attr("fill", "#334155")
    .text("CO2 emissions (g/km)");

  store.subscribe((state, reason) => {
    const { CLASS_GROUPS } = window._spiderClassGroups || {};
    const activeGroups = state.activeVehicleClasses || [];

    // Build the set of raw vehicleclass strings that are allowed
    let allowedClasses = null;
    if (CLASS_GROUPS && activeGroups.length > 0) {
      allowedClasses = new Set();
      activeGroups.forEach(key => {
        (CLASS_GROUPS[key]?.classes || []).forEach(c => allowedClasses.add(c.toUpperCase()));
      });
    }

    const data = allowedClasses
      ? state.currentPoints.filter(d => allowedClasses.has((d.vehicleclass || "").toUpperCase()))
      : state.currentPoints;

    const transitionDuration = reason === "hoveredCar" ? 150 : 450;
    const transition = svg.transition().duration(transitionDuration).ease(d3.easeCubicOut);

    const x = d3
      .scaleLinear()
      .domain(expandExtent(d3.extent(data, d => d.fuel), [4, 20]))
      .range([0, plotWidth])
      .nice();

    const y = d3
      .scaleLinear()
      .domain(expandExtent(d3.extent(data, d => d.co2), [90, 450]))
      .range([plotHeight, 0])
      .nice();

    const xTickCount = Math.max(4, Math.min(8, Math.floor(plotWidth / 105)));
    const yTickCount = Math.max(4, Math.min(7, Math.floor(plotHeight / 86)));
    const grid = d3.axisLeft(y).ticks(yTickCount).tickSize(-plotWidth).tickFormat("");
    gridLayer
      .transition(transition)
      .call(grid)
      .call(selection => selection.select(".domain").remove())
      .call(selection =>
        selection.selectAll("line").attr("stroke", "rgba(71, 85, 105, 0.16)")
      );

    xAxis.transition(transition).call(d3.axisBottom(x).ticks(xTickCount).tickSizeOuter(0));
    yAxis.transition(transition).call(d3.axisLeft(y).ticks(yTickCount).tickSizeOuter(0));

    countLabel.text(
      data.length === 0 ? "No sampled vehicles yet" : `${data.length} sampled vehicle${data.length === 1 ? "" : "s"}`
    );

    emptyLayer.selectAll("*").remove();
    if (data.length === 0) {
      emptyLayer
        .append("text")
        .attr("x", plotWidth / 2)
        .attr("y", plotHeight / 2 - 10)
        .attr("text-anchor", "middle")
        .attr("fill", "#64748b")
        .attr("font-size", 18)
        .attr("font-weight", 600)
        .text("Use Sample 10 Cars or Build! to populate the scatter.");

      emptyLayer
        .append("text")
        .attr("x", plotWidth / 2)
        .attr("y", plotHeight / 2 + 18)
        .attr("text-anchor", "middle")
        .attr("fill", "#94a3b8")
        .attr("font-size", 13)
        .text("Click any future point to set the active make for the crown.");
    }

    const brushedMakes = new Set(state.brushedMakes);
    const activeFuelTypes = new Set(state.activeFuelTypes);

    const circles = pointsLayer
      .selectAll("circle")
      .data(data, d => d.instanceId)
      .join(
        enter =>
          enter
            .append("circle")
            .attr("cx", d => x(d.fuel))
            .attr("cy", d => y(d.co2))
            .attr("r", 0)
            .attr("fill", d => FUEL_TYPE_COLORS[d.fueltype] ?? "#4c6073")
            .attr("stroke", "white")
            .attr("stroke-width", 1.2)
            .style("cursor", "pointer")
            .call(selection =>
              selection
                .on("mouseenter", function(event, d) {
                  tooltip
                    .style("opacity", 1)
                    .html(
                      `<strong>${d.make} ${d.model}</strong>
                      ${d.vehicleclass}<br/>
                      Fuel: ${FUEL_TYPE_LABELS[d.fueltype] ?? d.fueltype}<br/>
                      Engine: ${d3.format(".1f")(d.engine)} L<br/>
                      CO2: ${d.co2} g/km<br/>
                      Click to inspect ${d.make} in the crown`
                    );

                  d3.select(this).attr("stroke-width", 2.2);
                })
                .on("mousemove", event => {
                  tooltip
                    .style("left", `${event.pageX + 14}px`)
                    .style("top", `${event.pageY - 18}px`);
                })
                .on("mouseleave", function() {
                  tooltip.style("opacity", 0);
                  const latestState = store.getState();
                  const point = d3.select(this).datum();

                  d3.select(this).attr("stroke-width", point.make === latestState.activeMake ? 1.6 : 1.1);
                })
                .on("click", (event, d) => {
                  event.stopPropagation();
                  store.setActiveMake(d.make);
                })
            )
            .call(selection =>
              selection.transition(transition).attr("r", d => Math.max(4, d.engine * 1.7))
            ),
        update => update,
        exit => exit.transition(transition).attr("r", 0).remove()
      );

    circles
      .transition(transition)
      .attr("cx", d => x(d.fuel))
      .attr("cy", d => y(d.co2))
      .attr("r", d => Math.max(4, d.engine * 1.7))
      .attr("fill", d => {
        const color = d3.color(FUEL_TYPE_COLORS[d.fueltype] ?? "#4c6073");
        const isHovered = matchesFocus(d, state.hoveredCar);

        if (!color) {
          return "#4c6073";
        }

        return isHovered ? color.brighter(0.5).formatHex() : color.formatHex();
      })
      .attr("stroke", d => {
        if (matchesFocus(d, state.pinnedCar)) return "#9a3412";
        if (matchesFocus(d, state.hoveredCar)) return "#f97316";
        if (d.make === state.activeMake) return "#0f172a";
        return "white";
      })
      .attr("stroke-width", d => {
        if (matchesFocus(d, state.pinnedCar)) return 2.8;
        if (matchesFocus(d, state.hoveredCar)) return 2.2;
        if (d.make === state.activeMake) return 1.6;
        return 1.1;
      })
      .attr("opacity", d => {
        const highlighted = matchesFocus(d, state.pinnedCar) || matchesFocus(d, state.hoveredCar);

        if (highlighted) return 1;
        if (!activeFuelTypes.has(d.fueltype)) return 0.12;
        if (brushedMakes.size > 0 && !brushedMakes.has(d.make)) return 0.15;
        if (d.make === state.activeMake) return 0.95;
        return 0.75;
      });

    circles
      .filter(d => matchesFocus(d, state.hoveredCar) || matchesFocus(d, state.pinnedCar))
      .raise();
  });
}
