import { useEffect, useMemo, useRef, useState } from "react";
import type { Plan, Resource } from "./data";
import {
  type AppState, type Task, useAppState, today, parseKey, addDays, keyOf, DAY_SHORT, DAY_LONG, WEEK_ORDER,
  tasksFor, dayStatus, streak, bestStreak, xpOf, rankOf, RANKS, nextUnit, isClassDay, weekKeys,
  planCode, parsePlanText,
} from "./store";

type Tab = "today" | "journey" | "scrolls" | "discipline";

/* ---------- icons (ink strokes) ---------- */
const I = {
  check: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>,
  enso: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M19 8.5A8 8 0 1 0 20 12" /></svg>,
  path: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 19l6-9 4 5 3-4 5 8" /></svg>,
  blade: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M4 20L18 6M15 4l5 5M6 15l3 3" /></svg>,
  scroll: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 4h11a2 2 0 0 1 0 4H7M7 4a2 2 0 0 0 0 4v12h11M10 12h5M10 16h5" /></svg>,
  vow: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="1" /><path d="M9 12l2 2 4-4" /></svg>,
  plus: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>,
  trash: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" /></svg>,
  brush: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 4l6 6L9 21H3v-6z" /></svg>,
  close: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>,
  reset: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" /></svg>,
};
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const CHEERS = ["One cut made. Keep the edge.", "The blade stays sharp.", "Small cuts, every day.", "Steady hands. Next cut.", "Another stone on the path.", "Discipline beats motivation."];

/* ---------- clipboard with fallback ---------- */
async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* fall back */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select(); const ok = document.execCommand("copy"); ta.remove(); return ok;
  } catch { return false; }
}

/* ---------- ink splash on a perfect day ---------- */
function splash(canvas: HTMLCanvasElement | null) {
  if (!canvas || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const ctx = canvas.getContext("2d"); if (!ctx) return;
  const W = (canvas.width = innerWidth), H = (canvas.height = innerHeight);
  const ink = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim();
  const seal = getComputedStyle(document.documentElement).getPropertyValue("--seal").trim();
  const drops = Array.from({ length: 70 }, () => ({ x: W / 2, y: H * 0.42, vx: (Math.random() - 0.5) * 12, vy: (Math.random() - 0.7) * 12, r: 2 + Math.random() * 7, c: Math.random() < 0.18 ? seal : ink, a: 0.9 }));
  let f = 0;
  const step = () => {
    ctx.clearRect(0, 0, W, H);
    drops.forEach((d) => { d.x += d.vx; d.y += d.vy; d.vy += 0.32; d.vx *= 0.98; d.a *= 0.975; ctx.globalAlpha = d.a; ctx.fillStyle = d.c; ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r, d.r * 0.8, d.vx, 0, Math.PI * 2); ctx.fill(); });
    if (++f < 80) requestAnimationFrame(step); else ctx.clearRect(0, 0, W, H);
  };
  step();
}

/* ---------- focus session (persists across app restarts) ---------- */
type Session = { total: number; endAt: number | null; left: number; taskKey: string | null; urges: number; credited: boolean };
const SKEY = "path-of-the-blade-focus";
const loadSession = (): Session => { try { const s = localStorage.getItem(SKEY); if (s) return JSON.parse(s); } catch { /* */ } return { total: 45 * 60, endAt: null, left: 45 * 60, taskKey: null, urges: 0, credited: false }; };

export default function App() {
  const [state, setState] = useAppState();
  const [tab, setTab] = useState<Tab>("today");
  const [sel, setSel] = useState(today());
  const [focusOpen, setFocusOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const toastT = useRef<number>();
  const canvas = useRef<HTMLCanvasElement>(null);

  const toast = (m: string) => { setToastMsg(m); clearTimeout(toastT.current); toastT.current = window.setTimeout(() => setToastMsg(""), 2300); };
  const update = (fn: (s: AppState) => AppState) => setState((s) => fn(structuredClone(s)));

  useEffect(() => { window.scrollTo(0, 0); }, [tab]);

  /* ----- actions ----- */
  function toggleTask(t: Task) {
    const before = dayStatus(state, sel);
    let after: AppState | null = null;
    update((s) => {
      const log = (s.progress.log[sel] ??= { tasks: {}, units: {} });
      const now = !log.tasks[t.key];
      log.tasks[t.key] = now;
      if (t.kind === "study" && t.resource) {
        if (now && t.unit) { log.units[t.resource.id] = t.unit.id; s.progress.done[t.unit.id] = sel; }
        if (!now) { const u = log.units[t.resource.id]; if (u && s.progress.done[u] === sel) delete s.progress.done[u]; delete log.units[t.resource.id]; }
      }
      after = s;
      return s;
    });
    setTimeout(() => {
      if (!after) return;
      const nowDone = !t.done;
      if (!nowDone) return;
      if (dayStatus(after, sel) === "full" && before !== "full") { splash(canvas.current); navigator.vibrate?.(60); toast("A perfect day. Rest the blade."); }
      else toast(CHEERS[Math.floor(Math.random() * CHEERS.length)]);
    }, 0);
  }
  function keepUnitOpen(t: Task) {
    update((s) => { const log = s.progress.log[sel]; const u = t.resource && log?.units[t.resource.id]; if (u && s.progress.done[u] === sel) delete s.progress.done[u]; return s; });
    toast("Session counted. This unit stays next.");
  }
  function finishMilestone(r: Resource) {
    const u = nextUnit(r, state.progress.done); if (!u) return;
    update((s) => { s.progress.done[u.id] = sel; return s; });
    splash(canvas.current); toast("Milestone forged: " + u.name);
  }

  const s = streak(state);
  const xp = xpOf(state);
  const rk = rankOf(xp);

  return (
    <>
      <div className="shell">
        <svg className="mist" viewBox="0 0 390 240" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 200 C60 140 90 160 130 110 C160 75 190 100 215 80 C250 50 280 85 320 60 C350 42 370 56 390 48 L390 240 L0 240 Z" fill="currentColor" />
          <path d="M0 226 C70 186 120 204 170 170 C220 140 260 180 310 158 C350 142 372 150 390 144 L390 240 L0 240 Z" fill="currentColor" opacity="0.6" />
        </svg>
        {tab === "today" && <Today state={state} sel={sel} setSel={setSel} streakN={s} xp={xp} rk={rk} onToggle={toggleTask} onKeep={keepUnitOpen} onMilestone={finishMilestone} onFocus={() => setFocusOpen(true)} />}
        {tab === "journey" && <Journey state={state} xp={xp} rk={rk} streakN={s} />}
        {tab === "scrolls" && <Scrolls state={state} update={update} toast={toast} />}
        {tab === "discipline" && <Discipline state={state} update={update} toast={toast} onFocus={() => setFocusOpen(true)} />}
      </div>

      <nav className="nav" aria-label="Main">
        <div className="in">
          {([["today", "Today", I.enso], ["journey", "Journey", I.path], ["focus", "Focus", I.blade], ["scrolls", "Scrolls", I.scroll], ["discipline", "Discipline", I.vow]] as const).map(([id, label, icon]) => (
            <button key={id} className={tab === id ? "on" : ""} onClick={() => { if (id === "focus") setFocusOpen(true); else { setTab(id); if (id === "today") setSel(today()); } }} aria-current={tab === id ? "page" : undefined}>
              {icon}<span>{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {focusOpen && <Focus state={state} update={update} toast={toast} onClose={() => setFocusOpen(false)} onSplash={() => splash(canvas.current)} />}
      <canvas ref={canvas} className="splash" aria-hidden="true" />
      <div className={`toast ${toastMsg ? "show" : ""}`} role="status">{toastMsg}</div>
    </>
  );
}

/* =================== TODAY =================== */
function Today(p: { state: AppState; sel: string; setSel: (k: string) => void; streakN: number; xp: number; rk: ReturnType<typeof rankOf>; onToggle: (t: Task) => void; onKeep: (t: Task) => void; onMilestone: (r: Resource) => void; onFocus: () => void }) {
  const { state, sel } = p;
  const t0 = today();
  const tasks = tasksFor(state, sel);
  const n = tasks.filter((t) => t.done).length;
  const total = tasks.reduce((a, t) => a + t.minutes, 0);
  const C = 2 * Math.PI * 48;
  const d = parseKey(sel);
  const nextXp = p.rk.next ? p.rk.next.xp : p.rk.rank.xp;
  const span = p.rk.next ? p.rk.next.xp - p.rk.rank.xp : 1;
  const msgs = ["Begin with the first cut.", "One cut made. Keep the edge.", "Keep going. The path is clear.", "Almost there. Finish strong."];
  const msg = n === tasks.length ? "A perfect day. Rest the blade." : msgs[Math.min(n, 3)];
  const focusName = state.plan.resources.filter((r) => r.role === "study" && r.days.includes(d.getDay())).map((r) => r.name).join(" + ");

  return (
    <div className="page">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <span className="eyebrow">{DAY_LONG[d.getDay()]} · {d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
          <h1 className="h1">{sel === t0 ? "Today's practice" : "Past practice"}</h1>
          <span className="sub">{isClassDay(state.plan, sel) ? "English class day · shorter blocks" : focusName ? `Focus: ${focusName}` : "Rest from study, keep the forge warm"}</span>
        </div>
        <div className="seal" aria-label={`${p.streakN} day streak`}><b className="num">{p.streakN}</b><span>DAY STREAK</span></div>
      </header>

      <div className="week">
        {weekKeys().map((k) => {
          const dd = parseKey(k);
          return (
            <button key={k} className={`day ${k === sel ? "sel" : ""}`} disabled={k > t0} onClick={() => p.setSel(k)} aria-label={DAY_LONG[dd.getDay()]} aria-pressed={k === sel}>
              <small>{DAY_SHORT[dd.getDay()]}</small><b className="num">{dd.getDate()}</b><i className={dayStatus(state, k)} />
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
        <div style={{ width: 112, height: 112, position: "relative", flexShrink: 0 }}>
          <svg viewBox="0 0 120 120" width="112" height="112" style={{ transform: "rotate(-100deg)" }} role="img" aria-label={`${n} of ${tasks.length} done`}>
            <circle cx="60" cy="60" r="48" fill="none" stroke="var(--wash)" strokeWidth="10" />
            <circle cx="60" cy="60" r="48" fill="none" stroke="var(--ink)" strokeWidth="11" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - n / tasks.length)} style={{ transition: "stroke-dashoffset .5s" }} />
            <circle cx="60" cy="60" r="43" fill="none" stroke="var(--ink)" strokeWidth="2" strokeDasharray={C} strokeDashoffset={C * (1 - n / tasks.length)} opacity="0.3" />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <b className="display num" style={{ fontSize: 28 }}>{n}/{tasks.length}</b>
            <span className="eyebrow" style={{ fontSize: 10 }}>cuts</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7, minWidth: 0, flexGrow: 1 }}>
          <span className="eyebrow">Rank · {p.rk.rank.name}</span>
          <div className="bar"><i style={{ width: `${Math.min(100, ((p.xp - p.rk.rank.xp) / span) * 100)}%` }} /></div>
          <span className="mute num" style={{ fontSize: 13 }}>{p.rk.next ? `${p.xp} / ${nextXp} XP to ${p.rk.next.name}` : `${p.xp} XP · highest rank`}</span>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{msg} <span className="mute num">· {total} min</span></span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {tasks.map((t) => (
          <div key={t.key} className="sheet">
            <button className={`task ${t.done ? "done" : ""}`} onClick={() => p.onToggle(t)} aria-pressed={t.done}>
              <span className="mark">{I.check}</span>
              <span style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                <span className="eyebrow" style={{ fontSize: 10.5 }}>{t.label} · <span className="num">{t.minutes}</span> min</span>
                <span className="t">{t.title}</span>
                {t.kind === "daily" && <span className="mute" style={{ fontSize: 13 }}>Next milestone: {t.unit ? t.unit.name : "all forged"}</span>}
              </span>
            </button>
            {((t.kind === "study" && (t.done || t.resource?.url)) || (t.kind === "daily" && t.unit)) && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "0 14px 12px 72px" }}>
                {t.kind === "study" && t.done && t.resource && state.progress.log[sel]?.units[t.resource.id] && state.progress.done[state.progress.log[sel].units[t.resource.id]] && <button className="chipbtn" onClick={() => p.onKeep(t)}>Didn't finish the unit</button>}
                {t.kind === "study" && !t.done && t.resource?.url && <a className="chipbtn" href={t.resource.url} target="_blank" rel="noopener">Open {t.resource.kind === "video" ? "playlist" : "course"} ↗</a>}
                {t.kind === "daily" && t.resource && <button className="chipbtn" onClick={() => p.onMilestone(t.resource!)}>Milestone finished</button>}
              </div>
            )}
          </div>
        ))}
      </div>

      <button className="btn" onClick={p.onFocus}>{I.blade} Draw the blade · start focus</button>
    </div>
  );
}

/* =================== FOCUS =================== */
function Focus(p: { state: AppState; update: (fn: (s: AppState) => AppState) => void; toast: (m: string) => void; onClose: () => void; onSplash: () => void }) {
  const [ses, setSes] = useState<Session>(loadSession);
  const [, tick] = useState(0);
  useEffect(() => { try { localStorage.setItem(SKEY, JSON.stringify(ses)); } catch { /* */ } }, [ses]);
  useEffect(() => { const id = setInterval(() => tick((x) => x + 1), 500); return () => clearInterval(id); }, []);
  const wake = useRef<{ release: () => void } | null>(null);

  const left = ses.endAt ? Math.max(0, Math.round((ses.endAt - Date.now()) / 1000)) : ses.left;
  const running = !!ses.endAt && left > 0;
  const finished = left === 0;
  const tasks = tasksFor(p.state, today()).filter((t) => !t.done);

  useEffect(() => {
    if (ses.endAt && left === 0 && !ses.credited) {
      const mins = Math.round(ses.total / 60);
      p.update((s) => { const k = today(); s.progress.focus[k] = (s.progress.focus[k] ?? 0) + mins; return s; });
      setSes({ ...ses, credited: true, left: 0 });
      navigator.vibrate?.([200, 100, 200]);
      p.onSplash(); p.toast(`${mins} minutes of focus. Well fought.`);
      wake.current?.release(); wake.current = null;
    }
  });

  async function start() {
    setSes({ ...ses, endAt: Date.now() + left * 1000, credited: false });
    try { const nav = navigator as Navigator & { wakeLock?: { request: (t: string) => Promise<{ release: () => void }> } }; wake.current = (await nav.wakeLock?.request("screen")) ?? null; } catch { /* optional */ }
  }
  function pause() { setSes({ ...ses, endAt: null, left }); wake.current?.release(); wake.current = null; }
  function reset(total = ses.total) { setSes({ ...ses, total, left: total, endAt: null, urges: 0, credited: false }); wake.current?.release(); wake.current = null; }
  function resist() {
    setSes({ ...ses, urges: ses.urges + 1 });
    p.update((s) => { const k = today(); s.progress.urges[k] = (s.progress.urges[k] ?? 0) + 1; return s; });
    p.toast("Urge cut down. Back to the blade.");
  }
  function markTask() {
    const t = tasks.find((x) => x.key === ses.taskKey); if (!t) return;
    p.update((s) => {
      const k = today(); const log = (s.progress.log[k] ??= { tasks: {}, units: {} }); log.tasks[t.key] = true;
      if (t.kind === "study" && t.resource && t.unit) { log.units[t.resource.id] = t.unit.id; s.progress.done[t.unit.id] = k; }
      return s;
    });
    p.toast("Task marked done"); reset();
  }

  const C = 2 * Math.PI * 108;
  const mm = String(Math.floor(left / 60)).padStart(2, "0"), ss = String(left % 60).padStart(2, "0");
  const notes = ["Name the urge. It loses its grip.", "Two urges cut down. The mind is yours.", "Three. The phone has no power here.", "Strong. Write the trigger down after this."];
  const current = tasks.find((t) => t.key === ses.taskKey);

  return (
    <div className="night" role="dialog" aria-label="Focus session">
      <div className="in">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
            <span className="eyebrow" style={{ color: "var(--night-mute)" }}>Focus session</span>
            <h1 className="h1" style={{ fontSize: 28 }}>{running ? "The blade is drawn" : finished ? "Session complete" : "Prepare the blade"}</h1>
            <span className="mute" style={{ fontSize: 14 }}>{current ? current.title : "Pick what you're working on below"}</span>
          </div>
          <button onClick={p.onClose} aria-label="Close focus" style={{ width: 44, height: 44, border: 0, background: "transparent", display: "grid", placeItems: "center", color: "var(--night-ink)" }}>{I.close}</button>
        </div>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <div style={{ width: 250, height: 250, position: "relative" }}>
            <svg viewBox="0 0 260 260" width="250" height="250" style={{ transform: "rotate(-96deg)" }} role="img" aria-label="Time remaining">
              <circle cx="130" cy="130" r="108" fill="none" stroke="#2a2823" strokeWidth="16" />
              <circle cx="130" cy="130" r="108" fill="none" stroke="var(--night-ink)" strokeWidth="18" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - left / ses.total)} style={{ transition: "stroke-dashoffset .6s linear" }} />
              <circle cx="130" cy="130" r="98" fill="none" stroke="var(--night-ink)" strokeWidth="2" strokeDasharray={C} strokeDashoffset={C * (1 - left / ses.total)} opacity="0.3" />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <b className="display num" style={{ fontSize: 56 }}>{mm}:{ss}</b>
              <span className="eyebrow" style={{ color: "var(--night-mute)" }}>{running ? "Phone face down" : finished ? "Well fought" : "Paused"}</span>
            </div>
          </div>
        </div>

        {!running && (
          <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
            {[25, 45, 60, 90].map((m) => <button key={m} className={`preset ${ses.total === m * 60 ? "on" : ""}`} onClick={() => reset(m * 60)} aria-pressed={ses.total === m * 60}>{m} min</button>)}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          {finished ? (
            <button className="btn seal-btn" style={{ flexGrow: 1 }} onClick={() => (current ? markTask() : reset())}>{current ? "Mark the task done" : "New session"}</button>
          ) : (
            <button className="btn seal-btn" style={{ flexGrow: 1 }} onClick={running ? pause : start}>{running ? "Sheathe · pause" : left === ses.total ? "Draw the blade" : "Resume"}</button>
          )}
          <button className="btn" style={{ width: 52, padding: 0, background: "transparent", border: "1px solid #4a463d", color: "var(--night-ink)" }} onClick={() => reset()} aria-label="Reset timer">{I.reset}</button>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <b style={{ fontSize: 15 }}>Feel the pull of your phone?</b>
              <span className="mute" style={{ fontSize: 13 }}>Tap here instead of opening an app.</span>
            </div>
            <button onClick={resist} style={{ flexShrink: 0, minHeight: 44, padding: "0 14px", borderRadius: 22, border: "1px solid var(--night-ink)", background: "transparent", color: "var(--night-ink)", fontWeight: 700, fontSize: 13 }}>I resisted</button>
          </div>
          {ses.urges > 0 && <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}><b className="display" style={{ fontSize: 22, color: "var(--seal-night)" }}>{ses.urges}</b><span className="mute">resisted this session. {notes[Math.min(ses.urges - 1, 3)]}</span></div>}
        </div>

        {tasks.length > 0 && !running && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span className="eyebrow" style={{ color: "var(--night-mute)" }}>Working on</span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {tasks.map((t) => <button key={t.key} className={`preset ${ses.taskKey === t.key ? "on" : ""}`} style={{ padding: "0 14px", fontSize: 13 }} onClick={() => setSes({ ...ses, taskKey: ses.taskKey === t.key ? null : t.key })} aria-pressed={ses.taskKey === t.key}>{t.label.replace("Study · ", "").replace("Forge · ", "")}</button>)}
            </div>
          </div>
        )}

        <p className="display mute" style={{ marginTop: "auto", textAlign: "center", fontSize: 15, lineHeight: 1.6 }}>Do nothing that is of no use.<br /><span style={{ fontSize: 13 }}>— attributed to Miyamoto Musashi</span></p>
      </div>
    </div>
  );
}

/* =================== JOURNEY =================== */
const STATIONS: [number, number][] = [[54, 392], [176, 312], [282, 236], [96, 172], [262, 104], [146, 36]];
function seg(a: [number, number], b: [number, number]) { const my = (a[1] + b[1]) / 2; return `M${a[0]} ${a[1]} C${a[0]} ${my} ${b[0]} ${my} ${b[0]} ${b[1]}`; }

function Journey(p: { state: AppState; xp: number; rk: ReturnType<typeof rankOf>; streakN: number }) {
  const { state, xp, rk } = p;
  const frac = rk.next ? (xp - rk.rank.xp) / (rk.next.xp - rk.rank.xp) : 0;
  const t0 = today();
  const start = addDays(weekKeys()[0], -63);
  const focusMin = Object.values(state.progress.focus).reduce((a, b) => a + b, 0);
  const studyMin = Object.keys(state.progress.log).reduce((a, k) => a + tasksFor(state, k).filter((t) => t.done).reduce((x, t) => x + t.minutes, 0), 0);

  return (
    <div className="page">
      <header style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span className="eyebrow">Level {rk.index + 1} · <span className="num">{xp}</span> XP</span>
        <h1 className="h1">The warrior's path</h1>
        <span className="sub">From rōnin to shōgun, one cut at a time</span>
      </header>

      <div style={{ position: "relative", width: "100%", maxWidth: 360, alignSelf: "center", aspectRatio: "350 / 430" }}>
        <svg viewBox="0 0 350 430" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} aria-hidden="true">
          <path d="M0 150 C40 110 70 120 100 80 C125 50 150 70 175 40 C200 15 230 45 260 30 C300 10 330 40 350 25 L350 430 L0 430 Z" fill="var(--ink)" opacity="0.06" />
          <path d="M0 270 C60 230 110 250 160 210 C210 175 260 215 300 190 C330 176 345 180 350 178 L350 430 L0 430 Z" fill="var(--ink)" opacity="0.07" />
          {STATIONS.slice(1).map((b, i) => {
            const a = STATIONS[i];
            const doneSeg = i < rk.index, cur = i === rk.index;
            return (
              <g key={i}>
                <path d={seg(a, b)} fill="none" stroke="var(--ink)" strokeWidth="7" strokeLinecap="round" opacity="0.15" />
                {(doneSeg || cur) && <path d={seg(a, b)} pathLength={100} fill="none" stroke="var(--ink)" strokeWidth="7" strokeLinecap="round" strokeDasharray="100 100" strokeDashoffset={doneSeg ? 0 : 100 - frac * 100} />}
              </g>
            );
          })}
        </svg>
        {RANKS.map((r, i) => {
          const [x, y] = STATIONS[i];
          const reached = i <= rk.index, isCur = i === rk.index;
          const right = x < 200;
          return (
            <div key={r.name} style={{ position: "absolute", left: `${(x / 350) * 100}%`, top: `${(y / 430) * 100}%`, transform: right ? "translate(-20px,-20px)" : "translate(calc(-100% + 20px),-20px)", display: "flex", flexDirection: right ? "row" : "row-reverse", gap: 8, alignItems: "center", opacity: reached ? 1 : 0.5 }}>
              <span className="display" style={{ width: 40, height: 40, boxSizing: "border-box", borderRadius: "50%", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 14, background: isCur ? "var(--paper)" : reached ? "var(--ink)" : "var(--paper)", color: isCur ? "var(--seal)" : reached ? "var(--paper)" : "var(--ink)", border: isCur ? "3px solid var(--seal)" : reached ? "0" : "2px dashed var(--ink-3)" }}>{ROMAN[i]}</span>
              <span style={{ display: "flex", flexDirection: "column", background: "var(--paper)", padding: "1px 6px", textAlign: right ? "left" : "right" }}>
                <b style={{ fontSize: 14 }}>{r.name}</b>
                <span className="num" style={{ fontSize: 11, color: isCur && rk.next ? "var(--seal)" : "var(--ink-3)", fontWeight: isCur ? 700 : 400 }}>{isCur ? (rk.next ? `${rk.next.xp - xp} XP to next` : "you are here") : `${r.xp.toLocaleString()} XP`}</span>
              </span>
            </div>
          );
        })}
      </div>
      <p className="mute" style={{ margin: "-6px 0 0", fontSize: 13.5, textAlign: "center" }}>{rk.rank.note}</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8 }}>
        {[["Streak", `${p.streakN}`, "days"], ["Best", `${bestStreak(state)}`, "days"], ["Trained", `${((studyMin + focusMin * 0) / 60).toFixed(1)}`, "hours"]].map(([a, b, c]) => (
          <div key={a} className="sheet" style={{ padding: 12 }}><span className="eyebrow" style={{ fontSize: 10.5 }}>{a}</span><div className="display num" style={{ fontSize: 26, fontWeight: 800 }}>{b}<span style={{ fontSize: 13, fontWeight: 600 }}> {c}</span></div></div>
        ))}
      </div>

      <div className="sheet" style={{ padding: 14 }}>
        <span className="eyebrow">Last 10 weeks</span>
        <div style={{ display: "grid", gridTemplateColumns: "34px repeat(7, minmax(0,1fr))", gap: 4, marginTop: 10, fontSize: 10.5 }} className="mute">
          <span />{WEEK_ORDER.map((d) => <span key={d} style={{ textAlign: "center" }}>{DAY_SHORT[d][0]}</span>)}
          {Array.from({ length: 10 }, (_, w) => {
            const wk = addDays(start, w * 7); const wd = parseKey(wk);
            return [<span key={wk + "l"} className="num">{wd.getDate()}/{wd.getMonth() + 1}</span>, ...Array.from({ length: 7 }, (_, i) => {
              const k = addDays(wk, i); const st = dayStatus(state, k);
              return <span key={k} title={k} style={{ aspectRatio: "1", borderRadius: 3, background: k > t0 ? "transparent" : st === "full" ? "var(--seal)" : st === "part" ? "var(--ink-3)" : "var(--wash)", border: k > t0 ? "1px dashed var(--line)" : 0 }} />;
            })];
          })}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span className="eyebrow">Scrolls in progress</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 8 }}>
          {state.plan.resources.map((r) => {
            const d = r.units.filter((u) => state.progress.done[u.id]).length;
            return (
              <div key={r.id} className="sheet" style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                <b style={{ fontSize: 13.5, lineHeight: 1.25 }}>{r.name}</b>
                <div className="bar" style={{ height: 6 }}><i style={{ width: `${r.units.length ? (d / r.units.length) * 100 : 0}%` }} /></div>
                <span className="mute num" style={{ fontSize: 11.5 }}>{d} / {r.units.length} {r.kind === "project" ? "milestones" : "units"}</span>
              </div>
            );
          })}
        </div>
      </div>
      <p className="mute" style={{ fontSize: 12.5, margin: 0 }}>XP: 10 per task · 15 per unit · 20 for a perfect day · 3 per vow kept · 2 per urge resisted · 1 per 5 focus minutes</p>
    </div>
  );
}

/* =================== SCROLLS =================== */
function Scrolls(p: { state: AppState; update: (fn: (s: AppState) => AppState) => void; toast: (m: string) => void }) {
  const { state } = p;
  const [open, setOpen] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [mode, setMode] = useState<"" | "paste" | "add" | "backup">("");
  const [paste, setPaste] = useState("");
  const [shownCode, setShownCode] = useState("");
  const preview = useMemo(() => (paste.trim() ? parsePlanText(paste) : null), [paste]);
  const totalUnits = state.plan.resources.reduce((a, r) => a + r.units.length, 0);

  async function copyPlan() {
    const code = planCode(state.plan);
    if (await copyText(code)) { p.toast("Plan code copied. Paste it in Claude."); setShownCode(""); }
    else { setShownCode(code); p.toast("Copy blocked. Select the text below."); }
  }
  function applyPlan(plan: Plan) {
    p.update((s) => { s.plan = plan; return s; });
    setPaste(""); setMode(""); p.toast("Plan updated. Your progress is kept.");
  }

  return (
    <div className="page">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="eyebrow">{state.plan.resources.length} scrolls · {totalUnits} units</span>
          <h1 className="h1">Scrolls</h1>
          <span className="sub">Your learning materials</span>
        </div>
        <button className="btn ghost small" onClick={() => setMode(mode === "add" ? "" : "add")} aria-expanded={mode === "add"}>{I.plus} Add scroll</button>
      </header>

      {mode === "add" && <AddScroll onAdd={(r) => { p.update((s) => { s.plan.resources.push(r); return s; }); setMode(""); p.toast("Scroll added: " + r.name); }} existing={state.plan.resources.map((r) => r.id)} />}

      <div style={{ background: "var(--ink)", color: "var(--paper)", borderRadius: 4, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ width: 34, height: 34, borderRadius: "50%", border: "2px solid var(--seal-night)", color: "var(--seal-night)", display: "grid", placeItems: "center" }}>{I.brush}</span>
          <b style={{ fontSize: 16 }}>Update with Claude</b>
        </div>
        <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 5, fontSize: 13.5, opacity: 0.85, lineHeight: 1.4 }}>
          <li>Copy your plan code.</li>
          <li>Paste it in Claude on your phone and say what to change, e.g. "add Clean Architecture, chapters as units, on Fridays".</li>
          <li>Copy Claude's whole reply and paste it here. Your progress stays.</li>
        </ol>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 8 }}>
          <button className="btn small" style={{ background: "var(--paper)", color: "var(--ink)" }} onClick={copyPlan}>Copy plan code</button>
          <button className="btn small" style={{ background: "transparent", color: "var(--paper)", border: "1px solid var(--paper)" }} onClick={() => setMode(mode === "paste" ? "" : "paste")} aria-expanded={mode === "paste"}>Paste update</button>
        </div>
        {shownCode && <textarea className="field" readOnly value={shownCode} onFocus={(e) => e.currentTarget.select()} aria-label="Plan code" />}
        {mode === "paste" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <textarea className="field" placeholder="Paste Claude's reply here" value={paste} onChange={(e) => setPaste(e.target.value)} aria-label="Claude's reply" />
            {paste.trim() && !preview && <span style={{ fontSize: 13, color: "var(--seal-night)" }}>No plan found in that text. Copy Claude's full reply, including the code block.</span>}
            {preview && (
              <>
                <span style={{ fontSize: 13, opacity: 0.85 }}>Found {preview.resources.length} scrolls with {preview.resources.reduce((a, r) => a + r.units.length, 0)} units: {preview.resources.map((r) => r.name).join(", ")}.</span>
                <button className="btn small seal-btn" onClick={() => applyPlan(preview)}>Apply this plan</button>
              </>
            )}
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {state.plan.resources.map((r, i) => {
          const d = r.units.filter((u) => state.progress.done[u.id]).length;
          const nx = nextUnit(r, state.progress.done);
          const isOpen = open === r.id;
          return (
            <div key={r.id} className="sheet">
              <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 6px 10px 14px" }}>
                <span className="display" style={{ fontSize: 18, fontWeight: 800, width: 30, textAlign: "center", flexShrink: 0 }}>{ROMAN[i] ?? i + 1}</span>
                <button onClick={() => setOpen(isOpen ? null : r.id)} aria-expanded={isOpen} style={{ border: 0, background: "transparent", textAlign: "left", flexGrow: 1, minWidth: 0, padding: "4px 0", display: "flex", flexDirection: "column", gap: 3 }}>
                  <b style={{ fontSize: 14.5 }}>{r.name}</b>
                  <span className="mute num" style={{ fontSize: 12 }}>{r.by ? r.by + " · " : ""}{r.role === "daily" ? "daily" : r.days.map((x) => DAY_SHORT[x]).join(" & ") || "no days set"} · {r.minutes} min · {d}/{r.units.length}</span>
                  <div className="bar" style={{ height: 5 }}><i style={{ width: `${r.units.length ? (d / r.units.length) * 100 : 0}%` }} /></div>
                </button>
                {confirmDel === r.id ? (
                  <button className="chipbtn" style={{ color: "var(--seal)", borderColor: "var(--seal)" }} onClick={() => { p.update((s) => { s.plan.resources = s.plan.resources.filter((x) => x.id !== r.id); return s; }); setConfirmDel(null); p.toast("Scroll removed"); }}>Remove?</button>
                ) : (
                  <button onClick={() => setConfirmDel(r.id)} aria-label={`Remove ${r.name}`} style={{ width: 44, height: 44, border: 0, background: "transparent", display: "grid", placeItems: "center", color: "var(--ink-3)", flexShrink: 0 }}>{I.trash}</button>
                )}
              </div>
              {isOpen && (
                <div style={{ borderTop: "1px solid var(--line)", padding: "6px 0", maxHeight: 380, overflowY: "auto" }}>
                  {r.units.map((u) => {
                    const done = !!state.progress.done[u.id];
                    return (
                      <button key={u.id} onClick={() => p.update((s) => { if (s.progress.done[u.id]) delete s.progress.done[u.id]; else s.progress.done[u.id] = today(); return s; })} aria-pressed={done} style={{ width: "100%", border: 0, background: "transparent", textAlign: "left", display: "flex", gap: 10, alignItems: "center", padding: "9px 14px", fontSize: 14, minHeight: 44 }}>
                        <span style={{ width: 20, height: 20, borderRadius: 4, border: "2px solid var(--ink)", background: done ? "var(--ink)" : "transparent", color: "var(--paper)", display: "grid", placeItems: "center", flexShrink: 0 }}>{done && <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}</span>
                        <span style={{ color: done ? "var(--ink-3)" : "var(--ink)", fontWeight: nx?.id === u.id ? 700 : 400, flexGrow: 1 }}>{u.name}</span>
                        {nx?.id === u.id && <span className="eyebrow" style={{ color: "var(--seal)", fontSize: 10 }}>Next</span>}
                      </button>
                    );
                  })}
                  {r.url && <a href={r.url} target="_blank" rel="noopener" style={{ display: "block", padding: "6px 14px 10px", fontSize: 13, fontWeight: 700 }}>Open source ↗</a>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <EnglishDays state={state} update={p.update} />
      <Backup state={state} update={p.update} toast={p.toast} />
    </div>
  );
}

function AddScroll(p: { onAdd: (r: Resource) => void; existing: string[] }) {
  const [name, setName] = useState(""); const [by, setBy] = useState(""); const [url, setUrl] = useState("");
  const [kind, setKind] = useState<Resource["kind"]>("course"); const [days, setDays] = useState<number[]>([]);
  const [daily, setDaily] = useState(false); const [minutes, setMinutes] = useState(60); const [units, setUnits] = useState("");
  const lines = units.split("\n").map((x) => x.trim()).filter(Boolean);
  const ok = name.trim() && lines.length && (daily || days.length);
  function add() {
    let id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 20) || "scroll";
    while (p.existing.includes(id)) id += "-2";
    p.onAdd({ id, name: name.trim(), by: by.trim(), kind, url: url.trim() || undefined, role: daily ? "daily" : "study", days: daily ? [0, 1, 2, 3, 4, 5, 6] : days, minutes, units: lines.map((n, i) => ({ id: `${id}-${i + 1}`, name: n })) });
  }
  return (
    <div className="sheet" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
      <b className="h2" style={{ fontSize: 18 }}>New scroll</b>
      <label className="lbl">Name<input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Clean Architecture" /></label>
      <label className="lbl">Author or platform<input className="field" value={by} onChange={(e) => setBy(e.target.value)} placeholder="Robert C. Martin · book" /></label>
      <label className="lbl">Link (optional)<input className="field" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" inputMode="url" /></label>
      <div className="lbl">Type<div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{(["course", "book", "video", "project"] as const).map((k) => <button key={k} className={`chipbtn ${kind === k ? "on" : ""}`} onClick={() => { setKind(k); setDaily(k === "project"); }} aria-pressed={kind === k}>{k}</button>)}</div></div>
      <div className="lbl">When<div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button className={`chipbtn ${daily ? "on" : ""}`} onClick={() => setDaily(!daily)} aria-pressed={daily}>Every day</button>
        {!daily && WEEK_ORDER.map((d) => <button key={d} className={`chipbtn ${days.includes(d) ? "on" : ""}`} onClick={() => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d])} aria-pressed={days.includes(d)}>{DAY_SHORT[d]}</button>)}
      </div></div>
      <label className="lbl">Minutes per session<input className="field" type="number" min={5} max={240} value={minutes} onChange={(e) => setMinutes(Number(e.target.value) || 60)} /></label>
      <label className="lbl">Units, one per line<textarea className="field" style={{ fontFamily: "var(--body)", fontSize: 14 }} value={units} onChange={(e) => setUnits(e.target.value)} placeholder={"Ch1 · What is design and architecture\nCh2 · A tale of two values"} /></label>
      <span className="mute" style={{ fontSize: 12.5 }}>Tip: let Claude write the unit list, then paste it here.</span>
      <button className="btn" disabled={!ok} onClick={add}>Add {lines.length ? `${lines.length} units` : "scroll"}</button>
    </div>
  );
}

function EnglishDays(p: { state: AppState; update: (fn: (s: AppState) => AppState) => void }) {
  const cd = p.state.plan.english.classDays;
  return (
    <div className="sheet" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
      <span className="eyebrow">English class days</span>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {WEEK_ORDER.map((d) => <button key={d} className={`chipbtn ${cd.includes(d) ? "on" : ""}`} aria-pressed={cd.includes(d)} onClick={() => p.update((s) => { const c = s.plan.english.classDays; s.plan.english.classDays = c.includes(d) ? c.filter((x) => x !== d) : [...c, d]; return s; })}>{DAY_SHORT[d]}</button>)}
      </div>
      <span className="mute" style={{ fontSize: 12.5 }}>On class days the class takes {p.state.plan.english.classMinutes} min and the other blocks shrink by a quarter.</span>
    </div>
  );
}

function Backup(p: { state: AppState; update: (fn: (s: AppState) => AppState) => void; toast: (m: string) => void }) {
  const [open, setOpen] = useState(false); const [text, setText] = useState(""); const [shown, setShown] = useState("");
  const [wipe, setWipe] = useState(false);
  async function exportAll() { const t = "PATH OF THE BLADE BACKUP " + keyOf(new Date()) + "\n" + JSON.stringify(p.state); if (await copyText(t)) p.toast("Backup copied. Keep it somewhere safe."); else setShown(t); }
  function restore() {
    try { const a = text.indexOf("{"); const s = JSON.parse(text.slice(a)); if (!s.plan || !s.progress) throw 0; p.update(() => s); setText(""); p.toast("Backup restored"); }
    catch { p.toast("That doesn't look like a backup"); }
  }
  return (
    <div className="sheet" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      <button onClick={() => setOpen(!open)} aria-expanded={open} style={{ border: 0, background: "transparent", textAlign: "left", padding: 0, display: "flex", justifyContent: "space-between", minHeight: 32, alignItems: "center" }}>
        <span className="eyebrow">Backup & restore</span><span className="mute">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <>
          <span className="mute" style={{ fontSize: 13 }}>Progress lives on this phone. Copy a backup before uninstalling or switching phones.</span>
          <button className="btn small ghost" onClick={exportAll}>Copy backup</button>
          {shown && <textarea className="field" readOnly value={shown} onFocus={(e) => e.currentTarget.select()} aria-label="Backup text" />}
          <textarea className="field" placeholder="Paste a backup to restore" value={text} onChange={(e) => setText(e.target.value)} aria-label="Backup to restore" />
          <button className="btn small" disabled={!text.trim()} onClick={restore}>Restore backup</button>
          <button className="chipbtn" style={{ alignSelf: "flex-start", color: "var(--seal)", borderColor: "var(--seal)" }} onClick={() => { if (!wipe) { setWipe(true); return; } p.update((s) => { s.progress = { done: {}, log: {}, urges: {}, focus: {}, vows: s.progress.vows, vowLog: {} }; return s; }); setWipe(false); p.toast("Progress cleared"); }}>{wipe ? "Tap again to erase all progress" : "Reset progress"}</button>
        </>
      )}
    </div>
  );
}

/* =================== DISCIPLINE =================== */
function Discipline(p: { state: AppState; update: (fn: (s: AppState) => AppState) => void; toast: (m: string) => void; onFocus: () => void }) {
  const { state } = p;
  const k = today();
  const week = weekKeys();
  const [adding, setAdding] = useState(false); const [text, setText] = useState("");
  const [del, setDel] = useState<string | null>(null);
  const vows = state.progress.vows;
  const kept = state.progress.vowLog[k] ?? {};
  const urgesWeek = week.reduce((a, d) => a + (state.progress.urges[d] ?? 0), 0);
  const focusWeek = week.reduce((a, d) => a + (state.progress.focus[d] ?? 0), 0);
  const perfectVowDays = week.filter((d) => vows.length && vows.every((v) => state.progress.vowLog[d]?.[v.id])).length;

  return (
    <div className="page">
      <header style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span className="eyebrow">Against brain rot</span>
        <h1 className="h1">Vows</h1>
        <span className="sub">Keep your vows today. Break none.</span>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8 }}>
        {[[urgesWeek, "", "urges resisted this week", false], [(focusWeek / 60).toFixed(1), "h", "deep focus this week", false], [perfectVowDays, "", "days with every vow kept", true]].map(([v, u, l, red], i) => (
          <div key={i} className="sheet" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 2 }}>
            <span className="display num" style={{ fontSize: 26, fontWeight: 800, color: red ? "var(--seal)" : undefined }}>{v}<span style={{ fontSize: 14 }}>{u}</span></span>
            <span className="mute" style={{ fontSize: 11.5, lineHeight: 1.3 }}>{l}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span className="eyebrow">Today's vows</span>
        {vows.map((v) => (
          <div key={v.id} className="sheet" style={{ display: "flex", alignItems: "center", gap: 4, paddingRight: 4 }}>
            <label style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 0 12px 14px", flexGrow: 1, minHeight: 44, cursor: "pointer" }}>
              <input type="checkbox" checked={!!kept[v.id]} onChange={() => { const now = !kept[v.id]; p.update((s) => { (s.progress.vowLog[k] ??= {})[v.id] = now; return s; }); if (now) p.toast("Vow kept. Honour holds."); }} style={{ width: 22, height: 22, accentColor: "var(--ink)", flexShrink: 0 }} />
              <span style={{ display: "flex", flexDirection: "column" }}><b style={{ fontSize: 14.5 }}>{v.text}</b>{v.sub && <span className="mute" style={{ fontSize: 12 }}>{v.sub}</span>}</span>
            </label>
            {del === v.id
              ? <button className="chipbtn" style={{ color: "var(--seal)", borderColor: "var(--seal)" }} onClick={() => { p.update((s) => { s.progress.vows = s.progress.vows.filter((x) => x.id !== v.id); return s; }); setDel(null); }}>Remove?</button>
              : <button onClick={() => setDel(v.id)} aria-label={`Remove vow: ${v.text}`} style={{ width: 44, height: 44, border: 0, background: "transparent", display: "grid", placeItems: "center", color: "var(--ink-3)" }}>{I.trash}</button>}
          </div>
        ))}
        {adding ? (
          <div className="sheet" style={{ padding: 12, display: "flex", gap: 8 }}>
            <input className="field" autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="No YouTube after 11 pm" aria-label="New vow" />
            <button className="btn small" disabled={!text.trim()} onClick={() => { p.update((s) => { s.progress.vows.push({ id: "v" + Date.now(), text: text.trim() }); return s; }); setText(""); setAdding(false); }}>Add</button>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} style={{ minHeight: 44, border: "1px dashed var(--ink-3)", background: "transparent", borderRadius: 4, color: "var(--ink-2)", fontWeight: 700, fontSize: 14 }}>Add a vow</button>
        )}
      </div>

      <div style={{ background: "var(--ink)", color: "var(--paper)", borderRadius: 4, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <b style={{ fontSize: 15 }}>When the urge comes</b>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8, textAlign: "center" }}>
          {["10 slow breaths", "Name the trigger", "Return to the task"].map((t, i) => (
            <div key={t} style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}><b className="display" style={{ fontSize: 22, color: "var(--seal-night)" }}>{i + 1}</b><span style={{ fontSize: 12.5, opacity: 0.85 }}>{t}</span></div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 8 }}>
          <button className="btn small" style={{ background: "var(--paper)", color: "var(--ink)" }} onClick={() => { p.update((s) => { s.progress.urges[k] = (s.progress.urges[k] ?? 0) + 1; return s; }); p.toast("Urge cut down. +2 XP"); }}>I resisted one</button>
          <button className="btn small" style={{ background: "transparent", color: "var(--paper)", border: "1px solid var(--paper)" }} onClick={p.onFocus}>Start focus</button>
        </div>
      </div>
    </div>
  );
}
