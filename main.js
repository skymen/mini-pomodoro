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
const TUCK_DURATION = 250;
const EDGE_SNAP_DURATION = 300;

let tuckTimer = null;
let currentHeight = MIN_HEIGHT;
let currentWidth = WIN_WIDTH;
let isPinned = false;

function createWindow() {
  const wa = screen.getPrimaryDisplay().workArea;

  currentHeight = MIN_HEIGHT;
  currentWidth = WIN_WIDTH;

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

        if (saved.dockedSide === "left" || saved.dockedSide === "right") {
          dockedSide = saved.dockedSide;
        }

        // Determine which display to restore onto using saved coordinates
        const savedX = typeof saved.x === "number" ? saved.x : undefined;
        const savedY = typeof saved.y === "number" ? saved.y : undefined;
        const wa =
          savedX !== undefined && savedY !== undefined
            ? getWorkAreaForPoint(savedX, savedY)
            : screen.getPrimaryDisplay().workArea;

        const startX =
          dockedSide === "right" ? wa.x + wa.width - WIN_WIDTH : wa.x;

        let startY;
        if (savedY !== undefined) {
          startY = Math.max(
            wa.y,
            Math.min(savedY, wa.y + wa.height - currentHeight),
          );
        } else {
          startY = wa.y + Math.round((wa.height - currentHeight) / 2);
        }

        win.setBounds({
          x: startX,
          y: startY,
          width: WIN_WIDTH,
          height: currentHeight,
        });
      }
    } catch {
      // First launch or corrupt data — use defaults
    }

    // Always notify the renderer of the (possibly restored) docked side
    notifyDockedSide();

    win.show();

    // Read pinned state from localStorage before auto-tucking
    try {
      const pinnedVal = await win.webContents.executeJavaScript(
        `localStorage.getItem("pomo-pinned")`,
      );
      isPinned = pinnedVal === "true";
    } catch {
      isPinned = false;
    }

    // Auto-dock shortly after startup so the window appears briefly then tucks
    if (!isPinned) ipcMain.emit("mouse-leave");
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
      const [winX, y] = win.getPosition();
      // Save the untucked X position so we can restore to the correct display
      const wa = getWorkArea();
      const x = dockedSide === "right" ? wa.x + wa.width - WIN_WIDTH : wa.x;
      const state = JSON.stringify({ dockedSide, x, y });
      win.webContents
        .executeJavaScript(
          `localStorage.setItem("pomo-window-state", ${JSON.stringify(state)})`,
        )
        .catch(() => {});
    }
  });

  win.on("closed", () => {
    win = null;
  });
}

// ── Helpers ──────────────────────────────────────────────────────────

function getWorkArea() {
  if (win) {
    const bounds = win.getBounds();
    return screen.getDisplayMatching(bounds).workArea;
  }
  return screen.getPrimaryDisplay().workArea;
}

function getWorkAreaForPoint(x, y) {
  return screen.getDisplayNearestPoint({ x, y }).workArea;
}

function lerpAnimate(from, to, duration, done) {
  const fps = 60;
  const steps = Math.max(1, Math.round((duration / 1000) * fps));
  let step = 0;

  const interval = setInterval(() => {
    step++;
    const t = step / steps;
    const ease = 1 - Math.pow(1 - t, 4);
    const x = Math.round(from.x + (to.x - from.x) * ease);
    const y = Math.round(from.y + (to.y - from.y) * ease);
    const w = Math.round(from.w + (to.w - from.w) * ease);
    if (win) {
      currentWidth = w;
      win.setBounds({ x, y, width: w, height: currentHeight });
    }

    if (step >= steps) {
      clearInterval(interval);
      currentWidth = to.w;
      if (win)
        win.setBounds({
          x: to.x,
          y: to.y,
          width: to.w,
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

  // Clamp Y to the current display's work area
  const targetY = Math.max(
    wa.y,
    Math.min(curY, wa.y + wa.height - currentHeight),
  );

  notifyDockedSide();

  lerpAnimate(
    { x: curX, y: curY, w: currentWidth },
    { x: targetX, y: targetY, w: WIN_WIDTH },
    EDGE_SNAP_DURATION,
    () => {
      tucked = false;
    },
  );
}

function tuck() {
  if (!win || tucked || tucking) return;
  tucking = true;
  const wa = getWorkArea();
  const [curX, curY] = win.getPosition();

  // Shrink the window to ARROW_TAB wide, pinned to the screen edge.
  // For right-dock: X moves to right edge minus ARROW_TAB.
  // For left-dock: X stays at the left edge (wa.x).
  let targetX;
  if (dockedSide === "right") {
    targetX = wa.x + wa.width - ARROW_TAB;
  } else {
    targetX = wa.x;
  }

  notifyTuckState(true);
  lerpAnimate(
    { x: curX, y: curY, w: currentWidth },
    { x: targetX, y: curY, w: ARROW_TAB },
    TUCK_DURATION,
    () => {
      tucked = true;
      tucking = false;
    },
  );
}

function untuck() {
  if (!win || !tucked || tucking) return;
  tucking = true;
  const wa = getWorkArea();
  const [curX, curY] = win.getPosition();

  // Expand back to full width, pinned to the screen edge.
  let targetX;
  if (dockedSide === "right") {
    targetX = wa.x + wa.width - WIN_WIDTH;
  } else {
    targetX = wa.x;
  }

  // Notify immediately so the arrow fades out during the slide
  notifyTuckState(false);
  lerpAnimate(
    { x: curX, y: curY, w: currentWidth },
    { x: targetX, y: curY, w: WIN_WIDTH },
    TUCK_DURATION,
    () => {
      tucked = false;
      tucking = false;
    },
  );
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
  if (isPinned) return;
  if (tuckTimer) clearTimeout(tuckTimer);
  tuckTimer = setTimeout(() => {
    tuck();
  }, TUCK_DELAY);
});

ipcMain.on("set-pinned", (_, pinned) => {
  isPinned = pinned;
  // If just pinned while tucked, untuck immediately
  if (isPinned && tucked) {
    if (tuckTimer) {
      clearTimeout(tuckTimer);
      tuckTimer = null;
    }
    untuck();
  }
});

ipcMain.on("drag-end", (_, { x, y }) => {
  // Use the display where the window was dropped, not the primary display
  const wa = getWorkAreaForPoint(x + WIN_WIDTH / 2, y);
  const center = x + WIN_WIDTH / 2;
  dockedSide = center > wa.x + wa.width / 2 ? "right" : "left";

  // Move the window to the dropped display first so getWorkArea() picks it up
  if (win) {
    currentWidth = WIN_WIDTH;
    win.setBounds({ x, y, width: WIN_WIDTH, height: currentHeight });
  }
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
  win.setBounds({ x, y, width: currentWidth, height: h });
});

ipcMain.handle("get-docked-side", () => dockedSide);
ipcMain.handle("get-max-height", () => MAX_HEIGHT);

ipcMain.on("open-external", (_, url) => {
  shell.openExternal(url).catch(() => {});
});

ipcMain.on("set-ignore-mouse", (_, ignore) => {
  if (!win) return;
  if (ignore) {
    win.setIgnoreMouseEvents(true, { forward: true });
  } else {
    win.setIgnoreMouseEvents(false);
  }
});

// ── App lifecycle ────────────────────────────────────────────────────

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
