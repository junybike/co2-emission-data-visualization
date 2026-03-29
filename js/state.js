import { getFuelTypes, getMostCommonMake } from "./data.js";

export function createAppState(fullData, manufacturerStats) {
  const defaultMake = getMostCommonMake(fullData);
  const allFuelTypes = getFuelTypes(fullData);

  const state = {
    fullData,
    manufacturerStats,
    currentPoints: [],
    activeMake: defaultMake,
    brushedMakes: [],
    crownMetric: "gap",
    activeFuelTypes: [...allFuelTypes],
    hoveredCar: null,
    pinnedCar: null,
    activeVehicleClasses: []
  };

  const dispatch = d3.dispatch("change");
  let subscriptionCount = 0;

  function snapshot() {
    return {
      ...state,
      brushedMakes: [...state.brushedMakes],
      activeFuelTypes: [...state.activeFuelTypes],
      activeVehicleClasses: [...state.activeVehicleClasses],
      allFuelTypes: [...allFuelTypes]
    };
  }

  function emit(reason) {
    dispatch.call("change", null, snapshot(), reason);
  }

  function subscribe(listener) {
    subscriptionCount += 1;
    const key = `listener-${subscriptionCount}`;

    dispatch.on(`change.${key}`, listener);
    listener(snapshot(), "init");

    return () => {
      dispatch.on(`change.${key}`, null);
    };
  }

  function setCurrentPoints(points) {
    state.currentPoints = [...points];
    emit("currentPoints");
  }

  function appendCurrentPoints(points) {
    state.currentPoints = state.currentPoints.concat(points);
    emit("currentPoints");
  }

  function setActiveMake(make) {
    const nextMake = make || defaultMake;
    const changed = state.activeMake !== nextMake;

    state.activeMake = nextMake;
    state.hoveredCar = null;

    if (state.pinnedCar && state.pinnedCar.make !== nextMake) {
      state.pinnedCar = null;
    }

    emit(changed ? "activeMake" : "activeMakeRefresh");
  }

  function setBrushedMakes(makes) {
    state.brushedMakes = makes ? [...makes] : [];
    emit("brushedMakes");
  }

  function setHoveredCar(car) {
    if (state.hoveredCar?.id === car?.id) {
      return;
    }

    state.hoveredCar = car || null;
    emit("hoveredCar");
  }

  function togglePinnedCar(car) {
    if (state.pinnedCar?.id === car?.id) {
      state.pinnedCar = null;
    } else {
      state.pinnedCar = car || null;
    }

    emit("pinnedCar");
  }

  function clearPinnedCar() {
    if (!state.pinnedCar) {
      return;
    }

    state.pinnedCar = null;
    emit("pinnedCar");
  }

  function setCrownMetric(metric) {
    if (state.crownMetric === metric) {
      return;
    }

    state.crownMetric = metric;
    emit("crownMetric");
  }

  function toggleFuelType(fuelType) {
    const active = new Set(state.activeFuelTypes);

    if (active.has(fuelType)) {
      if (active.size === 1) {
        state.activeFuelTypes = [...allFuelTypes];
      } else {
        active.delete(fuelType);
        state.activeFuelTypes = allFuelTypes.filter(type => active.has(type));
      }
    } else {
      active.add(fuelType);
      state.activeFuelTypes = allFuelTypes.filter(type => active.has(type));
    }

    emit("fuelFilter");
  }

  function toggleVehicleClass(groupKey) {
    const active = state.activeVehicleClasses;
    const idx = active.indexOf(groupKey);
    if (idx === -1) {
      state.activeVehicleClasses = [...active, groupKey];
    } else {
      state.activeVehicleClasses = active.filter(k => k !== groupKey);
    }
    emit("vehicleClasses");
  }

  function resetInteractions() {
    state.activeMake = defaultMake;
    state.brushedMakes = [];
    state.crownMetric = "gap";
    state.activeFuelTypes = [...allFuelTypes];
    state.hoveredCar = null;
    state.pinnedCar = null;
    state.activeVehicleClasses = [];

    emit("resetInteractions");
  }

  return {
    subscribe,
    getState: snapshot,
    setCurrentPoints,
    appendCurrentPoints,
    setActiveMake,
    setBrushedMakes,
    setHoveredCar,
    togglePinnedCar,
    clearPinnedCar,
    setCrownMetric,
    toggleFuelType,
    toggleVehicleClass,
    resetInteractions
  };
}
