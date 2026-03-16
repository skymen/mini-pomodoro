const {
  app,
  BrowserWindow,
  screen,
  ipcMain,
  nativeTheme,
  shell,
} = require("electron");
const path = require("path");

let win;
let tucked = false;
let tucking = false;
let dockedSide = "right";
const ARROW_TAB = 40;
const WIN_WIDTH = 290;
const MIN_HEIGHT = 160;
const MAX_HEIGHT = 560;
const TUCK_DELAY = 800;

let tuckTimer = null;
let currentHeight = MIN_HEIGHT;

function createWindow() {
  const wa = screen.getPrimaryDisplay().workArea;

  currentHeight = MIN_HEIGHT;

  win = new BrowserWindow({
    width: WIN_WIDTH,
    height: currentHeight,
    x: wa.x + wa.width - WIN_WIDTH,
    y: wa.y + Math.round((wa.height - currentHeight) / 2),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    show: false,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, "dist", "index.html"));
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // Once the renderer is ready, restore saved position from localStorage,
  // show the window, then auto-dock.
  win.webContents.on("did-finish-load", async () => {
    win.webContents.send(
      "system-theme",
      nativeTheme.shouldUseDarkColors ? "dark" : "light",
    );

    // Read saved window state from renderer localStorage
    try {
      const json = await win.webContents.executeJavaScript(
        `localStorage.getItem("pomo-window-state")`,
      );
      if (json) {
        const saved = JSON.parse(json);
        const wa = screen.getPrimaryDisplay().workArea;

        if (saved.dockedSide === "left" || saved.dockedSide === "right") {
          dockedSide = saved.dockedSide;
        }

        const startX =
          dockedSide === "right" ? wa.x + wa.width - WIN_WIDTH : wa.x;

        let startY;
        if (typeof saved.y === "number") {
          startY = Math.max(
            wa.y,
            Math.min(saved.y, wa.y + wa.height - currentHeight),
          );
        } else {
          startY = wa.y + Math.round((wa.height - currentHeight) / 2);
        }

        win.setBounds({ x: startX, y: startY, width: WIN_WIDTH, height: currentHeight });
        notifyDockedSide();
      }
    } catch {
      // First launch or corrupt data — use defaults
    }

    win.show();

    // Auto-dock shortly after startup so the window appears briefly then tucks
    setTimeout(() => tuck(), 600);
  });

  nativeTheme.on("updated", () => {
    if (win)
      win.webContents.send(
        "system-theme",
        nativeTheme.shouldUseDarkColors ? "dark" : "light",
      );
  });

  // Save position to renderer localStorage before the window is destroyed
  win.on("close", () => {
    if (win) {
      const [, y] = win.getPosition();
      const state = JSON.stringify({ dockedSide, y });
      win.webContents.executeJavaScript(
        `localStorage.setItem("pomo-window-state", ${JSON.stringify(state)})`,
      ).catch(() => {});
    }
  });

  win.on("closed", () => {
    win = null;
  });
}

// ── Helpers ──────────────────────────────────────────────────────────

function getWorkArea() {
  return screen.getPrimaryDisplay().workArea;
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
    if (win) win.setBounds({ x, y, width: WIN_WIDTH, height: currentHeight });

    if (step >= steps) {
      clearInterval(interval);
      if (win)
        win.setBounds({
          x: toX,
          y: toY,
          width: WIN_WIDTH,
          height: currentHeight,
        });
      if (done) done();
    }
  }, 1000 / fps);
}

function snapToEdge() {
  if (!win) return;
  const wa = getWorkArea();
  const [curX, curY] = win.getPosition();

  let targetX;
  if (dockedSide === "right") {
    targetX = wa.x + wa.width - WIN_WIDTH;
  } else {
    targetX = wa.x;
  }
  notifyDockedSide();

  lerpAnimate(curX, curY, targetX, curY, 300, () => {
    tucked = false;
  });
}

function tuck() {
  if (!win || tucked || tucking) return;
  tucking = true;
  const wa = getWorkArea();
  const [curX, curY] = win.getPosition();

  let targetX;
  if (dockedSide === "right") {
    targetX = wa.x + wa.width - ARROW_TAB;
  } else {
    targetX = wa.x - WIN_WIDTH + ARROW_TAB;
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
  const wa = getWorkArea();
  const [curX, curY] = win.getPosition();

  let targetX;
  if (dockedSide === "right") {
    targetX = wa.x + wa.width - WIN_WIDTH;
  } else {
    targetX = wa.x;
  }

  // Notify immediately so the arrow fades out during the slide
  notifyTuckState(false);
  lerpAnimate(curX, curY, targetX, curY, 250, () => {
    tucked = false;
    tucking = false;
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
  const wa = getWorkArea();
  const center = x + WIN_WIDTH / 2;
  dockedSide = center > wa.x + wa.width / 2 ? "right" : "left";
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
  currentHeight = h;
  win.setBounds({ x, y, width: WIN_WIDTH, height: h });
});

ipcMain.handle("get-docked-side", () => dockedSide);
ipcMain.handle("get-max-height", () => MAX_HEIGHT);

ipcMain.on("open-external", (_, url) => {
  shell.openExternal(url).catch(() => {});
});

// ── App lifecycle ────────────────────────────────────────────────────

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
