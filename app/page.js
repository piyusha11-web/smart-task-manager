"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

const PRIORITIES = ["Low", "Medium", "High"];
const STATUSES = ["To Do", "In Progress", "Done"];
const STATUS_COLOR = { "To Do": "var(--todo)", "In Progress": "var(--prog)", Done: "var(--done)" };

/** Small fetch wrapper: throws Error(message) when the API returns an error. */
async function api(url, opts = {}) {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, cache: "no-store", ...opts });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

const Avatar = ({ name, small }) => <span className={"av" + (small ? " sm" : "")}>{(name || "?")[0].toUpperCase()}</span>;

/* ---------------------------- Login / Sign up ---------------------------- */
function Auth({ onLogin, notify }) {
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ name: "", email: "aarav@demo.com", password: "123456" });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") await api("/api/users", { method: "POST", body: JSON.stringify(f) });
      const { user } = await api("/api/login", { method: "POST", body: JSON.stringify(f) });
      onLogin(user);
    } catch (err) { notify(err.message, true); }
    setBusy(false);
  }

  return (
    <div className="auth">
      <section className="hero">
        <h1>Finish tasks in the right order.</h1>
        <p>Assign work, set priorities and link tasks together. A task stays locked until everything it depends on is done.</p>
        <div className="chain"><span className="chip ok">Schema ✓</span><span>→</span><span className="chip ok">APIs ✓</span><span>→</span><span className="chip lock">Dashboard 🔒</span></div>
      </section>
      <section className="authbox">
        <form className="form" onSubmit={submit}>
          <h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
          <div className="tabs2">
            <button type="button" className={mode === "login" ? "on" : ""} onClick={() => setMode("login")}>Log in</button>
            <button type="button" className={mode === "signup" ? "on" : ""} onClick={() => setMode("signup")}>Sign up</button>
          </div>
          {mode === "signup" && <label>Name<input value={f.name} onChange={set("name")} required /></label>}
          <label>Email<input type="email" value={f.email} onChange={set("email")} required /></label>
          <label>Password<input type="password" value={f.password} onChange={set("password")} required /></label>
          <button className="btn" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}</button>
          <p className="hint">Demo accounts: aarav@demo.com or priya@demo.com, password 123456</p>
        </form>
      </section>
    </div>
  );
}

/* ------------------------------ Task card ------------------------------ */
function TaskCard({ t, users, onEdit, onComplete }) {
  const assignee = users.find((u) => u.id === t.assigneeId);
  return (
    <article className={`card ${t.priority}${t.blocked ? " blocked" : ""}`}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h4>{t.title}</h4>
        <span className={`tag ${t.priority}`}>{t.priority}</span>
      </div>
      {t.description && <p>{t.description}</p>}
      {t.blocked && <span className="tag lock">🔒 Waiting for: {t.blockedBy.map((b) => b.title).join(", ")}</span>}
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="row">{assignee ? <><Avatar name={assignee.name} small />{assignee.name.split(" ")[0]}</> : <span className="hint">Unassigned</span>}</span>
        <span className="row">
          {t.status !== "Done" && (
            <button className="btn sm" disabled={t.blocked} title={t.blocked ? "Finish dependencies first" : "Mark as done"} onClick={() => onComplete(t)}>✓ Complete</button>
          )}
          <button className="btn ghost sm" onClick={() => onEdit(t)}>Edit</button>
        </span>
      </div>
    </article>
  );
}

/* ----------------------------- Create / Edit ----------------------------- */
function TaskModal({ task, tasks, users, me, onClose, onSaved, onDeleted, notify }) {
  const [f, setF] = useState(task || { title: "", description: "", priority: "Medium", status: "To Do", assigneeId: me.id, dependsOn: [] });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggleDep = (id) => setF({ ...f, dependsOn: f.dependsOn.includes(id) ? f.dependsOn.filter((x) => x !== id) : [...f.dependsOn, id] });

  async function save(e) {
    e.preventDefault();
    try {
      const body = JSON.stringify({ ...f, assigneeId: f.assigneeId || null });
      await (task ? api(`/api/tasks/${task.id}`, { method: "PATCH", body }) : api("/api/tasks", { method: "POST", body }));
      onSaved(task ? "Task updated" : "Task created");
    } catch (err) { notify(err.message, true); }
  }
  async function remove() {
    if (!confirm("Delete this task?")) return;
    try { await api(`/api/tasks/${task.id}`, { method: "DELETE" }); onDeleted(); } catch (err) { notify(err.message, true); }
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={save}>
        <h2>{task ? "Edit task" : "New task"}</h2>
        <label>Title<input value={f.title} onChange={set("title")} required autoFocus /></label>
        <label>Description<textarea value={f.description} onChange={set("description")} /></label>
        <div className="two">
          <label>Priority<select value={f.priority} onChange={set("priority")}>{PRIORITIES.map((p) => <option key={p}>{p}</option>)}</select></label>
          <label>Status<select value={f.status} onChange={set("status")}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
        </div>
        <label>Assign to
          <select value={f.assigneeId || ""} onChange={set("assigneeId")}>
            <option value="">Unassigned</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </label>
        <div>
          <b style={{ fontSize: 13 }}>Depends on</b>
          <div className="deps" style={{ marginTop: 6 }}>
            {tasks.filter((t) => t.id !== task?.id).map((t) => (
              <button type="button" key={t.id} className={"dep" + (f.dependsOn.includes(t.id) ? " on" : "")} onClick={() => toggleDep(t.id)}>{t.title}</button>
            ))}
            {tasks.length <= (task ? 1 : 0) && <span className="hint">No other tasks yet.</span>}
          </div>
        </div>
        <div className="row" style={{ justifyContent: "space-between" }}>
          {task ? <button type="button" className="btn danger" onClick={remove}>Delete</button> : <span />}
          <span className="row"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn">{task ? "Save changes" : "Create task"}</button></span>
        </div>
      </form>
    </div>
  );
}

/* --------------------------------- Page --------------------------------- */
export default function Home() {
  const [me, setMe] = useState(null);
  const [ready, setReady] = useState(false);
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [prio, setPrio] = useState("");
  const [modal, setModal] = useState(null); // null | { task? }
  const [toast, setToast] = useState(null);

  const notify = useCallback((msg, err) => { setToast({ msg, err }); setTimeout(() => setToast(null), 3200); }, []);

  // Restore session (mock auth: just the user object in localStorage)
  useEffect(() => {
    try { setMe(JSON.parse(localStorage.getItem("stm_user"))); } catch {}
    setReady(true);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [u, t] = await Promise.all([api("/api/users"), api("/api/tasks")]);
      setUsers(u.users); setTasks(t.tasks);
    } catch (e) { /* keep last data; next poll will retry */ }
  }, []);

  // "Real-time": poll every 4s so changes from other users show up
  useEffect(() => {
    if (!me) return;
    refresh();
    const id = setInterval(refresh, 4000);
    return () => clearInterval(id);
  }, [me, refresh]);

  const login = (u) => { localStorage.setItem("stm_user", JSON.stringify(u)); setMe(u); };
  const logout = () => { localStorage.removeItem("stm_user"); setMe(null); };

  async function complete(t) {
    try { await api(`/api/tasks/${t.id}`, { method: "PATCH", body: JSON.stringify({ status: "Done" }) }); notify("Marked as done"); refresh(); }
    catch (e) { notify(e.message, true); }
  }

  const counts = useMemo(() => ({
    all: tasks.length,
    mine: tasks.filter((t) => t.assigneeId === me?.id).length,
    blocked: tasks.filter((t) => t.blocked).length,
    done: tasks.filter((t) => t.status === "Done").length,
  }), [tasks, me]);

  // Tab scope first, then the UI filters (search + priority)
  const visible = useMemo(() => tasks
    .filter((t) => tab === "mine" ? t.assigneeId === me?.id : tab === "blocked" ? t.blocked : true)
    .filter((t) => !prio || t.priority === prio)
    .filter((t) => !q || (t.title + t.description).toLowerCase().includes(q.toLowerCase())), [tasks, tab, prio, q, me]);

  if (!ready) return null;
  const toastEl = toast && <div className={"toast" + (toast.err ? " err" : "")} role="status">{toast.msg}</div>;
  if (!me) return <><Auth onLogin={login} notify={notify} />{toastEl}</>;

  const titles = { all: "All tasks", mine: "My tasks", blocked: "Blocked tasks", users: "Team" };
  const nav = [["all", "All tasks", counts.all], ["mine", "My tasks", counts.mine], ["blocked", "Blocked", counts.blocked], ["users", "Users", users.length]];

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">Smart Tasks</div>
        {nav.map(([k, label, n]) => (
          <button key={k} className={"nav" + (tab === k ? " on" : "")} onClick={() => setTab(k)}>{label}<b>{n}</b></button>
        ))}
        <div className="me">
          <Avatar name={me.name} />
          <div style={{ flex: 1, minWidth: 0 }}>{me.name}<small>{me.email}</small></div>
          <button className="btn ghost sm" onClick={logout}>Log out</button>
        </div>
      </aside>

      <main className="main">
        <div className="top">
          <h2>{titles[tab]}</h2>
          <button className="btn" onClick={() => setModal({})}>+ New task</button>
        </div>

        {tab === "users" ? (
          <div className="users">
            {users.map((u) => (
              <div className="ucard" key={u.id}>
                <Avatar name={u.name} />
                <div>{u.name}{u.id === me.id && " (you)"}<div className="hint">{u.email} · {tasks.filter((t) => t.assigneeId === u.id).length} tasks</div></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="stats">
              {[["Total", counts.all], ["Assigned to me", counts.mine], ["Blocked", counts.blocked], ["Done", counts.done]].map(([l, n]) => (
                <div className="stat" key={l}><span>{l}</span><strong>{n}</strong></div>
              ))}
            </div>
            <div className="filters">
              <input placeholder="Search tasks…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search tasks" />
              <select value={prio} onChange={(e) => setPrio(e.target.value)} aria-label="Filter by priority">
                <option value="">All priorities</option>{PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="board">
              {STATUSES.map((s) => {
                const list = visible.filter((t) => t.status === s);
                return (
                  <section className="col" key={s}>
                    <h3><span className="dot" style={{ background: STATUS_COLOR[s] }} />{s} <span className="hint">{list.length}</span></h3>
                    {list.map((t) => <TaskCard key={t.id} t={t} users={users} onEdit={(task) => setModal({ task })} onComplete={complete} />)}
                    {!list.length && <div className="empty">Nothing here</div>}
                  </section>
                );
              })}
            </div>
          </>
        )}
      </main>

      {modal && (
        <TaskModal task={modal.task} tasks={tasks} users={users} me={me} notify={notify}
          onClose={() => setModal(null)}
          onSaved={(m) => { setModal(null); notify(m); refresh(); }}
          onDeleted={() => { setModal(null); notify("Task deleted"); refresh(); }} />
      )}
      {toastEl}
    </div>
  );
}
