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
import { CLASS_GROUPS, buildClassStats, createSpider } from "./spider.js";

bindSlider("#engineInput", "#engineValue");
bindSlider("#cylinderInput", "#cylinderValue");
bindSlider("#fuelInput", "#fuelValue");

d3.csv("data.csv")
  .then(rows => {
    const fullData = prepareDataset(rows);
    const manufacturerStats = buildManufacturerStats(fullData);
    const store = createAppState(fullData, manufacturerStats);

    const classStats = buildClassStats(fullData);
    window._spiderClassGroups = { CLASS_GROUPS };

    createScatter(store);
    createBarchart(store);
    createCrown(store);

    buildClassButtons(store, classStats);

    store.setCurrentPoints(sampleData(fullData, 10));

    d3.select("#random10samples").on("click", () => {
      store.appendCurrentPoints(sampleData(fullData, 10));
    });

    d3.select("#showAllCars").on("click", () => {
      store.setCurrentPoints(fullData.map(createPointInstance));
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
    function buildClassButtons(store, classStats) {
      const btnContainer = d3.select("#classButtons");
      Object.entries(CLASS_GROUPS).forEach(([key, group]) => {
        const btn = btnContainer.append("button")
          .attr("class", "class-btn")
          .attr("data-key", key)
          .attr("title", group.label)
          .on("click", () => {
            store.toggleVehicleClass(key);
          });

        btn.append("svg")
          .attr("viewBox", "0 0 48 32")
          .attr("width", 40)
          .attr("height", 27)
          .attr("aria-hidden", "true")
          .html(carIconHtml(key));

        btn.append("span").text(group.label);
      });

      store.subscribe(state => {
        const active = new Set(state.activeVehicleClasses);
        const colors = [
          "#11736a","#c65d2e","#1d79a9","#cf8a21","#9b4dca","#68993b","#e63962","#4c6073"
        ];
        const activeArr = state.activeVehicleClasses;

        btnContainer.selectAll(".class-btn")
          .each(function() {
            const key = this.dataset.key;
            const idx = activeArr.indexOf(key);
            const isActive = idx !== -1;
            const color = isActive ? colors[idx % colors.length] : null;
            d3.select(this)
              .classed("is-active", isActive)
              .style("--class-color", color);
          });

        createSpider(store, classStats);
      });
    }

    function carIconHtml(key) {
      const icons = {
        compact:      `<rect x="4" y="14" width="40" height="12" rx="3"/><path d="M10 14 L14 6 L34 6 L38 14Z"/><circle cx="13" cy="26" r="4" fill="white"/><circle cx="35" cy="26" r="4" fill="white"/>`,
        midsize:      `<rect x="3" y="13" width="42" height="13" rx="3"/><path d="M8 13 L13 5 L35 5 L40 13Z"/><circle cx="13" cy="26" r="4" fill="white"/><circle cx="35" cy="26" r="4" fill="white"/>`,
        fullsize:     `<rect x="2" y="13" width="44" height="13" rx="3"/><path d="M6 13 L11 5 L37 5 L42 13Z"/><circle cx="12" cy="26" r="4" fill="white"/><circle cx="36" cy="26" r="4" fill="white"/>`,
        suv:          `<rect x="3" y="10" width="42" height="16" rx="3"/><path d="M6 10 L10 3 L38 3 L42 10Z"/><circle cx="13" cy="26" r="4" fill="white"/><circle cx="35" cy="26" r="4" fill="white"/>`,
        twoseater:    `<rect x="6" y="16" width="36" height="10" rx="3"/><path d="M14 16 L18 9 L30 9 L34 16Z"/><circle cx="14" cy="26" r="4" fill="white"/><circle cx="34" cy="26" r="4" fill="white"/>`,
        stationwagon: `<rect x="2" y="12" width="44" height="14" rx="3"/><path d="M5 12 L8 5 L40 5 L43 12Z"/><circle cx="12" cy="26" r="4" fill="white"/><circle cx="36" cy="26" r="4" fill="white"/>`,
        van:          `<rect x="2" y="8" width="44" height="18" rx="4"/><rect x="28" y="4" width="16" height="4" rx="2"/><rect x="6" y="11" width="8" height="6" rx="1" fill="white" opacity=".6"/><rect x="18" y="11" width="8" height="6" rx="1" fill="white" opacity=".6"/><circle cx="13" cy="26" r="4" fill="white"/><circle cx="35" cy="26" r="4" fill="white"/>`,
        pickup:       `<rect x="2" y="14" width="44" height="12" rx="3"/><path d="M22 14 L26 7 L44 7 L44 14Z"/><circle cx="12" cy="26" r="4" fill="white"/><circle cx="36" cy="26" r="4" fill="white"/>`
      };
      return icons[key] ?? icons.compact;
    }
  })
  .catch(error => {
    console.error("Failed to load data.csv", error);
    d3.select("#crownSubtitle").text("Could not load data.csv");
  });
