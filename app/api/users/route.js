import { handle, read, mutate, publicUser, ApiError } from "../../../lib/store";
export const dynamic = "force-dynamic";

// View all users
export const GET = handle(async () => ({ users: (await read()).users.map(publicUser) }));

// Create a new user
export const POST = handle(async (req) => {
  const { name, email, password } = await req.json();
  if (!name?.trim() || !email?.trim() || !password) throw new ApiError("Name, email and password are required");
  return mutate((db) => {
    if (db.users.some((u) => u.email === email.trim().toLowerCase())) throw new ApiError("Email already registered", 409);
    const user = { id: crypto.randomUUID(), name: name.trim(), email: email.trim().toLowerCase(), password };
    db.users.push(user);
    return { user: publicUser(user) };
  });
});
