import {
  MATCH_THRESHOLD,
  buildManufacturerStats,
  carMatch,
  createPointInstance,
  prepareDataset,
  sampleData
} from "./data.js";
import { createScatter } from "./scatter.js";
import { createBarchart } from "./barchart.js";
import { createCrown } from "./crown.js";
import { bindSlider } from "./interactions.js";
import { createAppState } from "./state.js";

bindSlider("#engineInput", "#engineValue");
bindSlider("#cylinderInput", "#cylinderValue");
bindSlider("#fuelInput", "#fuelValue");

d3.csv("data.csv")
  .then(rows => {
    const fullData = prepareDataset(rows);
    const manufacturerStats = buildManufacturerStats(fullData);
    const store = createAppState(fullData, manufacturerStats);

    createScatter(store);
    createBarchart(store);
    createCrown(store);

    store.setCurrentPoints(sampleData(fullData, 10));

    d3.select("#random10samples").on("click", () => {
      store.appendCurrentPoints(sampleData(fullData, 10));
    });

    d3.select("#resetButton").on("click", () => {
      store.setCurrentPoints([]);
      store.resetInteractions();
      d3.select("#buildMessage").text("");
      d3.select("#carInfo").html("");
    });

    d3.select("#addCustomCar").on("click", () => {
      const criteria = {
        engine: +d3.select("#engineInput").property("value"),
        cyl: +d3.select("#cylinderInput").property("value"),
        fuel: +d3.select("#fuelInput").property("value"),
        vehicleclass: d3.select("#classInput").property("value")
      };

      const result = carMatch(criteria, fullData);
      const messageBox = d3.select("#buildMessage");
      const infoBox = d3.select("#carInfo");

      if (!result.match || result.score > MATCH_THRESHOLD) {
        messageBox.text("No similar car found");
        infoBox.html("");
        return;
      }

      const match = result.match;

      store.appendCurrentPoints([createPointInstance(match)]);

      messageBox.text("Car added!");
      infoBox.html(
        `<strong>${match.make} ${match.model}</strong><br/>
        Class: ${match.vehicleclass}<br/>
        Engine: ${d3.format(".1f")(match.engine)} L<br/>
        Cylinders: ${match.cyl}<br/>
        Fuel: ${d3.format(".1f")(match.fuel)} L/100 km<br/>
        CO2: ${match.co2} g/km<br/>
        <small>Bias score: ${result.score.toFixed(2)}</small>`
      );
    });
  })
  .catch(error => {
    console.error("Failed to load data.csv", error);
    d3.select("#crownSubtitle").text("Could not load data.csv");
  });
