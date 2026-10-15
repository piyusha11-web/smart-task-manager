import { handle, read, mutate, tasksView, cleanTask } from "../../../lib/store";
export const dynamic = "force-dynamic";

// All tasks (each one carries computed `blocked` + `blockedBy`)
export const GET = handle(async () => ({ tasks: tasksView(await read()) }));

// Create a task
export const POST = handle(async (req) => {
  const body = await req.json();
  return mutate((db) => {
    const task = { id: crypto.randomUUID(), ...cleanTask(db, body), createdAt: new Date().toISOString() };
    db.tasks.push(task);
    return { task };
  });
});
