const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  mouseEnter: () => ipcRenderer.send("mouse-enter"),
  mouseLeave: () => ipcRenderer.send("mouse-leave"),
  dragEnd: (pos) => ipcRenderer.send("drag-end", pos),
  startDrag: () => ipcRenderer.send("start-drag"),
  closeWindow: () => ipcRenderer.send("close-window"),
  resizeHeight: (h) => ipcRenderer.send("resize-height", h),
  getDockedSide: () => ipcRenderer.invoke("get-docked-side"),
  getMaxHeight: () => ipcRenderer.invoke("get-max-height"),
  onDockedSide: (cb) => ipcRenderer.on("docked-side", (_, side) => cb(side)),
  onTuckState: (cb) => ipcRenderer.on("tuck-state", (_, tucked) => cb(tucked)),
  onSystemTheme: (cb) =>
    ipcRenderer.on("system-theme", (_, theme) => cb(theme)),
});
