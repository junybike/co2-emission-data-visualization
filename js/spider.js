import { FUEL_TYPE_LABELS } from "./data.js";

// Class grouping
export const CLASS_GROUPS = {
  compact:       { label: "Compact",       classes: ["COMPACT", "MINICOMPACT", "SUBCOMPACT"] },
  midsize:       { label: "Mid-size",      classes: ["MID-SIZE"] },
  fullsize:      { label: "Full-size",     classes: ["FULL-SIZE"] },
  suv:           { label: "SUV",           classes: ["SUV - SMALL", "SUV - STANDARD"] },
  twoseater:     { label: "Two-seater",    classes: ["TWO-SEATER"] },
  stationwagon:  { label: "Station Wagon", classes: ["STATION WAGON - MID-SIZE", "STATION WAGON - SMALL"] },
  van:           { label: "Van",           classes: ["VAN - CARGO", "VAN - PASSENGER", "MINIVAN"] },
  pickup:        { label: "Pickup Truck",  classes: ["PICKUP TRUCK - SMALL", "PICKUP TRUCK - STANDARD", "SPECIAL PURPOSE VEHICLE"] }
};

// Palette for overlaid groups
const GROUP_COLORS = [
  "#11736a", "#c65d2e", "#1d79a9", "#cf8a21", "#9b4dca", "#68993b", "#e63962", "#4c6073"
];

// Fuel-type ordinal rank (low -> high emission risk)
const FUEL_RANK = { E: 1, N: 2, X: 3, Z: 4, D: 5 };

function getGears(transmission) {
  if (!transmission) return 0;
  const last = transmission.slice(-1);
  if (last === "V") return 1;  // CVT treated as 1 effective gear
  const n = parseInt(last, 10);
  return isNaN(n) ? 0 : (transmission.endsWith("10") ? 10 : n);
}

export function buildClassStats(fullData) {
  const stats = {};
  Object.entries(CLASS_GROUPS).forEach(([key, group]) => {
    const rows = fullData.filter(d =>
      group.classes.some(c => (d.vehicleclass || "").toUpperCase() === c.toUpperCase())
    );
    if (rows.length === 0) { stats[key] = null; return; }

    const avgFuelRank = d3.mean(rows, d => FUEL_RANK[d.fueltype] ?? 3);

    stats[key] = {
      engine:    d3.mean(rows, d => d.engine),
      cylinders: d3.mean(rows, d => d.cyl),
      fuel:      d3.mean(rows, d => d.fuel),
      fuelrank:  avgFuelRank,
      gears:     d3.mean(rows, d => getGears(d.transmission)),
      co2:       d3.mean(rows, d => d.co2),
      count:     rows.length
    };
  });
  return stats;
}

// Spider axes
const AXES = [
  { key: "engine",    label: "Engine Size",      unit: "L",       domain: [1, 8] },
  { key: "cylinders", label: "Cylinders",        unit: "",        domain: [2, 16] },
  { key: "fuel",      label: "Fuel Consumption", unit: "L/100km", domain: [4, 20] },
  { key: "co2",       label: "CO₂ Emissions",    unit: "g/km",    domain: [100, 400] },
  { key: "fuelrank",  label: "Fuel Type",        unit: "",        domain: [1, 5],
    tickFormat: v => ({ 1:"E",2:"N",3:"X",4:"Z",5:"D" }[Math.round(v)] ?? "") },
  { key: "gears",     label: "Gears",            unit: "",        domain: [1, 10] }
];

const N = AXES.length;
const angleSlice = (Math.PI * 2) / N;

function radialPoint(angle, r) {
  return [r * Math.sin(angle), -r * Math.cos(angle)];
}

function polygonPath(values, scale) {
  const pts = values.map((v, i) => {
    const r = scale(v);
    return radialPoint(i * angleSlice, r);
  });
  return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ") + "Z";
}

// Car SVG icons
function carIcon(groupKey) {
  const icons = {
    compact:      `<rect x="4" y="14" width="40" height="12" rx="3" fill="currentColor"/>
                   <path d="M10 14 L14 6 L34 6 L38 14Z" fill="currentColor"/>
                   <circle cx="13" cy="26" r="4" fill="white"/>
                   <circle cx="35" cy="26" r="4" fill="white"/>`,
    midsize:      `<rect x="3" y="13" width="42" height="13" rx="3" fill="currentColor"/>
                   <path d="M8 13 L13 5 L35 5 L40 13Z" fill="currentColor"/>
                   <circle cx="13" cy="26" r="4" fill="white"/>
                   <circle cx="35" cy="26" r="4" fill="white"/>`,
    fullsize:     `<rect x="2" y="13" width="44" height="13" rx="3" fill="currentColor"/>
                   <path d="M6 13 L11 5 L37 5 L42 13Z" fill="currentColor"/>
                   <circle cx="12" cy="26" r="4" fill="white"/>
                   <circle cx="36" cy="26" r="4" fill="white"/>`,
    suv:          `<rect x="3" y="10" width="42" height="16" rx="3" fill="currentColor"/>
                   <path d="M6 10 L10 3 L38 3 L42 10Z" fill="currentColor"/>
                   <circle cx="13" cy="26" r="4" fill="white"/>
                   <circle cx="35" cy="26" r="4" fill="white"/>`,
    twoseater:    `<rect x="6" y="16" width="36" height="10" rx="3" fill="currentColor"/>
                   <path d="M14 16 L18 9 L30 9 L34 16Z" fill="currentColor"/>
                   <circle cx="14" cy="26" r="4" fill="white"/>
                   <circle cx="34" cy="26" r="4" fill="white"/>`,
    stationwagon: `<rect x="2" y="12" width="44" height="14" rx="3" fill="currentColor"/>
                   <path d="M5 12 L8 5 L40 5 L43 12Z" fill="currentColor"/>
                   <circle cx="12" cy="26" r="4" fill="white"/>
                   <circle cx="36" cy="26" r="4" fill="white"/>`,
    van:          `<rect x="2" y="8" width="44" height="18" rx="4" fill="currentColor"/>
                   <rect x="28" y="4" width="16" height="4" rx="2" fill="currentColor"/>
                   <rect x="6" y="11" width="8" height="6" rx="1" fill="white" opacity=".6"/>
                   <rect x="18" y="11" width="8" height="6" rx="1" fill="white" opacity=".6"/>
                   <circle cx="13" cy="26" r="4" fill="white"/>
                   <circle cx="35" cy="26" r="4" fill="white"/>`,
    pickup:       `<rect x="2" y="14" width="44" height="12" rx="3" fill="currentColor"/>
                   <path d="M22 14 L26 7 L44 7 L44 14Z" fill="currentColor"/>
                   <circle cx="12" cy="26" r="4" fill="white"/>
                   <circle cx="36" cy="26" r="4" fill="white"/>`
  };
  return icons[groupKey] ?? icons.compact;
}

// Builds the spider chart 
export function createSpider(store, classStats) {
  const container = d3.select("#spiderContainer");
  container.selectAll("*").remove();

  const W = container.node().clientWidth || 340;
  const radius = Math.min(W, 280) / 2 - 32;
  const cx = W / 2;
  const cy = radius + 44;
  const svgH = cy + radius + 85;

  const svg = container.append("svg")
    .attr("width", "100%")
    .attr("height", svgH)
    .attr("viewBox", `0 0 ${W} ${svgH}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const g = svg.append("g").attr("transform", `translate(${cx},${cy})`);

  const levels = 5;
  const rScale = d3.scaleLinear().domain([0, 1]).range([0, radius]);

  for (let l = 1; l <= levels; l++) {
    const r = (radius / levels) * l;
    const pts = AXES.map((_, i) => radialPoint(i * angleSlice, r));
    g.append("polygon")
      .attr("points", pts.map(p => p.join(",")).join(" "))
      .attr("fill", "none")
      .attr("stroke", "rgba(29,42,53,0.1)")
      .attr("stroke-width", 1);
  }

  AXES.forEach((axis, i) => {
    const angle = i * angleSlice;
    const [x2, y2] = radialPoint(angle, radius);
    g.append("line")
      .attr("x1", 0).attr("y1", 0)
      .attr("x2", x2).attr("y2", y2)
      .attr("stroke", "rgba(29,42,53,0.15)")
      .attr("stroke-width", 1.2);

    const labelR = radius + 22;
    const [lx, ly] = radialPoint(angle, labelR);
    const anchor = Math.abs(lx) < 8 ? "middle" : lx > 0 ? "start" : "end";

    const lbl = g.append("text")
      .attr("x", lx).attr("y", ly)
      .attr("text-anchor", anchor)
      .attr("dominant-baseline", "middle")
      .attr("font-size", 10)
      .attr("font-weight", 700)
      .attr("fill", "#334155");

    lbl.append("tspan").text(axis.label);
    if (axis.unit) {
      lbl.append("tspan")
        .attr("x", lx)
        .attr("dy", "1.15em")
        .attr("font-weight", 400)
        .attr("font-size", 9)
        .attr("fill", "#64748b")
        .text(`(${axis.unit})`);
    }

    if (axis.tickFormat) {
      for (let l = 1; l <= levels; l++) {
        const r = (radius / levels) * l;
        const [tx, ty] = radialPoint(angle, r + 4);
        g.append("text")
          .attr("x", tx).attr("y", ty)
          .attr("text-anchor", "middle")
          .attr("font-size", 8)
          .attr("fill", "#94a3b8")
          .text(axis.tickFormat(l));
      }
    }
  });

  const state = store.getState();
  const activeGroups = state.activeVehicleClasses || [];

  activeGroups.forEach((key, colorIdx) => {
    const stats = classStats[key];
    if (!stats) return;

    const color = GROUP_COLORS[colorIdx % GROUP_COLORS.length];

    const values = AXES.map(axis => {
      const [lo, hi] = axis.domain;
      const v = Math.min(Math.max(stats[axis.key], lo), hi);
      return (v - lo) / (hi - lo);
    });

    const path = polygonPath(values, rScale);

    g.append("path")
      .attr("d", path)
      .attr("fill", color)
      .attr("fill-opacity", 0.14)
      .attr("stroke", color)
      .attr("stroke-width", 2.2)
      .attr("stroke-linejoin", "round");

    values.forEach((v, i) => {
      const r = rScale(v);
      const [px, py] = radialPoint(i * angleSlice, r);
      const axis = AXES[i];
      const rawVal = axis.domain[0] + v * (axis.domain[1] - axis.domain[0]);
      const tooltip = d3.select(".tooltip");

      g.append("circle")
        .attr("cx", px).attr("cy", py)
        .attr("r", 4.5)
        .attr("fill", color)
        .attr("stroke", "white")
        .attr("stroke-width", 1.5)
        .style("cursor", "default")
        .on("mouseenter", function(event) {
          let formatted;
          if (axis.tickFormat) {
            formatted = `${axis.tickFormat(rawVal)} (${FUEL_TYPE_LABELS[axis.tickFormat(rawVal)] ?? ""})`;
          } else {
            formatted = `${d3.format(".2f")(rawVal)}${axis.unit ? " " + axis.unit : ""}`;
          }
          tooltip.style("opacity", 1)
            .html(`<strong>${CLASS_GROUPS[key].label}</strong><br/>${axis.label}: ${formatted}`);
        })
        .on("mousemove", event => {
          tooltip.style("left", `${event.pageX + 14}px`).style("top", `${event.pageY - 18}px`);
        })
        .on("mouseleave", () => tooltip.style("opacity", 0));
    });
  });

  if (activeGroups.length > 1) {
    const legendG = svg.append("g").attr("transform", `translate(${cx - (activeGroups.length * 60) / 2}, ${svgH - 18})`);
    activeGroups.forEach((key, i) => {
      const x = i * 72;
      legendG.append("circle").attr("cx", x + 6).attr("cy", 0).attr("r", 5).attr("fill", GROUP_COLORS[i % GROUP_COLORS.length]);
      legendG.append("text").attr("x", x + 14).attr("y", 4).attr("font-size", 10).attr("fill", "#334155").attr("font-weight", 600)
        .text(CLASS_GROUPS[key].label);
    });
  }

  if (activeGroups.length === 0) {
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("y", 12)
      .attr("font-size", 12)
      .attr("fill", "#94a3b8")
      .text("Select a vehicle class above");
  }
}