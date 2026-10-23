import {
  ACTIVE,
  forecastBudget,
  createState,
  available,
  used,
  quote,
  startJob,
  advanceJobs,
  cancelJob,
  setBudget,
} from "./state.mjs";
import { createRepository } from "./repository.mjs";
import {
  activeProjectId,
  readProjectContext,
  saveProjectContext,
  createValidationScope,
} from "./context.mjs";
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
const KEY = "higgsfield-studio-v1";
const icon = (name) =>
  `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
let storageOK = true,
  storageWarned = false;
function load() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY));
    if (
      value?.version === 1 &&
      Array.isArray(value.projects) &&
      value.projects.length &&
      Array.isArray(value.jobs) &&
      Array.isArray(value.ledger) &&
      Number.isFinite(value.initialBalance)
    )
      return value;
  } catch {}
  return createState();
}
let state = advanceJobs(load()),
  projectId = state.projects[0].id,
  view = "workspace",
  preset = "forest",
  settings = { priority: "balanced", duration: 8, ratio: "16:9" },
  selectedId = null,
  reference = null,
  pending = false;
const sessionContexts = new Map(),
  references = new Map(),
  validationScope = createValidationScope();
try {
  projectId = activeProjectId(localStorage, state.projects);
} catch {}
restoreContext(projectId);
function restoreContext(id) {
  let context = sessionContexts.get(id);
  try {
    context ||= readProjectContext(localStorage, id, state.jobs);
  } catch {}
  context ||= readProjectContext({ getItem: () => null }, id, state.jobs);
  preset = context.preset;
  settings = { ...context.settings };
  selectedId = context.selectedId;
  $("#prompt").value = context.prompt;
  reference = references.get(id) || null;
  renderReference();
  $("#failure-toggle").checked = false;
}
function clearValidation() {
  validationScope.invalidate();
  const error = $("#generation-error");
  if (!error.hidden && $("#toast").textContent === error.textContent)
    $("#toast").hidden = true;
  error.hidden = true;
  error.textContent = "";
}
function saveDraft() {
  clearValidation();
  const context = {
    preset,
    settings: { ...settings },
    selectedId,
    prompt: $("#prompt").value,
  };
  sessionContexts.set(projectId, context);
  references.set(projectId, reference);
  try {
    saveProjectContext(localStorage, projectId, context);
  } catch {
    storageWarning();
  }
}
function renderReference() {
  $("#reference-input").value = "";
  $("#reference-label").textContent = reference?.name || "Add reference";
  $("#clear-reference").hidden = !reference;
  $("#reference-preview").hidden = !reference;
  $("#reference-preview").innerHTML = reference
    ? `<img src="${reference.url}" alt="Your local reference"><span>${escape(reference.name)}<br>Local reference only · Sample content is unchanged</span>`
    : "";
}
function storageWarning() {
  storageOK = false;
  if (!storageWarned) {
    storageWarned = true;
    toast(
      "Browser storage is unavailable. Keep this tab open; changes may not survive a refresh.",
    );
  }
}
function persist(next) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    storageWarning();
  }
}
const updateRepository = createRepository({
  read: () => advanceJobs(storageOK ? load() : state),
  write: persist,
  withLock: (fn) => (navigator.locks ? navigator.locks.request(KEY, fn) : fn()),
});
async function transact(fn) {
  const errorProjectId = projectId,
    errorScope = validationScope.capture();
  try {
    const next = await updateRepository(fn);
    render();
    return next;
  } catch (error) {
    if (projectId === errorProjectId && validationScope.isCurrent(errorScope))
      showError(error.message);
    throw error;
  }
}

function toast(message) {
  $("#toast").textContent = message;
  $("#toast").hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => ($("#toast").hidden = true), 5000);
}
function showError(message) {
  $("#generation-error").textContent = message;
  $("#generation-error").hidden = false;
  toast(message);
}
function project() {
  return state.projects.find((p) => p.id === projectId) || state.projects[0];
}
function jobs() {
  return state.jobs
    .filter((j) => j.projectId === project().id)
    .sort((a, b) => b.createdAt - a.createdAt);
}
function selected() {
  return state.jobs.find(
    (j) =>
      j.id === selectedId &&
      j.projectId === project().id &&
      j.status === "completed",
  );
}
function mediaPath(config = settings, look = preset) {
  const ratio = { "16:9": "wide", "9:16": "social", "1:1": "square" }[
    config.ratio
  ];
  return `assets/${look}-${ratio}-${config.duration}.mp4`;
}
function switchProject(id) {
  saveDraft();
  stopPreview();
  projectId = id;
  restoreContext(id);
  view = "workspace";
  saveDraft();
  render();
}
function setView(next) {
  view = next;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function openModal(title, body, wide = false) {
  $("#modal-title").textContent = title;
  $("#modal-body").innerHTML = body;
  $("#modal").classList.toggle("compare-dialog", wide);
  $("#modal").showModal();
}
function closeModal() {
  $("#modal").close();
  $("#modal-body").innerHTML = "";
}
$("#close-modal").onclick = closeModal;
$("#modal").addEventListener("click", (e) => {
  if (e.target === $("#modal")) {
    const r = $("#modal").getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      closeModal();
  }
});
function demoInfo() {
  openModal(
    "A real workspace. A sample engine.",
    `<p>This is Hamza Hameed’s product engineering assessment: a considered reinterpretation of Higgsfield.</p><p><strong>What works:</strong> budgets, credit reservations and returns, project history, reference previews, version comparison and film downloads.</p><p><strong>What’s simulated:</strong> AI generation, model recommendations, credit prices and queue timings. Films are bundled animations of an original AI-created campaign still. Your brief and uploaded references do not change the sample content.</p><p>Everything stays in this browser. No real money, account, API calls or uploads. Your reference preview is session-only; project records persist locally.</p><button class="primary-button" id="demo-understood">Back to creating →</button>`,
  );
  $("#demo-understood").onclick = closeModal;
}
function newProject() {
  openModal(
    "Make room for a new idea.",
    `<p>Give your next exploration a name. Every project gets its own budget; your demo balance is shared.</p><form id="new-project-form"><label for="project-name">Project name</label><input id="project-name" maxlength="60" required placeholder="e.g. Autumn launch film" autocomplete="off"><label for="new-budget">Project budget · demo credits</label><input id="new-budget" type="number" min="0" max="10000" step="1" value="40" required><p class="modal-error" id="form-error" role="alert"></p><button class="primary-button">Create project →</button></form>`,
  );
  $("#new-project-form").onsubmit = async (e) => {
    e.preventDefault();
    const name = $("#project-name").value.trim(),
      budget = Number($("#new-budget").value);
    if (!name || !Number.isInteger(budget) || budget < 0 || budget > 10000) {
      $("#form-error").textContent =
        "Add a name and a whole-number budget from 0 to 10,000.";
      return;
    }
    try {
      const id = crypto.randomUUID();
      await transact((s) => ({
        ...s,
        projects: [...s.projects, { id, name, budget, createdAt: Date.now() }],
      }));
      closeModal();
      switchProject(id);
      toast("New project. Fresh possibilities.");
    } catch (error) {
      $("#form-error").textContent = error.message;
    }
  };
}
function editProject() {
  const p = project();
  openModal(
    "A little structure. More freedom.",
    `<p>Your project limit is a hard cap. Reserved and completed generations count toward it.</p><form id="edit-project-form"><label for="edit-name">Project name</label><input id="edit-name" value="${escape(p.name)}" maxlength="60" required><label for="edit-budget-input">Project limit · demo credits</label><input id="edit-budget-input" type="number" min="${used(state, p.id)}" max="10000" step="1" value="${p.budget}" required><p>${used(state, p.id)} credits already committed. Your shared balance is ${available(state)}.</p><p class="modal-error" id="form-error" role="alert"></p><button class="primary-button">Save project settings</button></form>`,
  );
  $("#edit-project-form").onsubmit = async (e) => {
    e.preventDefault();
    const name = $("#edit-name").value.trim(),
      budget = Number($("#edit-budget-input").value);
    if (!name) {
      $("#form-error").textContent = "Give your project a name.";
      return;
    }
    try {
      await transact((s) => {
        const next = setBudget(s, p.id, budget);
        next.projects.find((x) => x.id === p.id).name = name;
        return next;
      });
      clearValidation();
      closeModal();
      toast("Project settings saved.");
    } catch (error) {
      $("#form-error").textContent = error.message;
    }
  };
}
function updateSettings() {
  settings.duration = Number($("#duration").value);
  settings.ratio = $("#aspect-ratio").value;
  saveDraft();
  stopPreview();
  render();
}
function stopPreview() {
  const video = $("#preview-video");
  video.pause();
  video.hidden = true;
  $("#preview-frame").classList.remove("playing");
}
function render() {
  const p = project();
  projectId = p.id;
  const q = quote(settings),
    spent = used(state, p.id),
    balance = available(state),
    active = jobs().find((j) => ACTIVE.includes(j.status)),
    current = selected();
  $("#breadcrumb-project").textContent = p.name;
  $("#balance").textContent = balance;
  $("#balance-meter").style.width = `${Math.max(0, (balance / 120) * 100)}%`;
  $("#project-count").textContent = state.projects.length;
  $$(".nav-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.view === view);
    if (el.dataset.view === view) el.setAttribute("aria-current", "page");
    else el.removeAttribute("aria-current");
  });
  for (const name of ["workspace", "projects", "activity"])
    $(`#${name}-view`).hidden = view !== name;
  $("#project-list").innerHTML = state.projects
    .map(
      (item) =>
        `<button class="project-item ${item.id === p.id ? "selected" : ""}" data-project="${escape(item.id)}"><span class="project-dot"></span><span>${escape(item.name)}</span></button>`,
    )
    .join("");
  $$("#project-list [data-project]").forEach(
    (el) => (el.onclick = () => switchProject(el.dataset.project)),
  );
  $("#presets")
    .querySelectorAll("button")
    .forEach((el) => {
      el.classList.toggle("selected", el.dataset.preset === preset);
      el.setAttribute("aria-pressed", el.dataset.preset === preset);
    });
  $$("#priorities button").forEach((el) => {
    el.classList.toggle("selected", el.dataset.priority === settings.priority);
    el.setAttribute("aria-pressed", el.dataset.priority === settings.priority);
  });
  $("#duration").value = settings.duration;
  $("#aspect-ratio").value = settings.ratio;
  $("#recommended-model").textContent = q.model;
  $("#quote-cost").textContent = q.cost;
  $("#quote-eta").textContent = q.estimated;
  $("#budget-used").textContent = spent;
  $("#budget-total").textContent = p.budget;
  $("#project-meter").style.width =
    `${p.budget ? Math.min(100, (spent / p.budget) * 100) : 0}%`;
  const forecast = forecastBudget(state, p.id, settings);
  $("#forecast-meter").style.width =
    `${p.budget ? Math.max(0, (Math.min(forecast.additionalCost, p.budget - spent) / p.budget) * 100) : 0}%`;
  const left = forecast.remaining;
  $("#budget-after").textContent =
    left < 0
      ? `${-left} credits over your project limit`
      : `${left} credits left after this generation`;
  $("#budget-after").classList.toggle("danger-text", left < 0);
  const canRun = !active && !pending;
  $("#generate-button").disabled = !canRun;
  $("#generate-button span").textContent = active
    ? "Creating your sample…"
    : pending
      ? "Preparing…"
      : "Create sample film";
  const displaySettings = current?.settings || settings,
    displayPreset = current?.preset || preset;
  $("#preview-image").style.filter =
    displayPreset === "golden"
      ? "sepia(.7) saturate(.85) brightness(1.12)"
      : displayPreset === "noir"
        ? "grayscale(.9) brightness(.7) contrast(1.1)"
        : "none";
  $("#preview-frame").style.aspectRatio = displaySettings.ratio.replace(
    ":",
    "/",
  );
  $("#preview-frame").style.maxHeight = "530px";
  $("#preview-title").textContent = p.name;
  $("#preview-meta").textContent = current
    ? `${current.accepted ? "APPROVED" : "SAMPLE RESULT"} · VERSION ${
        jobs()
          .filter((j) => j.status === "completed")
          .reverse()
          .findIndex((j) => j.id === current.id) + 1
      }`
    : "STARTER PREVIEW";
  $("#frame-format").textContent =
    `${displaySettings.duration} SEC / ${displaySettings.ratio}`;
  $("#result-menu").hidden = !current;
  $("#result-status").innerHTML = current
    ? `${icon(current.accepted ? "check" : "film")}<span>${current.accepted ? "Marked as a keeper." : current.report ? "Feedback saved · pending review." : "Sample ready. What do you think?"}</span>`
    : `${icon("leaf")}<span>A starting point for something great.</span>`;
  $("#version-count").textContent =
    `${jobs().filter((j) => j.status === "completed").length} saved ${jobs().filter((j) => j.status === "completed").length === 1 ? "version" : "versions"}`;
  $("#versions").innerHTML =
    `<button class="version-card ${!selectedId ? "selected" : ""}" data-version="starter"><img src="assets/vela-forest.png" alt="Starter campaign sample"><span>Starter shot<small>Sample</small></span></button>` +
    jobs()
      .map(
        (j, i) =>
          `<button class="version-card ${j.id === selectedId ? "selected" : ""}" data-version="${escape(j.id)}" ${j.status !== "completed" ? "disabled" : ""}><img src="assets/vela-forest.png" alt="${escape(j.preset)} sample version" class="${j.preset}"><span>Exploration ${jobs().length - i}<small>${j.cost} cr</small></span><span class="version-state">${j.status === "completed" ? (j.accepted ? "✓ Approved" : "Ready") : j.status === "processing" ? "Creating" : j.status === "queued" ? "Queued" : j.status === "failed" ? "Failed · refunded" : "Cancelled"}</span></button>`,
      )
      .join("") +
    `<button class="version-card add-version" id="another-version">${icon("plus")}Explore another</button>`;
  $$("#versions [data-version]").forEach(
    (el) =>
      (el.onclick = () => {
        selectedId =
          el.dataset.version === "starter" ? null : el.dataset.version;
        saveDraft();
        stopPreview();
        render();
      }),
  );
  $("#another-version").onclick = () => {
    selectedId = null;
    saveDraft();
    stopPreview();
    render();
    $("#prompt").focus();
  };
  $("#prompt-length").textContent = `${$("#prompt").value.length} / 2,000`;
  $("#job-overlay").hidden = !active;
  if (active) {
    const queued = active.status === "queued";
    $("#job-overlay").innerHTML =
      `<div><div class="orbit-loader"></div><div class="steps">BRIEF READY <span>—</span> ${queued ? "QUEUED" : "CREATING"} <span>— SAMPLE FILM</span></div><h3>${queued ? "Your idea is next." : "A little magic in motion."}</h3><p>${queued ? "Your demo credits are reserved. You can still cancel." : "Playing out a simulated generation. Your brief and reference stay safe."}</p><span class="tiny-pill">DEMO · ABOUT ${Math.max(1, Math.ceil((14000 - (Date.now() - active.createdAt)) / 1000))} SEC LEFT</span>${queued ? '<button class="subtle-button" id="cancel-generation">Cancel & return credits</button>' : ""}</div>`;
    if (queued)
      $("#cancel-generation").onclick = () =>
        transact((s) => cancelJob(s, active.id))
          .then(() => toast("Cancelled. Reserved credits returned."))
          .catch(() => {});
  }
  renderProjects();
  renderActivity();
}
function renderProjects() {
  $("#project-cards").innerHTML = state.projects
    .map(
      (p) =>
        `<button class="project-card" data-open-project="${escape(p.id)}"><img src="assets/vela-forest.png" alt="Product film sample project cover"><div class="project-card-content"><h2>${escape(p.name)}</h2><p>${state.jobs.filter((j) => j.projectId === p.id && j.status === "completed").length} saved explorations · Product film</p><div class="project-card-footer"><span>${used(state, p.id)} / ${p.budget} credits committed</span><span>Open project ↗</span></div></div></button>`,
    )
    .join("");
  $$("[data-open-project]").forEach(
    (el) => (el.onclick = () => switchProject(el.dataset.openProject)),
  );
}
function renderActivity() {
  const returned = state.ledger
      .filter((e) => e.amount > 0)
      .reduce((sum, e) => sum + e.amount, 0),
    committed = 120 - available(state);
  $("#activity-summary").innerHTML =
    `<div class="stat-card"><span>AVAILABLE BALANCE</span><strong>${available(state)} <small>demo credits</small></strong></div><div class="stat-card"><span>RESERVED & USED</span><strong>${committed} <small>demo credits</small></strong></div><div class="stat-card"><span>SAFELY RETURNED</span><strong>${returned} <small>demo credits</small></strong></div>`;
  $("#activity-empty").hidden = !!state.ledger.length;
  $("#activity-rows").innerHTML = [...state.ledger]
    .reverse()
    .map((e) => {
      const j = state.jobs.find((j) => j.id === e.jobId),
        p = state.projects.find((p) => p.id === e.projectId);
      return `<tr><td>${e.amount > 0 ? "Credits returned" : j?.status === "completed" ? "Sample completed" : "Credits reserved"}<small>${escape(e.reason || j?.model || "Demo generation")}</small></td><td>${escape(p?.name || "Project")}</td><td>${new Date(e.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td><td class="${e.amount > 0 ? "positive" : ""}">${e.amount > 0 ? "+" : ""}${e.amount}</td></tr>`;
    })
    .join("");
}
$$("[data-view]").forEach(
  (el) => (el.onclick = () => setView(el.dataset.view)),
);
$$('[data-action="new-project"]').forEach((el) => (el.onclick = newProject));
$$('[data-action="demo-info"]').forEach((el) => (el.onclick = demoInfo));
$(".brand").onclick = (e) => {
  e.preventDefault();
  setView("workspace");
};
$("#edit-budget").onclick = editProject;
$("#rename-project").onclick = editProject;
$$("[data-preset]").forEach(
  (el) =>
    (el.onclick = () => {
      preset = el.dataset.preset;
      selectedId = null;
      stopPreview();
      saveDraft();
      render();
    }),
);
$$("[data-priority]").forEach(
  (el) =>
    (el.onclick = () => {
      settings.priority = el.dataset.priority;
      saveDraft();
      render();
    }),
);
$("#duration").onchange = updateSettings;
$("#aspect-ratio").onchange = updateSettings;
$("#prompt").oninput = () => {
  $("#prompt-length").textContent = `${$("#prompt").value.length} / 2,000`;
  saveDraft();
  $("#generation-error").hidden = true;
};
$("#use-example").onclick = () => {
  $("#prompt").value = [
    "A slow cinematic push-in on a botanical perfume bottle. Morning light filters through the forest, catching the glass. Earthy, atmospheric, quietly luxurious.",
    "A warm golden-hour reveal. A botanical fragrance catches the last light of the day. Gentle camera movement, rich amber tones, understated luxury.",
    "An intimate after-dark product portrait. Sculptural shadows, silver highlights on dark glass, a restrained monochrome palette. Slow and deliberate.",
  ][["forest", "golden", "noir"].indexOf(preset)];
  saveDraft();
  render();
  toast("A starting point. Make it yours.");
};
$("#generate-button").onclick = async () => {
  if (pending) return;
  pending = true;
  clearValidation();
  stopPreview();
  render();
  try {
    const request = {
      projectId: project().id,
      prompt: $("#prompt").value,
      preset,
      settings: { ...settings },
      outcome: $("#failure-toggle").checked ? "failure" : "success",
      referenceName: reference?.name || null,
    };
    await transact((s) => startJob(s, request));
    $("#failure-toggle").checked = false;
    toast("Demo credits reserved. Your sample is in the queue.");
  } catch {
  } finally {
    pending = false;
    render();
  }
};
$("#play-preview").onclick = () => {
  const current = selected(),
    video = $("#preview-video");
  video.src = mediaPath(
    current?.settings || settings,
    current?.preset || preset,
  );
  video.hidden = false;
  $("#preview-frame").classList.add("playing");
  video
    .play()
    .catch(() =>
      toast("Press play in the video controls to start the sample."),
    );
};
$("#preview-video").onerror = () => {
  stopPreview();
  toast("This sample could not load. Please refresh and try again.");
};
$("#download-button").onclick = () => {
  const current = selected(),
    config = current?.settings || settings,
    look = current?.preset || preset;
  const a = document.createElement("a");
  a.href = mediaPath(config, look);
  a.download = `vela-${look}-${config.ratio.replace(":", "x")}-${config.duration}s-sample.mp4`;
  a.click();
  toast("Downloading bundled sample film.");
};
$("#compare-button").onclick = () => {
  const completed = jobs().filter((j) => j.status === "completed");
  if (!completed.length) {
    toast("Create a sample first, then compare it with the starter shot.");
    return;
  }
  const a = selected() || completed[0],
    b = completed.find((j) => j.id !== a.id);
  openModal(
    "Two directions. One vision.",
    `<p>Compare your sample explorations side by side. Each film is a bundled sample, not generated from your brief.</p><div class="compare-grid"><div><video controls playsinline preload="metadata" src="${mediaPath(a.settings, a.preset)}"></video><p>${escape(a.model)} · ${a.settings.duration}s · ${a.settings.ratio}</p><small>${escape(a.prompt)}</small></div><div><video controls playsinline preload="metadata" src="${mediaPath(b?.settings || { duration: 8, ratio: "16:9" }, b?.preset || "forest")}"></video><p>${b ? escape(b.model) : "Starter shot"} · ${b?.settings.duration || 8}s</p><small>${b ? escape(b.prompt) : "The original campaign sample."}</small></div></div>`,
    true,
  );
};
$("#result-menu").onclick = () => {
  const current = selected();
  if (!current) return;
  openModal(
    "Is this the direction?",
    `<p>${escape(current.prompt)}</p><p>${current.cost} demo credits · ${escape(current.model)} · ${current.settings.duration}s</p><div class="modal-actions"><button class="primary-button" id="accept-result">${current.accepted ? "Keep approved" : "Mark as a keeper"}</button><button class="subtle-button" id="iterate-result">Explore a variation</button></div><button class="text-button" style="margin-top:20px" id="report-result">${current.report ? "Feedback is pending review" : "Report an issue with this sample"}</button>`,
  );
  $("#accept-result").onclick = () =>
    transact((s) => {
      const j = s.jobs.find((j) => j.id === current.id);
      if (j) j.accepted = true;
      return s;
    })
      .then(() => {
        closeModal();
        toast("Marked as a keeper.");
      })
      .catch(() => {});
  $("#iterate-result").onclick = () => {
    preset = current.preset;
    settings = { ...current.settings };
    $("#prompt").value = current.prompt;
    selectedId = null;
    saveDraft();
    closeModal();
    render();
    $("#prompt").focus();
  };
  $("#report-result").onclick = () => {
    if (current.report) {
      toast("Your feedback is already pending review.");
      return;
    }
    openModal(
      "Tell us what missed the mark.",
      `<p>For this concept, feedback is saved locally as pending review. A report does not automatically grant credits.</p><div class="report-options">${["Ignored the brief", "Visual issue", "Unexpected motion", "Other"].map((reason) => `<button data-report="${reason}">${reason} →</button>`).join("")}</div>`,
    );
    $$("[data-report]").forEach(
      (el) =>
        (el.onclick = () =>
          transact((s) => {
            const j = s.jobs.find((j) => j.id === current.id);
            if (j && !j.report)
              j.report = {
                reason: el.dataset.report,
                status: "pending",
                at: Date.now(),
              };
            return s;
          })
            .then(() => {
              closeModal();
              toast("Feedback saved. Pending review in this demo.");
            })
            .catch(() => {})),
    );
  };
};
$("#add-reference").onclick = () => $("#reference-input").click();
$("#reference-input").onchange = () => {
  const file = $("#reference-input").files[0];
  if (!file) return;
  if (
    !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
    file.size > 5 * 1024 * 1024
  ) {
    toast("Choose a JPG, PNG or WebP image under 5 MB.");
    $("#reference-input").value = "";
    return;
  }
  if (reference) URL.revokeObjectURL(reference.url);
  reference = { name: file.name, url: URL.createObjectURL(file) };
  saveDraft();
  $("#reference-label").textContent = file.name;
  $("#clear-reference").hidden = false;
  $("#reference-preview").hidden = false;
  $("#reference-preview").innerHTML =
    `<img src="${reference.url}" alt="Your local reference"><span>${escape(file.name)}<br>Local reference only · Sample content is unchanged</span>`;
};
$("#clear-reference").onclick = () => {
  if (reference) URL.revokeObjectURL(reference.url);
  reference = null;
  saveDraft();
  $("#reference-input").value = "";
  $("#reference-label").textContent = "Add reference";
  $("#clear-reference").hidden = true;
  $("#reference-preview").hidden = true;
  $("#reference-preview").innerHTML = "";
};
document.addEventListener("keydown", (e) => {
  if (
    e.key.toLowerCase() === "n" &&
    !e.metaKey &&
    !e.ctrlKey &&
    !e.altKey &&
    !["INPUT", "TEXTAREA", "SELECT"].includes(
      document.activeElement?.tagName,
    ) &&
    !$("#modal").open
  ) {
    setView("workspace");
    $("#prompt").focus();
  }
});
window.addEventListener("storage", (e) => {
  if (e.key === KEY) {
    state = advanceJobs(load());
    if (!state.projects.some((p) => p.id === projectId))
      projectId = state.projects[0].id;
    render();
  }
});
setInterval(() => {
  if (!state.jobs.some((j) => ACTIVE.includes(j.status))) return;
  const before = JSON.stringify(state);
  transact((s) => advanceJobs(s))
    .then(() => {
      if (before !== JSON.stringify(state)) {
        const finished = jobs().find(
          (j) => j.status === "completed" && Date.now() - j.finishedAt < 1800,
        );
        const failed = jobs().find(
          (j) => j.status === "failed" && Date.now() - j.finishedAt < 1800,
        );
        if (finished) {
          selectedId = finished.id;
          saveDraft();
          stopPreview();
          render();
          toast("Your sample film is ready. Take a look.");
        }
        if (failed) {
          toast(
            "Sample generation failed. Reserved credits returned automatically.",
          );
        }
      }
    })
    .catch(() => {});
}, 1000);
render();
transact((s) => s).catch(() => {});
