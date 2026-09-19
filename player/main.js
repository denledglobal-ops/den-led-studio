const { app, BrowserWindow } = require("electron");
const fs = require("fs");
const path = require("path");

const API_BASE = process.env.DEN_LED_API || "https://den-led-studio.vercel.app";
let DEVICE_TOKEN = process.env.DEN_LED_DEVICE_TOKEN || null;
let configPath;
const VERSION = "0.1.0";
let win;
let currentDeploymentId = null;

function loadConfig() {
  configPath = path.join(app.getPath("userData"), "device.json");
  try { DEVICE_TOKEN = DEVICE_TOKEN || JSON.parse(fs.readFileSync(configPath, "utf8")).deviceToken; } catch {}
}

function saveToken(deviceToken) {
  DEVICE_TOKEN = deviceToken;
  fs.writeFileSync(configPath, JSON.stringify({ deviceToken }), "utf8");
}

function createWindow() {
  win = new BrowserWindow({
    fullscreen: true,
    frame: false,
    backgroundColor: "#000000",
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, preload: path.join(__dirname, "preload.js") }
  });
  win.loadFile(DEVICE_TOKEN ? "player.html" : "pair.html");
  win.on("closed", () => { win = null; });
}

async function api(route, body) {
  const response = await fetch(API_BASE + route, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-device-token": DEVICE_TOKEN || "" },
    body: JSON.stringify(body || {})
  });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "API error");
  return response.json();
}

async function report(id, status) {
  return api("/api/device/status", { deploymentId: id, status, playerVersion: VERSION });
}

async function pair(code) {
  const response = await fetch(API_BASE + "/api/device/pair", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, playerVersion: VERSION }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Eşleştirme başarısız.");
  saveToken(data.deviceToken);
  await win.loadFile("player.html");
  poll();
}

async function poll() {
  if (!DEVICE_TOKEN) return;
  try {
    const data = await api("/api/device/next");
    const deployment = data.deployment;
    const project = deployment?.projects;
    if (!deployment || !project?.output_url) return;
    if (deployment.id === currentDeploymentId) return;
    currentDeploymentId = deployment.id;
    await report(deployment.id, "downloading");

    const response = await fetch(project.output_url);
    if (!response.ok) throw new Error("Video indirilemedi.");
    const buffer = Buffer.from(await response.arrayBuffer());
    const file = path.join(app.getPath("userData"), "current-video.mp4");
    fs.writeFileSync(file, buffer);

    await report(deployment.id, "live");
    const screenWidth = Number(data.screen?.width || project.width || 0);
    const screenHeight = Number(data.screen?.height || project.height || 0);
    const projectRatio = Number(project.width || 0) / Number(project.height || 1);
    const screenRatio = screenWidth / Math.max(screenHeight, 1);
    const ratioDelta = Math.abs(projectRatio - screenRatio) / Math.max(screenRatio, 0.001);
    const fit = ratioDelta <= 0.02 ? "fill" : "contain";
    await win.loadFile("player.html", { query: { video: file, fit } });
  } catch (error) {
    if (currentDeploymentId) {
      try { await report(currentDeploymentId, "failed"); } catch {}
      currentDeploymentId = null;
    }
  }
}

app.whenReady().then(() => {
  loadConfig();
  createWindow();
  poll();
  setInterval(poll, 10000);
  const { ipcMain } = require("electron");
  ipcMain.handle("pair-device", async (_event, code) => { try { await pair(code); return { ok: true }; } catch (error) { return { ok: false, error: error.message }; } });
});

app.on("window-all-closed", () => app.quit());
