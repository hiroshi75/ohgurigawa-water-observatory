const summaryEl = document.querySelector("#summary");
const chartEl = document.querySelector("#chart");
const recordsEl = document.querySelector("#records");
const metricSelect = document.querySelector("#metric-select");
const filterInput = document.querySelector("#filter");
const pageLinks = [...document.querySelectorAll("[data-page-link]")];
const pageViews = [...document.querySelectorAll("[data-page-view]")];
const intradayDateSelect = document.querySelector("#intraday-date-select");
const intradayMetricSelect = document.querySelector("#intraday-metric-select");
const intradayChartEl = document.querySelector("#intraday-chart");
const intradayRecordsEl = document.querySelector("#intraday-records");
const intradayCountEl = document.querySelector("#intraday-count");

let records = [];
let summary = null;
let intradayDates = [];

init();

async function init() {
  const [recordsResponse, summaryResponse] = await Promise.all([
    fetch("data/observations.json"),
    fetch("data/summary.json"),
  ]);
  records = (await recordsResponse.json()).records ?? [];
  summary = await summaryResponse.json();
  renderSummary();
  renderIntradayDateOptions();
  routePage();
  renderChart();
  renderTable();
  metricSelect.addEventListener("change", renderChart);
  filterInput.addEventListener("input", renderTable);
  intradayDateSelect.addEventListener("change", renderIntraday);
  intradayMetricSelect.addEventListener("change", renderIntraday);
  window.addEventListener("hashchange", routePage);
}

function routePage() {
  const requested = location.hash.replace(/^#/, "") || "daily";
  const active = requested === "intraday" ? "intraday" : "daily";
  for (const view of pageViews) {
    view.hidden = view.dataset.pageView !== active;
  }
  for (const link of pageLinks) {
    link.classList.toggle("is-active", link.dataset.pageLink === active);
  }
  if (active === "intraday") {
    renderIntraday();
  } else {
    renderChart();
  }
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
  const values = chartRecords
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
  const x = (index) => dates.length === 1 ? pad.left + plotWidth / 2 : pad.left + (index / (dates.length - 1)) * plotWidth;
  const y = (value) => pad.top + (1 - ((value - minY) / ySpan)) * (height - pad.top - pad.bottom);
  const ticks = [minY, minY + ySpan / 2, maxY];
  const dateTicks = dates.filter((_, index) => dates.length <= 10 || index === 0 || index === dates.length - 1 || index % Math.ceil(dates.length / 6) === 0);
  const morningValues = values.filter((point) => point.record.session === "morning").sort((a, b) => a.x - b.x);
  const afternoonValues = values.filter((point) => point.record.session === "afternoon").sort((a, b) => a.x - b.x);
  const linePath = (points) => points.length >= 2
    ? points.map((point, index) => `${index ? "L" : "M"} ${x(point.x).toFixed(1)} ${y(point.y).toFixed(1)}`).join(" ")
    : "";
  const morningPath = linePath(morningValues);
  const afternoonPath = linePath(afternoonValues);
  chartEl.innerHTML = `
    <rect x="0" y="0" width="${width}" height="${height}" fill="transparent"></rect>
    ${ticks.map((tick) => `
      <line x1="${pad.left}" x2="${width - pad.right}" y1="${y(tick)}" y2="${y(tick)}" class="grid-line"></line>
      <text x="8" y="${y(tick) + 4}" class="axis-label">${formatNumber(tick)}</text>
    `).join("")}
    ${dateTicks.map((date) => `
      <text x="${x(dateIndex.get(date))}" y="${height - 30}" class="axis-label date-label" text-anchor="middle">${formatDate(date)}</text>
    `).join("")}
    ${morningPath ? `<path d="${morningPath}" class="series-line series-line-morning"></path>` : ""}
    ${afternoonPath ? `<path d="${afternoonPath}" class="series-line series-line-afternoon"></path>` : ""}
    <g class="chart-legend">
      <circle cx="${pad.left}" cy="12" r="4" class="legend-point legend-point-morning"></circle>
      <text x="${pad.left + 10}" y="16" class="axis-label">morning</text>
      <rect x="${pad.left + 86}" y="8" width="8" height="8" class="legend-point legend-point-afternoon"></rect>
      <text x="${pad.left + 100}" y="16" class="axis-label">afternoon</text>
    </g>
    ${values.map((point) => renderSessionPoint(point, x(point.x), y(point.y))).join("")}
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

function renderIntradayDateOptions() {
  intradayDates = [...new Set(records
    .filter((record) => record.session === "other" && record.date)
    .map((record) => record.date))]
    .sort()
    .reverse();
  if (!intradayDates.length) {
    intradayDateSelect.disabled = true;
    intradayDateSelect.innerHTML = '<option value="">otherを含む日はありません</option>';
    return;
  }
  intradayDateSelect.disabled = false;
  intradayDateSelect.innerHTML = intradayDates
    .map((date) => `<option value="${escapeHtml(date)}">${escapeHtml(date)}</option>`)
    .join("");
}

function renderIntraday() {
  if (!intradayDates.length) {
    intradayChartEl.innerHTML = '<text x="24" y="48">other を含む日はまだありません</text>';
    intradayRecordsEl.innerHTML = '<tr><td colspan="6">other を含む日はまだありません</td></tr>';
    intradayCountEl.textContent = "";
    return;
  }
  const selectedDate = intradayDates.includes(intradayDateSelect.value) ? intradayDateSelect.value : intradayDates[0];
  if (intradayDateSelect.value !== selectedDate) intradayDateSelect.value = selectedDate;
  const key = intradayMetricSelect.value;
  const dayRecords = records
    .filter((record) => record.date === selectedDate)
    .sort((a, b) => String(a.observed_at).localeCompare(String(b.observed_at)));
  const values = dayRecords
    .map((record) => ({ x: new Date(record.observed_at).getTime(), y: record[key], record }))
    .filter((point) => Number.isFinite(point.x) && typeof point.y === "number" && Number.isFinite(point.y));

  intradayCountEl.textContent = `${dayRecords.length}件`;
  renderIntradayTable(dayRecords);
  if (!values.length) {
    intradayChartEl.innerHTML = '<text x="24" y="48">選択日のこの項目にはグラフ対象データがありません</text>';
    return;
  }

  const width = intradayChartEl.clientWidth || 680;
  const height = 300;
  intradayChartEl.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const pad = { left: 48, right: 22, top: 18, bottom: 54 };
  const minX = Math.min(...values.map((point) => point.x));
  const maxX = Math.max(...values.map((point) => point.x));
  const minY = Math.min(...values.map((point) => point.y));
  const maxY = Math.max(...values.map((point) => point.y));
  const ySpan = maxY - minY || 1;
  const plotWidth = width - pad.left - pad.right;
  const x = (value) => maxX === minX ? pad.left + plotWidth / 2 : pad.left + ((value - minX) / (maxX - minX)) * plotWidth;
  const y = (value) => pad.top + (1 - ((value - minY) / ySpan)) * (height - pad.top - pad.bottom);
  const ticks = [minY, minY + ySpan / 2, maxY];
  const path = values.length >= 2
    ? values.map((point, index) => `${index ? "L" : "M"} ${x(point.x).toFixed(1)} ${y(point.y).toFixed(1)}`).join(" ")
    : "";
  intradayChartEl.innerHTML = `
    <rect x="0" y="0" width="${width}" height="${height}" fill="transparent"></rect>
    ${ticks.map((tick) => `
      <line x1="${pad.left}" x2="${width - pad.right}" y1="${y(tick)}" y2="${y(tick)}" class="grid-line"></line>
      <text x="8" y="${y(tick) + 4}" class="axis-label">${formatNumber(tick)}</text>
    `).join("")}
    ${path ? `<path d="${path}" class="series-line intraday-line"></path>` : ""}
    <g class="chart-legend">
      <circle cx="${pad.left}" cy="12" r="4" class="legend-point legend-point-morning"></circle>
      <text x="${pad.left + 10}" y="16" class="axis-label">morning</text>
      <rect x="${pad.left + 86}" y="8" width="8" height="8" class="legend-point legend-point-afternoon"></rect>
      <text x="${pad.left + 100}" y="16" class="axis-label">afternoon</text>
      <polygon points="${pad.left + 196},12 ${pad.left + 202},6 ${pad.left + 208},12 ${pad.left + 202},18" class="legend-point legend-point-other"></polygon>
      <text x="${pad.left + 214}" y="16" class="axis-label">other</text>
    </g>
    ${values.map((point) => renderIntradayPoint(point, x(point.x), y(point.y))).join("")}
    <text x="${pad.left}" y="${height - 30}" class="axis-label">${escapeHtml(selectedDate)} / ${escapeHtml(metricLabel(key))}</text>
    <text x="${pad.left}" y="${height - 12}" class="axis-label">${formatTime(values[0].record.observed_at)}</text>
    <text x="${width - 72}" y="${height - 12}" class="axis-label">${formatTime(values.at(-1).record.observed_at)}</text>
  `;
}

function renderIntradayPoint(point, cx, cy) {
  const title = `${formatTime(point.record.observed_at)} ${point.record.session ?? ""} / ${formatNumber(point.y)}`;
  if (point.record.session === "afternoon") {
    return `
      <rect x="${(cx - 4).toFixed(1)}" y="${(cy - 4).toFixed(1)}" width="8" height="8" class="series-point series-point-afternoon">
        <title>${escapeHtml(title)}</title>
      </rect>
    `;
  }
  if (point.record.session === "other") {
    const points = [
      [cx, cy - 5],
      [cx + 5, cy],
      [cx, cy + 5],
      [cx - 5, cy],
    ].map(([xValue, yValue]) => `${xValue.toFixed(1)},${yValue.toFixed(1)}`).join(" ");
    return `
      <polygon points="${points}" class="series-point series-point-other">
        <title>${escapeHtml(title)}</title>
      </polygon>
    `;
  }
  return `
    <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="4" class="series-point series-point-morning">
      <title>${escapeHtml(title)}</title>
    </circle>
  `;
}

function renderIntradayTable(dayRecords) {
  intradayRecordsEl.innerHTML = dayRecords.map((record) => `
    <tr>
      <td><strong>${escapeHtml(formatTime(record.observed_at))}</strong><br><span>${escapeHtml(formatDateTime(record.observed_at))}</span></td>
      <td>${escapeHtml(record.session ?? "")}</td>
      <td>${numberOrDash(record.pH)}</td>
      <td>${numberOrDash(record.DO_mgL)} mg/L<br><span>${numberOrDash(record.DO_pct)} %</span></td>
      <td>上 ${numberOrDash(record.PAR_air_mean)}<br>底 ${numberOrDash(record.PAR_bottom_mean)}</td>
      <td>${escapeHtml([record.event_type, record.water_clarity, record.flow].filter(Boolean).join(" / ") || "-")}</td>
    </tr>
  `).join("") || '<tr><td colspan="6">選択日のデータがありません</td></tr>';
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

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value ?? "";
  return date.toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" });
}

function formatDate(value) {
  return value ? value.slice(5) : "";
}

function metricLabel(key) {
  return ({
    pH: "pH",
    DO_mgL: "DO mg/L",
    DO_pct: "DO %",
    PAR_air_mean: "水面上PAR",
    PAR_bottom_mean: "川底近くPAR",
    bottom_PAR_ratio: "川底PAR比",
  })[key] ?? key;
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
