const SAVE_KEY = "cookie_clicker_lite_save_v1";

const buildingDefs = [
  { id: "cursor", name: "Cursor", baseCost: 15, baseCps: 0.1, description: "Auto-clicks once in a while." },
  { id: "grandma", name: "Grandma", baseCost: 100, baseCps: 1, description: "A nice grandma bakes cookies." },
  { id: "farm", name: "Farm", baseCost: 1100, baseCps: 8, description: "Grows cookie plants." },
  { id: "factory", name: "Factory", baseCost: 12000, baseCps: 47, description: "Mass-produces cookies." },
  { id: "bank", name: "Bank", baseCost: 130000, baseCps: 260, description: "Finances cookie ventures." },
  { id: "temple", name: "Temple", baseCost: 1400000, baseCps: 1400, description: "Summons ancient cookie magic." }
];

const upgradeDefs = [
  { id: "reinforcedFinger", name: "Reinforced Index Finger", cost: 100, requirement: () => state.totalCookies >= 100, effect: () => (state.clickPower += 1), description: "+1 cookies per click." },
  { id: "ironBaker", name: "Iron Baker Gloves", cost: 1000, requirement: () => state.totalCookies >= 1000, effect: () => (state.clickPower *= 2), description: "Double click power." },
  { id: "efficientCursors", name: "Efficient Cursors", cost: 500, requirement: () => getBuildingOwned("cursor") >= 10, effect: () => addBuildingMultiplier("cursor", 2), description: "Cursors are twice as efficient." },
  { id: "grandmaWisdom", name: "Grandma Wisdom", cost: 5000, requirement: () => getBuildingOwned("grandma") >= 10, effect: () => addBuildingMultiplier("grandma", 2), description: "Grandmas are twice as efficient." },
  { id: "industrialBakery", name: "Industrial Bakery", cost: 25000, requirement: () => getBuildingOwned("factory") >= 5, effect: () => (state.globalMultiplier *= 1.2), description: "+20% global production." },
  { id: "sugarRush", name: "Sugar Rush", cost: 75000, requirement: () => state.totalCookies >= 50000, effect: () => (state.goldenBoostFactor *= 1.5), description: "Golden cookie boosts are stronger." }
];

const achievementDefs = [
  { id: "firstClick", name: "First Batch", test: () => state.totalCookies >= 1 },
  { id: "hundred", name: "Baker's Dozen-ish", test: () => state.totalCookies >= 100 },
  { id: "thousand", name: "Cookie Crafter", test: () => state.totalCookies >= 1000 },
  { id: "million", name: "Mega Bakery", test: () => state.totalCookies >= 1000000 },
  { id: "grandmas", name: "Family Recipe", test: () => getBuildingOwned("grandma") >= 25 },
  { id: "ascended", name: "Transcended Taste", test: () => state.prestigePoints >= 1 }
];

const state = {
  cookies: 0,
  totalCookies: 0,
  clickPower: 1,
  globalMultiplier: 1,
  goldenBoostFactor: 1,
  prestigePoints: 0,
  ascensions: 0,
  buildings: Object.fromEntries(buildingDefs.map((b) => [b.id, { owned: 0, multiplier: 1 }])),
  purchasedUpgrades: [],
  achievements: [],
  goldenCookie: { active: false, expiresAt: 0 },
  frenzy: { multiplier: 1, expiresAt: 0 },
  lastTick: Date.now()
};

const el = {
  cookieCount: document.getElementById("cookieCount"),
  totalCookies: document.getElementById("totalCookies"),
  cps: document.getElementById("cps"),
  clickPower: document.getElementById("clickPower"),
  buildingShop: document.getElementById("buildingShop"),
  upgradeShop: document.getElementById("upgradeShop"),
  achievements: document.getElementById("achievements"),
  mainCookie: document.getElementById("mainCookie"),
  goldenCookie: document.getElementById("goldenCookie"),
  floatingTextContainer: document.getElementById("floatingTextContainer"),
  prestigeButton: document.getElementById("prestigeButton"),
  potentialPrestige: document.getElementById("potentialPrestige"),
  prestigePoints: document.getElementById("prestigePoints"),
  saveBtn: document.getElementById("saveBtn"),
  resetBtn: document.getElementById("resetBtn")
};

function formatNumber(value) {
  if (value < 1000) return value.toFixed(value >= 100 ? 0 : 1);
  const suffixes = ["K", "M", "B", "T", "Qa"];
  let v = value;
  let i = -1;
  while (v >= 1000 && i < suffixes.length - 1) {
    v /= 1000;
    i += 1;
  }
  return `${v.toFixed(2)}${suffixes[i]}`;
}

function getBuildingOwned(id) {
  return state.buildings[id].owned;
}

function getBuildingCost(def) {
  const owned = state.buildings[def.id].owned;
  return Math.floor(def.baseCost * Math.pow(1.15, owned));
}

function addCookies(amount, source = "") {
  state.cookies += amount;
  state.totalCookies += amount;
  if (source === "click") {
    showFloatingText(`+${formatNumber(amount)}`);
  }
}

function showFloatingText(text) {
  const span = document.createElement("span");
  span.className = "floating";
  span.textContent = text;
  span.style.left = `${40 + Math.random() * 120}px`;
  span.style.top = `${220 + Math.random() * 60}px`;
  el.floatingTextContainer.append(span);
  setTimeout(() => span.remove(), 900);
}

function getPrestigeMultiplier() {
  return 1 + state.prestigePoints * 0.05;
}

function getCps() {
  const buildingCps = buildingDefs.reduce((sum, def) => {
    const b = state.buildings[def.id];
    return sum + def.baseCps * b.owned * b.multiplier;
  }, 0);
  const frenzy = Date.now() < state.frenzy.expiresAt ? state.frenzy.multiplier : 1;
  return buildingCps * state.globalMultiplier * getPrestigeMultiplier() * frenzy;
}

function buyBuilding(id) {
  const def = buildingDefs.find((b) => b.id === id);
  const cost = getBuildingCost(def);
  if (state.cookies < cost) return;
  state.cookies -= cost;
  state.buildings[id].owned += 1;
  render();
}

function addBuildingMultiplier(id, factor) {
  state.buildings[id].multiplier *= factor;
}

function buyUpgrade(id) {
  const upgrade = upgradeDefs.find((u) => u.id === id);
  if (!upgrade || state.purchasedUpgrades.includes(id) || state.cookies < upgrade.cost) return;
  state.cookies -= upgrade.cost;
  state.purchasedUpgrades.push(id);
  upgrade.effect();
  render();
}

function rollGoldenCookie() {
  if (state.goldenCookie.active) return;
  const chance = 0.012;
  if (Math.random() < chance) {
    state.goldenCookie.active = true;
    state.goldenCookie.expiresAt = Date.now() + 12000;
    el.goldenCookie.classList.remove("hidden");
  }
}

function clickGoldenCookie() {
  if (!state.goldenCookie.active) return;
  state.goldenCookie.active = false;
  el.goldenCookie.classList.add("hidden");

  const isFrenzy = Math.random() < 0.6;
  if (isFrenzy) {
    state.frenzy.multiplier = 7 * state.goldenBoostFactor;
    state.frenzy.expiresAt = Date.now() + 12000;
    showFloatingText("Frenzy!");
  } else {
    const burst = Math.max(30, getCps() * 45 * state.goldenBoostFactor);
    addCookies(burst);
    showFloatingText(`Lucky! +${formatNumber(burst)}`);
  }
}

function updateAchievements() {
  for (const ach of achievementDefs) {
    if (!state.achievements.includes(ach.id) && ach.test()) {
      state.achievements.push(ach.id);
      showFloatingText(`Achievement: ${ach.name}`);
    }
  }
}

function getPotentialPrestige() {
  return Math.floor(Math.sqrt(state.totalCookies / 1_000_000));
}

function ascend() {
  const gain = getPotentialPrestige();
  if (gain <= 0) return;
  state.prestigePoints += gain;
  state.ascensions += 1;

  state.cookies = 0;
  state.totalCookies = 0;
  state.clickPower = 1;
  state.globalMultiplier = 1;
  state.goldenBoostFactor = 1;
  state.buildings = Object.fromEntries(buildingDefs.map((b) => [b.id, { owned: 0, multiplier: 1 }]));
  state.purchasedUpgrades = [];
  state.frenzy = { multiplier: 1, expiresAt: 0 };
  state.goldenCookie = { active: false, expiresAt: 0 };
  render();
}

function saveGame() {
  const payload = {
    cookies: state.cookies,
    totalCookies: state.totalCookies,
    clickPower: state.clickPower,
    globalMultiplier: state.globalMultiplier,
    goldenBoostFactor: state.goldenBoostFactor,
    prestigePoints: state.prestigePoints,
    ascensions: state.ascensions,
    buildings: state.buildings,
    purchasedUpgrades: state.purchasedUpgrades,
    achievements: state.achievements
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
}

function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    Object.assign(state, data);
  } catch {
    localStorage.removeItem(SAVE_KEY);
  }
}

function hardReset() {
  localStorage.removeItem(SAVE_KEY);
  location.reload();
}

function renderBuildings() {
  el.buildingShop.innerHTML = "";
  for (const def of buildingDefs) {
    const cost = getBuildingCost(def);
    const owned = state.buildings[def.id].owned;

    const item = document.createElement("article");
    item.className = "shop-item";
    item.innerHTML = `
      <strong>${def.name} (${owned})</strong>
      <small>${def.description}</small>
      <small>+${formatNumber(def.baseCps * state.buildings[def.id].multiplier)} cps each</small>
      <button ${state.cookies < cost ? "disabled" : ""}>Buy - ${formatNumber(cost)} cookies</button>
    `;

    item.querySelector("button").addEventListener("click", () => buyBuilding(def.id));
    el.buildingShop.append(item);
  }
}

function renderUpgrades() {
  el.upgradeShop.innerHTML = "";
  const available = upgradeDefs.filter((u) => !state.purchasedUpgrades.includes(u.id) && u.requirement());
  if (!available.length) {
    el.upgradeShop.innerHTML = "<small>No upgrades available yet.</small>";
    return;
  }

  for (const up of available) {
    const item = document.createElement("article");
    item.className = "upgrade-item";
    item.innerHTML = `
      <strong>${up.name}</strong>
      <small>${up.description}</small>
      <button ${state.cookies < up.cost ? "disabled" : ""}>Buy - ${formatNumber(up.cost)} cookies</button>
    `;

    item.querySelector("button").addEventListener("click", () => buyUpgrade(up.id));
    el.upgradeShop.append(item);
  }
}

function renderAchievements() {
  el.achievements.innerHTML = "";
  for (const ach of achievementDefs) {
    const li = document.createElement("li");
    const unlocked = state.achievements.includes(ach.id);
    li.textContent = unlocked ? `✅ ${ach.name}` : `⬜ ${ach.name}`;
    if (unlocked) li.classList.add("unlocked");
    el.achievements.append(li);
  }
}

function render() {
  if (state.goldenCookie.active && Date.now() > state.goldenCookie.expiresAt) {
    state.goldenCookie.active = false;
    el.goldenCookie.classList.add("hidden");
  }

  el.cookieCount.textContent = formatNumber(state.cookies);
  el.totalCookies.textContent = formatNumber(state.totalCookies);
  el.cps.textContent = formatNumber(getCps());
  el.clickPower.textContent = formatNumber(state.clickPower * getPrestigeMultiplier());
  el.potentialPrestige.textContent = formatNumber(getPotentialPrestige());
  el.prestigePoints.textContent = String(state.prestigePoints);

  renderBuildings();
  renderUpgrades();
  renderAchievements();
}

function gameLoop() {
  const now = Date.now();
  const delta = (now - state.lastTick) / 1000;
  state.lastTick = now;

  const passiveGain = getCps() * delta;
  state.cookies += passiveGain;
  state.totalCookies += passiveGain;

  rollGoldenCookie();
  updateAchievements();
  render();
}

el.mainCookie.addEventListener("click", () => {
  const amount = state.clickPower * getPrestigeMultiplier();
  addCookies(amount, "click");
  updateAchievements();
  render();
});
el.goldenCookie.addEventListener("click", clickGoldenCookie);
el.prestigeButton.addEventListener("click", ascend);
el.saveBtn.addEventListener("click", saveGame);
el.resetBtn.addEventListener("click", hardReset);

loadGame();
render();
setInterval(gameLoop, 100);
setInterval(saveGame, 5000);
