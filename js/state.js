import { getFuelTypes, getMostCommonMake } from "./data.js";

function createEmptyFocusState() {
  return {
    hoveredCar: null,
    pinnedCar: null
  };
}

function getSlotKey(slotOrCar, maybeCar) {
  return maybeCar === undefined ? "primary" : slotOrCar;
}

function getCarArg(slotOrCar, maybeCar) {
  return maybeCar === undefined ? slotOrCar : maybeCar;
}

export function createAppState(fullData, manufacturerStats) {
  const defaultMake = getMostCommonMake(fullData);
  const allFuelTypes = getFuelTypes(fullData);

  const state = {
    fullData,
    manufacturerStats,
    currentPoints: [],
    primaryMake: defaultMake,
    secondaryMake: null,
    brushedMakes: [],
    crownMetric: "gap",
    activeFuelTypes: [...allFuelTypes],
    crownFocus: {
      primary: createEmptyFocusState(),
      secondary: createEmptyFocusState()
    },
    activeVehicleClasses: []
  };

  const dispatch = d3.dispatch("change");
  let subscriptionCount = 0;

  function selectedMakes() {
    return [state.primaryMake, state.secondaryMake].filter(Boolean);
  }

  function snapshot() {
    return {
      ...state,
      activeMake: state.primaryMake,
      selectedMakes: selectedMakes(),
      hoveredCar: state.crownFocus.primary.hoveredCar,
      pinnedCar: state.crownFocus.primary.pinnedCar,
      hoveredCars: {
        primary: state.crownFocus.primary.hoveredCar,
        secondary: state.crownFocus.secondary.hoveredCar
      },
      pinnedCars: {
        primary: state.crownFocus.primary.pinnedCar,
        secondary: state.crownFocus.secondary.pinnedCar
      },
      brushedMakes: [...state.brushedMakes],
      activeFuelTypes: [...state.activeFuelTypes],
      activeVehicleClasses: [...state.activeVehicleClasses],
      allFuelTypes: [...allFuelTypes],
      hasComparison: Boolean(state.secondaryMake)
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

  function syncSlotFocus(slotKey) {
    const activeMake = slotKey === "primary" ? state.primaryMake : state.secondaryMake;
    const slotFocus = state.crownFocus[slotKey];

    slotFocus.hoveredCar = null;

    if (!activeMake || (slotFocus.pinnedCar && slotFocus.pinnedCar.make !== activeMake)) {
      slotFocus.pinnedCar = null;
    }
  }

  function setPrimaryMake(make) {
    const nextMake = make || defaultMake;
    const changed = state.primaryMake !== nextMake;

    state.primaryMake = nextMake;

    if (state.secondaryMake === nextMake) {
      state.secondaryMake = null;
      syncSlotFocus("secondary");
    }

    syncSlotFocus("primary");
    emit(changed ? "primaryMake" : "primaryMakeRefresh");
  }

  function setSecondaryMake(make) {
    const normalized = make && make !== state.primaryMake ? make : null;
    const changed = state.secondaryMake !== normalized;

    state.secondaryMake = normalized;
    syncSlotFocus("secondary");

    emit(changed ? "secondaryMake" : "secondaryMakeRefresh");
  }

  function setActiveMake(make) {
    setPrimaryMake(make);
  }

  function setBrushedMakes(makes) {
    state.brushedMakes = makes ? [...makes] : [];
    emit("brushedMakes");
  }

  function setHoveredCar(slotOrCar, maybeCar) {
    const slotKey = getSlotKey(slotOrCar, maybeCar);
    const car = getCarArg(slotOrCar, maybeCar);
    const slotFocus = state.crownFocus[slotKey];

    if (!slotFocus) {
      return;
    }

    if (slotFocus.hoveredCar?.id === car?.id) {
      return;
    }

    slotFocus.hoveredCar = car || null;
    emit("hoveredCar");
  }

  function togglePinnedCar(slotOrCar, maybeCar) {
    const slotKey = getSlotKey(slotOrCar, maybeCar);
    const car = getCarArg(slotOrCar, maybeCar);
    const slotFocus = state.crownFocus[slotKey];

    if (!slotFocus) {
      return;
    }

    if (slotFocus.pinnedCar?.id === car?.id) {
      slotFocus.pinnedCar = null;
    } else {
      slotFocus.pinnedCar = car || null;
    }

    emit("pinnedCar");
  }

  function clearPinnedCar(slotKey = "primary") {
    const slotFocus = state.crownFocus[slotKey];

    if (!slotFocus || !slotFocus.pinnedCar) {
      return;
    }

    slotFocus.pinnedCar = null;
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
    state.primaryMake = defaultMake;
    state.secondaryMake = null;
    state.brushedMakes = [];
    state.crownMetric = "gap";
    state.activeFuelTypes = [...allFuelTypes];
    state.crownFocus = {
      primary: createEmptyFocusState(),
      secondary: createEmptyFocusState()
    };
    state.activeVehicleClasses = [];

    emit("resetInteractions");
  }

  return {
    subscribe,
    getState: snapshot,
    setCurrentPoints,
    appendCurrentPoints,
    setPrimaryMake,
    setSecondaryMake,
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