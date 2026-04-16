const SAVE_KEY = "cookie-clicker-lite-save-v1";

const buildingDefs = [
  { id: "cursor", name: "Cursor", baseCost: 15, cps: 0.1, desc: "Auto-clicks once in a while." },
  { id: "grandma", name: "Grandma", baseCost: 100, cps: 1, desc: "A nice grandma to bake more cookies." },
  { id: "farm", name: "Farm", baseCost: 1100, cps: 8, desc: "Grows cookie plants from cookie seeds." },
  { id: "factory", name: "Factory", baseCost: 12000, cps: 47, desc: "Mass-produces cookies." },
  { id: "bank", name: "Bank", baseCost: 130000, cps: 260, desc: "Generates cookies from interest." },
  { id: "temple", name: "Temple", baseCost: 1400000, cps: 1400, desc: "Summons ancient cookie blessings." }
];

const upgradeDefs = [
  { id: "reinforced-index", name: "Reinforced Index Finger", cost: 100, type: "click", value: 1, desc: "+1 cookie per click" },
  { id: "carpal-tunnel", name: "Carpal Tunnel Prevention", cost: 500, type: "clickMult", value: 2, desc: "Double click power" },
  { id: "steel-oven", name: "Steel Ovens", cost: 1500, type: "globalMult", value: 1.25, desc: "+25% CpS" },
  { id: "robotic-arms", name: "Robotic Arms", cost: 8000, type: "buildingMult", target: "cursor", value: 2, desc: "Cursors are twice as efficient" },
  { id: "grandma-apprentices", name: "Grandma Apprentices", cost: 10000, type: "buildingMult", target: "grandma", value: 2, desc: "Grandmas are twice as efficient" },
  { id: "high-gluten-dough", name: "High-Gluten Dough", cost: 35000, type: "globalMult", value: 1.5, desc: "+50% CpS" }
];

const achievements = [
  { id: "first-cookie", name: "First Bite", desc: "Bake 1 cookie", check: s => s.cookiesBaked >= 1 },
  { id: "hundred", name: "Small Batch", desc: "Bake 100 cookies", check: s => s.cookiesBaked >= 100 },
  { id: "thousand", name: "Bakery Starter", desc: "Bake 1,000 cookies", check: s => s.cookiesBaked >= 1000 },
  { id: "first-building", name: "Hired Help", desc: "Own 1 building", check: s => totalBuildings(s) >= 1 },
  { id: "fifty-buildings", name: "Cookie Corporation", desc: "Own 50 buildings", check: s => totalBuildings(s) >= 50 },
  { id: "million", name: "Industrial Oven", desc: "Bake 1,000,000 cookies", check: s => s.cookiesBaked >= 1_000_000 }
];

const $ = id => document.getElementById(id);

const state = {
  cookies: 0,
  cookiesBaked: 0,
  buildings: Object.fromEntries(buildingDefs.map(b => [b.id, 0])),
  boughtUpgrades: [],
  unlockedAchievements: [],
  clickPower: 1,
  globalMult: 1,
  buildingMults: Object.fromEntries(buildingDefs.map(b => [b.id, 1])),
  prestige: 0,
  golden: { active: false, mult: 1, endsAt: 0 },
  lastTick: Date.now()
};

function totalBuildings(s = state) {
  return Object.values(s.buildings).reduce((a, b) => a + b, 0);
}

function format(num) {
  if (num < 1000) return num.toFixed(1).replace(/\.0$/, "");
  const units = ["K", "M", "B", "T", "Qa"];
  let n = num;
  let idx = -1;
  while (n >= 1000 && idx < units.length - 1) {
    n /= 1000;
    idx++;
  }
  return `${n.toFixed(2)}${units[idx]}`;
}

function buildingCost(def, owned) {
  return Math.floor(def.baseCost * Math.pow(1.15, owned));
}

function cps() {
  let sum = 0;
  for (const def of buildingDefs) {
    sum += state.buildings[def.id] * def.cps * state.buildingMults[def.id];
  }
  const prestigeMult = 1 + state.prestige * 0.02;
  const goldenMult = state.golden.active ? state.golden.mult : 1;
  return sum * state.globalMult * prestigeMult * goldenMult;
}

function clickCookies() {
  const goldenMult = state.golden.active ? state.golden.mult : 1;
  const amt = state.clickPower * goldenMult;
  state.cookies += amt;
  state.cookiesBaked += amt;
  maybeUnlockAchievements();
  render();
}

function buyBuilding(id) {
  const def = buildingDefs.find(b => b.id === id);
  const cost = buildingCost(def, state.buildings[id]);
  if (state.cookies < cost) return;
  state.cookies -= cost;
  state.buildings[id] += 1;
  maybeUnlockAchievements();
  render();
}

function applyUpgrade(upg) {
  if (upg.type === "click") state.clickPower += upg.value;
  if (upg.type === "clickMult") state.clickPower *= upg.value;
  if (upg.type === "globalMult") state.globalMult *= upg.value;
  if (upg.type === "buildingMult") state.buildingMults[upg.target] *= upg.value;
}

function buyUpgrade(id) {
  const upg = upgradeDefs.find(u => u.id === id);
  if (!upg || state.boughtUpgrades.includes(id) || state.cookies < upg.cost) return;
  state.cookies -= upg.cost;
  state.boughtUpgrades.push(id);
  applyUpgrade(upg);
  render();
}

function maybeUnlockAchievements() {
  for (const a of achievements) {
    if (!state.unlockedAchievements.includes(a.id) && a.check(state)) {
      state.unlockedAchievements.push(a.id);
    }
  }
}

function spawnGoldenCookie() {
  if (state.golden.active) return;
  state.golden.active = true;
  state.golden.mult = Math.random() < 0.5 ? 7 : 13;
  state.golden.endsAt = Date.now() + 12_000;
  $("goldenCookie").classList.remove("hidden");
  $("goldenStatus").textContent = `Golden cookie active! x${state.golden.mult} until clicked or expired.`;
}

function clickGoldenCookie() {
  if (!state.golden.active) return;
  const reward = cps() * 20;
  state.cookies += reward;
  state.cookiesBaked += reward;
  state.golden.active = false;
  $("goldenCookie").classList.add("hidden");
  $("goldenStatus").textContent = `Golden cookie burst! +${format(reward)} cookies.`;
  maybeUnlockAchievements();
  render();
}

function checkGoldenExpiry() {
  if (state.golden.active && Date.now() > state.golden.endsAt) {
    state.golden.active = false;
    $("goldenCookie").classList.add("hidden");
    $("goldenStatus").textContent = "Golden cookie faded away.";
    render();
  }
}

function ascend() {
  const earned = Math.floor(Math.sqrt(state.cookiesBaked / 1_000_000));
  if (earned < 1) {
    alert("Bake at least 1,000,000 total cookies to earn your first Heavenly Chip.");
    return;
  }

  const keepPrestige = state.prestige + earned;
  state.cookies = 0;
  state.cookiesBaked = 0;
  state.buildings = Object.fromEntries(buildingDefs.map(b => [b.id, 0]));
  state.boughtUpgrades = [];
  state.unlockedAchievements = [];
  state.clickPower = 1;
  state.globalMult = 1;
  state.buildingMults = Object.fromEntries(buildingDefs.map(b => [b.id, 1]));
  state.prestige = keepPrestige;
  state.golden = { active: false, mult: 1, endsAt: 0 };
  maybeUnlockAchievements();
  render();
}

function save() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function load() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    Object.assign(state, data);
    state.buildings = { ...Object.fromEntries(buildingDefs.map(b => [b.id, 0])), ...data.buildings };
    state.buildingMults = { ...Object.fromEntries(buildingDefs.map(b => [b.id, 1])), ...data.buildingMults };
    state.boughtUpgrades = Array.isArray(data.boughtUpgrades) ? data.boughtUpgrades : [];
    state.unlockedAchievements = Array.isArray(data.unlockedAchievements) ? data.unlockedAchievements : [];
  } catch {
    // ignore corrupt save
  }
}

function reset() {
  localStorage.removeItem(SAVE_KEY);
  location.reload();
}

function renderBuildings() {
  const list = $("buildingList");
  list.innerHTML = "";
  const tpl = $("shopItemTemplate");

  for (const def of buildingDefs) {
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.querySelector(".name").textContent = `${def.name} (${state.buildings[def.id]})`;
    const cost = buildingCost(def, state.buildings[def.id]);
    node.querySelector(".meta").textContent = `${def.desc} • +${def.cps}/s • Cost: ${format(cost)}`;
    const btn = node.querySelector(".buy-btn");
    btn.disabled = state.cookies < cost;
    btn.textContent = "Buy";
    btn.addEventListener("click", () => buyBuilding(def.id));
    list.appendChild(node);
  }
}

function renderUpgrades() {
  const list = $("upgradeList");
  list.innerHTML = "";
  const tpl = $("shopItemTemplate");

  for (const upg of upgradeDefs) {
    if (state.boughtUpgrades.includes(upg.id)) continue;

    const unlocked = state.cookiesBaked >= upg.cost / 2;
    if (!unlocked) continue;

    const node = tpl.content.firstElementChild.cloneNode(true);
    node.querySelector(".name").textContent = upg.name;
    node.querySelector(".meta").textContent = `${upg.desc} • Cost: ${format(upg.cost)}`;
    const btn = node.querySelector(".buy-btn");
    btn.disabled = state.cookies < upg.cost;
    btn.textContent = "Buy";
    btn.addEventListener("click", () => buyUpgrade(upg.id));
    list.appendChild(node);
  }

  if (!list.children.length) {
    const li = document.createElement("li");
    li.textContent = "No upgrades available yet.";
    li.className = "shop-item";
    list.appendChild(li);
  }
}

function renderAchievements() {
  const list = $("achievementList");
  list.innerHTML = "";
  for (const a of achievements) {
    const li = document.createElement("li");
    const unlocked = state.unlockedAchievements.includes(a.id);
    li.className = unlocked ? "" : "locked";
    li.textContent = `${unlocked ? "🏆" : "🔒"} ${a.name} — ${a.desc}`;
    list.appendChild(li);
  }
}

function render() {
  $("cookieCount").textContent = `${format(state.cookies)} cookies`;
  $("cps").textContent = `${format(cps())} cookies / second`;
  $("clickPower").textContent = `${format(state.clickPower)} cookie / click`;
  $("prestigeInfo").textContent = `Prestige level: ${state.prestige} (x${(1 + state.prestige * 0.02).toFixed(2)} CpS)`;
  renderBuildings();
  renderUpgrades();
  renderAchievements();
}

function tick() {
  const now = Date.now();
  const delta = (now - state.lastTick) / 1000;
  state.lastTick = now;
  const gained = cps() * delta;
  state.cookies += gained;
  state.cookiesBaked += gained;
  checkGoldenExpiry();
  maybeUnlockAchievements();
  render();
}

function init() {
  load();
  $("cookieButton").addEventListener("click", clickCookies);
  $("saveBtn").addEventListener("click", save);
  $("resetBtn").addEventListener("click", reset);
  $("goldenCookie").addEventListener("click", clickGoldenCookie);
  $("prestigeBtn").addEventListener("click", ascend);

  setInterval(tick, 100);
  setInterval(save, 10_000);
  setInterval(() => {
    if (Math.random() < 0.12) spawnGoldenCookie();
  }, 15_000);

  render();
}

init();
