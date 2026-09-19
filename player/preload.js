const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("denLed", { pair: (code) => ipcRenderer.invoke("pair-device", code) });
