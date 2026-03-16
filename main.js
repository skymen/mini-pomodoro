const {
  app,
  BrowserWindow,
  screen,
  ipcMain,
  nativeTheme,
} = require("electron");
const path = require("path");

let win;
let tucked = false;
let tucking = false;
let dockedSide = "right";
const ARROW_TAB = 20;
const ARROW_TAB_WIDE = 40;
const WIN_WIDTH = 290;
let currentArrowTab = ARROW_TAB;
const MIN_HEIGHT = 160;
const MAX_HEIGHT = 560;
const TUCK_DELAY = 800;

let tuckTimer = null;
let currentHeight = MIN_HEIGHT;

function createWindow() {
  const { width: screenW, height: screenH } =
    screen.getPrimaryDisplay().workAreaSize;

  currentHeight = MIN_HEIGHT;

  win = new BrowserWindow({
    width: WIN_WIDTH,
    height: currentHeight,
    x: screenW - WIN_WIDTH,
    y: Math.round((screenH - currentHeight) / 2),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile("index.html");
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // Send initial theme to renderer once ready
  win.webContents.on("did-finish-load", () => {
    win.webContents.send(
      "system-theme",
      nativeTheme.shouldUseDarkColors ? "dark" : "light",
    );
  });

  nativeTheme.on("updated", () => {
    if (win)
      win.webContents.send(
        "system-theme",
        nativeTheme.shouldUseDarkColors ? "dark" : "light",
      );
  });

  win.on("closed", () => {
    win = null;
  });
}

// ── Helpers ──────────────────────────────────────────────────────────

function getWorkArea() {
  return screen.getPrimaryDisplay().workAreaSize;
}

function lerpAnimate(fromX, fromY, toX, toY, duration, done) {
  const fps = 60;
  const steps = Math.max(1, Math.round((duration / 1000) * fps));
  let step = 0;

  const interval = setInterval(() => {
    step++;
    const t = step / steps;
    const ease = 1 - Math.pow(1 - t, 4);
    const x = Math.round(fromX + (toX - fromX) * ease);
    const y = Math.round(fromY + (toY - fromY) * ease);
    if (win) win.setPosition(x, y, false);

    if (step >= steps) {
      clearInterval(interval);
      if (win) win.setPosition(toX, toY, false);
      if (done) done();
    }
  }, 1000 / fps);
}

function snapToEdge() {
  if (!win) return;
  const { width: screenW } = getWorkArea();
  const [curX, curY] = win.getPosition();

  let targetX;
  if (dockedSide === "right") {
    targetX = screenW - WIN_WIDTH;
  } else {
    targetX = 0;
  }
  notifyDockedSide();

  lerpAnimate(curX, curY, targetX, curY, 300, () => {
    tucked = false;
  });
}

function tuck() {
  if (!win || tucked || tucking) return;
  tucking = true;
  const { width: screenW } = getWorkArea();
  const [curX, curY] = win.getPosition();

  let targetX;
  if (dockedSide === "right") {
    targetX = screenW - currentArrowTab;
  } else {
    targetX = -(WIN_WIDTH - currentArrowTab);
  }

  notifyTuckState(true);
  lerpAnimate(curX, curY, targetX, curY, 250, () => {
    tucked = true;
    tucking = false;
  });
}

function untuck() {
  if (!win || !tucked || tucking) return;
  tucking = true;
  const { width: screenW } = getWorkArea();
  const [curX, curY] = win.getPosition();

  let targetX;
  if (dockedSide === "right") {
    targetX = screenW - WIN_WIDTH;
  } else {
    targetX = 0;
  }

  lerpAnimate(curX, curY, targetX, curY, 250, () => {
    tucked = false;
    tucking = false;
    notifyTuckState(false);
  });
}

function notifyDockedSide() {
  if (win) win.webContents.send("docked-side", dockedSide);
}

function notifyTuckState(isTucked) {
  if (win) win.webContents.send("tuck-state", isTucked);
}

// ── IPC ──────────────────────────────────────────────────────────────

ipcMain.on("mouse-enter", () => {
  if (tuckTimer) {
    clearTimeout(tuckTimer);
    tuckTimer = null;
  }
  if (tucked) untuck();
});

ipcMain.on("mouse-leave", () => {
  if (tuckTimer) clearTimeout(tuckTimer);
  tuckTimer = setTimeout(() => {
    tuck();
  }, TUCK_DELAY);
});

ipcMain.on("drag-end", (_, { x, y }) => {
  const { width: screenW } = getWorkArea();
  const center = x + WIN_WIDTH / 2;
  dockedSide = center > screenW / 2 ? "right" : "left";
  snapToEdge();
});

ipcMain.on("start-drag", () => {
  if (tuckTimer) {
    clearTimeout(tuckTimer);
    tuckTimer = null;
  }
});

ipcMain.on("close-window", () => {
  if (win) win.close();
});

ipcMain.on("resize-height", (_, requestedHeight) => {
  if (!win) return;
  const h = Math.max(
    MIN_HEIGHT,
    Math.min(MAX_HEIGHT, Math.round(requestedHeight)),
  );
  if (h === currentHeight) return;

  const [x, y] = win.getPosition();
  const newY = y + Math.round((currentHeight - h) / 2);
  currentHeight = h;
  win.setBounds({ x, y: newY, width: WIN_WIDTH, height: h });
});

ipcMain.on("set-arrow-width", (_, wide) => {
  currentArrowTab = wide ? ARROW_TAB_WIDE : ARROW_TAB;
  if (tucked && win && !tucking) {
    const { width: screenW } = getWorkArea();
    const [, curY] = win.getPosition();
    let targetX;
    if (dockedSide === "right") {
      targetX = screenW - currentArrowTab;
    } else {
      targetX = -(WIN_WIDTH - currentArrowTab);
    }
    win.setPosition(targetX, curY, false);
  }
});

ipcMain.handle("get-docked-side", () => dockedSide);
ipcMain.handle("get-max-height", () => MAX_HEIGHT);

// ── App lifecycle ────────────────────────────────────────────────────

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
