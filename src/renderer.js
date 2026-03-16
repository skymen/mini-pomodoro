import Sortable from "sortablejs";
import "./style.css";

// ── Sounds ──────────────────────────────────────────────────────
const sndAdd = document.getElementById("snd-add");
const sndChecked = document.getElementById("snd-checked");
const sndUnchecked = document.getElementById("snd-unchecked");
const sndTimerEnd = document.getElementById("snd-timer-end");

function playSound(audio) {
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

// ── Theme system ───────────────────────────────────────────────
let themePref = localStorage.getItem("pomo-theme") || "auto";
let systemTheme = "dark"; // updated by main process

function applyTheme() {
  const effective = themePref === "auto" ? systemTheme : themePref;
  document.documentElement.classList.toggle(
    "light",
    effective === "light",
  );

  // Update button active states
  document.querySelectorAll(".theme-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.theme === themePref);
  });
}

document.querySelectorAll(".theme-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    themePref = btn.dataset.theme;
    localStorage.setItem("pomo-theme", themePref);
    applyTheme();
  });
});

window.electronAPI.onSystemTheme((theme) => {
  systemTheme = theme;
  applyTheme();
});

applyTheme();

// ── Side tracking ──────────────────────────────────────────────
let dockedSide = "right";
const rootEl = document.getElementById("root");
const arrowTab = document.getElementById("arrow-tab");
const arrowIcon = document.getElementById("arrow-icon");
const miniTimerEl = document.getElementById("mini-timer");

function updateSideClasses(side) {
  dockedSide = side;
  if (side === "left") {
    rootEl.classList.add("dock-left");
  } else {
    rootEl.classList.remove("dock-left");
  }

  if (side === "right") {
    arrowIcon.innerHTML = '<polyline points="15 18 9 12 15 6" />';
  } else {
    arrowIcon.innerHTML = '<polyline points="9 18 15 12 9 6" />';
  }
}

window.electronAPI.getDockedSide().then(updateSideClasses);
window.electronAPI.onDockedSide(updateSideClasses);

// ── Tuck state ─────────────────────────────────────────────────
let isTucked = false;

window.electronAPI.onTuckState((tucked) => {
  isTucked = tucked;
  if (tucked) {
    arrowTab.classList.add("visible");
    updateMiniTimerVisibility();
  } else {
    arrowTab.classList.remove("visible");
    miniTimerEl.classList.remove("visible");
  }
});

// ── Drag handling ──────────────────────────────────────────────
const header = document.getElementById("header");
let dragging = false;
let dragOffsetX = 0,
  dragOffsetY = 0;

header.addEventListener("mousedown", (e) => {
  if (e.target.closest(".header-btn")) return;
  dragging = true;
  dragOffsetX = e.screenX - window.screenX;
  dragOffsetY = e.screenY - window.screenY;
  window.electronAPI.startDrag();
});

document.addEventListener("mousemove", (e) => {
  if (!dragging) return;
  window.moveTo(e.screenX - dragOffsetX, e.screenY - dragOffsetY);
});

document.addEventListener("mouseup", () => {
  if (!dragging) return;
  dragging = false;
  window.electronAPI.dragEnd({ x: window.screenX, y: window.screenY });
});

// ── Mouse enter / leave ────────────────────────────────────────
rootEl.addEventListener("mouseenter", () => {
  window.electronAPI.mouseEnter();
});

rootEl.addEventListener("mouseleave", () => {
  if (!dragging) window.electronAPI.mouseLeave();
});

// ── Close ──────────────────────────────────────────────────────
document.getElementById("close-btn").addEventListener("click", () => {
  window.electronAPI.closeWindow();
});

// ── Settings panel toggle ──────────────────────────────────────
const settingsPanel = document.getElementById("settings-panel");
const mainContent = document.getElementById("main-content");
const settingsBtn = document.getElementById("settings-btn");

settingsBtn.addEventListener("click", () => {
  const isOpen = settingsPanel.classList.toggle("open");
  settingsBtn.classList.toggle("active", isOpen);
  if (isOpen) {
    mainContent.classList.add("hidden");
  } else {
    mainContent.classList.remove("hidden");
  }
  requestResize();
});

// Open external links in default browser
document.querySelectorAll('a[target="_blank"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    window.electronAPI.openExternal(a.href);
  });
});

// ── Dynamic height ─────────────────────────────────────────────
function requestResize() {
  // Double-rAF ensures layout has fully settled after DOM mutations
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const panel = document.getElementById("panel");
      // Sum the offsetHeight of each direct child for an accurate
      // measurement that isn't inflated by stale scrollHeight values.
      let h = 0;
      for (const child of panel.children) {
        h += child.offsetHeight;
      }
      // Account for panel's own vertical padding/border/margin
      const style = getComputedStyle(panel);
      h += parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
      h +=
        parseFloat(style.borderTopWidth) +
        parseFloat(style.borderBottomWidth);
      h += 12; // outer chrome (root margins, arrow strip, etc.)
      window.electronAPI.resizeHeight(h);
    });
  });
}

// ── Tasks ──────────────────────────────────────────────────────
const taskInput = document.getElementById("task-input");
const addBtn = document.getElementById("add-btn");
const taskListEl = document.getElementById("task-list");
const doneSection = document.getElementById("done-section");
const doneListEl = document.getElementById("done-list");
const doneCountEl = document.getElementById("done-count");
const clearDoneBtn = document.getElementById("clear-done-btn");
let _nextId = 1;
function genId() { return _nextId++; }
let tasks = JSON.parse(localStorage.getItem("pomo-tasks") || "[]");
// Migrate tasks that lack an id (from older versions)
tasks.forEach((t) => { if (!t.id) t.id = genId(); });
// Ensure _nextId is above any existing id
tasks.forEach((t) => { if (t.id >= _nextId) _nextId = t.id + 1; });

clearDoneBtn.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  tasks = tasks.filter((t) => !t.done);
  saveTasks();
  renderTasks();
  requestResize();
});

// Track collapsed state for done section
const doneWasOpen = localStorage.getItem("pomo-done-open") === "true";
if (doneWasOpen) doneSection.open = true;
doneSection.addEventListener("toggle", () => {
  localStorage.setItem("pomo-done-open", doneSection.open);
  requestResize();
});

function saveTasks() {
  localStorage.setItem("pomo-tasks", JSON.stringify(tasks));
}

// Helper: create a DOM element for an incomplete task
function createIncompleteEl(t, origIdx) {
  const el = document.createElement("div");
  el.className = "task-item";
  el.dataset.idx = origIdx;
  el.dataset.id = t.id;
  el.innerHTML = `
    <div class="task-grip" title="Drag to reorder">
      <svg width="6" height="10" viewBox="0 0 6 10" fill="currentColor">
        <circle cx="1.5" cy="1.5" r="1"/><circle cx="4.5" cy="1.5" r="1"/>
        <circle cx="1.5" cy="5" r="1"/><circle cx="4.5" cy="5" r="1"/>
        <circle cx="1.5" cy="8.5" r="1"/><circle cx="4.5" cy="8.5" r="1"/>
      </svg>
    </div>
    <div class="task-check" data-i="${origIdx}"></div>
    <span class="task-text">${escapeHtml(t.text)}</span>
    <button class="task-del" data-i="${origIdx}">&times;</button>
  `;
  return el;
}

// Helper: create a DOM element for a completed task
function createDoneEl(t, origIdx, animateStrike) {
  const el = document.createElement("div");
  el.className = "task-item done";
  el.dataset.id = t.id;
  if (!animateStrike) el.classList.add("strike-no-anim");
  el.innerHTML = `
    <div class="task-check" data-i="${origIdx}"></div>
    <span class="task-text">${escapeHtml(t.text)}</span>
    <button class="task-del" data-i="${origIdx}">&times;</button>
  `;
  return el;
}

// Set of task IDs that have already been rendered as done at least once.
// Used to suppress the strikethrough animation on re-renders.
const _renderedDoneIds = new Set();
// Pre-seed with tasks already done on load so they don't animate
tasks.forEach((t) => { if (t.done) _renderedDoneIds.add(t.id); });

// Reconcile a container's children with a list of desired elements,
// keyed by data-id, reusing existing DOM nodes where possible.
function reconcileList(container, desiredEls) {
  const desiredMap = new Map();          // id -> new element
  const desiredOrder = [];               // ordered ids
  for (const el of desiredEls) {
    const id = el.dataset.id;
    desiredMap.set(id, el);
    desiredOrder.push(id);
  }

  const existingMap = new Map();
  for (const child of [...container.children]) {
    existingMap.set(child.dataset.id, child);
  }

  // Remove elements no longer in the list
  for (const [id, child] of existingMap) {
    if (!desiredMap.has(id)) {
      container.removeChild(child);
      existingMap.delete(id);
    }
  }

  // Update existing elements in-place; insert new ones
  let refNode = container.firstChild;
  for (const id of desiredOrder) {
    if (existingMap.has(id)) {
      const existing = existingMap.get(id);
      const desired = desiredMap.get(id);
      // Update mutable attributes (idx may have changed)
      if (existing.dataset.idx !== desired.dataset.idx) {
        existing.dataset.idx = desired.dataset.idx;
      }
      // Update data-i on check and delete buttons (index may shift)
      const eCheck = existing.querySelector(".task-check");
      const dCheck = desired.querySelector(".task-check");
      if (eCheck && dCheck && eCheck.dataset.i !== dCheck.dataset.i) {
        eCheck.dataset.i = dCheck.dataset.i;
      }
      const eDel = existing.querySelector(".task-del");
      const dDel = desired.querySelector(".task-del");
      if (eDel && dDel && eDel.dataset.i !== dDel.dataset.i) {
        eDel.dataset.i = dDel.dataset.i;
      }
      // Update text: if currently editing (input present), restore the span
      const eText = existing.querySelector(".task-text");
      const eInput = existing.querySelector(".task-edit-input");
      const dText = desired.querySelector(".task-text");
      if (eInput && dText) {
        eInput.replaceWith(dText.cloneNode(true));
      } else if (eText && dText && eText.innerHTML !== dText.innerHTML) {
        eText.innerHTML = dText.innerHTML;
      }
      // Move to correct position if needed
      if (existing !== refNode) {
        container.insertBefore(existing, refNode);
      } else {
        refNode = refNode.nextSibling;
      }
    } else {
      // New element – insert it with the fade-in animation
      const newEl = desiredMap.get(id);
      newEl.classList.add("fade-in");
      newEl.addEventListener("animationend", () => newEl.classList.remove("fade-in"), { once: true });
      container.insertBefore(newEl, refNode);
    }
  }
}

function renderTasks() {
  const incomplete = tasks.filter((t) => !t.done);
  const complete = tasks.filter((t) => t.done);

  // Build desired elements for incomplete tasks
  const incompleteEls = incomplete.map((t) => {
    return createIncompleteEl(t, tasks.indexOf(t));
  });

  // Build desired elements for done tasks
  const doneEls = complete.map((t) => {
    const alreadyRenderedDone = _renderedDoneIds.has(t.id);
    return createDoneEl(t, tasks.indexOf(t), !alreadyRenderedDone);
  });

  // Reconcile both lists
  reconcileList(taskListEl, incompleteEls);
  reconcileList(doneListEl, doneEls);

  // Track which tasks have been rendered as done
  _renderedDoneIds.clear();
  complete.forEach((t) => _renderedDoneIds.add(t.id));

  // Update done section visibility
  doneCountEl.textContent = `${complete.length} done`;
  if (complete.length === 0) {
    doneSection.style.display = "none";
  } else {
    doneSection.style.display = "";
  }

  requestResize();

  // Re-initialize SortableJS after DOM reconciliation
  initSortable();
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function addTask() {
  const text = taskInput.value.trim();
  if (!text) return;
  tasks.push({ id: genId(), text, done: false });
  saveTasks();
  renderTasks();
  taskInput.value = "";
  taskInput.focus();
  playSound(sndAdd);
}

addBtn.addEventListener("click", addTask);
taskInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addTask();
});

// Click handler for checks and deletes (both lists)
function handleTaskClick(e) {
  const check = e.target.closest(".task-check");
  const del = e.target.closest(".task-del");
  if (check) {
    const i = +check.dataset.i;
    tasks[i].done = !tasks[i].done;
    playSound(tasks[i].done ? sndChecked : sndUnchecked);
    saveTasks();
    renderTasks();
  } else if (del) {
    const i = +del.dataset.i;
    tasks.splice(i, 1);
    saveTasks();
    renderTasks();
  }
}

taskListEl.addEventListener("click", handleTaskClick);
doneListEl.addEventListener("click", handleTaskClick);

// ── Double-click to edit task text ─────────────────────────────
function startEditTask(taskItem, idx) {
  const textEl = taskItem.querySelector(".task-text");
  if (!textEl || taskItem.querySelector(".task-edit-input")) return;

  const currentText = tasks[idx].text;
  const input = document.createElement("input");
  input.type = "text";
  input.className = "task-edit-input";
  input.value = currentText;

  textEl.replaceWith(input);
  input.focus();
  input.select();

  function commitEdit() {
    const newText = input.value.trim();
    if (newText && newText !== currentText) {
      tasks[idx].text = newText;
      saveTasks();
    }
    renderTasks();
  }

  input.addEventListener("blur", commitEdit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      input.blur();
    } else if (e.key === "Escape") {
      input.removeEventListener("blur", commitEdit);
      renderTasks();
    }
  });
}

function handleTaskDblClick(e) {
  const taskItem = e.target.closest(".task-item");
  if (!taskItem || taskItem.classList.contains("done")) return;
  const idx = +taskItem.dataset.idx;
  if (isNaN(idx)) return;
  startEditTask(taskItem, idx);
}

taskListEl.addEventListener("dblclick", handleTaskDblClick);

// ── SortableJS drag-and-drop reorder (incomplete tasks only) ──
let sortableInstance = null;

function initSortable() {
  if (sortableInstance) {
    sortableInstance.destroy();
  }

  sortableInstance = Sortable.create(taskListEl, {
    animation: 200,
    ghostClass: "sortable-ghost",
    chosenClass: "sortable-chosen",
    dragClass: "sortable-drag",
    easing: "cubic-bezier(0.25, 1, 0.5, 1)",
    // Use fallback mode to avoid the native HTML5 DnD backend entirely.
    // This prevents the OS drop-cursor flash and gives us full control
    // over the drag visual.
    forceFallback: true,
    fallbackClass: "sortable-fallback",
    // Don't drag when clicking interactive elements
    filter: ".task-check, .task-del, .task-edit-input",
    preventOnFilter: false,
    onEnd(evt) {
      const { oldIndex, newIndex } = evt;
      if (oldIndex === newIndex) return;

      // Map from list indices (incomplete only) to tasks array indices
      const incompleteIndices = [];
      tasks.forEach((t, i) => { if (!t.done) incompleteIndices.push(i); });

      const srcTaskIdx = incompleteIndices[oldIndex];
      const [moved] = tasks.splice(srcTaskIdx, 1);

      // Recalculate incomplete indices after removal
      const newIncompleteIndices = [];
      tasks.forEach((t, i) => { if (!t.done) newIncompleteIndices.push(i); });

      // Find where to insert
      let insertAt;
      if (newIndex >= newIncompleteIndices.length) {
        // Moved to end — insert after last incomplete task
        insertAt = newIncompleteIndices.length > 0
          ? newIncompleteIndices[newIncompleteIndices.length - 1] + 1
          : tasks.length;
      } else {
        insertAt = newIncompleteIndices[newIndex];
      }

      tasks.splice(insertAt, 0, moved);
      saveTasks();

      // Update data-idx and data-i attributes to reflect new indices
      for (const child of taskListEl.children) {
        const id = +child.dataset.id;
        const newIdx = tasks.findIndex((t) => t.id === id);
        child.dataset.idx = newIdx;
        const chk = child.querySelector(".task-check");
        if (chk) chk.dataset.i = newIdx;
        const del = child.querySelector(".task-del");
        if (del) del.dataset.i = newIdx;
      }

      requestResize();

      // After a fallback drag, the browser doesn't re-evaluate :hover
      // because no real pointer-move event fires once the item lands.
      // Nudge the hover state by dispatching a synthetic pointer event
      // on the element currently under the cursor.
      requestAnimationFrame(() => {
        const el = document.elementFromPoint(evt.originalEvent.clientX, evt.originalEvent.clientY);
        if (el) {
          el.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
          el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
        }
      });
    },
  });
}

renderTasks();

// ── Pomodoro Timer ─────────────────────────────────────────────
const FOCUS_MINS = 25;
const SHORT_BREAK = 5;
const LONG_BREAK = 15;
const SESSIONS = 4;

let session = 1;
let isBreak = false;
let totalSeconds = FOCUS_MINS * 60;
let remaining = totalSeconds;
let running = false;
let interval = null;

const timerDisplay = document.getElementById("timer-display");
const timerPhase = document.getElementById("timer-phase");
const timerSessionInfo = document.getElementById("timer-session-info");
const smRingProgress = document.getElementById("sm-ring-progress");
const btnPlay = document.getElementById("btn-play");
const iconPlay = document.getElementById("icon-play");
const iconPause = document.getElementById("icon-pause");
const btnReset = document.getElementById("btn-reset");
const btnSkip = document.getElementById("btn-skip");

const SM_CIRCUMFERENCE = 2 * Math.PI * 20;
const MINI_CIRCUMFERENCE = 2 * Math.PI * 9;

const miniRingProgress = document.getElementById("mini-ring-progress");
const miniTimerText = document.getElementById("mini-timer-text");
const keepTimerToggle = document.getElementById("keep-timer-toggle");

keepTimerToggle.checked =
  localStorage.getItem("pomo-keep-timer") === "true";
keepTimerToggle.addEventListener("change", () => {
  localStorage.setItem("pomo-keep-timer", keepTimerToggle.checked);
  updateMiniTimerVisibility();
});

function fmt(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function updateTimerUI() {
  timerDisplay.textContent = fmt(remaining);
  const progress = 1 - remaining / totalSeconds;

  smRingProgress.setAttribute(
    "stroke-dashoffset",
    (SM_CIRCUMFERENCE * (1 - progress)).toFixed(2),
  );

  timerPhase.textContent = isBreak ? "Break" : "Focus";
  timerSessionInfo.textContent = `Session ${session} / ${SESSIONS}`;

  miniTimerText.textContent = fmt(remaining);
  miniRingProgress.setAttribute(
    "stroke-dashoffset",
    (MINI_CIRCUMFERENCE * (1 - progress)).toFixed(2),
  );
}

function updateMiniTimerVisibility() {
  const showMini = isTucked && running && keepTimerToggle.checked;
  if (showMini) {
    miniTimerEl.classList.add("visible");
    arrowTab.classList.remove("visible");
  } else if (isTucked) {
    miniTimerEl.classList.remove("visible");
    arrowTab.classList.add("visible");
  } else {
    miniTimerEl.classList.remove("visible");
  }
}

function tick() {
  if (remaining <= 0) {
    clearInterval(interval);
    running = false;
    iconPlay.style.display = "";
    iconPause.style.display = "none";
    playSound(sndTimerEnd);
    onPhaseEnd();
    updateMiniTimerVisibility();
    return;
  }
  remaining--;
  updateTimerUI();
}

function onPhaseEnd() {
  if (!isBreak) {
    const idx = tasks.findIndex((t) => !t.done);
    if (idx !== -1) {
      tasks[idx].done = true;
      saveTasks();
      renderTasks();
    }
    isBreak = true;
    totalSeconds =
      (session % SESSIONS === 0 ? LONG_BREAK : SHORT_BREAK) * 60;
  } else {
    isBreak = false;
    session++;
    totalSeconds = FOCUS_MINS * 60;
  }
  remaining = totalSeconds;
  updateTimerUI();
  startTimer();
}

function startTimer() {
  if (running) return;
  running = true;
  iconPlay.style.display = "none";
  iconPause.style.display = "";
  btnPlay.classList.add("playing");
  interval = setInterval(tick, 1000);
  updateMiniTimerVisibility();
}

function pauseTimer() {
  running = false;
  clearInterval(interval);
  iconPlay.style.display = "";
  iconPause.style.display = "none";
  btnPlay.classList.remove("playing");
  updateMiniTimerVisibility();
}

btnPlay.addEventListener("click", () =>
  running ? pauseTimer() : startTimer(),
);
btnReset.addEventListener("click", () => {
  pauseTimer();
  remaining = totalSeconds;
  updateTimerUI();
});
btnSkip.addEventListener("click", () => {
  pauseTimer();
  remaining = 0;
  onPhaseEnd();
});

updateTimerUI();

// Initial resize
requestResize();
