import React, { useState, useEffect, useRef } from "react";

/* ============================================================
   ATELIER v4 — Umang's default home.
   The room rearranges itself at midnight.
   ============================================================ */

const ACC = { red: "#E8402A", blue: "#3B5BE8", sun: "#F0B41C", moss: "#2E8A5C", iron: "#A8A196" };

const QUOTES = [
  ["Everything I'm not made me everything I am.", "Kanye West"],
  ["You have to embrace irony to survive.", "Virgil Abloh"],
  ["I really believe in the philosophy that you create your own universe.", "Basquiat"],
  ["Travel isn't always pretty. But that's okay. The journey changes you.", "Anthony Bourdain"],
  ["A good traveler has no fixed plans and is not intent on arriving.", "Lao Tzu"],
  ["You are what your deep, driving desire is.", "Brihadaranyaka Upanishad"],
  ["I start a picture and I finish it.", "Basquiat"],
  ["The struggle itself toward the heights is enough to fill a man's heart.", "Camus, on the guy in your sidebar"],
  ["Real painting means using colors as a battlefield.", "Kandinsky"],
  ["I try to apply colors like words that shape poems.", "Joan Miró"],
  ["Water is fluid, soft, and yielding. But water will wear away rock.", "Tao Te Ching"],
  ["The details are not the details. They make the design.", "Charles Eames"],
  ["Make it simple, but significant.", "Don Draper"],
  ["Perfection is achieved when there is nothing left to take away.", "Saint-Exupéry"],
  ["We are what we repeatedly do.", "Will Durant, on Aristotle"],
  ["Knowing others is intelligence; knowing yourself is true wisdom.", "Lao Tzu"],
];

const MUSES = [
  "Write like nobody's grading it.",
  "The 3am version of you is allowed in here.",
  "Bad first drafts are load-bearing.",
  "What's the wildest true version of this idea?",
  "Say it plain first. Make it beautiful later.",
];

const SESSIONS = ["PUSH", "PULL", "LEGS", "UPPER", "LOWER", "FULL", "CARDIO", "SPORT", "REST"];

/* ---------- helpers ---------- */
const dkey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const niceDate = () =>
  new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
const fmtShort = (iso) => {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
};
const lastNDays = (n) => {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(dkey(d));
  }
  return out;
};
const uid = () => Math.random().toString(36).slice(2, 10);

async function sGet(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch (e) { return fallback; }
}
async function sSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); }
  catch (e) { console.error("save failed", key, e); }
}

async function askClaude(prompt, maxTokens = 1000) {
  const key = (localStorage.getItem("atelier-key") || "").trim();
  if (!key) throw new Error("no-key");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
}

/* pulls the first JSON object out of any reply, however wrapped */
function extractJSON(raw) {
  const clean = raw.replace(/```json|```/g, "").trim();
  try { return JSON.parse(clean); } catch (e) {}
  const m = clean.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch (e) {} }
  return null;
}

function ytId(url) {
  const m = (url || "").match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
function ytList(url) {
  const m = (url || "").match(/[?&]list=([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}
/* pull a mix's real title straight from YouTube — no API key, oEmbed is public + CORS-open */
async function fetchYtTitle(url) {
  try {
    const r = await fetch("https://www.youtube.com/oembed?format=json&url=" + encodeURIComponent((url || "").trim()));
    if (!r.ok) return "";
    const j = await r.json();
    return (j.title || "").trim();
  } catch (e) { return ""; }
}

/* seeded rng — one universe per date */
function rng(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* moon phase */
function moonPhase() {
  const synodic = 29.53058867;
  const knownNew = Date.UTC(2000, 0, 6, 18, 14);
  const days = (Date.now() - knownNew) / 86400000;
  const frac = (((days % synodic) + synodic) % synodic) / synodic;
  let name = "new moon";
  if (frac < 0.03 || frac > 0.97) name = "new moon";
  else if (frac < 0.22) name = "waxing crescent";
  else if (frac < 0.28) name = "first quarter";
  else if (frac < 0.47) name = "waxing gibbous";
  else if (frac < 0.53) name = "full moon";
  else if (frac < 0.72) name = "waning gibbous";
  else if (frac < 0.78) name = "last quarter";
  else name = "waning crescent";
  return { frac, name };
}

const Moon = () => {
  const { frac, name } = moonPhase();
  const r = 13;
  const offset = frac <= 0.5 ? -4 * r * frac : 4 * r * (1 - frac);
  return (
    <span className="moon" title={name}>
      <svg viewBox="-16 -16 32 32" width="26" height="26">
        <defs><clipPath id="mclip"><circle r={r} /></clipPath></defs>
        <circle r={r} fill="var(--fg)" />
        <g clipPath="url(#mclip)"><circle r={r} cx={offset} fill="var(--bg)" /></g>
        <circle r={r} fill="none" stroke="var(--fg)" strokeWidth="1.6" />
      </svg>
      <em>{name}</em>
    </span>
  );
};

/* ============ CREATURES ============ */

const Sisyphus = () => (
  <div className="sisy-wrap" aria-hidden="true">
    <svg viewBox="0 0 220 150" width="100%">
      <path d="M8 132 L 202 46" stroke="var(--line)" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M196 40 l0 -14 l12 4 l-12 5" stroke={ACC.red} strokeWidth="2.5" fill={ACC.red} strokeLinejoin="round" />
      <g className="sisy">
        <circle cx="15" cy="-12" r="11.5" fill="none" stroke="var(--line)" strokeWidth="3" />
        <path d="M9 -16 q5 -3 10 1" stroke="var(--line)" strokeWidth="1.6" fill="none" />
        <circle cx="-13" cy="-19" r="4" fill="none" stroke="var(--line)" strokeWidth="2.6" />
        <path d="M-11 -15 L -5 -7" stroke="var(--line)" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M-10 -13 L 2 -15 M -9 -11 L 3 -9" stroke="var(--line)" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M-5 -7 L -12 0 M -5 -7 L 0 0" stroke="var(--line)" strokeWidth="2.6" strokeLinecap="round" />
      </g>
    </svg>
    <div className="cap">one must imagine him shipping</div>
  </div>
);

const Flame = ({ pct }) => {
  const s = 0.45 + Math.min(1, pct) * 0.75;
  return (
    <div className="creature" aria-hidden="true">
      <svg viewBox="0 0 90 120" width="76">
        <g className="flame" style={{ transform: `scaleY(${s}) scaleX(${0.8 + s * 0.2})` }}>
          <path d="M45 14 C 58 34 72 44 72 70 a27 27 0 0 1 -54 0 C 18 44 32 34 45 14 Z"
            fill="none" stroke={ACC.red} strokeWidth="4" strokeLinejoin="round" />
          <path d="M45 48 C 51 58 58 63 58 76 a13 13 0 0 1 -26 0 C 32 63 39 58 45 48 Z"
            fill={ACC.sun} opacity=".9" />
        </g>
        <line x1="16" y1="112" x2="74" y2="112" stroke="var(--line)" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <div className="cap">{Math.round(pct * 100)}% stoked</div>
    </div>
  );
};

const Marble = ({ progress, revealed }) => {
  const chips = [
    { th: 0.1, pts: "8,8 34,8 8,30", f: "-40px,-30px,-40deg" },
    { th: 0.2, pts: "96,8 122,8 122,34", f: "44px,-28px,50deg" },
    { th: 0.35, pts: "8,58 8,88 30,74", f: "-46px,10px,-30deg" },
    { th: 0.5, pts: "122,52 122,84 102,68", f: "48px,14px,36deg" },
    { th: 0.65, pts: "8,108 40,132 8,132", f: "-38px,40px,-46deg" },
    { th: 0.8, pts: "122,104 122,132 88,132", f: "42px,42px,40deg" },
    { th: 0.92, pts: "48,8 82,8 65,26", f: "0px,-44px,20deg" },
  ];
  return (
    <div className="creature" aria-hidden="true">
      <svg viewBox="0 0 130 140" width="86" style={{ overflow: "visible" }}>
        <rect x="8" y="8" width="114" height="124" fill="none" stroke="var(--line)" strokeWidth="3.6" />
        {chips.map((c, i) => {
          const carved = progress >= c.th;
          const [tx, ty, rot] = c.f.split(",");
          return (
            <polygon key={i} points={c.pts} fill="var(--bg)" stroke={ACC.blue} strokeWidth="2.6"
              className={"chip-p" + (carved ? " carved" : "")}
              style={carved ? { transform: `translate(${tx},${ty}) rotate(${rot})` } : {}} />
          );
        })}
        <g className={"figure" + (revealed ? " show" : "")}>
          <circle cx="65" cy="52" r="11" fill="none" stroke="var(--line)" strokeWidth="3" />
          <path d="M65 63 V 96 M 65 72 L 48 86 M 65 72 L 82 86 M 65 96 L 52 118 M 65 96 L 78 118"
            stroke="var(--line)" strokeWidth="3" strokeLinecap="round" fill="none" />
        </g>
        <g className="chisel">
          <path d="M108 20 L 128 -2" stroke="var(--line)" strokeWidth="4.5" strokeLinecap="round" />
          <rect x="121" y="-12" width="15" height="10" rx="2" transform="rotate(45 128 -7)" fill={ACC.sun} />
        </g>
      </svg>
      <div className="cap">{revealed ? "the figure emerges" : "carving away the excess"}</div>
    </div>
  );
};

const Vinyl = ({ spinning }) => (
  <div className="creature" aria-hidden="true">
    <svg viewBox="0 0 150 130" width="120">
      <g className={"disc" + (spinning ? " spin" : "")}>
        <circle cx="62" cy="65" r="52" fill="var(--bg)" stroke="var(--line)" strokeWidth="3.4" />
        <circle cx="62" cy="65" r="40" fill="none" stroke="var(--line)" strokeWidth="1" opacity=".5" />
        <circle cx="62" cy="65" r="32" fill="none" stroke="var(--line)" strokeWidth="1" opacity=".5" />
        <circle cx="62" cy="65" r="24" fill="none" stroke="var(--line)" strokeWidth="1" opacity=".5" />
        <circle cx="62" cy="65" r="15" fill={ACC.sun} stroke="var(--line)" strokeWidth="2.6" />
        <circle cx="62" cy="65" r="2.6" fill="var(--bg)" stroke="var(--line)" strokeWidth="2" />
        <circle cx="62" cy="35" r="2.4" fill={ACC.red} />
      </g>
      <g className={"arm" + (spinning ? " down" : "")}>
        <circle cx="132" cy="18" r="7" fill="none" stroke="var(--line)" strokeWidth="3" />
        <path d="M132 18 L 112 52 L 98 66" stroke="var(--line)" strokeWidth="3.4" strokeLinecap="round" fill="none" />
        <rect x="90" y="62" width="12" height="9" rx="2" transform="rotate(-42 96 66)" fill={ACC.blue} />
      </g>
    </svg>
    <div className="cap">{spinning ? "now spinning" : "needle up"}</div>
  </div>
);

const Barbell = ({ sessions }) => (
  <div className="creature" aria-hidden="true">
    <svg viewBox="0 0 170 110" width="130">
      <g className="bell">
        <path d={`M18 55 Q 85 ${55 + Math.min(sessions, 6) * 3.2} 152 55`} stroke="var(--line)" strokeWidth="4.5" fill="none" strokeLinecap="round" />
        <rect x="8" y="30" width="12" height="50" fill={ACC.red} stroke="var(--line)" strokeWidth="2.6" />
        <rect x="22" y="38" width="8" height="34" fill={ACC.sun} stroke="var(--line)" strokeWidth="2.4" />
        <rect x="150" y="30" width="12" height="50" fill={ACC.red} stroke="var(--line)" strokeWidth="2.6" />
        <rect x="140" y="38" width="8" height="34" fill={ACC.sun} stroke="var(--line)" strokeWidth="2.4" />
      </g>
      <line x1="0" y1="100" x2="170" y2="100" stroke="var(--line)" strokeWidth="3" />
    </svg>
    <div className="cap">{sessions} session{sessions === 1 ? "" : "s"} this week — the bar remembers</div>
  </div>
);

const STONES = [
  [8, 84, 34], [46, 84, 36], [84, 84, 36], [118, 84, 34],
  [26, 62, 36], [62, 62, 36], [98, 62, 36],
  [44, 40, 36], [80, 40, 36],
  [62, 18, 36],
];
const Pyramid = () => (
  <div className="pyr-wrap" aria-hidden="true">
    <svg viewBox="0 0 160 112" width="150" style={{ overflow: "visible" }}>
      {STONES.map(([x, y, w], i) => (
        <rect key={i} x={x} y={y} width={w} height="20" fill="var(--bg)" stroke="var(--line)" strokeWidth="2.6"
          className="stone" style={{ animationDelay: `${i * 0.55}s` }} />
      ))}
      <circle className="stone" cx="80" cy="8" r="4" fill={ACC.sun} style={{ animationDelay: "5.7s" }} />
      <line x1="0" y1="107" x2="160" y2="107" stroke="var(--line)" strokeWidth="3" />
    </svg>
    <div className="cap">built daily · torn down nightly</div>
  </div>
);

const Drift = () => (
  <div className="drift" aria-hidden="true">
    <svg className="dr dr1" viewBox="0 0 30 30" width="20"><circle cx="15" cy="15" r="9" fill={ACC.red} opacity=".45" /></svg>
    <svg className="dr dr2" viewBox="0 0 40 40" width="26">
      <g stroke={ACC.sun} strokeWidth="2.4" strokeLinecap="round" opacity=".45">
        <path d="M20 4 V 36 M 6 12 L 34 28 M 34 12 L 6 28" />
      </g>
    </svg>
    <svg className="dr dr3" viewBox="0 0 40 40" width="22"><path d="M6 32 L20 8 L34 32 Z" fill="none" stroke={ACC.blue} strokeWidth="3" opacity=".45" /></svg>
  </div>
);

/* THE DAILY CANVAS — one original composition per date */
const DailyCanvas = ({ seed, width = 260, wide = false }) => {
  const r = rng("atelier-" + seed + (wide ? "-w" : ""));
  const pick = (arr) => arr[Math.floor(r() * arr.length)];
  const cols = [ACC.red, ACC.blue, ACC.sun, ACC.moss];
  const W = wide ? 760 : 260, H = wide ? 150 : 180;
  const px = () => 20 + r() * (W - 40);
  const py = () => 18 + r() * (H - 36);
  const els = [];
  els.push(<circle key="c1" cx={px()} cy={py()} r={(wide ? 20 : 22) + r() * 24} fill={pick(cols)} opacity=".92" />);
  if (wide) els.push(<circle key="c2" cx={px()} cy={py()} r={12 + r() * 16} fill="none" stroke={pick(cols)} strokeWidth="4" />);
  {
    const cx = px(), cy = py(), cr = 13 + r() * 13, col = pick(cols);
    els.push(
      <path key="cr" d={`M${cx} ${cy - cr} A ${cr} ${cr} 0 1 0 ${cx + cr} ${cy} A ${cr * 0.72} ${cr * 0.72} 0 1 1 ${cx} ${cy - cr}`}
        fill={col} opacity=".9" />
    );
  }
  {
    const cx = px(), cy = py(), s = 9 + r() * 9, rot = r() * 90;
    els.push(
      <g key="st" transform={`rotate(${rot} ${cx} ${cy})`} stroke="var(--fg)" strokeWidth="2.6" strokeLinecap="round">
        <path d={`M${cx} ${cy - s} V ${cy + s} M ${cx - s} ${cy - s * 0.5} L ${cx + s} ${cy + s * 0.5} M ${cx + s} ${cy - s * 0.5} L ${cx - s} ${cy + s * 0.5}`} />
      </g>
    );
  }
  {
    const cx = px(), cy = py(), s = 12 + r() * 13;
    els.push(<path key="tr" d={`M${cx - s} ${cy + s} L ${cx} ${cy - s} L ${cx + s} ${cy + s} Z`} fill="none" stroke={pick(cols)} strokeWidth="4" strokeLinejoin="round" />);
  }
  const nLines = (wide ? 2 : 1) + Math.floor(r() * 2);
  for (let i = 0; i < nLines; i++) {
    const x0 = r() * W, y0 = r() * H;
    els.push(
      <path key={"ln" + i}
        d={`M${x0} ${y0} q ${(r() - 0.5) * 200} ${(r() - 0.5) * 140} ${(r() - 0.5) * 280} ${(r() - 0.5) * 160}`}
        fill="none" stroke="var(--fg)" strokeWidth="2.2" strokeLinecap="round" opacity=".85" />
    );
  }
  const nDots = (wide ? 5 : 3) + Math.floor(r() * 4);
  for (let i = 0; i < nDots; i++) {
    els.push(<circle key={"d" + i} cx={8 + r() * (W - 16)} cy={8 + r() * (H - 16)} r={2 + r() * 3.5} fill={pick([...cols, "var(--fg)"])} />);
  }
  return (
    <svg className="dcanvas" viewBox={`0 0 ${W} ${H}`} width={width} style={wide ? { width: "100%", maxWidth: 760 } : {}}>
      <rect x="0" y="0" width={W} height={H} fill="var(--soft)" stroke="var(--line)" strokeWidth="3" />
      {els}
    </svg>
  );
};

/* DAILY MARKS — the room's furniture, rearranged every midnight */
const DailyMarks = ({ seed }) => {
  const r = rng("marks-" + seed);
  const pick = (arr) => arr[Math.floor(r() * arr.length)];
  const cols = [ACC.red, ACC.blue, ACC.sun, ACC.moss];
  const zones = [
    { x: [80, 93], y: [5, 16] }, { x: [82, 94], y: [40, 58] }, { x: [78, 92], y: [74, 88] },
    { x: [34, 55], y: [82, 92] }, { x: [4, 14], y: [76, 90] }, { x: [26, 44], y: [5, 12] },
  ];
  const marks = zones
    .filter(() => r() > 0.2)
    .map((z, i) => {
      const shape = pick(["dot", "ring", "cres", "star", "tri", "sq"]);
      const col = pick(cols);
      const size = 30 + r() * 42;
      const left = z.x[0] + r() * (z.x[1] - z.x[0]);
      const top = z.y[0] + r() * (z.y[1] - z.y[0]);
      const drift = r() > 0.45;
      const dur = 12 + r() * 12;
      return { shape, col, size, left, top, drift, dur, key: i };
    });
  const draw = (m) => {
    switch (m.shape) {
      case "dot": return <circle cx="30" cy="30" r="17" fill={m.col} />;
      case "ring": return <circle cx="30" cy="30" r="15" fill="none" stroke={m.col} strokeWidth="4.5" />;
      case "cres": return <path d="M30 6 A 24 24 0 1 0 54 30 A 18 18 0 1 1 30 6" fill={m.col} />;
      case "star": return (
        <g stroke={m.col} strokeWidth="4" strokeLinecap="round">
          <path d="M30 7 V 53 M 10 17 L 50 43 M 50 17 L 10 43" />
        </g>
      );
      case "tri": return <path d="M8 50 L30 12 L52 50 Z" fill="none" stroke={m.col} strokeWidth="5" strokeLinejoin="round" />;
      case "sq": return <rect x="12" y="12" width="36" height="36" fill="none" stroke={m.col} strokeWidth="4.5" transform={`rotate(${Math.round(m.dur)} 30 30)`} />;
      default: return null;
    }
  };
  return (
    <div className="marks" aria-hidden="true">
      {marks.map((m) => (
        <svg key={m.key} className={"mk" + (m.drift ? " drifting" : "")} viewBox="0 0 60 60" width={m.size}
          style={{ left: m.left + "%", top: m.top + "%", animationDuration: m.dur + "s" }}>
          {draw(m)}
        </svg>
      ))}
    </div>
  );
};

/* ---------- MINI PLAYER (drag by the header, resize from the corner) ---------- */
function MiniPlayer({ mix, min, setMin, close }) {
  const mobile = typeof window !== "undefined" && window.innerWidth <= 760;
  const [box, setBox] = useState(() => ({
    x: Math.max(12, (typeof window !== "undefined" ? window.innerWidth : 1200) - 340),
    y: Math.max(12, (typeof window !== "undefined" ? window.innerHeight : 800) - 260),
    w: 320,
  }));
  const [dragging, setDragging] = useState(false);
  const drag = useRef(null);
  const rez = useRef(null);

  useEffect(() => {
    const move = (e) => {
      if (drag.current) {
        const d = drag.current;
        const nx = Math.max(0, Math.min(d.ox + (e.clientX - d.sx), window.innerWidth - 90));
        const ny = Math.max(0, Math.min(d.oy + (e.clientY - d.sy), window.innerHeight - 44));
        setBox((b) => ({ ...b, x: nx, y: ny }));
      } else if (rez.current) {
        const z = rez.current;
        const nw = Math.max(220, Math.min(z.ow + (e.clientX - z.sx), window.innerWidth - 24));
        setBox((b) => ({ ...b, w: nw }));
      }
    };
    const up = () => {
      if (drag.current || rez.current) {
        drag.current = null; rez.current = null; setDragging(false); document.body.style.userSelect = "";
      }
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, []);

  const startDrag = (e) => {
    if (mobile || e.target.closest(".mini-b")) return;
    drag.current = { sx: e.clientX, sy: e.clientY, ox: box.x, oy: box.y };
    setDragging(true); document.body.style.userSelect = "none";
  };
  const startRez = (e) => {
    if (mobile) return;
    e.stopPropagation();
    rez.current = { sx: e.clientX, ow: box.w };
    setDragging(true); document.body.style.userSelect = "none";
  };

  const style = mobile ? undefined : { left: box.x, top: box.y, width: box.w, right: "auto", bottom: "auto" };

  return (
    <div className={"mini" + (min ? " min" : "") + (dragging ? " dragging" : "")} style={style}>
      <div className="mini-bar" onMouseDown={startDrag}>
        <div className="eq" aria-hidden="true"><i /><i /><i /><i /></div>
        <span className="mini-label">{mix.label}</span>
        <button className="mini-b" onClick={() => setMin(!min)}>{min ? "▲" : "▼"}</button>
        <button className="mini-b" onClick={close}>×</button>
      </div>
      <div className="mini-frame">
        <iframe
          title={mix.label}
          src={
            mix.list
              ? `https://www.youtube.com/embed/videoseries?list=${mix.list}&autoplay=1&playsinline=1`
              : `https://www.youtube.com/embed/${mix.vid}?autoplay=1&playsinline=1`
          }
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
      {!min && !mobile && <div className="mini-rez" onMouseDown={startRez} aria-hidden="true" title="drag to resize" />}
    </div>
  );
}

/* ---------- main ---------- */

export default function Atelier() {
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("today");

  const [settings, setSettings] = useState({ kcalGoal: 2400, proteinGoal: 130, theme: "dark", city: "Malegaon" });
  const [fuelDays, setFuelDays] = useState({});
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [mixes, setMixes] = useState([]);
  const [dayLogs, setDayLogs] = useState({});
  const [ironDays, setIronDays] = useState({});

  const [nowPlaying, setNowPlaying] = useState(null);
  const [playerMin, setPlayerMin] = useState(false);
  const [ritualOpen, setRitualOpen] = useState(false);

  const setKey = () => {
    const k = window.prompt(
      "Paste your Anthropic API key (sk-ant-...). It is stored ONLY in this browser and used for COUNT IT / RIFF / READ THE WEEK:",
      localStorage.getItem("atelier-key") || ""
    );
    if (k !== null) localStorage.setItem("atelier-key", k.trim());
  };

  useEffect(() => {
    (async () => {
      const [se, fu, ta, no, mi, dl, ir] = await Promise.all([
        sGet("atelier-settings", { kcalGoal: 2400, proteinGoal: 130, theme: "dark", city: "Malegaon" }),
        sGet("atelier-fuel", {}),
        sGet("atelier-tasks", []),
        sGet("atelier-notes", []),
        sGet("atelier-mixes", []),
        sGet("atelier-daylogs", {}),
        sGet("atelier-iron", {}),
      ]);
      setSettings({ theme: "dark", city: "Malegaon", kcalGoal: 2400, proteinGoal: 130, ...se });
      setFuelDays(fu); setTasks(ta); setNotes(no); setMixes(mi); setDayLogs(dl); setIronDays(ir);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => { if (loaded) sSet("atelier-settings", settings); }, [settings, loaded]);
  useEffect(() => { if (loaded) sSet("atelier-fuel", fuelDays); }, [fuelDays, loaded]);
  useEffect(() => { if (loaded) sSet("atelier-tasks", tasks); }, [tasks, loaded]);
  useEffect(() => { if (loaded) sSet("atelier-notes", notes); }, [notes, loaded]);
  useEffect(() => { if (loaded) sSet("atelier-mixes", mixes); }, [mixes, loaded]);
  useEffect(() => { if (loaded) sSet("atelier-daylogs", dayLogs); }, [dayLogs, loaded]);
  useEffect(() => { if (loaded) sSet("atelier-iron", ironDays); }, [ironDays, loaded]);

  const tk = dkey();
  const todayFuel = fuelDays[tk] || [];
  const kcalToday = todayFuel.reduce((s, e) => s + (e.kcal || 0), 0);
  const openTasks = tasks.filter((t) => !t.done);
  const quote = QUOTES[new Date().getDate() % QUOTES.length];
  const todayIron = ironDays[tk];

  let heroWord = ["STILL", "PUSHING"];
  if (todayIron && todayIron.pr) heroWord = ["PR", "DAY"];
  else if (todayIron && todayIron.type === "REST") heroWord = ["REST", "DAY"];
  else if (todayIron && todayIron.type) heroWord = ["HEAVY", "DAY"];
  else if (dayLogs[tk] && dayLogs[tk].sealed) heroWord = ["DAY", "SEALED"];

  const NAV = [
    ["today", "TODAY", "var(--fg)"],
    ["fuel", "FUEL", ACC.red],
    ["iron", "IRON", ACC.iron],
    ["tasks", "TASKS", ACC.blue],
    ["studio", "STUDIO", ACC.moss],
    ["sound", "SOUND", ACC.sun],
    ["atlas", "ATLAS", "var(--fg)"],
  ];

  return (
    <div className={"room " + (settings.theme === "dark" ? "dark" : "light")}>
      <style>{CSS}</style>
      <DailyMarks seed={tk} />

      <aside className="rail">
        <div className="rail-top">
          <div className="wordmark" onClick={() => setTab("today")}>
            ATE<br />LIER<span className="dot">.</span>
          </div>
          <button className="theme-b" title="flip the lights"
            onClick={() => setSettings({ ...settings, theme: settings.theme === "dark" ? "light" : "dark" })}>
            {settings.theme === "dark" ? "☾" : "☀"}
          </button>
        </div>
        <nav>
          {NAV.map(([id, label, col]) => (
            <button key={id} className={"navb" + (tab === id ? " on" : "")} onClick={() => setTab(id)}>
              <span className="swatch" style={{ background: col }} />
              {label}
            </button>
          ))}
        </nav>
        <button className="ghost keybtn" onClick={setKey}>⚿ claude api key</button>
        <Sisyphus />
      </aside>

      <main className="canvas">
        {!loaded ? (
          <div className="loading">pulling the room together…</div>
        ) : (
          <>
            {tab === "today" && (
              <Today quote={quote} heroWord={heroWord} kcalToday={kcalToday} settings={settings} setSettings={setSettings}
                openTasks={openTasks} notes={notes} mixes={mixes} dayLogs={dayLogs} ironDays={ironDays}
                go={setTab} openRitual={() => setRitualOpen(true)} />
            )}
            {tab === "fuel" && (
              <Fuel fuelDays={fuelDays} setFuelDays={setFuelDays} settings={settings} setSettings={setSettings} />
            )}
            {tab === "iron" && <Iron ironDays={ironDays} setIronDays={setIronDays} />}
            {tab === "tasks" && <Tasks tasks={tasks} setTasks={setTasks} />}
            {tab === "studio" && <Studio notes={notes} setNotes={setNotes} />}
            {tab === "sound" && (
              <Sound mixes={mixes} setMixes={setMixes} nowPlaying={nowPlaying}
                setNowPlaying={setNowPlaying} setPlayerMin={setPlayerMin} />
            )}
            {tab === "atlas" && (
              <Atlas fuelDays={fuelDays} tasks={tasks} dayLogs={dayLogs} ironDays={ironDays}
                settings={settings} openRitual={() => setRitualOpen(true)} />
            )}
          </>
        )}
      </main>

      {ritualOpen && loaded && (
        <Ritual dayLogs={dayLogs} setDayLogs={setDayLogs} close={() => setRitualOpen(false)} />
      )}

      {nowPlaying && (
        <MiniPlayer mix={nowPlaying} min={playerMin} setMin={setPlayerMin} close={() => setNowPlaying(null)} />
      )}
    </div>
  );
}

/* ---------- TODAY ---------- */
function Today({ quote, heroWord, kcalToday, settings, setSettings, openTasks, notes, mixes, dayLogs, ironDays, go, openRitual }) {
  const [editCity, setEditCity] = useState(false);
  const lastNote = notes.length ? notes[0] : null;
  const tk = dkey();
  const sealed = dayLogs[tk] && dayLogs[tk].sealed;
  const todayIron = ironDays[tk];
  return (
    <section className="pane">
      <div className="eyebrow">
        {niceDate()} ·{" "}
        {editCity ? (
          <input className="city-in" autoFocus value={settings.city}
            onChange={(e) => setSettings({ ...settings, city: e.target.value })}
            onBlur={() => setEditCity(false)}
            onKeyDown={(e) => e.key === "Enter" && setEditCity(false)} />
        ) : (
          <button className="city-b" onClick={() => setEditCity(true)} title="change city">{settings.city}</button>
        )}
        <Moon />
      </div>

      <div className="banner">
        <DailyCanvas seed={tk} wide />
        <div className="cap">today's canvas · {tk} · one of one — and the whole room rearranges at midnight</div>
      </div>

      <h1 className="hero">{heroWord[0]}<br />{heroWord[1]}<span style={{ color: ACC.red }}>.</span></h1>
      <p className="quote">“{quote[0]}” <span className="q-by">— {quote[1]}</span></p>

      <div className="tiles">
        <button className="tile" style={{ borderColor: ACC.red }} onClick={() => go("fuel")}>
          <div className="t-label" style={{ color: ACC.red }}>FUEL</div>
          <div className="t-big">{kcalToday}<span className="t-unit">/{settings.kcalGoal} kcal</span></div>
          <div className="t-bar"><div style={{ width: Math.min(100, (kcalToday / settings.kcalGoal) * 100) + "%", background: ACC.red }} /></div>
        </button>
        <button className="tile" style={{ borderColor: ACC.iron }} onClick={() => go("iron")}>
          <div className="t-label" style={{ color: ACC.iron }}>IRON</div>
          <div className="t-big">{todayIron && todayIron.type ? todayIron.type : "—"}{todayIron && todayIron.pr ? <span className="t-unit" style={{ color: ACC.sun }}> ★PR</span> : null}</div>
          <div className="t-sub">{todayIron && (todayIron.steps || todayIron.note) ? [todayIron.note, todayIron.steps ? todayIron.steps + " steps" : ""].filter(Boolean).join(" · ") : "no session logged yet"}</div>
        </button>
        <button className="tile" style={{ borderColor: ACC.blue }} onClick={() => go("tasks")}>
          <div className="t-label" style={{ color: ACC.blue }}>TASKS</div>
          <div className="t-big">{openTasks.length}<span className="t-unit"> open</span></div>
          <div className="t-sub">{openTasks[0] ? "next: " + openTasks[0].text : "board is clear"}</div>
        </button>
        <button className="tile" style={{ borderColor: ACC.moss }} onClick={() => go("studio")}>
          <div className="t-label" style={{ color: ACC.moss }}>STUDIO</div>
          <div className="t-big">{notes.length}<span className="t-unit"> pages</span></div>
          <div className="t-sub">{lastNote ? "last: " + (lastNote.title || "untitled") : "blank canvas waiting"}</div>
        </button>
        <button className="tile" style={{ borderColor: ACC.sun }} onClick={() => go("sound")}>
          <div className="t-label" style={{ color: ACC.sun }}>SOUND</div>
          <div className="t-big">{mixes.length}<span className="t-unit"> mixes</span></div>
          <div className="t-sub">{mixes[0] ? mixes[0].label : "crate is empty"}</div>
        </button>
      </div>

      <button className={"endday" + (sealed ? " sealed" : "")} onClick={openRitual}>
        ☾ {sealed ? "day sealed — reopen the journal" : "end the day"}
      </button>
    </section>
  );
}

/* ---------- RITUAL ---------- */
function Ritual({ dayLogs, setDayLogs, close }) {
  const tk = dkey();
  const existing = dayLogs[tk] || {};
  const [text, setText] = useState(existing.journal || "");
  const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;

  useEffect(() => {
    const esc = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [close]);

  const seal = () => {
    setDayLogs({ ...dayLogs, [tk]: { ...existing, journal: text, sealed: true } });
    close();
  };

  return (
    <div className="void ritual">
      <Drift />
      <div className="void-top">
        <span className="void-words">{niceDate()} · {words} words</span>
        <button className="ghost" onClick={close}>esc / not yet</button>
      </div>
      <div className="ritual-body">
        <div className="ritual-canvas">
          <DailyCanvas seed={tk} width={230} />
          <div className="cap">this day's painting — sealed with your words</div>
        </div>
        <div className="void-col ritual-col">
          <div className="ritual-ask">How was the day, really?</div>
          <textarea className="n-body v" autoFocus placeholder="What happened. What hit. What hurt. What's worth keeping…"
            value={text} onChange={(e) => setText(e.target.value)} />
          <button className="act ink big-seal" onClick={seal}>SEAL THE DAY</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- FUEL ---------- */
function Fuel({ fuelDays, setFuelDays, settings, setSettings }) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [editGoals, setEditGoals] = useState(false);
  const tk = dkey();
  const entries = fuelDays[tk] || [];
  const kcal = entries.reduce((s, e) => s + (e.kcal || 0), 0);
  const protein = entries.reduce((s, e) => s + (e.protein_g || 0), 0);
  const week = lastNDays(7);
  const weekMax = Math.max(settings.kcalGoal, ...week.map((d) => (fuelDays[d] || []).reduce((s, e) => s + e.kcal, 0)));

  const count = async () => {
    if (!input.trim() || busy) return;
    setBusy(true); setErr("");
    try {
      const raw = await askClaude(
        `You are a careful nutrition estimator using standard reference values (USDA / Indian Food Composition Tables). The user is in India; when a portion is unspecified, assume one typical Indian home serving and APPEND the assumed portion in parentheses inside the item name, e.g. "dal tadka (1 katori, ~150g)".\n\nThe input may describe an ENTIRE MEAL or FULL DAY with many foods separated by commas, plus signs, "and", or newlines. Split it into EVERY individual food item — never merge items, never skip any. "one scoop whey + 5 almonds + 100g curd" is THREE items.\n\nBe realistic, not conservative or inflated. Round kcal to the nearest 10.\n\nRespond with ONLY minified JSON on a single line, no markdown fences, no preamble, no trailing text, exactly:\n{"items":[{"name":"...","kcal":123,"protein_g":12}]}\n\nThey ate: ${input.trim()}`,
        1500
      );
      const parsed = extractJSON(raw);
      if (!parsed) throw new Error("no json");
      const items = (parsed.items || []).map((it) => ({
        id: uid(),
        name: String(it.name || "item"),
        kcal: Math.round(Number(it.kcal) || 0),
        protein_g: Math.round(Number(it.protein_g) || 0),
        at: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      }));
      if (!items.length) throw new Error("empty");
      setFuelDays({ ...fuelDays, [tk]: [...entries, ...items] });
      setInput("");
    } catch (e) {
      setErr("Didn't land — no API key set? Hit ⚿ in the sidebar, then try again.");
    }
    setBusy(false);
  };

  const remove = (id) => setFuelDays({ ...fuelDays, [tk]: entries.filter((e) => e.id !== id) });
  const patchKcal = (id, v) =>
    setFuelDays({ ...fuelDays, [tk]: entries.map((e) => (e.id === id ? { ...e, kcal: Number(v) || 0 } : e)) });

  return (
    <section className="pane">
      <div className="pane-head">
        <div>
          <div className="eyebrow" style={{ color: ACC.red }}>FUEL — {niceDate()}</div>
          <h2 className="head">What did you eat?</h2>
        </div>
        <Flame pct={settings.kcalGoal ? kcal / settings.kcalGoal : 0} />
      </div>

      <div className="fuel-input">
        <textarea rows={3}
          placeholder={"Dump the whole meal — one scoop whey, 5 almonds + 100g curd, 2 rotis, dal tadka, half plate poha…"}
          value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); count(); } }} />
        <button className="act red" onClick={count} disabled={busy}>{busy ? "counting…" : "COUNT IT"}</button>
      </div>
      <div className="hint">whole meals welcome — every item gets split out with its portion assumption. tap any kcal number to correct it.</div>
      {err && <div className="err">{err}</div>}

      <div className="fuel-stats">
        <div>
          <div className="big-num" style={{ color: ACC.red }}>{kcal}</div>
          <div className="num-cap">
            of {editGoals ? (
              <input className="goal-in" type="number" value={settings.kcalGoal}
                onChange={(e) => setSettings({ ...settings, kcalGoal: Number(e.target.value) || 0 })} />
            ) : settings.kcalGoal} kcal
          </div>
        </div>
        <div>
          <div className="big-num" style={{ color: ACC.blue }}>{protein}g</div>
          <div className="num-cap">
            of {editGoals ? (
              <input className="goal-in" type="number" value={settings.proteinGoal}
                onChange={(e) => setSettings({ ...settings, proteinGoal: Number(e.target.value) || 0 })} />
            ) : settings.proteinGoal}g protein
          </div>
        </div>
        <button className="ghost" onClick={() => setEditGoals(!editGoals)}>{editGoals ? "done" : "edit goals"}</button>
      </div>
      <div className="t-bar tall"><div style={{ width: Math.min(100, (kcal / settings.kcalGoal) * 100) + "%", background: ACC.red }} /></div>

      <ul className="entries">
        {entries.length === 0 && <li className="empty">Nothing logged yet. The plate is clean.</li>}
        {entries.map((e) => (
          <li key={e.id}>
            <span className="e-name">{e.name}</span>
            <span className="e-meta">
              <input className="kcal-in" type="number" value={e.kcal}
                onChange={(ev) => patchKcal(e.id, ev.target.value)} /> kcal · {e.protein_g}g · {e.at}
            </span>
            <button className="x" onClick={() => remove(e.id)}>×</button>
          </li>
        ))}
      </ul>

      <div className="eyebrow" style={{ marginTop: 34 }}>LAST 7 DAYS</div>
      <div className="week">
        {week.map((d) => {
          const v = (fuelDays[d] || []).reduce((s, e) => s + e.kcal, 0);
          const over = v > settings.kcalGoal;
          return (
            <div className="day" key={d} title={`${d}: ${v} kcal`}>
              <div className="day-bar-wrap">
                <div className="day-goal" style={{ bottom: (settings.kcalGoal / weekMax) * 100 + "%" }} />
                <div className="day-bar" style={{ height: Math.max(2, (v / weekMax) * 100) + "%", background: over ? ACC.sun : ACC.red }} />
              </div>
              <div className="day-cap">{d.slice(8)}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- IRON ---------- */
function Iron({ ironDays, setIronDays }) {
  const tk = dkey();
  const today = ironDays[tk] || { type: "", note: "", pr: false, steps: "", cardio: "" };
  const patch = (f) => setIronDays({ ...ironDays, [tk]: { ...today, ...f } });

  const week = lastNDays(7);
  const sessionsThisWeek = week.filter((d) => ironDays[d] && ironDays[d].type && ironDays[d].type !== "REST").length;
  const stepsThisWeek = week.reduce((s, d) => s + (Number(ironDays[d] && ironDays[d].steps) || 0), 0);
  const cardioThisWeek = week.filter((d) => ironDays[d] && ironDays[d].cardio).length;

  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const firstDow = new Date(y, m, 1).getDay();
  const monthName = now.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);

  const prs = Object.entries(ironDays).filter(([, v]) => v.pr).sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 12);

  return (
    <section className="pane">
      <div className="pane-head">
        <div>
          <div className="eyebrow" style={{ color: ACC.iron }}>IRON — {niceDate()}</div>
          <h2 className="head">Did you show up?</h2>
        </div>
        <Barbell sessions={sessionsThisWeek} />
      </div>

      <div className="w-chips">
        {SESSIONS.map((w) => (
          <button key={w} className={"chip pick" + (today.type === w ? " on" : "")}
            onClick={() => patch({ type: today.type === w ? "" : w })}>{w}</button>
        ))}
        <button className={"chip pick pr" + (today.pr ? " on" : "")} onClick={() => patch({ pr: !today.pr })}>
          ★ PR
        </button>
      </div>
      <div className="iron-form">
        <input className="grow2" placeholder="note — 'incline 32.5kg × 8'"
          value={today.note} onChange={(e) => patch({ note: e.target.value })} />
        <input className="steps-in" type="number" placeholder="steps"
          value={today.steps || ""} onChange={(e) => patch({ steps: e.target.value })} />
        <input className="grow2" placeholder="cardio — 'zone 2, 30 min'"
          value={today.cardio || ""} onChange={(e) => patch({ cardio: e.target.value })} />
      </div>

      <div className="stat-row" style={{ marginTop: 26 }}>
        <div className="stat"><div className="big-num" style={{ color: ACC.moss }}>{sessionsThisWeek}</div><div className="num-cap">sessions this week</div></div>
        <div className="stat"><div className="big-num" style={{ color: ACC.iron }}>{stepsThisWeek.toLocaleString("en-IN")}</div><div className="num-cap">steps this week</div></div>
        <div className="stat"><div className="big-num" style={{ color: ACC.sun }}>{cardioThisWeek}</div><div className="num-cap">cardio days</div></div>
      </div>

      <div className="eyebrow" style={{ marginTop: 32 }}>{monthName.toUpperCase()} — SHOW-UP MAP</div>
      <div className="month">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={"h" + i} className="m-h">{d}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="m-c off" />;
          const lg = ironDays[d];
          const isToday = d === tk;
          const worked = lg && lg.type && lg.type !== "REST";
          const rest = lg && lg.type === "REST";
          const cardio = lg && lg.cardio;
          return (
            <div key={i} className={"m-c" + (isToday ? " today" : "")}
              title={d + (lg ? [lg.type, lg.note, lg.steps ? lg.steps + " steps" : "", lg.cardio].filter(Boolean).map((s) => " · " + s).join("") : "")}>
              <span className="m-d">{Number(d.slice(8))}</span>
              {worked && <span className="m-dot" style={{ background: lg.pr ? ACC.sun : ACC.moss }} />}
              {rest && <span className="m-dot rest" />}
              {cardio && <span className="m-tick" />}
            </div>
          );
        })}
      </div>
      <div className="hint" style={{ marginTop: 8 }}>green = session · gold = PR day · dashed = rest · small red corner = cardio logged</div>

      {prs.length > 0 && (
        <>
          <div className="eyebrow" style={{ marginTop: 30, color: ACC.sun }}>★ PR WALL</div>
          <ul className="record">
            {prs.map(([d, v]) => (
              <li key={d}>
                <span className="r-date">{fmtShort(d)}</span>
                <span className="r-cells"><span className="chip sun">★ {v.type}</span><span>{v.note}</span></span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/* ---------- TASKS ---------- */
function Tasks({ tasks, setTasks }) {
  const [input, setInput] = useState("");
  const add = () => {
    if (!input.trim()) return;
    setTasks([{ id: uid(), text: input.trim(), done: false, doneAt: null }, ...tasks]);
    setInput("");
  };
  const toggle = (id) =>
    setTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done, doneAt: !t.done ? dkey() : null } : t)));
  const remove = (id) => setTasks(tasks.filter((t) => t.id !== id));
  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);
  const doneToday = tasks.filter((t) => t.done && t.doneAt === dkey()).length;
  const dayTotal = open.length + doneToday;
  const progress = dayTotal ? doneToday / dayTotal : 0;
  return (
    <section className="pane">
      <div className="pane-head">
        <div>
          <div className="eyebrow" style={{ color: ACC.blue }}>TASKS</div>
          <h2 className="head">Carve the excess away.</h2>
        </div>
        <Marble progress={progress} revealed={doneToday > 0 && open.length === 0} />
      </div>
      <div className="fuel-input">
        <textarea rows={1} placeholder="Add one thing…" value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <button className="act blue" onClick={add}>ADD</button>
      </div>
      <ul className="tlist">
        {open.length === 0 && <li className="empty">{tasks.length ? "All carved. The figure stands." : "Nothing here yet."}</li>}
        {open.map((t) => (
          <li key={t.id}>
            <button className="box" onClick={() => toggle(t.id)} aria-label="mark done" />
            <span>{t.text}</span>
            <button className="x" onClick={() => remove(t.id)}>×</button>
          </li>
        ))}
      </ul>
      {done.length > 0 && (
        <>
          <div className="eyebrow" style={{ marginTop: 26 }}>
            DONE ({done.length}) <button className="ghost" onClick={() => setTasks(open)}>clear</button>
          </div>
          <ul className="tlist done">
            {done.map((t) => (
              <li key={t.id}>
                <button className="box checked" onClick={() => toggle(t.id)}>×</button>
                <span className="strike">{t.text}</span>
                <button className="x" onClick={() => remove(t.id)}>×</button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/* ---------- STUDIO ---------- */
function Studio({ notes, setNotes }) {
  const [activeId, setActiveId] = useState(notes[0] ? notes[0].id : null);
  const [riff, setRiff] = useState("");
  const [riffBusy, setRiffBusy] = useState(false);
  const [voidMode, setVoidMode] = useState(false);
  const active = notes.find((n) => n.id === activeId) || null;
  const muse = MUSES[new Date().getDate() % MUSES.length];
  const words = active && active.body ? active.body.trim().split(/\s+/).filter(Boolean).length : 0;

  useEffect(() => {
    const esc = (e) => { if (e.key === "Escape") setVoidMode(false); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, []);

  const newNote = () => {
    const n = { id: uid(), title: "", body: "", updatedAt: Date.now() };
    setNotes([n, ...notes]);
    setActiveId(n.id);
    setRiff("");
  };
  const patch = (fields) =>
    setNotes(notes.map((n) => (n.id === activeId ? { ...n, ...fields, updatedAt: Date.now() } : n)));
  const remove = (id) => {
    const next = notes.filter((n) => n.id !== id);
    setNotes(next);
    if (activeId === id) setActiveId(next[0] ? next[0].id : null);
  };
  const doRiff = async () => {
    if (!active || !active.body.trim() || riffBusy) return;
    setRiffBusy(true); setRiff("");
    try {
      const out = await askClaude(
        `You are a sharp, honest thinking partner for a solo founder (built Clique Social, deep in a pivot; also job-hunting toward founding-engineer / product roles). Read his working note below. Reply in plain text, under 220 words: first the single strongest objection or blind spot, then exactly three concrete next moves. No flattery, no headers, no markdown.\n\nNOTE:\n${active.body}`
      );
      setRiff(out.trim());
    } catch (e) {
      setRiff("The line dropped — check your ⚿ api key in the sidebar, then riff again.");
    }
    setRiffBusy(false);
  };

  if (voidMode && active) {
    return (
      <div className="void">
        <Drift />
        <div className="void-top">
          <span className="void-words">{words} words</span>
          <button className="ghost" onClick={() => setVoidMode(false)}>esc / leave the void</button>
        </div>
        <div className="void-col">
          <input className="n-title v" placeholder="Title this thought"
            value={active.title} onChange={(e) => patch({ title: e.target.value })} />
          <textarea className="n-body v" placeholder={muse}
            value={active.body} onChange={(e) => patch({ body: e.target.value })} />
        </div>
        <div className="void-muse">“{muse}”</div>
      </div>
    );
  }

  return (
    <section className="pane studio">
      <Drift />
      <div className="s-side">
        <div className="eyebrow" style={{ color: ACC.moss }}>STUDIO</div>
        <button className="act moss wide" onClick={newNote}>NEW PAGE</button>
        <ul className="pages">
          {notes.map((n) => (
            <li key={n.id} className={n.id === activeId ? "on" : ""}>
              <button className="page-b" onClick={() => { setActiveId(n.id); setRiff(""); }}>
                {n.title || (n.body ? n.body.slice(0, 26) : "untitled")}
              </button>
              <button className="x" onClick={() => remove(n.id)}>×</button>
            </li>
          ))}
          {notes.length === 0 && <li className="empty">No pages yet.</li>}
        </ul>
      </div>
      <div className="s-main">
        {!active ? (
          <div className="empty big-empty">A blank canvas is an invitation.<br />Open a new page.</div>
        ) : (
          <>
            <input className="n-title" placeholder="Title this thought"
              value={active.title} onChange={(e) => patch({ title: e.target.value })} />
            <textarea className="n-body" placeholder={muse}
              value={active.body} onChange={(e) => patch({ body: e.target.value })} />
            <div className="riff-row">
              <button className="act ink" onClick={() => setVoidMode(true)}>ENTER THE VOID</button>
              <button className="act moss" onClick={doRiff} disabled={riffBusy}>
                {riffBusy ? "thinking…" : "RIFF WITH CLAUDE"}
              </button>
              <span className="hint">{words} words · riff = one hard objection + three moves</span>
            </div>
            {riff && <div className="riff">{riff}</div>}
          </>
        )}
      </div>
    </section>
  );
}

/* ---------- SOUND ---------- */
function Sound({ mixes, setMixes, nowPlaying, setNowPlaying, setPlayerMin }) {
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [fetching, setFetching] = useState(false);
  const labelEdited = useRef(false);

  // let the link name itself — fill the title unless you've typed your own
  const pullTitle = async (u) => {
    if ((!ytId(u) && !ytList(u)) || (labelEdited.current && label.trim())) return;
    setFetching(true);
    const t = await fetchYtTitle(u);
    setFetching(false);
    if (t && !(labelEdited.current && label.trim())) setLabel(t);
  };

  const add = async () => {
    const vid = ytId(url);
    const list = ytList(url);
    if (!vid && !list) return;
    let name = label.trim();
    if (!name) {
      setFetching(true);
      name = (await fetchYtTitle(url)) || "untitled mix";
      setFetching(false);
    }
    const m = { id: uid(), vid, list, url: url.trim(), label: name };
    setMixes([m, ...mixes]);
    setUrl(""); setLabel(""); labelEdited.current = false;
    setNowPlaying(m); setPlayerMin(false);
  };
  const remove = (id) => setMixes(mixes.filter((m) => m.id !== id));

  return (
    <section className="pane">
      <div className="pane-head">
        <div>
          <div className="eyebrow" style={{ color: ACC.sun }}>SOUND</div>
          <h2 className="head">The crate.</h2>
        </div>
        <Vinyl spinning={!!nowPlaying} />
      </div>

      <div className="sound-add">
        <input placeholder="Paste a YouTube link — video OR playlist" value={url}
          onChange={(e) => setUrl(e.target.value)}
          onBlur={() => pullTitle(url)}
          onPaste={(e) => { const v = e.clipboardData.getData("text"); if (v) setTimeout(() => pullTitle(v), 0); }} />
        <input placeholder={fetching ? "pulling the title…" : "Name it — or leave blank, the link names itself"} value={label}
          onChange={(e) => { labelEdited.current = true; setLabel(e.target.value); }} />
        <button className="act sun" onClick={add}>SAVE + SPIN</button>
      </div>
      <div className="hint">
        the corner player follows you through every room; minimize with ▼ and the audio carries on.
        real talk: claude.ai runs this app in a sandbox that YouTube distrusts, so many videos refuse here
        ("contact owner"). the crate still collects them all — and the moment we host Atelier on its own
        site, everything plays. playlists pass more often than single videos in the meantime.
      </div>

      <ul className="mixlist">
        {mixes.length === 0 && <li className="empty">Empty crate. Feed it your bangers.</li>}
        {mixes.map((m) => (
          <li key={m.id} className={nowPlaying && nowPlaying.id === m.id ? "on" : ""}>
            <button className="mix-b" onClick={() => { setNowPlaying(m); setPlayerMin(false); }}>
              ▸ {m.label} {m.list ? <span className="chip sun">playlist</span> : null}
            </button>
            <a className="ghost" href={m.url} target="_blank" rel="noreferrer">yt</a>
            <button className="x" onClick={() => remove(m.id)}>×</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- ATLAS ---------- */
function Atlas({ fuelDays, tasks, dayLogs, ironDays, settings, openRitual }) {
  const [letter, setLetter] = useState("");
  const [letterBusy, setLetterBusy] = useState(false);
  const tk = dkey();
  const week = lastNDays(7);
  const kcalOf = (d) => (fuelDays[d] || []).reduce((s, e) => s + e.kcal, 0);
  const daysWithFood = week.filter((d) => kcalOf(d) > 0);
  const avgKcal = daysWithFood.length
    ? Math.round(daysWithFood.reduce((s, d) => s + kcalOf(d), 0) / daysWithFood.length) : 0;
  const workoutsThisWeek = week.filter((d) => ironDays[d] && ironDays[d].type && ironDays[d].type !== "REST").length;
  const tasksThisWeek = tasks.filter((t) => t.done && week.includes(t.doneAt)).length;
  const sealedThisWeek = week.filter((d) => dayLogs[d] && dayLogs[d].sealed).length;
  const stepsThisWeek = week.reduce((s, d) => s + (Number(ironDays[d] && ironDays[d].steps) || 0), 0);

  const allDates = Array.from(
    new Set([
      ...Object.keys(fuelDays), ...Object.keys(dayLogs), ...Object.keys(ironDays),
      ...tasks.filter((t) => t.doneAt).map((t) => t.doneAt),
    ])
  ).sort().reverse().slice(0, 60);

  const readWeek = async () => {
    if (letterBusy) return;
    setLetterBusy(true); setLetter("");
    const lines = week.map((d) => {
      const ir = ironDays[d]; const jl = dayLogs[d];
      return `${d}: ${kcalOf(d)} kcal; iron=${ir && ir.type ? ir.type + (ir.pr ? " (PR: " + ir.note + ")" : "") : "none"}; steps=${(ir && ir.steps) || 0}; cardio=${(ir && ir.cardio) || "none"}; tasks closed=${tasks.filter((t) => t.doneAt === d).length}; journal="${jl && jl.journal ? jl.journal.slice(0, 300) : ""}"`;
    }).join("\n");
    try {
      const out = await askClaude(
        `You are writing a short weekly letter to Umang — a solo founder mid-pivot, training in the gym, tracking his days in a personal dashboard. Below is his real week of data and journal excerpts. Write an honest, warm but unsentimental letter under 180 words: name one real pattern you see (good or bad), one thing he should protect next week, one thing to fix. Plain text, no headers, no markdown, sign off as "— the room".\n\nWEEK (kcal goal ${settings.kcalGoal}):\n${lines}`
      );
      setLetter(out.trim());
    } catch (e) {
      setLetter("The room lost its voice — check your ⚿ api key in the sidebar and try again.");
    }
    setLetterBusy(false);
  };

  return (
    <section className="pane">
      <div className="pane-head">
        <div>
          <div className="eyebrow">ATLAS — THE OBSERVATORY</div>
          <h2 className="head">Zoom out.</h2>
        </div>
        <Pyramid />
      </div>

      <div className="stat-row">
        <div className="stat"><div className="big-num" style={{ color: ACC.moss }}>{workoutsThisWeek}</div><div className="num-cap">workouts this week</div></div>
        <div className="stat"><div className="big-num" style={{ color: ACC.red }}>{avgKcal}</div><div className="num-cap">avg kcal / logged day (goal {settings.kcalGoal})</div></div>
        <div className="stat"><div className="big-num" style={{ color: ACC.iron }}>{stepsThisWeek.toLocaleString("en-IN")}</div><div className="num-cap">steps</div></div>
        <div className="stat"><div className="big-num" style={{ color: ACC.blue }}>{tasksThisWeek}</div><div className="num-cap">tasks closed</div></div>
        <div className="stat"><div className="big-num">{sealedThisWeek}/7</div><div className="num-cap">days sealed</div></div>
      </div>

      <div className="atlas-actions">
        <button className="act ink" onClick={openRitual}>
          {dayLogs[tk] && dayLogs[tk].sealed ? "REOPEN TODAY'S JOURNAL" : "☾ END THE DAY"}
        </button>
        <button className="act sun" onClick={readWeek} disabled={letterBusy}>
          {letterBusy ? "reading…" : "READ THE WEEK"}
        </button>
      </div>
      {letter && <div className="riff letter">{letter}</div>}

      <div className="eyebrow" style={{ marginTop: 34 }}>THE RECORD</div>
      <ul className="record">
        {allDates.length === 0 && <li className="empty">The record begins today.</li>}
        {allDates.map((d) => {
          const k = kcalOf(d);
          const ir = ironDays[d];
          const lg = dayLogs[d];
          const td = tasks.filter((t) => t.doneAt === d).length;
          const hasJournal = lg && lg.journal;
          return (
            <li key={d} className={hasJournal ? "with-journal" : ""}>
              {hasJournal && <span className="r-thumb"><DailyCanvas seed={d} width={72} /></span>}
              <span className="r-date">{fmtShort(d)}</span>
              <span className="r-cells">
                {k > 0 && <span className="chip red">{k} kcal</span>}
                {ir && ir.type && <span className="chip moss">{ir.pr ? "★ " : ""}{ir.type}{ir.note ? " · " + ir.note : ""}</span>}
                {ir && ir.steps && <span className="chip iron">{Number(ir.steps).toLocaleString("en-IN")} steps</span>}
                {ir && ir.cardio && <span className="chip iron">{ir.cardio}</span>}
                {!ir && lg && lg.workout && <span className="chip moss">{lg.workout}{lg.note ? " · " + lg.note : ""}</span>}
                {td > 0 && <span className="chip blue">✓ {td}</span>}
                {hasJournal && <span className="r-high">“{lg.journal.length > 200 ? lg.journal.slice(0, 200) + "…" : lg.journal}”</span>}
                {!hasJournal && lg && lg.highlight && <span className="r-high">“{lg.highlight}”</span>}
                {k === 0 && !ir && !lg && td === 0 && <span className="hint">quiet day</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ---------- CSS ---------- */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Space+Grotesk:wght@400;500;700&family=Space+Mono:wght@400;700&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400&display=swap');

* { box-sizing: border-box; margin: 0; }
.room {
  --bg: #14120C; --fg: #EFE8D8; --line: #EFE8D8;
  --dot: rgba(239,232,216,.14); --soft: rgba(239,232,216,.06);
  min-height: 100vh; display: flex; background: var(--bg); color: var(--fg);
  font-family: 'Space Grotesk', sans-serif; position: relative; overflow-x: hidden;
  background-image: radial-gradient(var(--dot) 1px, transparent 1px);
  background-size: 26px 26px;
}
.room.light { --bg: #EFE8D8; --fg: #16120C; --line: #16120C; --dot: #E0D5BC; --soft: rgba(22,18,12,.05); }

.marks { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
.mk { position: absolute; opacity: .82; }
.mk.drifting { animation: mdrift ease-in-out infinite alternate; }
@keyframes mdrift { from { transform: translateY(0) rotate(0deg);} to { transform: translateY(-14px) rotate(9deg);} }

.rail {
  width: 200px; flex-shrink: 0; border-right: 3px solid var(--line);
  padding: 26px 18px; display: flex; flex-direction: column; gap: 24px;
  position: sticky; top: 0; height: 100vh; z-index: 2; background: var(--bg);
}
.rail-top { display: flex; justify-content: space-between; align-items: flex-start; }
.wordmark { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 34px; line-height: .92; letter-spacing: -1px; cursor: pointer; user-select: none; }
.wordmark .dot { color: ${ACC.red}; }
.theme-b { background: none; border: 2px solid var(--line); color: var(--fg); width: 32px; height: 32px; cursor: pointer; font-size: 15px; }
.theme-b:hover { background: var(--soft); }

nav { display: flex; flex-direction: column; gap: 4px; }
.navb {
  display: flex; align-items: center; gap: 10px; background: none; border: none;
  font-family: 'Space Mono', monospace; font-size: 13px; letter-spacing: 2px;
  padding: 8px; cursor: pointer; color: var(--fg); text-align: left;
  border-left: 3px solid transparent; transition: transform .15s;
}
.navb:hover { transform: translateX(4px); }
.navb.on { border-left-color: var(--line); font-weight: 700; background: var(--soft); }
.swatch { width: 11px; height: 11px; border: 2px solid var(--line); display: inline-block; }

.cap { font-family: 'Space Mono', monospace; font-size: 9.5px; opacity: .55; margin-top: 5px; letter-spacing: .5px; }
.keybtn { margin-top: auto; text-align: left; }
.sisy-wrap { margin-top: 10px; }
.sisy { animation: climb 16s linear infinite; }
@keyframes climb {
  0%   { transform: translate(22px, 122px) rotate(-23.6deg); }
  88%  { transform: translate(168px, 58px) rotate(-23.6deg); }
  91%  { transform: translate(150px, 66px) rotate(-16deg); }
  94%  { transform: translate(22px, 122px) rotate(-23.6deg); }
  100% { transform: translate(22px, 122px) rotate(-23.6deg); }
}

.creature { text-align: right; flex-shrink: 0; }
.pane-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; flex-wrap: wrap; }

.flame { transform-origin: 45px 112px; transition: transform 1.2s cubic-bezier(.3,1.4,.4,1); }
.flame path:first-child { animation: flick2 2.2s ease-in-out infinite; transform-origin: 45px 90px; }
@keyframes flick2 { 0%,100% { transform: skewX(0deg) scale(1);} 30% { transform: skewX(2.5deg) scale(1.02);} 60% { transform: skewX(-2deg) scale(.985);} }

.chip-p { transition: transform 1.1s cubic-bezier(.5,0,.8,.4), opacity 1.1s; }
.chisel { animation: tap 3s ease-in-out infinite; }
@keyframes tap {
  0%, 64%, 100% { transform: translate(5px,-5px) rotate(0deg); }
  72% { transform: translate(0px,0px) rotate(-2deg); }
  76% { transform: translate(6px,-6px) rotate(1deg); }
}
.chip-p.carved { opacity: 0; }
.figure { opacity: 0; transition: opacity 1.6s ease .6s; }
.figure.show { opacity: 1; }

.disc { transform-origin: 62px 65px; }
.disc.spin { animation: spin 2.4s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.arm { transform-origin: 132px 18px; transform: rotate(-24deg); transition: transform 1.2s cubic-bezier(.3,1.2,.4,1); }
.arm.down { transform: rotate(0deg); }

.bell { animation: heft 5s ease-in-out infinite; transform-origin: 85px 55px; }
@keyframes heft { 0%,100% { transform: translateY(0);} 50% { transform: translateY(-3px);} }

.stone { animation: stone 18s cubic-bezier(.25,1.35,.4,1) infinite; opacity: 0; }
@keyframes stone {
  0%   { opacity: 0; transform: translateY(26px); }
  3.5% { opacity: 1; transform: translateY(-3px); }
  5%   { transform: translateY(0); }
  72%  { opacity: 1; transform: translateY(0); animation-timing-function: cubic-bezier(.5,0,.85,.4); }
  79%  { opacity: 0; transform: translateY(34px) rotate(5deg); }
  100% { opacity: 0; transform: translateY(34px); }
}
.pyr-wrap { text-align: right; }

.drift { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.dr { position: absolute; }
.dr1 { top: 14%; right: 8%; animation: float1 34s ease-in-out infinite alternate; }
.dr2 { bottom: 22%; right: 14%; animation: float2 42s ease-in-out infinite alternate; }
.dr3 { top: 46%; right: 4%; animation: float1 38s ease-in-out infinite alternate-reverse; }
@keyframes float1 { from { transform: translate(0,0) rotate(0deg);} to { transform: translate(-26px, 20px) rotate(16deg);} }
@keyframes float2 { from { transform: translate(0,0) rotate(0deg);} to { transform: translate(20px, -26px) rotate(-12deg);} }

@media (prefers-reduced-motion: reduce) {
  .sisy, .mk.drifting, .stone, .dr, .eq i, .disc.spin, .flame path:first-child, .bell, .chisel { animation: none !important; }
  .stone { opacity: 1; transform: none; }
}

.canvas { flex: 1; padding: 40px 56px 130px; position: relative; z-index: 1; max-width: 1060px; }
.loading { font-family: 'Space Mono', monospace; opacity: .6; padding-top: 80px; }
.pane { animation: rise .35s ease; position: relative; }
@keyframes rise { from { opacity: 0; transform: translateY(10px);} to { opacity: 1; transform: none;} }

.eyebrow { font-family: 'Space Mono', monospace; font-size: 12px; letter-spacing: 3px; margin-bottom: 14px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.moon { display: inline-flex; align-items: center; gap: 7px; }
.moon em { font-style: normal; opacity: .6; letter-spacing: 1px; font-size: 11px; }
.city-b { background: none; border: none; color: var(--fg); font-family: 'Space Mono', monospace; font-size: 12px; letter-spacing: 3px; cursor: pointer; border-bottom: 2px dashed var(--line); padding: 0 2px; }
.city-in { width: 130px; padding: 2px 6px; font-size: 12px; border-width: 2px; font-family: 'Space Mono', monospace; }

.banner { margin: 4px 0 26px; }
.dcanvas { display: block; }

.hero {
  font-family: 'Syne', sans-serif; font-weight: 800; font-size: clamp(46px, 7vw, 88px);
  line-height: .9; letter-spacing: -3px; margin: 6px 0 20px;
  animation: paint 1s cubic-bezier(.2,.85,.25,1) both;
}
@keyframes paint { from { clip-path: inset(0 100% 0 0); transform: translateX(-8px);} to { clip-path: inset(0 0 0 0); transform: none;} }
.head { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 34px; margin-bottom: 20px; letter-spacing: -.5px; }
.quote { font-size: 17px; max-width: 520px; margin-bottom: 30px; line-height: 1.5; }
.q-by { font-family: 'Space Mono', monospace; font-size: 13px; opacity: .65; }

.tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
.tile {
  border: 3px solid; background: var(--bg); text-align: left; padding: 18px; cursor: pointer;
  box-shadow: 5px 5px 0 var(--line); transition: transform .12s, box-shadow .12s; font-family: inherit; color: var(--fg);
}
.tile:hover { transform: translate(-2px,-2px); box-shadow: 8px 8px 0 var(--line); }
.t-label { font-family: 'Space Mono', monospace; font-size: 11px; letter-spacing: 3px; margin-bottom: 10px; font-weight: 700; }
.t-big { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 32px; }
.t-unit { font-family: 'Space Mono', monospace; font-size: 13px; font-weight: 400; opacity: .6; margin-left: 4px; }
.t-sub { font-size: 13px; opacity: .7; margin-top: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.t-bar { height: 8px; border: 2px solid var(--line); margin-top: 12px; background: var(--bg); }
.t-bar.tall { height: 14px; max-width: 480px; margin: 10px 0 26px; }
.t-bar > div { height: 100%; transition: width .4s; }

.endday {
  margin-top: 34px; display: inline-block; padding: 10px 18px;
  font-family: 'Space Mono', monospace; font-size: 12px; letter-spacing: 2px;
  background: none; color: var(--fg); border: 2px dashed var(--line); cursor: pointer;
  opacity: .65; transition: opacity .2s, border-color .2s;
}
.endday:hover { opacity: 1; border-style: solid; }
.endday.sealed { border-color: ${ACC.moss}; color: ${ACC.moss}; opacity: .8; }

.fuel-input { display: flex; gap: 12px; align-items: stretch; max-width: 680px; margin-bottom: 8px; }
textarea, input, select {
  font-family: 'Space Grotesk', sans-serif; font-size: 16px; color: var(--fg);
  background: var(--bg); border: 3px solid var(--line); padding: 12px 14px; width: 100%;
  resize: vertical; outline: none;
}
textarea:focus, input:focus { box-shadow: 4px 4px 0 var(--line); }
.act {
  font-family: 'Space Mono', monospace; font-weight: 700; letter-spacing: 2px; font-size: 13px;
  border: 3px solid var(--line); padding: 12px 20px; cursor: pointer;
  box-shadow: 4px 4px 0 var(--line); transition: transform .1s, box-shadow .1s; white-space: nowrap;
}
.act:hover { transform: translate(-1px,-1px); box-shadow: 5px 5px 0 var(--line); }
.act:active { transform: translate(3px,3px); box-shadow: 1px 1px 0 var(--line); }
.act:disabled { opacity: .55; cursor: wait; }
.act.red { background: ${ACC.red}; color: #fff; } .act.blue { background: ${ACC.blue}; color: #fff; }
.act.moss { background: ${ACC.moss}; color: #fff; } .act.sun { background: ${ACC.sun}; color: #14120C; }
.act.ink { background: var(--fg); color: var(--bg); }
.act.wide { width: 100%; margin-bottom: 14px; }
.ghost { background: none; border: none; font-family: 'Space Mono', monospace; font-size: 11px; text-decoration: underline; cursor: pointer; color: var(--fg); opacity: .7; }
.err { color: ${ACC.red}; font-family: 'Space Mono', monospace; font-size: 13px; margin: 6px 0; }
.hint { font-family: 'Space Mono', monospace; font-size: 11.5px; opacity: .6; max-width: 680px; line-height: 1.6; }

.fuel-stats { display: flex; gap: 40px; align-items: flex-end; margin-top: 26px; }
.big-num { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 46px; line-height: 1; }
.num-cap { font-family: 'Space Mono', monospace; font-size: 12px; opacity: .7; margin-top: 4px; }
.goal-in { width: 74px; padding: 2px 6px; font-size: 13px; border-width: 2px; }
.kcal-in { width: 62px; padding: 1px 4px; font-size: 12px; border-width: 2px; font-family: 'Space Mono', monospace; text-align: right; }

.entries, .tlist, .pages, .mixlist, .record { list-style: none; padding: 0; max-width: 720px; }
.entries li, .tlist li, .mixlist li, .record li {
  display: flex; align-items: center; gap: 12px; padding: 11px 4px;
  border-bottom: 2px dashed color-mix(in srgb, var(--fg) 30%, transparent);
}
.e-name { flex: 1; }
.e-meta { font-family: 'Space Mono', monospace; font-size: 12px; opacity: .8; display: inline-flex; align-items: center; gap: 4px; }
.x { background: none; border: none; font-size: 18px; cursor: pointer; color: var(--fg); opacity: .4; }
.x:hover { opacity: 1; color: ${ACC.red}; }
.empty { opacity: .55; font-style: italic; padding: 12px 4px; border: none !important; }
.big-empty { font-size: 20px; padding-top: 60px; text-align: center; line-height: 1.6; }

.week { display: flex; gap: 12px; max-width: 480px; height: 130px; align-items: flex-end; }
.day { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%; }
.day-bar-wrap { position: relative; flex: 1; width: 100%; border-bottom: 3px solid var(--line); display: flex; align-items: flex-end; justify-content: center; }
.day-bar { width: 62%; border: 2px solid var(--line); border-bottom: none; }
.day-goal { position: absolute; left: 0; right: 0; border-top: 2px dashed ${ACC.blue}; }
.day-cap { font-family: 'Space Mono', monospace; font-size: 11px; opacity: .6; }

.w-chips { display: flex; flex-wrap: wrap; gap: 8px; max-width: 680px; }
.chip { font-family: 'Space Mono', monospace; font-size: 11px; letter-spacing: 1px; border: 2px solid var(--line); padding: 4px 9px; display: inline-block; }
.chip.pick { background: var(--bg); color: var(--fg); cursor: pointer; }
.chip.pick:hover { background: var(--soft); }
.chip.pick.on { background: ${ACC.moss}; color: #fff; border-color: ${ACC.moss}; }
.chip.pick.pr.on { background: ${ACC.sun}; color: #14120C; border-color: ${ACC.sun}; }
.chip.red { border-color: ${ACC.red}; color: ${ACC.red}; }
.chip.moss { border-color: ${ACC.moss}; color: ${ACC.moss}; }
.chip.blue { border-color: ${ACC.blue}; color: ${ACC.blue}; }
.chip.sun { border-color: ${ACC.sun}; color: ${ACC.sun}; }
.chip.iron { border-color: ${ACC.iron}; color: ${ACC.iron}; }

.iron-form { display: flex; gap: 12px; max-width: 680px; margin-top: 14px; align-items: flex-end; flex-wrap: wrap; }
.iron-form .grow2 { flex: 1; min-width: 200px; }
.iron-form .steps-in { width: 110px; }
.iron-field { display: flex; flex-direction: column; gap: 6px; width: 160px; }
.iron-field.grow { flex: 1; min-width: 240px; }
.f-label { font-family: 'Space Mono', monospace; font-size: 10px; letter-spacing: 2px; opacity: .6; }
.month { display: grid; grid-template-columns: repeat(7, 44px); gap: 6px; }
.m-h { font-family: 'Space Mono', monospace; font-size: 10px; opacity: .5; text-align: center; }
.m-c { border: 2px solid color-mix(in srgb, var(--fg) 35%, transparent); height: 44px; position: relative; padding: 3px 4px; }
.m-c.off { border: none; }
.m-c.today { border-color: var(--line); border-width: 3px; }
.m-d { font-family: 'Space Mono', monospace; font-size: 10px; opacity: .6; }
.m-dot { position: absolute; right: 5px; bottom: 5px; width: 11px; height: 11px; border-radius: 50%; }
.m-dot.rest { background: none; border: 2px dashed color-mix(in srgb, var(--fg) 50%, transparent); }
.m-tick { position: absolute; left: 0; bottom: 0; width: 0; height: 0; border-left: 9px solid ${ACC.red}; border-top: 9px solid transparent; }

.tlist .box { width: 22px; height: 22px; border: 3px solid var(--line); background: var(--bg); cursor: pointer; flex-shrink: 0; font-family: 'Syne', sans-serif; font-weight: 800; line-height: 1; color: ${ACC.blue}; }
.tlist span { flex: 1; }
.strike { text-decoration: line-through; opacity: .55; }

.studio { display: flex; gap: 34px; align-items: flex-start; }
.s-side { width: 220px; flex-shrink: 0; position: relative; z-index: 1; }
.pages li { display: flex; align-items: center; padding: 4px 0; }
.page-b { background: none; border: none; font-family: 'Space Grotesk', sans-serif; font-size: 15px; padding: 8px 6px; cursor: pointer; color: var(--fg); text-align: left; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border-left: 3px solid transparent; }
.pages li.on .page-b { border-left-color: ${ACC.moss}; font-weight: 700; }
.s-main { flex: 1; min-width: 0; position: relative; z-index: 1; }
.n-title { font-family: 'Fraunces', serif; font-weight: 600; font-size: 30px; border: none; border-bottom: 3px solid var(--line); background: transparent; padding: 8px 2px; margin-bottom: 18px; }
.n-title:focus { box-shadow: none; }
.n-body { min-height: 52vh; border: none; background: transparent; padding: 4px 2px; font-family: 'Fraunces', serif; line-height: 1.9; font-size: 18.5px; letter-spacing: .1px; }
.n-body:focus { box-shadow: none; }
.n-body::placeholder, .n-title::placeholder { opacity: .35; font-style: italic; }
.riff-row { display: flex; align-items: center; gap: 14px; margin-top: 14px; flex-wrap: wrap; border-top: 3px solid var(--line); padding-top: 16px; }
.riff { margin-top: 16px; border: 3px solid ${ACC.moss}; padding: 18px; white-space: pre-wrap; line-height: 1.6; box-shadow: 5px 5px 0 var(--line); background: var(--bg); max-width: 680px; }
.riff.letter { border-color: ${ACC.sun}; font-family: 'Fraunces', serif; font-size: 17px; line-height: 1.75; }

.void {
  position: fixed; inset: 0; z-index: 60; background: #14120C; color: #EFE8D8;
  background-image: radial-gradient(rgba(239,232,216,.1) 1px, transparent 1px); background-size: 26px 26px;
  display: flex; flex-direction: column; padding: 26px clamp(16px, 7vw, 110px);
  animation: rise .4s ease;
  --bg: #14120C; --fg: #EFE8D8; --line: #EFE8D8; --soft: rgba(239,232,216,.06);
}
.void-top { display: flex; justify-content: space-between; align-items: center; font-family: 'Space Mono', monospace; }
.void-words { font-size: 12px; letter-spacing: 2px; opacity: .6; }
.void-col { flex: 1; display: flex; flex-direction: column; max-width: 68ch; width: 100%; margin: 26px auto 0; }
.n-title.v { font-size: 36px; }
.n-body.v { flex: 1; font-size: 20px; line-height: 2; min-height: 40vh; }
.void-muse { font-family: 'Fraunces', serif; font-style: italic; opacity: .4; text-align: center; padding: 14px 0 4px; }

.ritual-body { flex: 1; display: flex; gap: 46px; align-items: flex-start; margin-top: 26px; }
.ritual-canvas { flex-shrink: 0; padding-top: 44px; }
.ritual-col { margin: 0; }
.ritual-ask { font-family: 'Fraunces', serif; font-size: 32px; font-weight: 600; margin-bottom: 18px; }
.big-seal { margin-top: 18px; align-self: flex-start; font-size: 15px; padding: 14px 26px; }

.sound-add { display: flex; gap: 10px; max-width: 760px; margin-bottom: 14px; flex-wrap: wrap; }
.sound-add input { flex: 1; min-width: 220px; }
.mixlist { margin-top: 22px; }
.mix-b { background: none; border: none; font-size: 16px; cursor: pointer; color: var(--fg); text-align: left; flex: 1; padding: 4px 0; font-family: 'Space Grotesk', sans-serif; }
.mixlist li.on .mix-b { font-weight: 700; color: ${ACC.sun}; }

.mini { position: fixed; right: 20px; bottom: 20px; width: 320px; z-index: 50; border: 3px solid var(--line); background: var(--bg); box-shadow: 7px 7px 0 var(--line); }
.mini.dragging { user-select: none; }
.mini.dragging .mini-frame iframe { pointer-events: none; }
.mini-bar { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-bottom: 3px solid var(--line); cursor: move; }
.mini-rez { position: absolute; right: 3px; bottom: 3px; width: 15px; height: 15px; cursor: nwse-resize; border-right: 3px solid var(--line); border-bottom: 3px solid var(--line); opacity: .5; z-index: 3; }
.mini-rez:hover { opacity: 1; }
.mini.min .mini-bar { border-bottom: none; }
.mini-label { flex: 1; font-family: 'Space Mono', monospace; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mini-b { background: none; border: none; color: var(--fg); cursor: pointer; font-size: 13px; opacity: .7; }
.mini-b:hover { opacity: 1; }
.mini-frame iframe { display: block; width: 100%; aspect-ratio: 16/9; border: none; }
.mini.min .mini-frame { height: 0; overflow: hidden; }
.eq { display: flex; align-items: flex-end; gap: 2.5px; height: 15px; }
.eq i { width: 3.5px; background: ${ACC.sun}; animation: eq 1s ease-in-out infinite; }
.eq i:nth-child(1) { height: 60%; animation-delay: 0s; background: ${ACC.red}; }
.eq i:nth-child(2) { height: 100%; animation-delay: .15s; }
.eq i:nth-child(3) { height: 45%; animation-delay: .3s; background: ${ACC.blue}; }
.eq i:nth-child(4) { height: 80%; animation-delay: .45s; background: ${ACC.moss}; }
@keyframes eq { 0%, 100% { transform: scaleY(.4);} 50% { transform: scaleY(1);} }

.atlas-actions { display: flex; gap: 14px; margin-top: 26px; flex-wrap: wrap; }
.stat-row { display: flex; gap: 38px; flex-wrap: wrap; }
.record li { align-items: flex-start; }
.record li.with-journal { padding: 16px 4px; }
.r-thumb { flex-shrink: 0; }
.r-date { font-family: 'Space Mono', monospace; font-size: 12px; width: 104px; flex-shrink: 0; opacity: .8; padding-top: 3px; }
.r-cells { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; flex: 1; }
.r-high { font-family: 'Fraunces', serif; font-style: italic; opacity: .85; width: 100%; line-height: 1.6; }

@media (max-width: 760px) {
  .room { flex-direction: column; }
  .rail { width: 100%; height: auto; position: relative; flex-direction: row; align-items: center; border-right: none; border-bottom: 3px solid var(--line); gap: 12px; padding: 12px; overflow-x: auto; }
  .rail-top { align-items: center; gap: 10px; }
  .wordmark { font-size: 18px; }
  nav { flex-direction: row; }
  .navb { padding: 6px 5px; font-size: 10.5px; letter-spacing: 1px; border-left: none; border-bottom: 3px solid transparent; }
  .navb.on { border-bottom-color: var(--line); }
  .sisy-wrap { display: none; }
  .canvas { padding: 24px 16px 150px; }
  .studio { flex-direction: column; }
  .s-side { width: 100%; }
  .fuel-stats, .stat-row { gap: 22px; flex-wrap: wrap; }
  .mini { width: calc(100% - 32px); right: 16px; bottom: 16px; }
  .pane-head { flex-direction: column; }
  .creature, .pyr-wrap { text-align: left; }
  .ritual-body { flex-direction: column; gap: 20px; }
  .ritual-canvas { padding-top: 0; }
  .month { grid-template-columns: repeat(7, 1fr); }
}
`;
