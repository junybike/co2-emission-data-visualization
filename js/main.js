import {sampleData, carMatch, MATCH_THRESHOLD} from "./data.js";
import {createScatter} from "./scatter.js";
import {createBarchart} from "./barchart.js";
import {bindSlider} from "./interactions.js";

let fullData = [];
let currentPoints = [];

const scatter = createScatter();

bindSlider("#engineInput", "#engineValue");
bindSlider("#cylinderInput", "#cylinderValue");
bindSlider("#fuelInput", "#fuelValue");

d3.csv("data.csv").then(data => {
	data.forEach(d=>{
	d.fuel = +d.fuel_consumption_comb_l_100_km;
	d.co2 = +d.co2_emissions_g_km;
	d.engine = +d.engine_size_l;
	d.cyl = +d.cylinders;
});

fullData = data;
currentPoints = sampleData(fullData, 10);

scatter.update(currentPoints);

const manufacturerStats = d3.rollups(
	fullData,
	v => ({
		count:v.length,
		avgCO2:d3.mean(v, d => d.co2)
	}),
	d => d.make
	).map(([make, stats]) => ({
		make,
		count:stats.count,
		avgCO2:stats.avgCO2
	}));

	createBarchart(manufacturerStats, (selected) => {
		if (!selected) {
			scatter.highlightMakes([]);
			// scatter.update(currentPoints);
			return;
		}
		scatter.highlightMakes(selected);
		// const filtered = currentPoints.filter(
		// 	d => selected.includes(d.make));
		// scatter.update(filtered);
	});
});

d3.select("#random10samples").on("click", () => {
  const sample = sampleData(fullData, 10);
  currentPoints = currentPoints.concat(sample);
  scatter.update(currentPoints);
});

d3.select("#resetButton").on("click", () => {
  currentPoints=[];
  scatter.update(currentPoints);
});

d3.select("#addCustomCar").on("click", () => {
  const criteria = {
    engine: +d3.select("#engineInput").property("value"),
    cyl: +d3.select("#cylinderInput").property("value"),
    fuel: +d3.select("#fuelInput").property("value"),
    vehicleclass: d3.select("#classInput").property("value")
  };

  const res = carMatch(criteria, fullData);

  const messageBox = d3.select("#buildMessage");
  const infoBox = d3.select("#carInfo");

  if (!res.match || res.score > MATCH_THRESHOLD) {
    messageBox.text("No similar car found");
    infoBox.html("");
    return;
  }

  const match = res.match;

  currentPoints.push(match);
  scatter.update(currentPoints);

  messageBox.text("Car added!");

  infoBox.html(`
    <strong>${match.make} ${match.model}</strong><br/>
    Class: ${match.vehicleclass}<br/>
    Engine: ${match.engine} L<br/>
    Cylinders: ${match.cyl}<br/>
    Fuel: ${match.fuel} L/100km<br/>
    CO₂: ${match.co2} g/km<br/>
    <small>Bias: ${res.score.toFixed(2)}</small>
  `);
});