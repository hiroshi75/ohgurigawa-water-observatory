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
  const values = records
    .map((record) => ({ x: new Date(record.observed_at).getTime(), y: record[key], record }))
    .filter((point) => typeof point.y === "number" && Number.isFinite(point.y));
  if (values.length < 2) {
    chartEl.innerHTML = '<text x="24" y="48">チャートに必要なデータがまだありません</text>';
    return;
  }
  const width = chartEl.clientWidth || 680;
  const height = 300;
  chartEl.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const pad = { left: 48, right: 16, top: 18, bottom: 42 };
  const minX = Math.min(...values.map((point) => point.x));
  const maxX = Math.max(...values.map((point) => point.x));
  const minY = Math.min(...values.map((point) => point.y));
  const maxY = Math.max(...values.map((point) => point.y));
  const ySpan = maxY - minY || 1;
  const x = (value) => pad.left + ((value - minX) / Math.max(1, maxX - minX)) * (width - pad.left - pad.right);
  const y = (value) => pad.top + (1 - ((value - minY) / ySpan)) * (height - pad.top - pad.bottom);
  const path = values.map((point, index) => `${index ? "L" : "M"} ${x(point.x).toFixed(1)} ${y(point.y).toFixed(1)}`).join(" ");
  const ticks = [minY, minY + ySpan / 2, maxY];
  chartEl.innerHTML = `
    <rect x="0" y="0" width="${width}" height="${height}" fill="transparent"></rect>
    ${ticks.map((tick) => `
      <line x1="${pad.left}" x2="${width - pad.right}" y1="${y(tick)}" y2="${y(tick)}" class="grid-line"></line>
      <text x="8" y="${y(tick) + 4}" class="axis-label">${formatNumber(tick)}</text>
    `).join("")}
    <path d="${path}" class="series-line"></path>
    ${values.map((point) => `
      <circle cx="${x(point.x)}" cy="${y(point.y)}" r="3.5" class="series-point">
        <title>${formatDateTime(point.record.observed_at)} / ${formatNumber(point.y)}</title>
      </circle>
    `).join("")}
    <text x="${pad.left}" y="${height - 12}" class="axis-label">${formatDate(values[0].record.date)}</text>
    <text x="${width - 120}" y="${height - 12}" class="axis-label">${formatDate(values.at(-1).record.date)}</text>
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
