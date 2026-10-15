import { handle, read, publicUser, ApiError } from "../../../lib/store";
export const dynamic = "force-dynamic";

// Mock auth: plain email + password comparison (no hashing, as per the task)
export const POST = handle(async (req) => {
  const { email, password } = await req.json();
  const db = await read();
  const user = db.users.find((u) => u.email === String(email || "").trim().toLowerCase() && u.password === password);
  if (!user) throw new ApiError("Invalid email or password", 401);
  return { user: publicUser(user) };
});
