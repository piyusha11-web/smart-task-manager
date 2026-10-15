import { NextResponse } from "next/server";
import { getStore } from "@netlify/blobs";

/**
 * In-memory "database" (globalThis) + optional Netlify Blobs persistence.
 * Netlify runs API routes as serverless functions: plain memory can reset on cold start.
 * So we try to persist the whole DB in Netlify Blobs; if Blobs isn't available
 * (e.g. local `next dev`) we silently fall back to pure in-memory state.
 */
const KEY = "db";
const g = globalThis;
export const PRIORITIES = ["Low", "Medium", "High"];
export const STATUSES = ["To Do", "In Progress", "Done"];

export class ApiError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

// Deterministic ids so repeated seeding always yields identical data.
function seed() {
  const now = new Date().toISOString();
  return {
    users: [
      { id: "u1", name: "Aarav Sharma", email: "aarav@demo.com", password: "123456" },
      { id: "u2", name: "Priya Patil", email: "priya@demo.com", password: "123456" },
    ],
    tasks: [
      { id: "t1", title: "Design database schema", description: "Define entities and relations.", priority: "High", status: "Done", assigneeId: "u1", dependsOn: [], createdAt: now },
      { id: "t2", title: "Build REST APIs", description: "Users and tasks endpoints.", priority: "High", status: "In Progress", assigneeId: "u2", dependsOn: ["t1"], createdAt: now },
      { id: "t3", title: "Create dashboard UI", description: "Kanban board with filters.", priority: "Medium", status: "To Do", assigneeId: "u1", dependsOn: ["t2"], createdAt: now },
      { id: "t4", title: "Write documentation", description: "README and API notes.", priority: "Low", status: "To Do", assigneeId: null, dependsOn: [], createdAt: now },
    ],
  };
}

const blobStore = () => getStore({ name: "smart-tasks", consistency: "strong" });

async function load() {
  try {
    const data = await blobStore().get(KEY, { type: "json" });
    if (data) return data;
    return (g.__db = seed());
  } catch {
    return (g.__db ||= seed()); // Blobs unavailable -> memory only
  }
}

async function save(db) {
  g.__db = db;
  try { await blobStore().setJSON(KEY, db); } catch { /* memory only */ }
}

export async function read() { return load(); }
export async function mutate(fn) {
  const db = await load();
  const result = fn(db);
  await save(db);
  return result;
}

/** Wraps a route handler: JSON response + uniform error handling. */
export const handle = (fn) => async (req, ctx) => {
  try { return NextResponse.json(await fn(req, ctx)); }
  catch (e) { return NextResponse.json({ error: e.message || "Server error" }, { status: e.status || 500 }); }
};

// ---------- Views (never leak passwords, add computed "blocked" info) ----------
export const publicUser = ({ password, ...u }) => u;

export function tasksView(db) {
  const byId = new Map(db.tasks.map((t) => [t.id, t]));
  return db.tasks.map((t) => {
    const blockedBy = t.dependsOn.map((id) => byId.get(id)).filter((d) => d && d.status !== "Done")
      .map((d) => ({ id: d.id, title: d.title }));
    return { ...t, blockedBy, blocked: t.status !== "Done" && blockedBy.length > 0 };
  });
}

// ---------- Validation ----------
// Would making `id` depend on `deps` create a loop (A -> B -> A)?
function createsCycle(db, id, deps) {
  const seen = new Set(), stack = [...deps];
  while (stack.length) {
    const cur = stack.pop();
    if (cur === id) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    const t = db.tasks.find((x) => x.id === cur);
    if (t) stack.push(...t.dependsOn);
  }
  return false;
}

/** Validates & normalises task input. `id` is set when updating. */
export function cleanTask(db, d, id = null) {
  const t = {
    title: String(d.title || "").trim(),
    description: String(d.description || "").trim(),
    priority: d.priority, status: d.status,
    assigneeId: d.assigneeId || null,
    dependsOn: [...new Set(d.dependsOn || [])],
  };
  if (!t.title) throw new ApiError("Title is required");
  if (!PRIORITIES.includes(t.priority)) throw new ApiError("Invalid priority");
  if (!STATUSES.includes(t.status)) throw new ApiError("Invalid status");
  if (t.assigneeId && !db.users.some((u) => u.id === t.assigneeId)) throw new ApiError("Assignee not found", 404);
  for (const dep of t.dependsOn) {
    if (dep === id) throw new ApiError("A task cannot depend on itself");
    if (!db.tasks.some((x) => x.id === dep)) throw new ApiError("Dependency not found", 404);
  }
  if (id && createsCycle(db, id, t.dependsOn)) throw new ApiError("Circular dependency detected");
  // Business rule: can only be Done when every dependency is Done.
  if (t.status === "Done") {
    const open = t.dependsOn.map((x) => db.tasks.find((y) => y.id === x)).filter((x) => x.status !== "Done");
    if (open.length) throw new ApiError(`Blocked by: ${open.map((x) => x.title).join(", ")}`);
  }
  return t;
}
