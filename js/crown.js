import { FUEL_TYPE_COLORS, FUEL_TYPE_LABELS } from "./data.js";

const CROWN_METRICS = {
  gap: {
    label: "City-Hwy gap",
    accessor: d => d.gap,
    format: value => `${d3.format(".1f")(value)} L/100 km`
  },
  fuel: {
    label: "Combined L/100 km",
    accessor: d => d.fuel,
    format: value => `${d3.format(".1f")(value)} L/100 km`
  },
  cyl: {
    label: "Cylinders",
    accessor: d => d.cyl,
    format: value => d3.format("d")(value)
  }
};

function polarPoint(angle, radius) {
  return {
    x: Math.sin(angle) * radius,
    y: -Math.cos(angle) * radius
  };
}

function createArcPath(radius, startAngle, endAngle, segments = 80) {
  const points = d3.range(segments).map(index => {
    const t = index / (segments - 1);
    return polarPoint(startAngle + (endAngle - startAngle) * t, radius);
  });

  return d3
    .line()
    .x(d => d.x)
    .y(d => d.y)
    .curve(d3.curveCatmullRom.alpha(0.5))(points);
}

function createBandPath(innerRadius, outerRadius, startAngle, endAngle) {
  const outerPoints = d3.range(80).map(index => {
    const t = index / 79;
    return polarPoint(startAngle + (endAngle - startAngle) * t, outerRadius);
  });

  const innerPoints = d3.range(80).map(index => {
    const t = index / 79;
    return polarPoint(endAngle - (endAngle - startAngle) * t, innerRadius);
  });

  const line = d3
    .line()
    .x(d => d.x)
    .y(d => d.y)
    .curve(d3.curveCatmullRom.alpha(0.5));

  return `${line(outerPoints)}${line(innerPoints).replace(/^M/, "L")}Z`;
}

function durationForReason(reason) {
  switch (reason) {
    case "hoveredCar":
      return 200;
    case "pinnedCar":
      return 280;
    case "fuelFilter":
      return 340;
    case "crownMetric":
      return 520;
    case "primaryMake":
    case "primaryMakeRefresh":
    case "secondaryMake":
    case "secondaryMakeRefresh":
      return 640;
    default:
      return 420;
  }
}

function formatValue(car, metricKey) {
  const metric = CROWN_METRICS[metricKey];
  return metric ? metric.format(metric.accessor(car)) : "";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function truncateLabel(value, maxChars = 40) {
  const text = String(value);
  return text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text;
}

function makeForSlot(state, slotKey) {
  return slotKey === "primary" ? state.primaryMake : state.secondaryMake;
}

function focusForSlot(state, slotKey) {
  return state.crownFocus?.[slotKey] ?? { hoveredCar: null, pinnedCar: null };
}

function renderLens(layer, config) {
  const {
    ranked,
    focusCar,
    metricKey,
    crownMetric,
    metricMax,
    hoveredCar,
    pinnedCar,
    activeFuelTypes
  } = config;

  layer.selectAll("*").remove();

  const panelWidth = 560;
  const panelHeight = 244;
  const panelTop = -164;
  const chartOffsetY = 122;
  const panel = layer.append("g").attr("class", "focus-lens").style("pointer-events", "none");

  panel
    .append("rect")
    .attr("x", -panelWidth / 2)
    .attr("y", panelTop)
    .attr("width", panelWidth)
    .attr("height", panelHeight)
    .attr("rx", 30)
    .attr("fill", "rgba(255, 255, 255, 0.9)")
    .attr("stroke", "rgba(71, 85, 105, 0.14)");

  if (!focusCar) {
    panel
      .append("text")
      .attr("x", 0)
      .attr("y", panelTop + 44)
      .attr("text-anchor", "middle")
      .attr("fill", "#0f172a")
      .attr("font-size", 18)
      .attr("font-weight", 700)
      .text("Hover zoom");

    panel
      .append("text")
      .attr("x", 0)
      .attr("y", panelTop + 84)
      .attr("text-anchor", "middle")
      .attr("fill", "#64748b")
      .attr("font-size", 14)
      .text("Hover or pin a crown point to open a magnified local neighborhood.");

    panel
      .append("text")
      .attr("x", 0)
      .attr("y", panelTop + 110)
      .attr("text-anchor", "middle")
      .attr("fill", "#94a3b8")
      .attr("font-size", 12.5)
      .text("The main crown still shows every vehicle for the active make.");

    panel
      .append("text")
      .attr("x", 0)
      .attr("y", panelTop + 146)
      .attr("text-anchor", "middle")
      .attr("fill", "#64748b")
      .attr("font-size", 12)
      .text(`Spoke metric: ${crownMetric.label}`);

    return;
  }

  const focusIndex = ranked.findIndex(item => item.id === focusCar.id);
  const neighborhoodRadius = 5;
  const start = Math.max(0, focusIndex - neighborhoodRadius);
  const end = Math.min(ranked.length, focusIndex + neighborhoodRadius + 1);
  const neighborhood = ranked.slice(start, end);

  const localBaseRadius = 74;
  const localSpokeScale = d3.scaleLinear().domain([0, metricMax]).range([18, 126]);
  const localEngineExtent = d3.extent(ranked, d => d.engine);
  const localSizeScale = d3
    .scaleSqrt()
    .domain(localEngineExtent[0] === localEngineExtent[1] ? [0, localEngineExtent[1] || 1] : localEngineExtent)
    .range([4.6, 10.6]);
  const localAngleScale = d3
    .scaleLinear()
    .domain([0, Math.max(1, neighborhood.length - 1)])
    .range([-1.16, 1.16]);

  const localItems = neighborhood.map((car, index) => {
    const angle = localAngleScale(index);
    const spokeLength = localSpokeScale(crownMetric.accessor(car));

    return {
      ...car,
      angle,
      basePoint: polarPoint(angle, localBaseRadius),
      tipPoint: polarPoint(angle, localBaseRadius + spokeLength)
    };
  });

  panel
    .append("text")
    .attr("x", 0)
    .attr("y", panelTop + 42)
    .attr("text-anchor", "middle")
    .attr("fill", "#0f172a")
    .attr("font-size", 18)
    .attr("font-weight", 700)
    .text("Hover zoom");

  panel
    .append("text")
    .attr("x", 0)
    .attr("y", panelTop + 78)
    .attr("text-anchor", "middle")
    .attr("fill", "#0f172a")
    .attr("font-size", 19)
    .attr("font-weight", 700)
    .text(truncateLabel(`${focusCar.make} ${focusCar.model}`, 34));

  panel
    .append("text")
    .attr("x", 0)
    .attr("y", panelTop + 104)
    .attr("text-anchor", "middle")
    .attr("fill", "#64748b")
    .attr("font-size", 13.5)
    .text(`Rank ${focusIndex + 1} of ${ranked.length} • ${crownMetric.label}: ${formatValue(focusCar, metricKey)}`);

  panel
    .append("text")
    .attr("x", 0)
    .attr("y", panelTop + 126)
    .attr("text-anchor", "middle")
    .attr("fill", "#94a3b8")
    .attr("font-size", 12)
    .text(`Showing nearby ranks ${start + 1} to ${end}`);

  const chart = panel
    .append("g")
    .attr("transform", `translate(0, ${chartOffsetY})`);

  chart
    .append("path")
    .attr("d", createBandPath(localBaseRadius - 18, localBaseRadius + 10, -1.16, 1.16))
    .attr("fill", "rgba(17, 115, 106, 0.08)")
    .attr("stroke", "rgba(17, 115, 106, 0.14)");

  const ringValues = [metricMax * 0.45, metricMax]
    .filter(value => value > 0)
    .map(value => +value.toFixed(2));

  chart
    .selectAll(".lens-ring")
    .data(ringValues)
    .join("path")
    .attr("class", "lens-ring")
    .attr("d", value => createArcPath(localBaseRadius + localSpokeScale(value), -1.16, 1.16))
    .attr("fill", "none")
    .attr("stroke", "rgba(148, 163, 184, 0.16)")
    .attr("stroke-dasharray", "4 7");

  const lensItems = chart
    .selectAll(".lens-item")
    .data(localItems)
    .join("g")
    .attr("class", "lens-item");

  lensItems
    .append("line")
    .attr("x1", d => d.basePoint.x)
    .attr("y1", d => d.basePoint.y)
    .attr("x2", d => d.tipPoint.x)
    .attr("y2", d => d.tipPoint.y)
    .attr("stroke", d => FUEL_TYPE_COLORS[d.fueltype] ?? "#4c6073")
    .attr("stroke-linecap", "round")
    .attr("stroke-width", d => (d.id === focusCar.id ? 3.8 : 1.9))
    .attr("stroke-opacity", d => {
      if (d.id === focusCar.id) return 1;
      if (!activeFuelTypes.has(d.fueltype)) return 0.12;
      if (pinnedCar?.id === d.id || hoveredCar?.id === d.id) return 0.88;
      return 0.28;
    });

  lensItems
    .append("circle")
    .attr("cx", d => d.tipPoint.x)
    .attr("cy", d => d.tipPoint.y)
    .attr("r", d => localSizeScale(d.engine) + (d.id === focusCar.id ? 3.2 : 0))
    .attr("fill", d => FUEL_TYPE_COLORS[d.fueltype] ?? "#4c6073")
    .attr("stroke", d => (d.id === focusCar.id ? "#0f172a" : "rgba(255,255,255,0.92)"))
    .attr("stroke-width", d => (d.id === focusCar.id ? 3 : 1.2))
    .attr("opacity", d => {
      if (d.id === focusCar.id) return 1;
      return activeFuelTypes.has(d.fueltype) ? 0.82 : 0.16;
    });

  const focusEntry = localItems.find(item => item.id === focusCar.id);
  if (focusEntry) {
    chart
      .append("circle")
      .attr("cx", focusEntry.tipPoint.x)
      .attr("cy", focusEntry.tipPoint.y)
      .attr("r", localSizeScale(focusEntry.engine) + 8.5)
      .attr("fill", "rgba(17, 115, 106, 0.08)")
      .attr("stroke", pinnedCar?.id === focusCar.id ? "rgba(17, 115, 106, 0.34)" : "rgba(249, 115, 22, 0.32)")
      .attr("stroke-width", 1.4);

    chart
      .append("circle")
      .attr("cx", focusEntry.tipPoint.x)
      .attr("cy", focusEntry.tipPoint.y)
      .attr("r", localSizeScale(focusEntry.engine) + 3.2)
      .attr("fill", "none")
      .attr("stroke", pinnedCar?.id === focusCar.id ? "#11736a" : "#f97316")
      .attr("stroke-width", 1.8);
  }
}

function createCrownPanel(store, config) {
  const {
    slotKey,
    panelSelector,
    subtitleSelector,
    svgSelector,
    pinnedSelector,
    titleSelector
  } = config;

  const panel = d3.select(panelSelector);
  const svg = d3.select(svgSelector);
  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const tooltip = d3.select(".tooltip");
  const subtitle = d3.select(subtitleSelector);
  const pinnedPanel = d3.select(pinnedSelector);
  const title = d3.select(titleSelector);

  svg
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const startAngle = -1.2;
  const endAngle = 1.2;
  const baseRadius = Math.min(width * 0.22, height * 0.34, 190);
  const maxSpokeLength = Math.min(width * 0.14, 116);
  const center = { x: width / 2, y: height - 54 };
  const lensTranslateY = -(height - 228);

  const root = svg.append("g").attr("transform", `translate(${center.x}, ${center.y})`);
  const lensLayer = root.append("g").attr("class", "lens-layer").attr("transform", `translate(0, ${lensTranslateY})`);
  const haloLayer = root.append("g").attr("class", "halo-layer");
  const referenceLayer = root.append("g").attr("class", "reference-layer");
  const spokeLayer = root.append("g").attr("class", "spoke-layer");
  const annotationLayer = root.append("g").attr("class", "annotation-layer");
  const focusLayer = root.append("g").attr("class", "focus-layer");

  store.subscribe((state, reason) => {
    const make = makeForSlot(state, slotKey);
    const slotFocus = focusForSlot(state, slotKey);
    const activeFuelTypes = new Set(state.activeFuelTypes);
    const crownMetric = CROWN_METRICS[state.crownMetric];

    title.text(slotKey === "primary" ? "Primary crown" : "Compare crown");

    if (!make) {
      panel.classed("is-hidden", slotKey === "secondary");
      subtitle.text(slotKey === "secondary"
        ? "Choose a second make from the compare dropdown to open a second crown."
        : "No make selected.");

      haloLayer.selectAll("*").remove();
      referenceLayer.selectAll("*").remove();
      spokeLayer.selectAll("*").remove();
      annotationLayer.selectAll("*").remove();
      focusLayer.selectAll("*").remove();
      lensLayer.selectAll("*").remove();

      pinnedPanel
        .classed("empty", true)
        .html(slotKey === "secondary"
          ? "Choose a second make to compare crowns side by side."
          : "Pin a point in the crown to inspect one vehicle in detail.");
      return;
    }

    panel.classed("is-hidden", false);

    const crownData = state.fullData
      .filter(d => d.make === make)
      .sort((a, b) => d3.ascending(a.co2, b.co2) || d3.ascending(a.model, b.model));

    if (slotKey === "primary" && state.secondaryMake) {
      subtitle.text(
        `${make} • ${crownData.length} vehicles. Comparing side by side with ${state.secondaryMake}.`
      );
    } else if (slotKey === "secondary" && state.primaryMake) {
      subtitle.text(
        `${make} • ${crownData.length} vehicles. Comparing side by side with ${state.primaryMake}.`
      );
    } else {
      subtitle.text(
        `${make} • ${crownData.length} vehicles ranked from lowest CO2 on the left to highest on the right.`
      );
    }

    if (crownData.length === 0) {
      haloLayer.selectAll("*").remove();
      referenceLayer.selectAll("*").remove();
      spokeLayer.selectAll("*").remove();
      annotationLayer.selectAll("*").remove();
      focusLayer.selectAll("*").remove();
      lensLayer.selectAll("*").remove();

      annotationLayer
        .append("text")
        .attr("x", 0)
        .attr("y", -120)
        .attr("text-anchor", "middle")
        .attr("fill", "#64748b")
        .attr("font-size", 16)
        .attr("font-weight", 600)
        .text("No crown data available for this make.");

      pinnedPanel
        .classed("empty", true)
        .html("Pin a point in the crown to inspect one vehicle in detail.");

      return;
    }

    const angleScale = d3
      .scaleLinear()
      .domain([0, Math.max(1, crownData.length - 1)])
      .range([startAngle, endAngle]);

    const metricMax = Math.max(d3.max(crownData, crownMetric.accessor) ?? 1, 1);
    const spokeScale = d3.scaleLinear().domain([0, metricMax]).range([12, maxSpokeLength]);
    const engineExtent = d3.extent(crownData, d => d.engine);
    const sizeScale = d3
      .scaleSqrt()
      .domain(engineExtent[0] === engineExtent[1] ? [0, engineExtent[1] || 1] : engineExtent)
      .range([3.4, 8.2]);

    const ranked = crownData.map((car, index) => {
      const angle = angleScale(index);
      const spokeLength = spokeScale(crownMetric.accessor(car));
      return {
        ...car,
        rank: index + 1,
        angle,
        basePoint: polarPoint(angle, baseRadius),
        tipPoint: polarPoint(angle, baseRadius + spokeLength)
      };
    });

    const rankLookup = new Map(ranked.map(item => [item.id, item.rank]));
    const focusCar =
      (slotFocus.hoveredCar && slotFocus.hoveredCar.make === make && slotFocus.hoveredCar) ||
      (slotFocus.pinnedCar && slotFocus.pinnedCar.make === make && slotFocus.pinnedCar) ||
      null;
    const hasPinned = Boolean(slotFocus.pinnedCar && slotFocus.pinnedCar.make === make);
    const transition = svg
      .transition()
      .duration(durationForReason(reason))
      .ease(d3.easeCubicInOut);

    renderLens(lensLayer, {
      ranked,
      focusCar,
      metricKey: state.crownMetric,
      crownMetric,
      metricMax,
      hoveredCar: slotFocus.hoveredCar,
      pinnedCar: slotFocus.pinnedCar,
      activeFuelTypes
    });

    haloLayer
      .selectAll("path")
      .data([null])
      .join("path")
      .attr("d", createBandPath(baseRadius - 24, baseRadius + 8, startAngle, endAngle))
      .attr("fill", "rgba(17, 115, 106, 0.06)")
      .attr("stroke", "rgba(17, 115, 106, 0.12)");

    const ringValues = d3.scaleLinear().domain([0, metricMax]).ticks(3).filter(value => value > 0);
    referenceLayer
      .selectAll(".reference-ring")
      .data(ringValues, d => d)
      .join(
        enter =>
          enter
            .append("path")
            .attr("class", "reference-ring")
            .attr("fill", "none")
            .attr("stroke", "rgba(148, 163, 184, 0.15)")
            .attr("stroke-dasharray", "4 6"),
        update => update,
        exit => exit.remove()
      )
      .transition(transition)
      .attr("d", value => createArcPath(baseRadius + spokeScale(value), startAngle, endAngle));

    referenceLayer
      .selectAll(".metric-caption")
      .data([`Spoke length • ${crownMetric.label}`])
      .join("text")
      .attr("class", "metric-caption")
      .attr("x", 0)
      .attr("y", -162)
      .attr("text-anchor", "middle")
      .attr("fill", "#64748b")
      .attr("font-size", 12)
      .attr("font-weight", 600)
      .text(d => d);

    referenceLayer
      .selectAll(".base-arc")
      .data([null])
      .join("path")
      .attr("class", "base-arc")
      .attr("fill", "none")
      .attr("stroke", "#0f172a")
      .attr("stroke-width", 1.25)
      .attr("opacity", 0.62)
      .attr("d", createArcPath(baseRadius, startAngle, endAngle));

    const items = spokeLayer
      .selectAll(".crown-item")
      .data(ranked, d => d.id)
      .join(
        enter => {
          const group = enter.append("g").attr("class", "crown-item").style("cursor", "pointer");

          group.append("line").attr("class", "hit-area");
          group.append("circle").attr("class", "halo");
          group.append("line").attr("class", "spoke");
          group.append("circle").attr("class", "base-node");
          group.append("circle").attr("class", "tip");

          return group;
        },
        update => update,
        exit => exit.transition(transition).style("opacity", 0).remove()
      )
      .on("mouseenter", (event, d) => {
        store.setHoveredCar(slotKey, d);

        tooltip
          .style("opacity", 1)
          .html(
            `<strong>${escapeHtml(d.make)} ${escapeHtml(d.model)}</strong>
            Class: ${escapeHtml(d.vehicleclass)}<br/>
            CO2 emissions: ${d.co2} g/km<br/>
            Engine / cylinders: ${d3.format(".1f")(d.engine)} L • ${d.cyl}<br/>
            Fuel type: ${escapeHtml(FUEL_TYPE_LABELS[d.fueltype] ?? d.fueltype)}<br/>
            ${escapeHtml(crownMetric.label)}: ${formatValue(d, state.crownMetric)}<br/>
            Click to pin this vehicle`
          );
      })
      .on("mousemove", event => {
        tooltip
          .style("left", `${event.pageX + 14}px`)
          .style("top", `${event.pageY - 18}px`);
      })
      .on("mouseleave", () => {
        tooltip.style("opacity", 0);
        store.setHoveredCar(slotKey, null);
      })
      .on("click", (event, d) => {
        event.stopPropagation();
        tooltip.style("opacity", 0);
        store.togglePinnedCar(slotKey, d);
      });

    items
      .select(".hit-area")
      .attr("x1", d => d.basePoint.x)
      .attr("y1", d => d.basePoint.y)
      .attr("x2", d => d.tipPoint.x)
      .attr("y2", d => d.tipPoint.y)
      .attr("stroke", "transparent")
      .attr("stroke-width", 14);

    items
      .select(".halo")
      .transition(transition)
      .attr("cx", d => d.tipPoint.x)
      .attr("cy", d => d.tipPoint.y)
      .attr("r", d => {
        if (slotFocus.pinnedCar?.id === d.id) return sizeScale(d.engine) + 6.8;
        if (slotFocus.hoveredCar?.id === d.id) return sizeScale(d.engine) + 4.8;
        return 0;
      })
      .attr("fill", d => (slotFocus.pinnedCar?.id === d.id ? "rgba(17, 115, 106, 0.12)" : "rgba(249, 115, 22, 0.10)"))
      .attr("stroke", d => (slotFocus.pinnedCar?.id === d.id ? "rgba(17, 115, 106, 0.36)" : "rgba(249, 115, 22, 0.28)"))
      .attr("stroke-width", d => (slotFocus.pinnedCar?.id === d.id || slotFocus.hoveredCar?.id === d.id ? 1.2 : 0));

    items
      .select(".spoke")
      .transition(transition)
      .attr("x1", d => d.basePoint.x)
      .attr("y1", d => d.basePoint.y)
      .attr("x2", d => d.tipPoint.x)
      .attr("y2", d => d.tipPoint.y)
      .attr("stroke", d => FUEL_TYPE_COLORS[d.fueltype] ?? "#4c6073")
      .attr("stroke-linecap", "round")
      .attr("stroke-width", d => {
        if (slotFocus.pinnedCar?.id === d.id) return 3.1;
        if (slotFocus.hoveredCar?.id === d.id) return 2.3;
        return 1.15;
      })
      .attr("stroke-opacity", d => {
        if (slotFocus.pinnedCar?.id === d.id || slotFocus.hoveredCar?.id === d.id) return 1;
        if (!activeFuelTypes.has(d.fueltype)) return 0.08;
        if (hasPinned) return 0.2;
        return 0.44;
      });

    items
      .select(".base-node")
      .transition(transition)
      .attr("cx", d => d.basePoint.x)
      .attr("cy", d => d.basePoint.y)
      .attr("r", 1.5)
      .attr("fill", d => FUEL_TYPE_COLORS[d.fueltype] ?? "#4c6073")
      .attr("opacity", d => (activeFuelTypes.has(d.fueltype) ? 0.45 : 0.08));

    items
      .select(".tip")
      .transition(transition)
      .attr("cx", d => d.tipPoint.x)
      .attr("cy", d => d.tipPoint.y)
      .attr("r", d => {
        if (slotFocus.pinnedCar?.id === d.id) return sizeScale(d.engine) + 1.8;
        if (slotFocus.hoveredCar?.id === d.id) return sizeScale(d.engine) + 1.1;
        return sizeScale(d.engine);
      })
      .attr("fill", d => FUEL_TYPE_COLORS[d.fueltype] ?? "#4c6073")
      .attr("opacity", d => {
        if (slotFocus.pinnedCar?.id === d.id || slotFocus.hoveredCar?.id === d.id) return 1;
        if (!activeFuelTypes.has(d.fueltype)) return 0.14;
        if (hasPinned) return 0.46;
        return 0.74;
      })
      .attr("stroke", d => {
        if (slotFocus.pinnedCar?.id === d.id) return "#0f172a";
        if (slotFocus.hoveredCar?.id === d.id) return "#f97316";
        return "rgba(255, 255, 255, 0.88)";
      })
      .attr("stroke-width", d => {
        if (slotFocus.pinnedCar?.id === d.id) return 2.8;
        if (slotFocus.hoveredCar?.id === d.id) return 2;
        return 1;
      });

    items
      .filter(d => slotFocus.hoveredCar?.id === d.id || slotFocus.pinnedCar?.id === d.id)
      .raise();

    const leftAnchor = polarPoint(startAngle, baseRadius - 12);
    const rightAnchor = polarPoint(endAngle, baseRadius - 12);
    const sideNotes = [
      {
        id: "low",
        title: "Most efficient",
        value: `${ranked[0].co2} g/km`,
        x: leftAnchor.x - 116,
        y: leftAnchor.y - 56,
        targetX: leftAnchor.x - 10,
        targetY: leftAnchor.y - 10,
        anchor: "end"
      },
      {
        id: "high",
        title: "Highest CO2",
        value: `${ranked[ranked.length - 1].co2} g/km`,
        x: rightAnchor.x + 116,
        y: rightAnchor.y - 56,
        targetX: rightAnchor.x + 10,
        targetY: rightAnchor.y - 10,
        anchor: "start"
      }
    ];

    const notes = annotationLayer
      .selectAll(".side-note")
      .data(sideNotes, d => d.id)
      .join(enter => {
        const group = enter.append("g").attr("class", "side-note");
        group.append("line");
        group.append("text").attr("class", "side-note-title");
        group.append("text").attr("class", "side-note-value");
        return group;
      });

    notes
      .select("line")
      .transition(transition)
      .attr("x1", d => d.targetX)
      .attr("y1", d => d.targetY)
      .attr("x2", d => d.x)
      .attr("y2", d => d.y)
      .attr("stroke", "#94a3b8")
      .attr("stroke-width", 1);

    notes
      .select(".side-note-title")
      .transition(transition)
      .attr("x", d => d.x)
      .attr("y", d => d.y - 4)
      .attr("text-anchor", d => d.anchor)
      .attr("fill", "#0f172a")
      .attr("font-size", 12)
      .attr("font-weight", 700)
      .text(d => d.title);

    notes
      .select(".side-note-value")
      .transition(transition)
      .attr("x", d => d.x)
      .attr("y", d => d.y + 14)
      .attr("text-anchor", d => d.anchor)
      .attr("fill", "#64748b")
      .attr("font-size", 11)
      .text(d => d.value);

    focusLayer.selectAll("*").remove();
    const pinnedEntry = hasPinned ? ranked.find(item => item.id === slotFocus.pinnedCar.id) : null;
    if (pinnedEntry) {
      const nearEdge = Math.abs(pinnedEntry.tipPoint.x) > baseRadius * 0.82;
      const anchor = nearEdge ? "middle" : pinnedEntry.tipPoint.x >= 0 ? "start" : "end";
      const labelX = nearEdge
        ? clamp(pinnedEntry.tipPoint.x, -width / 2 + 140, width / 2 - 140)
        : clamp(
            pinnedEntry.tipPoint.x + (anchor === "start" ? 48 : -48),
            -width / 2 + 120,
            width / 2 - 120
          );
      const labelY = nearEdge
        ? clamp(pinnedEntry.tipPoint.y - 72, -height + 220, -54)
        : clamp(pinnedEntry.tipPoint.y - 18, -height + 220, -28);

      focusLayer
        .append("line")
        .attr("x1", pinnedEntry.tipPoint.x)
        .attr("y1", pinnedEntry.tipPoint.y)
        .attr("x2", labelX)
        .attr("y2", labelY - 4)
        .attr("stroke", "#11736a")
        .attr("stroke-width", 1.3);

      focusLayer
        .append("text")
        .attr("x", labelX)
        .attr("y", labelY - 6)
        .attr("text-anchor", anchor)
        .attr("fill", "#11736a")
        .attr("font-size", 11)
        .attr("font-weight", 700)
        .text("Pinned");

      focusLayer
        .append("text")
        .attr("x", labelX)
        .attr("y", labelY + 12)
        .attr("text-anchor", anchor)
        .attr("fill", "#0f172a")
        .attr("font-size", 12)
        .attr("font-weight", 700)
        .text(pinnedEntry.model);

      focusLayer
        .append("text")
        .attr("x", labelX)
        .attr("y", labelY + 30)
        .attr("text-anchor", anchor)
        .attr("fill", "#64748b")
        .attr("font-size", 11)
        .text(`${formatValue(pinnedEntry, state.crownMetric)} • rank ${pinnedEntry.rank}`);
    }

    if (slotFocus.pinnedCar && slotFocus.pinnedCar.make === make) {
      pinnedPanel
        .classed("empty", false)
        .html(
          `<h3>Pinned Vehicle</h3>
          <div class="details-hero">
            <strong>${escapeHtml(slotFocus.pinnedCar.make)} ${escapeHtml(slotFocus.pinnedCar.model)}</strong>
            <span>${escapeHtml(slotFocus.pinnedCar.vehicleclass)} • rank ${rankLookup.get(slotFocus.pinnedCar.id)} of ${ranked.length}</span>
          </div>
          <div class="details-copy">
            <div><span>CO2 emissions</span><strong>${slotFocus.pinnedCar.co2} g/km</strong></div>
            <div><span>Engine</span><strong>${d3.format(".1f")(slotFocus.pinnedCar.engine)} L</strong></div>
            <div><span>Cylinders</span><strong>${slotFocus.pinnedCar.cyl}</strong></div>
            <div><span>Fuel type</span><strong>${escapeHtml(FUEL_TYPE_LABELS[slotFocus.pinnedCar.fueltype] ?? slotFocus.pinnedCar.fueltype)}</strong></div>
            <div><span>${escapeHtml(crownMetric.label)}</span><strong>${formatValue(slotFocus.pinnedCar, state.crownMetric)}</strong></div>
            <div><span>Transmission</span><strong>${escapeHtml(slotFocus.pinnedCar.transmission)}</strong></div>
          </div>
          <button type="button" class="clear-pin">Clear pin</button>`
        );

      pinnedPanel.select(".clear-pin").on("click", () => {
        store.clearPinnedCar(slotKey);
      });
    } else {
      pinnedPanel
        .classed("empty", true)
        .html("Pin a point in the crown to inspect one vehicle in detail.");
    }
  });
}

export function createCrown(store) {
  const metricControls = d3.select("#crownMetricControls");
  const legend = d3.select("#crownLegend");
  const primarySelect = d3.select("#primaryMakeSelect");
  const secondarySelect = d3.select("#secondaryMakeSelect");
  const compareLayout = d3.select("#crownCompareLayout");
  const secondaryPanel = d3.select("#crownPanelSecondary");

  const metricEntries = Object.entries(CROWN_METRICS).map(([key, config]) => ({
    key,
    ...config
  }));

  const metricButtons = metricControls
    .selectAll("button")
    .data(metricEntries)
    .join("button")
    .attr("type", "button")
    .attr("class", "metric-pill")
    .text(d => d.label)
    .on("click", (_, d) => {
      store.setCrownMetric(d.key);
    });

  const legendItems = legend
    .selectAll("button")
    .data(store.getState().allFuelTypes)
    .join("button")
    .attr("type", "button")
    .attr("class", "legend-item")
    .on("click", (_, fuelType) => {
      store.toggleFuelType(fuelType);
    });

  legendItems
    .append("span")
    .attr("class", "legend-swatch")
    .style("background", fuelType => FUEL_TYPE_COLORS[fuelType] ?? "#4c6073");

  legendItems
    .append("span")
    .attr("class", "legend-label")
    .text(fuelType => FUEL_TYPE_LABELS[fuelType] ?? fuelType);

  const makeOptions = store.getState().manufacturerStats
    .map(d => d.make)
    .slice()
    .sort(d3.ascending);

  primarySelect
    .selectAll("option")
    .data(makeOptions)
    .join("option")
    .attr("value", d => d)
    .text(d => d);

  secondarySelect
    .selectAll("option")
    .data(["", ...makeOptions])
    .join("option")
    .attr("value", d => d)
    .text(d => (d ? d : "None"));

  primarySelect.on("change", function() {
    store.setPrimaryMake(this.value);
  });

  secondarySelect.on("change", function() {
    store.setSecondaryMake(this.value || null);
  });

  createCrownPanel(store, {
    slotKey: "primary",
    panelSelector: "#crownPanelPrimary",
    titleSelector: "#crownPanelTitlePrimary",
    subtitleSelector: "#crownSubtitlePrimary",
    svgSelector: "#crownPrimary",
    pinnedSelector: "#crownPinnedPrimary"
  });

  createCrownPanel(store, {
    slotKey: "secondary",
    panelSelector: "#crownPanelSecondary",
    titleSelector: "#crownPanelTitleSecondary",
    subtitleSelector: "#crownSubtitleSecondary",
    svgSelector: "#crownSecondary",
    pinnedSelector: "#crownPinnedSecondary"
  });

  store.subscribe(state => {
    metricButtons.classed("is-active", d => d.key === state.crownMetric);
    legendItems.classed("inactive", fuelType => !state.activeFuelTypes.includes(fuelType));

    primarySelect.property("value", state.primaryMake || "");
    secondarySelect.property("value", state.secondaryMake || "");

    compareLayout.classed("has-compare", Boolean(state.secondaryMake));
    secondaryPanel.classed("is-hidden", !state.secondaryMake);
  });
}
