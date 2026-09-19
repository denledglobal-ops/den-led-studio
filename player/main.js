const { app, BrowserWindow } = require("electron");
const fs = require("fs");
const path = require("path");

const API_BASE = process.env.DEN_LED_API || "https://den-led-studio.vercel.app";
const DEVICE_TOKEN = process.env.DEN_LED_DEVICE_TOKEN;
const VERSION = "0.1.0";
let win;
let currentDeploymentId = null;

function createWindow() {
  win = new BrowserWindow({
    fullscreen: true,
    frame: false,
    backgroundColor: "#000000",
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true }
  });
  win.loadFile("player.html");
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

async function poll() {
  if (!DEVICE_TOKEN || currentDeploymentId) return;
  try {
    const data = await api("/api/device/next");
    const deployment = data.deployment;
    const project = deployment?.projects;
    if (!deployment || !project?.output_url) return;
    currentDeploymentId = deployment.id;
    await report(deployment.id, "downloading");

    const response = await fetch(project.output_url);
    if (!response.ok) throw new Error("Video indirilemedi.");
    const buffer = Buffer.from(await response.arrayBuffer());
    const file = path.join(app.getPath("userData"), "current-video.mp4");
    fs.writeFileSync(file, buffer);

    await report(deployment.id, "live");
    await win.loadFile("player.html", { query: { video: file } });
  } catch (error) {
    if (currentDeploymentId) {
      try { await report(currentDeploymentId, "failed"); } catch {}
      currentDeploymentId = null;
    }
  }
}

app.whenReady().then(() => {
  createWindow();
  poll();
  setInterval(poll, 10000);
});

app.on("window-all-closed", () => app.quit());
