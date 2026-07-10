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

function statusBadge(code, label) {
  return `<span class="badge badge-${code}">${label}</span>`;
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
  document.getElementById("kpi-incomplete").textContent  = kpis.incompleteSpots + " Spot" + (kpis.incompleteSpots !== 1 ? "s" : "") + " have data gaps";

  renderFundingChart(GRANTS);
  renderCompletenessChart(getClusterCompleteness());
}

// ---------------------------------------------------------------------------
// VIEW: GRANT TRACKER
// ---------------------------------------------------------------------------

function renderGrantTracker() {
  const tbody = document.getElementById("grants-tbody");
  if (!tbody) return;

  // Sort: overdue first, then due-soon, then on-track, then submitted
  const order = { overdue: 0, "due-soon": 1, "on-track": 2, submitted: 3 };
  const sorted = [...GRANTS].sort((a, b) => (order[a.status.code] ?? 4) - (order[b.status.code] ?? 4));

  tbody.innerHTML = sorted.map(g => {
    const clusterLabels = g.fundedClusterIds
      .map(cid => CLUSTERS.find(c => c.id === cid)?.label || cid)
      .join(", ");
    return `<tr class="grant-row" data-grant-id="${g.id}">
      <td class="td-funder">${g.funderName}</td>
      <td class="td-amount">${fmtCurrency(g.amount)}</td>
      <td class="td-clusters">${clusterLabels || "Network-wide"}</td>
      <td class="td-deadline">${fmtDate(g.reportingDeadline)}</td>
      <td class="td-status">${statusBadge(g.status.code, g.status.label)}</td>
    </tr>`;
  }).join("");

  tbody.querySelectorAll(".grant-row").forEach(row => {
    row.addEventListener("click", () => openGrantModal(row.dataset.grantId));
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

  const submittedRow = grant.submittedDate
    ? `<div class="detail-row"><span class="detail-label">Submitted</span><span>${fmtDate(grant.submittedDate)}</span></div>`
    : "";

  document.getElementById("modal-title").textContent     = grant.funderName;
  document.getElementById("modal-body").innerHTML = `
    <div class="modal-section">
      <div class="detail-grid">
        <div class="detail-row"><span class="detail-label">Grant ID</span><span class="mono">${grant.id}</span></div>
        <div class="detail-row"><span class="detail-label">Amount</span><span>${fmtCurrency(grant.amount)}</span></div>
        <div class="detail-row"><span class="detail-label">Deadline</span><span>${fmtDate(grant.reportingDeadline)}</span></div>
        <div class="detail-row"><span class="detail-label">Status</span><span>${statusBadge(grant.status.code, grant.status.label)}</span></div>
        ${submittedRow}
      </div>
    </div>
    <div class="modal-section">
      <div class="modal-section-label">Grant purpose / restrictions</div>
      <p class="modal-restrictions">${grant.restrictions}</p>
    </div>
    <div class="modal-section">
      <div class="modal-section-label">Funded clusters (${clusters.length || "Network-wide"})</div>
      ${clusters.length > 0 ? clusters.map(c => `
        <div class="cluster-detail">
          <strong>${c.label}</strong> — RC: ${c.rcName}
          <div class="spot-chips">${SPOTS.filter(s => s.clusterId === c.id).map(s => `<span class="spot-chip">${s.name}</span>`).join("")}</div>
        </div>`).join("") : `<p>Network-wide grant — all Spots in scope.</p>`}
    </div>
    <div class="modal-section">
      <div class="modal-section-label">Reporting history</div>
      <div class="history-list">${historyRows}</div>
    </div>`;

  document.getElementById("grant-modal").classList.remove("hidden");
  document.getElementById("modal-overlay").classList.remove("hidden");
}

function closeGrantModal() {
  document.getElementById("grant-modal").classList.add("hidden");
  document.getElementById("modal-overlay").classList.add("hidden");
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
    const ackClass = isAck ? " ack" : "";
    return `<div class="completeness-card${ackClass}" data-spot-id="${s.id}">
      <div class="cc-header">
        <div>
          <span class="cc-name">${s.name}</span>
          <span class="cc-cluster">${s.clusterLabel} · RC: ${s.rcName}</span>
        </div>
        ${isAck
          ? `<span class="badge badge-submitted">Acknowledged</span>`
          : `<button class="btn btn-sm btn-ack" onclick="acknowledgeSpot('${s.id}')">Acknowledge for follow-up</button>`}
      </div>
      <ul class="cc-flags">
        ${flags.map(f => `<li><span class="cc-field">${f.field}:</span> ${f.reason}</li>`).join("")}
      </ul>
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
  document.getElementById("modal-close").addEventListener("click", closeGrantModal);
  document.getElementById("modal-overlay").addEventListener("click", closeGrantModal);

  // Report generator buttons
  document.getElementById("btn-generate").addEventListener("click", handleGenerateDraft);
  document.getElementById("btn-copy").addEventListener("click", handleCopyDraft);
  document.getElementById("btn-download").addEventListener("click", handleDownloadDraft);

  // Start on overview
  navigate("overview");
});
