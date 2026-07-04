const summaryEl = document.querySelector("#summary");
const chartEl = document.querySelector("#chart");
const recordsEl = document.querySelector("#records");
const metricSelect = document.querySelector("#metric-select");
const filterInput = document.querySelector("#filter");

let records = [];
let summary = null;

init();

async function init() {
  const [recordsResponse, summaryResponse] = await Promise.all([
    fetch("data/observations.json"),
    fetch("data/summary.json"),
  ]);
  records = (await recordsResponse.json()).records ?? [];
  summary = await summaryResponse.json();
  renderSummary();
  renderChart();
  renderTable();
  metricSelect.addEventListener("change", renderChart);
  filterInput.addEventListener("input", renderTable);
}

function renderSummary() {
  const latest = records.at(-1);
  const cards = [
    ["公開レコード", summary.public_record_count ?? records.length, "件"],
    ["期間", [summary.date_start, summary.date_end].filter(Boolean).join(" - ") || "-", ""],
    ["最新観測", latest ? formatDateTime(latest.observed_at) : "-", ""],
    ["pH範囲", rangeText(summary.metrics?.pH), ""],
  ];
  summaryEl.innerHTML = cards.map(([label, value, unit]) => `
    <article class="metric-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}${unit ? `<small>${escapeHtml(unit)}</small>` : ""}</strong>
    </article>
  `).join("");
}

function renderChart() {
  const key = metricSelect.value;
  const chartRecords = records.filter((record) => record.session === "morning" || record.session === "afternoon");
  const dates = [...new Set(chartRecords.map((record) => record.date).filter(Boolean))].sort();
  const dateIndex = new Map(dates.map((date, index) => [date, index]));
  const values = records
    .filter((record) => record.session === "morning" || record.session === "afternoon")
    .map((record) => ({ x: dateIndex.get(record.date), y: record[key], record }))
    .filter((point) => typeof point.x === "number" && typeof point.y === "number" && Number.isFinite(point.y));
  if (!values.length || !dates.length) {
    chartEl.innerHTML = '<text x="24" y="48">morning / afternoon のグラフ対象データがまだありません</text>';
    return;
  }
  const width = chartEl.clientWidth || 680;
  const height = 300;
  chartEl.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const pad = { left: 48, right: 22, top: 18, bottom: 54 };
  const minY = Math.min(...values.map((point) => point.y));
  const maxY = Math.max(...values.map((point) => point.y));
  const ySpan = maxY - minY || 1;
  const plotWidth = width - pad.left - pad.right;
  const x = (index, session) => {
    const base = dates.length === 1 ? pad.left + plotWidth / 2 : pad.left + (index / (dates.length - 1)) * plotWidth;
    const offset = session === "morning" ? -5 : 5;
    return Math.max(pad.left, Math.min(width - pad.right, base + offset));
  };
  const y = (value) => pad.top + (1 - ((value - minY) / ySpan)) * (height - pad.top - pad.bottom);
  const ticks = [minY, minY + ySpan / 2, maxY];
  const dateTicks = dates.filter((_, index) => dates.length <= 10 || index === 0 || index === dates.length - 1 || index % Math.ceil(dates.length / 6) === 0);
  chartEl.innerHTML = `
    <rect x="0" y="0" width="${width}" height="${height}" fill="transparent"></rect>
    ${ticks.map((tick) => `
      <line x1="${pad.left}" x2="${width - pad.right}" y1="${y(tick)}" y2="${y(tick)}" class="grid-line"></line>
      <text x="8" y="${y(tick) + 4}" class="axis-label">${formatNumber(tick)}</text>
    `).join("")}
    ${dateTicks.map((date) => `
      <text x="${x(dateIndex.get(date), "morning") + 5}" y="${height - 30}" class="axis-label date-label" text-anchor="middle">${formatDate(date)}</text>
    `).join("")}
    <g class="chart-legend">
      <circle cx="${pad.left}" cy="12" r="4" class="legend-point legend-point-morning"></circle>
      <text x="${pad.left + 10}" y="16" class="axis-label">morning</text>
      <rect x="${pad.left + 86}" y="8" width="8" height="8" class="legend-point legend-point-afternoon"></rect>
      <text x="${pad.left + 100}" y="16" class="axis-label">afternoon</text>
    </g>
    ${values.map((point) => renderSessionPoint(point, x(point.x, point.record.session), y(point.y))).join("")}
  `;
}

function renderSessionPoint(point, cx, cy) {
  const title = `${point.record.date} ${point.record.session} / ${formatNumber(point.y)}`;
  if (point.record.session === "afternoon") {
    return `
      <rect x="${(cx - 4).toFixed(1)}" y="${(cy - 4).toFixed(1)}" width="8" height="8" class="series-point series-point-afternoon">
        <title>${escapeHtml(title)}</title>
      </rect>
    `;
  }
  return `
    <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="4" class="series-point series-point-morning">
      <title>${escapeHtml(title)}</title>
    </circle>
  `;
}

function renderTable() {
  const query = filterInput.value.trim().toLowerCase();
  const filtered = records
    .filter((record) => !query || [record.date, record.session, record.event_type, record.water_clarity].filter(Boolean).join(" ").toLowerCase().includes(query))
    .slice(-100)
    .reverse();
  recordsEl.innerHTML = filtered.map((record) => `
    <tr>
      <td><strong>${escapeHtml(formatDateTime(record.observed_at))}</strong><br><span>${escapeHtml(record.session ?? "")}</span></td>
      <td>${numberOrDash(record.pH)}</td>
      <td>${numberOrDash(record.DO_mgL)} mg/L<br><span>${numberOrDash(record.DO_pct)} %</span></td>
      <td>上 ${numberOrDash(record.PAR_air_mean)}<br>底 ${numberOrDash(record.PAR_bottom_mean)}</td>
      <td>${escapeHtml([record.event_type, record.water_clarity, record.flow].filter(Boolean).join(" / ") || "-")}</td>
    </tr>
  `).join("") || '<tr><td colspan="5">該当するデータがありません</td></tr>';
}

function rangeText(metric) {
  if (!metric || typeof metric.min !== "number" || typeof metric.max !== "number") return "-";
  return `${formatNumber(metric.min)} - ${formatNumber(metric.max)}`;
}

function numberOrDash(value) {
  return typeof value === "number" && Number.isFinite(value) ? formatNumber(value) : "-";
}

function formatNumber(value) {
  return Number(value).toLocaleString("ja-JP", { maximumFractionDigits: 2 });
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value ?? "";
  return date.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", dateStyle: "medium", timeStyle: "short" });
}

function formatDate(value) {
  return value ? value.slice(5) : "";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}
