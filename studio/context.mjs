import { quote } from "./state.mjs";
const PREFIX = "higgsfield-studio-project-v2:";
const ACTIVE = "higgsfield-studio-active-project-v2";
const LEGACY = "higgsfield-studio-draft-v1";
const starter =
  "A slow cinematic push-in on a botanical perfume bottle. Morning light filters through the forest, catching the glass. Earthy, atmospheric, quietly luxurious.";
function parsed(storage, key) {
  try {
    return JSON.parse(storage.getItem(key));
  } catch {
    return null;
  }
}
export function activeProjectId(storage, projects) {
  const id = parsed(storage, ACTIVE) || parsed(storage, LEGACY)?.projectId;
  return projects.some((p) => p.id === id) ? id : projects[0].id;
}
export function readProjectContext(storage, projectId, jobs) {
  let value = parsed(storage, PREFIX + projectId);
  const old = parsed(storage, LEGACY);
  if (!value && old?.projectId === projectId) value = old;
  const context = {
    prompt: projectId === "vela" ? starter : "",
    preset: "forest",
    settings: { priority: "balanced", duration: 8, ratio: "16:9" },
    selectedId: null,
  };
  if (!value || typeof value !== "object") return context;
  if (typeof value.prompt === "string")
    context.prompt = value.prompt.slice(0, 2000);
  if (["forest", "golden", "noir"].includes(value.preset))
    context.preset = value.preset;
  try {
    quote(value.settings);
    context.settings = { ...value.settings };
  } catch {}
  if (
    jobs.some(
      (j) =>
        j.id === value.selectedId &&
        j.projectId === projectId &&
        j.status === "completed",
    )
  )
    context.selectedId = value.selectedId;
  return context;
}
export function saveProjectContext(storage, projectId, context) {
  storage.setItem(PREFIX + projectId, JSON.stringify(context));
  storage.setItem(ACTIVE, JSON.stringify(projectId));
}

// Delayed requests must not reintroduce warnings for an editor context left behind.
export function createValidationScope() {
  let revision = 0;
  return {
    capture: () => revision,
    invalidate: () => {
      revision++;
    },
    isCurrent: (token) => token === revision,
  };
}
