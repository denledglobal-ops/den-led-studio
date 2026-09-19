const { app, BrowserWindow } = require("electron");
const fs = require("fs");
const path = require("path");

const API_BASE = process.env.DEN_LED_API || "https://den-led-studio.vercel.app";
let DEVICE_TOKEN = process.env.DEN_LED_DEVICE_TOKEN || null;
let configPath;
const VERSION = "0.1.0";
let win;
let currentDeploymentId = null;
let polling = false;
let pollTimer = null;
let currentVideoFile = null;
let currentPlaylistId = null;
let playlistIndex = 0;

function cachedVideoPath() {
  return path.join(app.getPath("userData"), "current-video.mp4");
}
function playlistVideoPath(itemId) {
  return path.join(app.getPath("userData"), `playlist-${itemId}.mp4`);
}
async function downloadFile(url, file) {
  if (fs.existsSync(file)) return file;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Video indirilemedi.");
  const temp = `${file}.download`;
  fs.writeFileSync(temp, Buffer.from(await response.arrayBuffer()));
  fs.renameSync(temp, file);
  return file;
}
async function playScheduledPlaylist(playlist, screen) {
  if (!playlist?.items?.length || !win) return false;
  if (currentPlaylistId !== playlist.id) { currentPlaylistId = playlist.id; playlistIndex = 0; }
  const item = playlist.items[playlistIndex % playlist.items.length];
  const project = item.project;
  if (!project?.output_url) return false;
  const file = await downloadFile(project.output_url, playlistVideoPath(item.id));
  currentVideoFile = file;
  const screenRatio = Number(screen?.width || 0) / Math.max(Number(screen?.height || 1), 1);
  const projectRatio = Number(project.width || 0) / Math.max(Number(project.height || 1), 1);
  const fit = Math.abs(projectRatio - screenRatio) / Math.max(screenRatio, 0.001) <= 0.02 ? "fill" : "contain";
  await win.loadFile("player.html", { query: { video: file, fit, once: "1" } });
  playlistIndex = (playlistIndex + 1) % playlist.items.length;
  return true;
}

async function showCachedVideo() {
  const file = cachedVideoPath();
  if (!win || !fs.existsSync(file)) return false;
  currentVideoFile = file;
  await win.loadFile("player.html", { query: { video: file, fit: "contain" } });
  return true;
}

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
  if (DEVICE_TOKEN) {
    showCachedVideo().then((shown) => { if (!shown && win) win.loadFile("player.html"); });
  } else {
    win.loadFile("pair.html");
  }
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
  if (!DEVICE_TOKEN || polling) return;
  polling = true;
  try {
    const data = await api("/api/device/next");
    const command = data.command;
    if (command?.command === "restart") {
      await api("/api/device/command-status", { commandId: command.id, status: "completed" });
      app.relaunch();
      app.exit(0);
      return;
    }
    if (command?.command === "reload") {
      try {
        await win.reload();
        await api("/api/device/command-status", { commandId: command.id, status: "completed" });
      } catch {
        await api("/api/device/command-status", { commandId: command.id, status: "failed" });
      }
    }
    if (command?.command === "redownload") {
      currentDeploymentId = null;
      try { fs.unlinkSync(cachedVideoPath()); currentVideoFile = null; } catch {}
      await api("/api/device/command-status", { commandId: command.id, status: "completed" });
    }
    if (data.playlist?.items?.length) {
      await playScheduledPlaylist(data.playlist, data.screen);
      return;
    }
    currentPlaylistId = null;
    const deployment = data.deployment;
    const project = deployment?.projects;
    if (!deployment || !project?.output_url) return;
    if (deployment.id === currentDeploymentId) return;
    currentDeploymentId = deployment.id;
    await report(deployment.id, "downloading");

    const response = await fetch(project.output_url);
    if (!response.ok) throw new Error("Video indirilemedi.");
    const buffer = Buffer.from(await response.arrayBuffer());
    const file = cachedVideoPath();
    const tempFile = `${file}.download`;
    fs.writeFileSync(tempFile, buffer);
    fs.renameSync(tempFile, file);
    currentVideoFile = file;

    await report(deployment.id, "live");
    const screenWidth = Number(data.screen?.width || project.width || 0);
    const screenHeight = Number(data.screen?.height || project.height || 0);
    const projectRatio = Number(project.width || 0) / Number(project.height || 1);
    const screenRatio = screenWidth / Math.max(screenHeight, 1);
    const ratioDelta = Math.abs(projectRatio - screenRatio) / Math.max(screenRatio, 0.001);
    const fit = ratioDelta <= 0.02 ? "fill" : "contain";
    await win.loadFile("player.html", { query: { video: file, fit } });
  } catch (error) {
    // Network/API failures must not interrupt the last successfully downloaded ad.
    if (!currentVideoFile || !fs.existsSync(currentVideoFile)) {
      try { await showCachedVideo(); } catch {}
    }
  } finally {
    polling = false;
  }
}

app.whenReady().then(() => {
  app.setLoginItemSettings({
    openAtLogin: true,
    openAsHidden: false,
    path: process.execPath,
  });
  loadConfig();
  createWindow();
  poll();
  pollTimer = setInterval(poll, 10000);
  const { ipcMain } = require("electron");
  ipcMain.handle("pair-device", async (_event, code) => { try { await pair(code); return { ok: true }; } catch (error) { return { ok: false, error: error.message }; } });
});

process.on("uncaughtException", (error) => {
  try { fs.appendFileSync(path.join(app.getPath("userData"), "player-errors.log"), `[${new Date().toISOString()}] ${error.stack || error.message}\n`); } catch {}
  app.relaunch();
  app.exit(1);
});

process.on("unhandledRejection", (error) => {
  try { fs.appendFileSync(path.join(app.getPath("userData"), "player-errors.log"), `[${new Date().toISOString()}] ${error?.stack || error}\n`); } catch {}
});

app.on("before-quit", () => { if (pollTimer) clearInterval(pollTimer); });
app.on("window-all-closed", () => app.quit());
