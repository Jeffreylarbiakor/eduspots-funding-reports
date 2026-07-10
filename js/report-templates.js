// js/report-templates.js
// Audience-specific report draft generators for the EduSpots Funding & Impact
// Report Generator.
//
// DESIGN PRINCIPLE (from spec §1):
//   Every number and claim in a generated draft must be traceable directly to
//   the underlying dataset passed in — nothing is invented. Where data is
//   missing the draft says so plainly ("No comparison data available for this
//   period") rather than writing around the gap.
//
// Three audiences, three tones:
//   funder     — formal, outcomes-and-accountability framed
//   rc         — operational, cluster-level detail, flags/actions oriented
//   committee  — plain-language, community-facing, celebrates local wins

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function formatCurrency(n) {
  return "GH₵ " + Number(n).toLocaleString("en-GB");
}

function formatDate(str) {
  if (!str) return "—";
  const d = new Date(str);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function periodLabel(startDate, endDate) {
  if (!startDate || !endDate) return "selected reporting period";
  return formatDate(startDate) + " to " + formatDate(endDate);
}

function sum(arr, key) {
  return arr.reduce((s, x) => s + (x[key] || 0), 0);
}

// Returns only the spots that belong to the selected clusters (or all if no filter)
function filterSpots(spots, clusterIds) {
  if (!clusterIds || clusterIds.length === 0) return spots;
  return spots.filter(s => clusterIds.includes(s.clusterId));
}

// Returns only grants relevant to the current filter (or all if no filter)
function filterGrants(grants, grantId) {
  if (!grantId || grantId === "all") return grants;
  return grants.filter(g => g.id === grantId);
}

// Completeness fraction label
function completenessText(complete, total) {
  if (total === 0) return "No Spots in scope for this filter.";
  const pct = Math.round((complete / total) * 100);
  return `${complete} of ${total} Spots (${pct}%) had complete reporting data for this period.`;
}

// ---------------------------------------------------------------------------
// FUNDER DRAFT
// Tone: formal, outcomes-and-accountability framed, references grant purpose
// ---------------------------------------------------------------------------

function generateFunderDraft({ spots, grants, startDate, endDate, clusterIds, grantId }) {
  const scopedSpots  = filterSpots(spots, clusterIds);
  const scopedGrants = filterGrants(grants, grantId);
  const period       = periodLabel(startDate, endDate);

  const totalSparks     = sum(scopedSpots, "activeSparks");
  const totalCatalysts  = sum(scopedSpots, "activeCatalysts");
  const totalSessions   = sum(scopedSpots, "sessionsHeld");
  const totalBooks      = sum(scopedSpots, "booksCirculated");
  const completeSpots   = scopedSpots.filter(s => s.isComplete).length;
  const incompleteSpots = scopedSpots.length - completeSpots;

  const grantSummary = scopedGrants.length === 1
    ? `This report covers activities funded under the ${scopedGrants[0].funderName} grant (${formatCurrency(scopedGrants[0].amount)}). Grant purpose: ${scopedGrants[0].restrictions}`
    : `This report covers activities across ${scopedGrants.length} active grants totalling ${formatCurrency(sum(scopedGrants, "amount"))}.`;

  const incompleteNote = incompleteSpots > 0
    ? `\nNote: ${incompleteSpots} Spot(s) in scope have incomplete reporting data for this period. Figures above reflect only Spots with verified, complete data where indicated. The Data Completeness view within this tool lists the specific missing fields per Spot.`
    : `\nAll ${scopedSpots.length} Spot(s) in scope provided complete reporting data for this period.`;

  return `IMPACT REPORT — FUNDER SUBMISSION DRAFT
EduSpots Network | Reporting Period: ${period}
Prepared by: [Name, Role] | Date: [Date of submission]
${grantSummary}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. EXECUTIVE SUMMARY

EduSpots operates ${REAL_NETWORK_TOTALS.totalSpots} community-owned learning hubs (Spots) across Ghana and Kenya, supported by ${REAL_NETWORK_TOTALS.totalCatalysts} volunteer Catalysts and serving approximately ${REAL_NETWORK_TOTALS.totalSparks.toLocaleString()} child learners (Sparks) (${REAL_NETWORK_TOTALS.asOf}; source: ${REAL_NETWORK_TOTALS.source}).

This report covers ${scopedSpots.length} Spot(s) within the funded scope during ${period}.

2. PROGRAMME OUTCOMES (FUNDED SCOPE)

Learners reached (Sparks):     ${totalSparks.toLocaleString()}
Volunteer Catalysts active:    ${totalCatalysts}
Learning sessions delivered:   ${totalSessions}
Books circulated:              ${totalBooks.toLocaleString()}

${completenessText(completeSpots, scopedSpots.length)}
${incompleteNote}

3. GRANT COMPLIANCE & ACCOUNTABILITY

${scopedGrants.map(g => `Grant: ${g.funderName}
  Amount: ${formatCurrency(g.amount)}
  Restrictions: ${g.restrictions}
  Reporting deadline: ${formatDate(g.reportingDeadline)}
  Status: ${g.status.label}
  Funded clusters: ${g.fundedClusterIds.join(", ") || "Network-wide"}
  Submission on file: ${g.submittedDate ? formatDate(g.submittedDate) : "Not yet submitted"}`).join("\n\n")}

4. NETWORK CONTEXT

EduSpots reported a ${REAL_NETWORK_TOTALS.bookBorrowingChange} and ${REAL_NETWORK_TOTALS.fundingGrowth} during the broader ${REAL_NETWORK_TOTALS.asOf} (source: ${REAL_NETWORK_TOTALS.source}). These network-wide figures are provided for context; programme-specific outcomes for this grant are detailed in Section 2 above.

5. NEXT REPORTING PERIOD

[REVIEWER: Insert planned activities, milestones, and any anticipated variances from grant purpose here. Do not leave this section blank before submission.]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Note: Spot-level figures are drawn from EduSpots operational records for the period stated. Network totals (Section 4) are sourced from published EduSpots reporting. This draft was generated automatically and must be reviewed, verified, and signed off by an authorised EduSpots staff member before submission to any funder.`;
}

// ---------------------------------------------------------------------------
// RC DRAFT
// Tone: operational, cluster-level detail, flags/actions oriented
// ---------------------------------------------------------------------------

function generateRCDraft({ spots, grants, startDate, endDate, clusterIds, grantId }) {
  const scopedSpots  = filterSpots(spots, clusterIds);
  const scopedGrants = filterGrants(grants, grantId);
  const period       = periodLabel(startDate, endDate);

  // Group by cluster
  const clusterGroups = {};
  scopedSpots.forEach(s => {
    if (!clusterGroups[s.clusterId]) {
      clusterGroups[s.clusterId] = { label: s.clusterLabel, rcName: s.rcName, spots: [] };
    }
    clusterGroups[s.clusterId].spots.push(s);
  });

  const flaggedSpots = scopedSpots.filter(s => !s.isComplete);
  const overdueGrants = scopedGrants.filter(g => g.status.code === "overdue");
  const dueSoonGrants = scopedGrants.filter(g => g.status.code === "due-soon");

  const clusterBlocks = Object.values(clusterGroups).map(cg => {
    const complete   = cg.spots.filter(s => s.isComplete);
    const incomplete = cg.spots.filter(s => !s.isComplete);
    const sparks     = sum(cg.spots, "activeSparks");
    const catalysts  = sum(cg.spots, "activeCatalysts");
    const sessions   = sum(cg.spots, "sessionsHeld");
    const books      = sum(cg.spots, "booksCirculated");

    const incompleteDetail = incomplete.length > 0
      ? `  ⚠ Spots with incomplete data (${incomplete.length}):\n` +
        incomplete.map(s => `    • ${s.name}: ${s.missingReasons.join("; ")}`).join("\n")
      : `  ✓ All ${cg.spots.length} Spots returned complete data.`;

    return `CLUSTER: ${cg.label}
  RC: ${cg.rcName}
  Spots in scope:        ${cg.spots.length}
  Sparks reached:        ${sparks}
  Catalysts active:      ${catalysts}
  Sessions held:         ${sessions}
  Books circulated:      ${books}
  Data complete:         ${complete.length} of ${cg.spots.length} Spots
${incompleteDetail}`;
  }).join("\n\n");

  const grantAlerts = [
    ...overdueGrants.map(g => `  ⛔ OVERDUE: ${g.funderName} — deadline was ${formatDate(g.reportingDeadline)}. Not yet submitted.`),
    ...dueSoonGrants.map(g => `  ⚡ DUE SOON: ${g.funderName} — deadline ${formatDate(g.reportingDeadline)} (${g.status.daysToGo} days).`),
  ].join("\n") || "  No overdue or imminent grant deadlines for this scope.";

  const followUpSpots = flaggedSpots.length > 0
    ? flaggedSpots.map(s => `  • ${s.name} (${s.clusterLabel}): ${s.missingReasons.join("; ")}`).join("\n")
    : "  No follow-up required — all Spots returned complete data.";

  return `OPERATIONAL BRIEFING — RC INTERNAL DRAFT
EduSpots Network | Reporting Period: ${period}
For: Regional Coordinators | Prepared: [Date]
Scope: ${scopedSpots.length} Spot(s) across ${Object.keys(clusterGroups).length} cluster(s)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GRANT STATUS ALERTS

${grantAlerts}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CLUSTER-LEVEL SUMMARY

${clusterBlocks}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ACTION ITEMS — FOLLOW UP REQUIRED

Spots with incomplete reporting data (${flaggedSpots.length}):
${followUpSpots}

[REVIEWER: Add any additional actions, deadlines, or escalations before circulating. Do not distribute as-is.]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This draft was generated automatically from operational data. It is intended as a working document for RC use only. All figures must be verified before formal submission or sharing externally.`;
}

// ---------------------------------------------------------------------------
// SPOT COMMITTEE DRAFT
// Tone: plain-language, community-facing, celebrates local wins, no jargon
// ---------------------------------------------------------------------------

function generateCommitteeDraft({ spots, grants, startDate, endDate, clusterIds, grantId }) {
  const scopedSpots  = filterSpots(spots, clusterIds);
  const scopedGrants = filterGrants(grants, grantId);
  const period       = periodLabel(startDate, endDate);

  const totalSparks    = sum(scopedSpots, "activeSparks");
  const totalCatalysts = sum(scopedSpots, "activeCatalysts");
  const totalSessions  = sum(scopedSpots, "sessionsHeld");
  const totalBooks     = sum(scopedSpots, "booksCirculated");

  const spotHighlights = scopedSpots.slice(0, 6).map(s =>
    `  • ${s.name}: ${s.activeSparks} children attended, ${s.sessionsHeld} sessions held, ${s.booksCirculated} books borrowed`
  ).join("\n");

  const moreSpots = scopedSpots.length > 6
    ? `  … and ${scopedSpots.length - 6} more Spots in your area.`
    : "";

  const grantNote = scopedGrants.length > 0
    ? `This update covers activities supported by ${scopedGrants.length === 1
        ? `the ${scopedGrants[0].funderName} programme`
        : `${scopedGrants.length} supporter programmes`}.`
    : "This update covers activities across EduSpots Spots in your area.";

  const dataGapNote = scopedSpots.some(s => !s.isComplete)
    ? "\n📋 Note to committee: Some figures for this period are still being collected. A final update will follow once all data is confirmed."
    : "";

  return `[DRAFT — Human review required before sharing]

COMMUNITY SPOT UPDATE
EduSpots | ${period}
${grantNote}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT YOUR SPOT HAS BEEN UP TO

During this period, the Spots in your community were busy:

  👧 ${totalSparks.toLocaleString()} children (Sparks) took part in learning activities
  🙋 ${totalCatalysts} volunteer Catalysts ran sessions
  📚 ${totalSessions} learning sessions were held
  📖 ${totalBooks.toLocaleString()} books were borrowed

HIGHLIGHTS FROM YOUR SPOTS

${spotHighlights}
${moreSpots}

ACROSS THE WIDER EDUSPOTS NETWORK

EduSpots now has ${REAL_NETWORK_TOTALS.totalSpots} community Spots across Ghana and Kenya. In ${REAL_NETWORK_TOTALS.asOf.replace("reporting period","")}the network saw a ${REAL_NETWORK_TOTALS.bookBorrowingChange} in book borrowing — a sign of how much children in communities like yours love having access to books and learning.
${dataGapNote}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Thank you to every Catalyst who volunteered their time, every Spot Committee member who keeps things running, and every family who brings their child to the Spot.

[REVIEWER: Personalise with the specific Spot or community name, add any local stories or photos, and confirm all figures before sharing with the Spot Committee. Do not send as-is.]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Network-wide totals sourced from EduSpots published reporting (${REAL_NETWORK_TOTALS.source}). Spot-level figures drawn from operational records for the period above. This draft was generated automatically and requires human review before distribution.`;
}

// ---------------------------------------------------------------------------
// Main entry point — dispatches to the right template
// ---------------------------------------------------------------------------

function generateReportDraft(options) {
  const { audience } = options;
  switch (audience) {
    case "funder":    return generateFunderDraft(options);
    case "rc":        return generateRCDraft(options);
    case "committee": return generateCommitteeDraft(options);
    default:          return "Unknown audience type. Please select Funder, RC, or Spot Committee.";
  }
}
