// js/app.js
// Main application controller for the EduSpots Funding & Impact Report Generator.
// Handles navigation, rendering of all four views, the report generator form,
// and the grant detail modal.

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const state = {
  currentView:         "overview",
  grantModalId:        null,
  generatedReport:     null,
  reportAudience:      null,
  acknowledgedSpots:   new Set(),
  generatedCount:      0,
};

// ---------------------------------------------------------------------------
// Nav routing
// ---------------------------------------------------------------------------

function navigate(viewId) {
  state.currentView = viewId;

  document.querySelectorAll(".nav-link").forEach(el => {
    el.classList.toggle("active", el.dataset.view === viewId);
  });

  document.querySelectorAll(".view").forEach(el => {
    el.classList.toggle("hidden", el.id !== `view-${viewId}`);
  });

  if (viewId === "overview")     renderOverview();
  if (viewId === "grants")       renderGrantTracker();
  if (viewId === "generator")    renderGenerator();
  if (viewId === "completeness") renderCompleteness();
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function fmt(n)          { return Number(n).toLocaleString("en-GB"); }
function fmtCurrency(n)  { return "GH₵ " + fmt(n); }
function fmtDate(str) {
  if (!str) return "—";
  return new Date(str).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ---------------------------------------------------------------------------
// STATUS BADGE
// ---------------------------------------------------------------------------

// Grant reporting has 4 tiers; the bundle's req-badge only defines 3
// (open / in-progress / fulfilled) plus our added req-due-soon modifier.
const GRANT_STATUS_TO_REQ_CLASS = {
  overdue:    "req-open",
  "due-soon": "req-due-soon",
  "on-track": "req-inprogress",
  submitted:  "req-fulfilled",
};

function statusBadge(code, label) {
  const reqClass = GRANT_STATUS_TO_REQ_CLASS[code] || "req-open";
  return `<span class="req-badge ${reqClass}">${label}</span>`;
}

// ---------------------------------------------------------------------------
// VIEW: OVERVIEW
// ---------------------------------------------------------------------------

function renderOverview() {
  const kpis = getKPIs();

  document.getElementById("kpi-funding").textContent     = fmtCurrency(kpis.totalFunding);
  document.getElementById("kpi-grants").textContent      = kpis.activeGrants;
  document.getElementById("kpi-deadlines").textContent   = kpis.upcomingInNext60;
  document.getElementById("kpi-generated").textContent   = state.generatedCount;
  document.getElementById("kpi-complete").textContent    = kpis.completeSpots + " / " + SPOTS.length;

  renderFundingChart(GRANTS);
  renderCompletenessChart(getClusterCompleteness());
}

// ---------------------------------------------------------------------------
// VIEW: GRANT TRACKER
// ---------------------------------------------------------------------------

function renderGrantTracker() {
  const tbody = document.getElementById("grants-tbody");
  if (!tbody) return;

  const filterSel = document.getElementById("grant-status-filter");
  const statusFilter = filterSel ? filterSel.value : "all";

  // Sort: overdue first, then due-soon, then on-track, then submitted
  const order = { overdue: 0, "due-soon": 1, "on-track": 2, submitted: 3 };
  const sorted = [...GRANTS]
    .filter(g => statusFilter === "all" || g.status.code === statusFilter)
    .sort((a, b) => (order[a.status.code] ?? 4) - (order[b.status.code] ?? 4));

  const countEl = document.getElementById("grants-filter-count");
  if (countEl) countEl.textContent = `${sorted.length} of ${GRANTS.length} grants`;

  if (sorted.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No grants match the current filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = sorted.map(g => {
    const clusterLabels = g.fundedClusterIds
      .map(cid => CLUSTERS.find(c => c.id === cid)?.label || cid)
      .join(", ");
    return `<tr class="req-row" data-grant-id="${g.id}" tabindex="0" role="button" aria-label="View ${g.funderName} grant detail">
      <td>${g.funderName}</td>
      <td class="mono">${fmtCurrency(g.amount)}</td>
      <td>${clusterLabels || "Network-wide"}</td>
      <td class="mono">${fmtDate(g.reportingDeadline)}</td>
      <td>${statusBadge(g.status.code, g.status.label)}</td>
    </tr>`;
  }).join("");

  tbody.querySelectorAll(".req-row").forEach(row => {
    row.addEventListener("click", () => openGrantModal(row.dataset.grantId));
    row.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openGrantModal(row.dataset.grantId);
      }
    });
  });
}

// ---------------------------------------------------------------------------
// GRANT DETAIL MODAL
// ---------------------------------------------------------------------------

function openGrantModal(grantId) {
  const grant = GRANTS.find(g => g.id === grantId);
  if (!grant) return;

  const clusters = grant.fundedClusterIds
    .map(cid => CLUSTERS.find(c => c.id === cid))
    .filter(Boolean);

  const spotsInScope = clusters.length > 0
    ? clusters.flatMap(c => SPOTS.filter(s => s.clusterId === c.id))
    : SPOTS;

  const historyRows = grant.reportingHistory.length > 0
    ? grant.reportingHistory.map(h => `<div class="history-row"><span>${fmtDate(h.period)}</span><span class="history-note">${h.note}</span></div>`).join("")
    : `<div class="history-empty">No prior reporting history on file.</div>`;

  const submittedCard = grant.submittedDate
    ? `<div class="detail-card"><span class="detail-label">Submitted</span><span class="detail-value mono">${fmtDate(grant.submittedDate)}</span></div>`
    : "";

  const statusBadgeEl = document.getElementById("modal-status-badge");
  const reqClass = GRANT_STATUS_TO_REQ_CLASS[grant.status.code] || "req-open";
  document.getElementById("modal-title").textContent = grant.funderName;
  document.getElementById("modal-sub").textContent   = `Grant ID: ${grant.id}`;
  statusBadgeEl.className   = `req-badge ${reqClass}`;
  statusBadgeEl.textContent = grant.status.label;
  document.getElementById("modal-body").innerHTML = `
    <div class="detail-grid">
      <div class="detail-card"><span class="detail-label">Amount</span><span class="detail-value">${fmtCurrency(grant.amount)}</span></div>
      <div class="detail-card"><span class="detail-label">Deadline</span><span class="detail-value mono">${fmtDate(grant.reportingDeadline)}</span></div>
      ${submittedCard}
    </div>
    <div>
      <div class="modal-section-title">Grant purpose / restrictions</div>
      <p class="modal-restrictions">${grant.restrictions}</p>
    </div>
    <div>
      <div class="modal-section-title">Funded clusters (${clusters.length || "Network-wide"})</div>
      ${clusters.length > 0 ? clusters.map(c => `
        <div class="cluster-detail">
          <strong>${c.label}</strong> — RC: ${c.rcName}
          <div class="spot-chips">${SPOTS.filter(s => s.clusterId === c.id).map(s => `<span class="spot-chip">${s.name}</span>`).join("")}</div>
        </div>`).join("") : `<p>Network-wide grant — all Spots in scope.</p>`}
    </div>
    <div>
      <div class="modal-section-title">Reporting history</div>
      <div class="history-list">${historyRows}</div>
    </div>`;

  document.getElementById("modalOverlay").classList.add("open");
}

function closeGrantModal() {
  document.getElementById("modalOverlay").classList.remove("open");
}

// ---------------------------------------------------------------------------
// VIEW: REPORT GENERATOR
// ---------------------------------------------------------------------------

function renderGenerator() {
  populateClusterFilter();
  populateGrantFilter();
  document.getElementById("draft-output").classList.add("hidden");
  document.getElementById("draft-placeholder").classList.remove("hidden");
}

function populateClusterFilter() {
  const sel = document.getElementById("gen-cluster");
  if (!sel || sel.options.length > 1) return;
  CLUSTERS.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.label;
    sel.appendChild(opt);
  });
}

function populateGrantFilter() {
  const sel = document.getElementById("gen-grant");
  if (!sel || sel.options.length > 1) return;
  GRANTS.forEach(g => {
    const opt = document.createElement("option");
    opt.value = g.id;
    opt.textContent = `${g.funderName} (${fmtCurrency(g.amount)})`;
    sel.appendChild(opt);
  });
}

function handleGenerateDraft() {
  const startDate  = document.getElementById("gen-start").value;
  const endDate    = document.getElementById("gen-end").value;
  const audience   = document.getElementById("gen-audience").value;
  const clusterSel = document.getElementById("gen-cluster").value;
  const grantSel   = document.getElementById("gen-grant").value;

  if (!startDate || !endDate) {
    alert("Please select a start and end date for the reporting period.");
    return;
  }
  if (new Date(endDate) < new Date(startDate)) {
    alert("End date must be after start date.");
    return;
  }
  if (!audience) {
    alert("Please select an audience.");
    return;
  }

  const clusterIds = clusterSel && clusterSel !== "all" ? [clusterSel] : [];

  const draftText = generateReportDraft({
    spots:      SPOTS,
    grants:     GRANTS,
    startDate,
    endDate,
    audience,
    clusterIds,
    grantId:    grantSel || "all",
  });

  state.generatedReport  = draftText;
  state.reportAudience   = audience;
  state.generatedCount  += 1;

  // Update KPI counter if overview is later revisited
  const kpiEl = document.getElementById("kpi-generated");
  if (kpiEl) kpiEl.textContent = state.generatedCount;

  const audienceLabels = { funder: "Funder", rc: "Regional Coordinator", committee: "Spot Committee" };

  document.getElementById("draft-placeholder").classList.add("hidden");
  document.getElementById("draft-output").classList.remove("hidden");
  document.getElementById("draft-audience-label").textContent = audienceLabels[audience] || audience;
  document.getElementById("draft-period-label").textContent   = startDate + " → " + endDate;
  document.getElementById("draft-text").textContent           = draftText;

  const tsEl = document.getElementById("draft-timestamp");
  if (tsEl) tsEl.textContent = new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function handleCopyDraft() {
  if (!state.generatedReport) return;
  navigator.clipboard.writeText(state.generatedReport).then(() => {
    const btn = document.getElementById("btn-copy");
    const orig = btn.textContent;
    btn.textContent = "Copied!";
    setTimeout(() => { btn.textContent = orig; }, 2000);
  });
}

function handleDownloadDraft() {
  if (!state.generatedReport) return;
  const blob = new Blob([state.generatedReport], { type: "text/plain" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `eduspots-report-draft-${state.reportAudience}-${new Date().toISOString().slice(0,10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// VIEW: DATA COMPLETENESS
// ---------------------------------------------------------------------------

function renderCompleteness() {
  const container = document.getElementById("completeness-list");
  if (!container) return;

  const flagged = SPOTS
    .filter(s => !s.isComplete || state.acknowledgedSpots.has(s.id))
    .sort((a, b) => {
      // Unacknowledged first
      const aAck = state.acknowledgedSpots.has(a.id) ? 1 : 0;
      const bAck = state.acknowledgedSpots.has(b.id) ? 1 : 0;
      return aAck - bAck || a.clusterLabel.localeCompare(b.clusterLabel);
    });

  const unacknowledged = flagged.filter(s => !state.acknowledgedSpots.has(s.id));
  const acknowledged   = flagged.filter(s => state.acknowledgedSpots.has(s.id));

  document.getElementById("completeness-count").textContent =
    `${unacknowledged.length} Spot${unacknowledged.length !== 1 ? "s" : ""} with data gaps`;

  if (flagged.length === 0) {
    container.innerHTML = `<div class="empty-state"><span class="empty-icon">✓</span><p>All Spots have complete reporting data for this period.</p></div>`;
    return;
  }

  function renderSpotCard(s) {
    const flags    = computeDataCompleteness(s);
    const isAck    = state.acknowledgedSpots.has(s.id);
    // Severity tier drives both the flag-card's left border and the header
    // badge, the same two-tier vocabulary the bundle uses for tile-badge
    // (status-under / status-below).
    const severity      = flags.length >= 2 ? "status-under" : "status-below";
    const severityLabel = flags.length >= 2 ? "Needs attention" : "Minor gap";

    return `<div class="flag-card ${severity}" data-spot-id="${s.id}">
      <div class="flag-card-header">
        <div>
          <span class="flag-spot-name">${s.name}</span>
          <span class="flag-cluster">${s.clusterLabel} · RC: ${s.rcName}</span>
        </div>
        <span class="tile-badge ${severity}">${severityLabel}</span>
      </div>
      <ul class="flag-reasons">
        ${flags.map(f => `<li class="flag-reason"><strong>${f.field}:</strong> ${f.reason}</li>`).join("")}
      </ul>
      <div class="flag-meta">
        <span>👥 ${s.activeCatalysts} Catalysts</span>
        <span>🧒 ${s.activeSparks} Sparks</span>
        <span>📚 ${s.sessionsHeld} sessions held</span>
        <span>📖 ${s.booksCirculated} books circulated</span>
      </div>
      <div class="flag-actions">
        ${isAck
          ? `<span class="ack-badge">✓ Acknowledged</span>`
          : `<button class="btn-acknowledge" onclick="acknowledgeSpot('${s.id}')">Acknowledge for follow-up</button>`}
      </div>
    </div>`;
  }

  container.innerHTML =
    unacknowledged.map(renderSpotCard).join("") +
    (acknowledged.length > 0
      ? `<div class="ack-section-label">Acknowledged for follow-up (${acknowledged.length})</div>` +
        acknowledged.map(renderSpotCard).join("")
      : "");
}

function acknowledgeSpot(spotId) {
  state.acknowledgedSpots.add(spotId);
  renderCompleteness();
}

// ---------------------------------------------------------------------------
// Bootstrap — runs after DOM ready
// ---------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  // Nav links
  document.querySelectorAll(".nav-link").forEach(el => {
    el.addEventListener("click", e => {
      e.preventDefault();
      navigate(el.dataset.view);
    });
  });

  // Modal close
  document.getElementById("modalClose").addEventListener("click", closeGrantModal);
  document.getElementById("modalOverlay").addEventListener("click", e => {
    if (e.target === e.currentTarget) closeGrantModal();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeGrantModal();
  });

  // Grant tracker filter
  const grantStatusFilter = document.getElementById("grant-status-filter");
  if (grantStatusFilter) grantStatusFilter.addEventListener("change", renderGrantTracker);

  // Report generator buttons
  document.getElementById("btn-generate").addEventListener("click", handleGenerateDraft);
  document.getElementById("btn-copy").addEventListener("click", handleCopyDraft);
  document.getElementById("btn-download").addEventListener("click", handleDownloadDraft);

  // Start on overview
  navigate("overview");
});
