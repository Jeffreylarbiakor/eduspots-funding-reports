// js/charts.js
// Chart.js wrappers for the EduSpots Funding & Impact Report Generator.
// All charts draw only from the datasets passed in — no invented data.

let fundingChartInstance     = null;
let completenessChartInstance = null;

// ---------------------------------------------------------------------------
// Funding by grant — bar chart
// ---------------------------------------------------------------------------

function renderFundingChart(grants) {
  if (typeof Chart === "undefined") {
    // Chart.js not yet loaded — retry in 100ms
    setTimeout(() => renderFundingChart(grants), 100);
    return;
  }
  const ctx = document.getElementById("funding-chart");
  if (!ctx) return;

  if (fundingChartInstance) {
    fundingChartInstance.destroy();
    fundingChartInstance = null;
  }

  const sorted = [...grants].sort((a, b) => b.amount - a.amount);

  const statusColors = {
    "on-track":  "#3E7CB1",
    "due-soon":  "#D9A62E",
    "overdue":   "#B54834",
    "submitted": "#1F5C3D",
  };

  fundingChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels:   sorted.map(g => g.funderName),
      datasets: [{
        label:           "Grant amount (GH₵)",
        data:            sorted.map(g => g.amount),
        backgroundColor: sorted.map(g => statusColors[g.status.code] || "#3E7CB1"),
        borderRadius:    4,
        borderSkipped:   false,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => "GH₵ " + ctx.parsed.y.toLocaleString("en-GB"),
            afterLabel: ctx => "Status: " + sorted[ctx.dataIndex].status.label,
          },
        },
      },
      scales: {
        x: {
          ticks: {
            font:      { family: "'IBM Plex Sans', sans-serif", size: 11 },
            color:     "#6B6558",
            maxRotation: 35,
            minRotation: 20,
          },
          grid: { display: false },
        },
        y: {
          ticks: {
            font:      { family: "'IBM Plex Mono', monospace", size: 11 },
            color:     "#6B6558",
            callback:  v => "GH₵ " + (v / 1000).toFixed(0) + "k",
          },
          grid: { color: "rgba(26,26,22,0.06)" },
        },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Reporting completeness by cluster — horizontal bar chart
// ---------------------------------------------------------------------------

function renderCompletenessChart(clusterData) {
  if (typeof Chart === "undefined") {
    setTimeout(() => renderCompletenessChart(clusterData), 100);
    return;
  }
  const ctx = document.getElementById("completeness-chart");
  if (!ctx) return;

  if (completenessChartInstance) {
    completenessChartInstance.destroy();
    completenessChartInstance = null;
  }

  completenessChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels:   clusterData.map(c => c.label),
      datasets: [
        {
          label:           "Complete",
          data:            clusterData.map(c => c.complete),
          backgroundColor: "#1F5C3D",
          borderRadius:    3,
          borderSkipped:   false,
        },
        {
          label:           "Incomplete",
          data:            clusterData.map(c => c.incomplete),
          backgroundColor: "#D9A62E",
          borderRadius:    3,
          borderSkipped:   false,
        },
      ],
    },
    options: {
      indexAxis:           "y",
      responsive:          true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            font:      { family: "'IBM Plex Sans', sans-serif", size: 12 },
            color:     "#1A1A16",
            padding:   16,
            boxWidth:  12,
            boxHeight: 12,
          },
        },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${ctx.parsed.x} Spot(s)`,
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          ticks:   { font: { family: "'IBM Plex Mono', monospace", size: 11 }, color: "#6B6558" },
          grid:    { color: "rgba(26,26,22,0.06)" },
        },
        y: {
          stacked: true,
          ticks:   { font: { family: "'IBM Plex Sans', sans-serif", size: 12 }, color: "#1A1A16" },
          grid:    { display: false },
        },
      },
    },
  });
}
