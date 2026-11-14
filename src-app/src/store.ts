import { useEffect, useState } from "react";
import { DEFAULT_PLAN, type Plan, type Resource, type Unit } from "./data";

/* ---------- types ---------- */
export type Vow = { id: string; text: string; sub?: string };
export type DayLog = {
  tasks: Record<string, boolean>;       // task key -> done
  units: Record<string, string>;        // resource id -> unit id studied that day
};
export type Progress = {
  done: Record<string, string>;         // unit id -> date finished
  log: Record<string, DayLog>;
  urges: Record<string, number>;
  focus: Record<string, number>;        // minutes of focus per day
  vows: Vow[];
  vowLog: Record<string, Record<string, boolean>>;
};
export type AppState = { plan: Plan; progress: Progress };

export type Task = {
  key: string;
  kind: "study" | "daily" | "eng";
  title: string;
  label: string;
  minutes: number;
  done: boolean;
  resource?: Resource;
  unit?: Unit | null;
};

/* ---------- dates ---------- */
export const keyOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const parseKey = (k: string) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
export const addDays = (k: string, n: number) => { const d = parseKey(k); d.setDate(d.getDate() + n); return keyOf(d); };
export const today = () => keyOf(new Date());
export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5]; // Egyptian week starts Saturday

/* ---------- persistence ---------- */
const KEY = "path-of-the-blade-v1";
const DEFAULT_VOWS: Vow[] = [
  { id: "v1", text: "No reels or shorts before the study block", sub: "Study first, scroll later or never" },
  { id: "v2", text: "Phone in another room while focusing", sub: "Out of sight, out of reach" },
  { id: "v3", text: "No screens in bed", sub: "Read one page of the book instead" },
];
const emptyProgress = (): Progress => ({ done: {}, log: {}, urges: {}, focus: {}, vows: DEFAULT_VOWS, vowLog: {} });

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      return { plan: normalizePlan(s.plan) ?? DEFAULT_PLAN, progress: { ...emptyProgress(), ...s.progress } };
    }
  } catch { /* storage unavailable: start fresh */ }
  return { plan: DEFAULT_PLAN, progress: emptyProgress() };
}

export function useAppState() {
  const [state, setState] = useState<AppState>(load);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ } }, [state]);
  return [state, setState] as const;
}

/* ---------- plan import / export ---------- */
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "item";

export function normalizePlan(p: unknown): Plan | null {
  if (!p || typeof p !== "object") return null;
  const o = p as Partial<Plan>;
  if (!Array.isArray(o.resources)) return null;
  const seen = new Set<string>();
  const uid = (base: string) => { let id = base, n = 2; while (seen.has(id)) id = `${base}-${n++}`; seen.add(id); return id; };
  const resources: Resource[] = o.resources.map((r: Partial<Resource>, ri) => {
    const rid = uid(String(r.id || slug(r.name || `scroll-${ri + 1}`)));
    const units = (Array.isArray(r.units) ? r.units : []).map((u: Partial<Unit> | string, ui) => {
      const name = typeof u === "string" ? u : String(u.name ?? `Unit ${ui + 1}`);
      const id = typeof u === "string" || !u.id ? `${rid}-${slug(name)}` : String(u.id);
      return { id: uid(id), name };
    });
    const days = Array.isArray(r.days) ? r.days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6) : [];
    return {
      id: rid, name: String(r.name || "Untitled scroll"), by: String(r.by || ""),
      kind: (["course", "book", "video", "project"].includes(r.kind as string) ? r.kind : "course") as Resource["kind"],
      url: r.url ? String(r.url) : undefined,
      role: r.role === "daily" ? "daily" : "study",
      days: r.role === "daily" ? [0, 1, 2, 3, 4, 5, 6] : days,
      minutes: Math.max(5, Math.min(240, Number(r.minutes) || 60)),
      units,
    };
  });
  const e = (o.english || {}) as Partial<Plan["english"]>;
  return {
    version: 1, resources,
    english: {
      classDays: Array.isArray(e.classDays) ? e.classDays : [0, 3],
      practiceMinutes: Number(e.practiceMinutes) || 20,
      classMinutes: Number(e.classMinutes) || 60,
    },
  };
}

export function planCode(plan: Plan) {
  return [
    "PATH OF THE BLADE · STUDY PLAN",
    "Claude: change this plan the way I ask. Keep every existing id exactly as it is. Give new units new unique ids.",
    "days: 0=Sun … 6=Sat. role \"study\" = shows on its days, \"daily\" = every day (projects).",
    "Reply with the complete JSON only, in one code block.",
    "",
    "```json",
    JSON.stringify(plan, null, 1),
    "```",
  ].join("\n");
}

export function parsePlanText(text: string): Plan | null {
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try { return normalizePlan(JSON.parse(text.slice(a, b + 1))); } catch { return null; }
}

/* ---------- daily plan ---------- */
export const nextUnit = (r: Resource, done: Progress["done"]) => r.units.find((u) => !done[u.id]) ?? null;
export const isClassDay = (plan: Plan, k: string) => plan.english.classDays.includes(parseKey(k).getDay());

export function tasksFor(state: AppState, k: string): Task[] {
  const { plan, progress } = state;
  const dow = parseKey(k).getDay();
  const log = progress.log[k] ?? { tasks: {}, units: {} };
  const cls = isClassDay(plan, k);
  const shrink = (m: number) => (cls ? Math.round((m * 0.75) / 5) * 5 : m);
  const list: Task[] = [];
  plan.resources.filter((r) => r.role === "study" && r.days.includes(dow)).forEach((r) => {
    const key = `study:${r.id}`;
    const studied = log.units[r.id];
    const unit = studied ? r.units.find((u) => u.id === studied) ?? null : nextUnit(r, progress.done);
    list.push({ key, kind: "study", label: `Study · ${r.name}`, title: unit ? unit.name : "Scroll finished. Pick any unit or add a new scroll.", minutes: shrink(r.minutes), done: !!log.tasks[key], resource: r, unit });
  });
  plan.resources.filter((r) => r.role === "daily").forEach((r) => {
    const key = `daily:${r.id}`;
    list.push({ key, kind: "daily", label: `Forge · ${r.name}`, title: "Build session", minutes: shrink(r.minutes), done: !!log.tasks[key], resource: r, unit: nextUnit(r, progress.done) });
  });
  if (cls) list.push({ key: "eng:class", kind: "eng", label: "English", title: "English class session", minutes: plan.english.classMinutes, done: !!log.tasks["eng:class"] });
  else list.push({ key: "eng:practice", kind: "eng", label: "English", title: `Practice ${plan.english.practiceMinutes} minutes: homework, words, listening`, minutes: plan.english.practiceMinutes, done: !!log.tasks["eng:practice"] });
  return list;
}

export function dayStatus(state: AppState, k: string): "" | "part" | "full" {
  const log = state.progress.log[k];
  if (!log) return "";
  const ts = tasksFor(state, k);
  const n = ts.filter((t) => t.done).length;
  return n === 0 ? "" : n === ts.length ? "full" : "part";
}

export function streak(state: AppState) {
  let k = today(), n = 0;
  if (!dayStatus(state, k)) k = addDays(k, -1);
  while (dayStatus(state, k)) { n++; k = addDays(k, -1); }
  return n;
}

export function bestStreak(state: AppState) {
  const days = Object.keys(state.progress.log).filter((k) => dayStatus(state, k)).sort();
  let best = 0, cur = 0, prev = "";
  days.forEach((k) => { cur = prev && addDays(prev, 1) === k ? cur + 1 : 1; best = Math.max(best, cur); prev = k; });
  return best;
}

/* ---------- ranks ---------- */
export const RANKS = [
  { name: "Rōnin", xp: 0, note: "A wanderer with a blade and a goal" },
  { name: "Ashigaru", xp: 250, note: "You show up. Every day." },
  { name: "Samurai", xp: 750, note: "Discipline has become habit" },
  { name: "Hatamoto", xp: 1500, note: "Trusted with harder battles" },
  { name: "Daimyō", xp: 3000, note: "You command your own time" },
  { name: "Shōgun", xp: 5000, note: "Master of the path" },
];

export function xpOf(state: AppState) {
  const p = state.progress;
  let xp = Object.keys(p.done).length * 15;
  Object.keys(p.log).forEach((k) => {
    xp += Object.values(p.log[k].tasks).filter(Boolean).length * 10;
    if (dayStatus(state, k) === "full") xp += 20;
  });
  xp += Object.values(p.urges).reduce((a, b) => a + b, 0) * 2;
  xp += Math.floor(Object.values(p.focus).reduce((a, b) => a + b, 0) / 5);
  Object.values(p.vowLog).forEach((d) => { xp += Object.values(d).filter(Boolean).length * 3; });
  return xp;
}

export function rankOf(xp: number) {
  let i = 0;
  RANKS.forEach((r, idx) => { if (xp >= r.xp) i = idx; });
  return { index: i, rank: RANKS[i], next: RANKS[i + 1] ?? null };
}

export function weekKeys(k = today()) {
  const start = addDays(k, -((parseKey(k).getDay() + 1) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}
