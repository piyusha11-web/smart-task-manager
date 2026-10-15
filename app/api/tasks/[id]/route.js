import { handle, mutate, cleanTask, ApiError } from "../../../../lib/store";
export const dynamic = "force-dynamic";

// Update a task (also used for assign / mark complete)
export const PATCH = handle(async (req, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json();
  return mutate((db) => {
    const task = db.tasks.find((t) => t.id === id);
    if (!task) throw new ApiError("Task not found", 404);
    Object.assign(task, cleanTask(db, { ...task, ...body }, id));
    return { task };
  });
});

// Delete a task and remove it from other tasks' dependencies
export const DELETE = handle(async (_req, ctx) => {
  const { id } = await ctx.params;
  return mutate((db) => {
    if (!db.tasks.some((t) => t.id === id)) throw new ApiError("Task not found", 404);
    db.tasks = db.tasks.filter((t) => t.id !== id);
    db.tasks.forEach((t) => { t.dependsOn = t.dependsOn.filter((d) => d !== id); });
    return { ok: true };
  });
});
