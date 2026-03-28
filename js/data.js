export const MATCH_THRESHOLD = 6;

export const FUEL_TYPE_LABELS = {
  X: "Regular gasoline",
  Z: "Premium gasoline",
  D: "Diesel",
  E: "Ethanol (E85)",
  N: "Natural gas"
};

export const FUEL_TYPE_COLORS = {
  X: "#4c6073",
  Z: "#c65d2e",
  D: "#1d79a9",
  E: "#cf8a21",
  N: "#68993b"
};

let pointInstanceCounter = 0;

export function prepareDataset(rows) {
  return rows.map((row, index) => {
    const city = +row.fuel_consumption_city_l_100_km;
    const hwy = +row.fuel_consumption_hwy_l_100_km;
    const fuel = +row.fuel_consumption_comb_l_100_km;
    const co2 = +row.co2_emissions_g_km;
    const engine = +row.engine_size_l;
    const cyl = +row.cylinders;

    return {
      ...row,
      id: `vehicle-${index}`,
      city,
      hwy,
      fuel,
      co2,
      engine,
      cyl,
      gap: city - hwy
    };
  });
}

export function createPointInstance(row) {
  pointInstanceCounter += 1;

  return {
    ...row,
    sourceId: row.id,
    instanceId: `point-${pointInstanceCounter}`
  };
}

export function sampleData(data, n) {
  return d3.shuffle([...data]).slice(0, n).map(createPointInstance);
}

export function buildManufacturerStats(data) {
  return d3.rollups(
    data,
    values => ({
      count: values.length,
      avgCO2: d3.mean(values, d => d.co2)
    }),
    d => d.make
  )
    .map(([make, stats]) => ({
      make,
      count: stats.count,
      avgCO2: stats.avgCO2
    }))
    .sort((a, b) => d3.descending(a.count, b.count) || d3.ascending(a.make, b.make));
}

export function getMostCommonMake(data) {
  const mostCommon = d3.greatest(
    d3.rollups(data, values => values.length, d => d.make),
    d => d[1]
  );

  return mostCommon ? mostCommon[0] : null;
}

export function getFuelTypes(data) {
  return Array.from(new Set(data.map(d => d.fueltype))).sort((a, b) =>
    d3.ascending(FUEL_TYPE_LABELS[a] ?? a, FUEL_TYPE_LABELS[b] ?? b)
  );
}

export function normalizeClass(vehicleclass) {
  if (!vehicleclass) return "";

  const normalized = vehicleclass.toUpperCase();

  if (normalized.includes("SUV")) return "SUV";
  if (normalized.includes("COMPACT")) return "COMPACT";

  return normalized;
}

export function carMatch(criteria, data) {
  let match = null;
  let bestScore = Infinity;

  data.forEach(d => {
    let score =
      Math.abs(d.engine - criteria.engine) * 2 +
      Math.abs(d.cyl - criteria.cyl) * 1.5 +
      Math.abs(d.fuel - criteria.fuel) * 2;

    if (criteria.vehicleclass) {
      if (normalizeClass(criteria.vehicleclass) !== normalizeClass(d.vehicleclass)) {
        score += 8;
      }
    }

    if (score < bestScore) {
      bestScore = score;
      match = d;
    }
  });

  return { match, score: bestScore };
}
