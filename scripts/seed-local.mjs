// Seeds a local dev server with a reference project and blueprint.
// Signs in through /api/auth/dev-login, so DEV_LOGIN_EMAIL must be set in .env.
//
//   node scripts/seed-local.mjs                 # defaults to http://localhost:5001
//   BASE_URL=http://localhost:5000 node scripts/seed-local.mjs
//
// Safe to re-run: skips anything that already exists by name.

const BASE_URL = process.env.BASE_URL || "http://localhost:5001";
const PROJECT_NAME = "Test Project";
const BOARD_NAME = "Test Blueprint: New Customer Onboarding";

let cookie = "";

async function api(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    redirect: "manual",
    ...options,
    headers: { "Content-Type": "application/json", Cookie: cookie, ...options.headers },
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  if (res.status >= 400) {
    throw new Error(`${options.method || "GET"} ${path} → ${res.status}: ${await res.text()}`);
  }
  return res.status === 200 ? res.json() : null;
}

// Each phase is a list of [columnName, emotion 1-7]
const PHASES = [
  ["Discover", [["Sees ad", 4], ["Visits site", 5]]],
  ["Sign up", [["Creates account", 3], ["Verifies email", 2]]],
  ["Onboard", [["Guided setup", 5], ["Invites team", 6]]],
  ["First value", [["Builds first blueprint", 7]]],
];

const EMOTION_COLORS = { 1: "#F2918C", 2: "#F5A97F", 3: "#F7C873", 4: "#E8E4D9", 5: "#B8DDB0", 6: "#8FD0A8", 7: "#5DBB8A" };

// [type, content, phaseIndex, columnIndex, extra]
const BLOCKS = [
  ["touchpoint", "LinkedIn ad: \"Map your customer journey in minutes\"", 0, 0],
  ["role", "Marketing", 0, 0, { department: "Marketing" }],
  ["metrics", "Ad CTR: 2.4%", 0, 0],
  ["touchpoint", "Lands on homepage, watches hero video", 0, 1],
  ["friction", "Pricing page doesn't mention team plans", 0, 1],
  ["question", "Do visitors scroll past the hero?", 0, 1],
  ["touchpoint", "Sign-up form (email or Google)", 1, 0],
  ["technology", "Auth service + Postgres", 1, 0, { department: "Engineering" }],
  ["process", "Personal workspace created automatically", 1, 0],
  ["email", "Verification email sent", 1, 1],
  ["friction", "Verification email lands in spam for some domains", 1, 1],
  ["insight", "30% of drop-off happens between sign-up and verification", 1, 1],
  ["touchpoint", "Three-step setup checklist", 2, 0],
  ["hypothesis", "A sample blueprint will shorten time-to-first-value", 2, 0],
  ["experiment", "A/B test: blank board vs. pre-filled template", 2, 0, { experimentTarget: "+15% activation" }],
  ["touchpoint", "Invite teammates modal", 2, 1],
  ["policy", "Invites expire after 7 days", 2, 1],
  ["role", "Customer Success", 2, 1, { department: "Support" }],
  ["touchpoint", "Adds phases, columns and blocks to a blueprint", 3, 0],
  ["rationale", "This is the moment users understand the product", 3, 0],
  ["note", "Reference blueprint seeded by scripts/seed-local.mjs", 3, 0],
];

async function main() {
  await api("/api/auth/dev-login");
  if (!cookie) throw new Error("Dev sign-in didn't set a session. Is DEV_LOGIN_EMAIL set in .env?");

  const projects = await api("/api/projects");
  let project = projects.find((p) => p.name === PROJECT_NAME);
  if (project) {
    console.log(`Project exists: ${project.name} (#${project.id})`);
  } else {
    project = await api("/api/projects", {
      method: "POST",
      body: JSON.stringify({
        name: PROJECT_NAME,
        description: "Reference project for local development",
        color: "#302E87",
        status: "in-progress",
      }),
    });
    console.log(`Created project: ${project.name} (#${project.id})`);
  }

  const boards = await api(`/api/projects/${project.id}/boards`);
  let board = boards.find((b) => b.name === BOARD_NAME);
  if (board) {
    console.log(`Blueprint exists: ${board.name} (#${board.id})`);
  } else {
    const phases = PHASES.map(([name, columns], p) => ({
      id: `phase-${p + 1}`,
      name,
      collapsed: false,
      columns: columns.map(([colName, value], c) => ({
        id: `col-${p + 1}-${c + 1}`,
        name: colName,
        emotion: { value, color: EMOTION_COLORS[value] },
      })),
    }));
    const blocks = BLOCKS.map(([type, content, phaseIndex, columnIndex, extra], i) => ({
      id: `block-${i + 1}`,
      type,
      content,
      phaseIndex,
      columnIndex,
      comments: [],
      attachments: [],
      ...extra,
    }));
    board = await api("/api/boards", {
      method: "POST",
      body: JSON.stringify({
        name: BOARD_NAME,
        description: "Every common block type across four phases, with emotion scores",
        projectId: project.id,
        status: "in-progress",
        phases,
        blocks,
      }),
    });
    console.log(`Created blueprint: ${board.name} (#${board.id})`);
  }

  console.log(`\nProject:   ${BASE_URL}/project/${project.id}`);
  console.log(`Blueprint: ${BASE_URL}/board/${board.id}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
