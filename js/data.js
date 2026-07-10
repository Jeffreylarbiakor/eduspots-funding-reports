// js/data.js
// Synthetic data generator for the EduSpots Funding & Impact Report Generator.
//
// IMPORTANT — WHAT IS REAL VS SYNTHETIC:
//   REAL:    Spot names, RC names, and network totals (see js/real-data.js)
//   SYNTHETIC: All grants, funder names, amounts, deadlines, restrictions,
//              and per-Spot completeness data below. Funder names are entirely
//              invented; do not interpret them as real organisations.
//
// Uses mulberry32 seeded PRNG so every demo run produces the same dataset.

// ---------------------------------------------------------------------------
// Seeded PRNG (mulberry32) — same approach as Projects #1 and #2
// ---------------------------------------------------------------------------
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20240901); // fixed seed → reproducible demo

function randInt(min, max)   { return Math.floor(rand() * (max - min + 1)) + min; }
function randFrom(arr)       { return arr[Math.floor(rand() * arr.length)]; }
function randBool(p = 0.75)  { return rand() < p; } // p = probability of true

// ---------------------------------------------------------------------------
// Cluster definitions — map each RC to a group of Spots
// ---------------------------------------------------------------------------
const CLUSTERS = [
  {
    id: "cluster-volta",
    label: "Volta Region",
    rcName: "Cynthia Mawuena Tetteh",
    spotNames: [
      "Abutia","Agbledomi","Atanve","Dodome Awuiasu","Ho-Kpenoe",
      "Metsrikasa","Takuve","Wodome","Joska Kenya",
    ],
  },
  {
    id: "cluster-northern",
    label: "Northern Region",
    rcName: "Getrude Akunlibe",
    spotNames: [
      "Bimbilla","Dulugu","Gambibgo","Kalpohin","Katanga-Zuarungu",
      "Kejabil","Kotokoli Zongo","Kumbungu Zamigu","Piisi",
      "Savelugu","Zangbalun","Banda Kabrono","Funkoe",
    ],
  },
  {
    id: "cluster-central-western",
    label: "Central & Western Regions",
    rcName: "Abdul Wadud Suleiman",
    spotNames: [
      "Ekumfi","Elmina","Gomoa-Manso","New Ebu","Sanzule-Krisan",
      "Sefwi Asanteman","Kato Berekum","Bono Manso","Ekawso","Yamfo",
    ],
  },
  {
    id: "cluster-new-spots",
    label: "New Spots",
    rcName: "Abdul-Malik Iddrisu",
    spotNames: [
      "Aboabo No.4","Abofour","Ahenkro","Akumadan","Ameyaw","Asemasa",
      "Bosomadwe","Dadwen","Donkorkrom","Ejisu-Besease","Ejura",
      "Mpatano","Nkonya","Posmonu","Sakasaka","Soko","Teshie","Zangbalun",
      "Piisi","Posmonu",
    ],
  },
];

// ---------------------------------------------------------------------------
// Synthetic funder / grant names (NOT real organisations)
// ---------------------------------------------------------------------------
const SYNTHETIC_FUNDER_NAMES = [
  "Albright Community Foundation",
  "Meridian Education Trust",
  "Halcyon Fund for Learning",
  "Commonwealth Futures Initiative",
  "Thornfield Literacy Fund",
  "Oakridge Global Impact",
  "Sycamore Education Partnership",
  "Blue Horizon Development Fund",
  "Lakewood Family Foundation",
  "Pennbridge Youth Trust",
  "Rivergate Social Fund",
  "Cartwright Grant Programme",
];

const RESTRICTION_PHRASES = [
  "Funds to be used exclusively for Spark literacy materials and book-stock replenishment.",
  "Restricted to training and stipends for volunteer Catalysts only.",
  "Support for safe learning environments and safeguarding infrastructure.",
  "Digital device procurement and connectivity for under-served Spot locations.",
  "Community engagement activities and Spot Committee capacity-building.",
  "Girls' education and female Catalyst recruitment initiatives.",
  "STEM learning resources and facilitator training across funded Spots.",
  "General operations support — no single line item to exceed 20% of award.",
  "Monitoring, evaluation and learning activities, including data collection tools.",
  "School-readiness and early childhood learning for Sparks aged 4–8.",
];

// ---------------------------------------------------------------------------
// Generate grants
// ---------------------------------------------------------------------------
function generateGrants() {
  const today = new Date("2025-07-09");
  const grants = [];

  const usedFunders = [...SYNTHETIC_FUNDER_NAMES].sort(() => rand() - 0.5).slice(0, 10);

  usedFunders.forEach((funderName, i) => {
    // Spread deadlines: some past, some soon, most future
    const offsetDays = [-45, -10, 15, 25, 45, 60, 90, 110, 140, 180][i] || randInt(20, 200);
    const deadline = new Date(today);
    deadline.setDate(deadline.getDate() + offsetDays);

    const amount = randInt(8, 95) * 1000;
    const clusterCount = randInt(1, 3);
    const fundedClusters = [...CLUSTERS]
      .sort(() => rand() - 0.5)
      .slice(0, clusterCount)
      .map(c => c.id);

    const submittedIfPast = rand() > 0.35; // ~65% of past-deadline grants were submitted

    grants.push({
      id:               `grant-${String(i + 1).padStart(3, "0")}`,
      funderName,
      amount,
      restrictions:     randFrom(RESTRICTION_PHRASES),
      reportingDeadline: deadline.toISOString().split("T")[0],
      fundedClusterIds: fundedClusters,
      submittedDate:    (offsetDays < 0 && submittedIfPast)
                          ? new Date(deadline.getTime() - randInt(1, 10) * 86400000)
                              .toISOString().split("T")[0]
                          : null,
      reportingHistory: generateReportingHistory(deadline, offsetDays),
    });
  });

  return grants;
}

function generateReportingHistory(currentDeadline, offsetFromToday) {
  const history = [];
  const cycles = randInt(0, 3);
  for (let i = 0; i < cycles; i++) {
    const d = new Date(currentDeadline);
    d.setMonth(d.getMonth() - (i + 1) * 6);
    history.push({
      period:    d.toISOString().split("T")[0],
      submitted: true,
      note:      "Report submitted and acknowledged.",
    });
  }
  return history;
}

// ---------------------------------------------------------------------------
// computeGrantStatus — transparent, named function (per spec §3)
// ---------------------------------------------------------------------------
function computeGrantStatus(grant) {
  const today      = new Date("2025-07-09");
  const deadline   = new Date(grant.reportingDeadline);
  const daysToGo   = Math.ceil((deadline - today) / 86400000);

  if (grant.submittedDate) return { code: "submitted", label: "Submitted",  daysToGo };
  if (daysToGo < 0)        return { code: "overdue",   label: "Overdue",    daysToGo };
  if (daysToGo <= 30)      return { code: "due-soon",  label: "Due soon",   daysToGo };
  return                          { code: "on-track",  label: "On-track",   daysToGo };
}

// ---------------------------------------------------------------------------
// Generate per-Spot completeness data
// ---------------------------------------------------------------------------
function generateSpots() {
  return REAL_SPOT_NAMES.map(name => {
    const cluster = CLUSTERS.find(c => c.spotNames.includes(name)) || CLUSTERS[3];

    // ~75% of Spots have all three data fields present
    // Individual field probabilities set high so joint P(all complete) ≈ 0.75
    const hasEngagement        = randBool(0.92);
    const hasSafeguarding      = randBool(0.93);
    const hasFinancial         = randBool(0.92);
    const hasGrantRestrictions = randBool(0.95);

    const missingReasons = [];
    if (!hasEngagement)       missingReasons.push("No engagement data logged for this Spot in the selected period");
    if (!hasSafeguarding)     missingReasons.push("Safeguarding data not returned for this reporting period");
    if (!hasFinancial)        missingReasons.push("Financial data missing for this period");
    if (!hasGrantRestrictions) missingReasons.push("Grant restrictions field not on file for this Spot");

    const activeCatalysts  = randInt(2, 18);
    const activeSparks     = randInt(15, 120);
    const sessionsHeld     = randInt(4, 48);
    const booksCirculated  = randInt(20, 400);

    return {
      id:                   name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      name,
      clusterId:            cluster.id,
      clusterLabel:         cluster.label,
      rcName:               cluster.rcName,
      hasEngagement,
      hasSafeguarding,
      hasFinancial,
      hasGrantRestrictions,
      missingReasons,
      isComplete:           missingReasons.length === 0,
      acknowledged:         false,
      // Operational figures used in report drafts
      activeCatalysts,
      activeSparks,
      sessionsHeld,
      booksCirculated,
    };
  });
}

// ---------------------------------------------------------------------------
// computeDataCompleteness — transparent, named function (per spec §3)
// ---------------------------------------------------------------------------
function computeDataCompleteness(spot) {
  const flags = [];
  if (!spot.hasEngagement)       flags.push({ field: "Engagement data",     reason: spot.missingReasons.find(r => r.includes("engagement")) || "No engagement data logged for this Spot in the selected period" });
  if (!spot.hasSafeguarding)     flags.push({ field: "Safeguarding data",   reason: spot.missingReasons.find(r => r.includes("Safeguarding")) || "Safeguarding data not returned for this reporting period" });
  if (!spot.hasFinancial)        flags.push({ field: "Financial data",      reason: spot.missingReasons.find(r => r.includes("Financial")) || "Financial data missing for this period" });
  if (!spot.hasGrantRestrictions) flags.push({ field: "Grant restrictions", reason: spot.missingReasons.find(r => r.includes("Grant restrictions")) || "Grant restrictions field not on file for this Spot" });
  return flags;
}

// ---------------------------------------------------------------------------
// Assemble and export dataset
// ---------------------------------------------------------------------------
const GRANTS = generateGrants().map(g => ({
  ...g,
  status: computeGrantStatus(g),
}));

const SPOTS = generateSpots();

// Cluster-level completeness summary (for the overview chart)
function getClusterCompleteness() {
  return CLUSTERS.map(cluster => {
    const clusterSpots = SPOTS.filter(s => s.clusterId === cluster.id);
    const complete     = clusterSpots.filter(s => s.isComplete).length;
    return {
      clusterId:   cluster.id,
      label:       cluster.label,
      total:       clusterSpots.length,
      complete,
      incomplete:  clusterSpots.length - complete,
      pct:         clusterSpots.length ? Math.round((complete / clusterSpots.length) * 100) : 0,
    };
  });
}

// KPI helpers
function getKPIs() {
  const today    = new Date("2025-07-09");
  const in60days = new Date(today); in60days.setDate(today.getDate() + 60);

  const totalFunding    = GRANTS.reduce((s, g) => s + g.amount, 0);
  const activeGrants    = GRANTS.filter(g => g.status.code !== "submitted").length;
  const upcomingInNext60 = GRANTS.filter(g => {
    const dl = new Date(g.reportingDeadline);
    return dl >= today && dl <= in60days && g.status.code !== "submitted";
  }).length;
  const completeSpots   = SPOTS.filter(s => s.isComplete).length;
  const incompleteSpots = SPOTS.length - completeSpots;

  return { totalFunding, activeGrants, upcomingInNext60, completeSpots, incompleteSpots };
}
