export const MATCH_THRESHOLD = 6;

export let fullData = [];
export let currentPoints = [];
export let manufacturerStats = [];

export function sampleData(data, n) {
  return d3.shuffle([...data]).slice(0, n);
}

export function normalizeClass(vehicleclass) {
  if (!vehicleclass) return "";
  const s = vehicleclass.toUpperCase();

  if (s.includes("SUV")) return "SUV";
  if (s.includes("COMPACT")) return "COMPACT";

  return s;
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

  return {match, score: bestScore};
}