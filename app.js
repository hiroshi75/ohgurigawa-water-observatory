const summaryEl = document.querySelector("#summary");
const chartEl = document.querySelector("#chart");
const recordsEl = document.querySelector("#records");
const metricSelect = document.querySelector("#metric-select");
const filterInput = document.querySelector("#filter");
const pageLinks = [...document.querySelectorAll("[data-page-link]")];
const pageViews = [...document.querySelectorAll("[data-page-view]")];
const intradayDateSelect = document.querySelector("#intraday-date-select");
const intradayChartsEl = document.querySelector("#intraday-charts");
const intradayRecordsEl = document.querySelector("#intraday-records");
const intradayCountEl = document.querySelector("#intraday-count");

let records = [];
let summary = null;
let intradayDates = [];
const intradayMetrics = [
  { key: "pH", label: "pH" },
  { key: "DO_mgL", label: "DO mg/L" },
  { key: "DO_pct", label: "DO %" },
  { key: "DO_temp_C", label: "DO計水温 ℃" },
  { key: "water_temp_C", label: "水温 ℃" },
  { key: "EC_uScm", label: "EC μS/cm" },
  { key: "PAR_air_mean", label: "水面上PAR" },
  { key: "PAR_subsurface_mean", label: "水面直下PAR" },
  { key: "PAR_bottom_mean", label: "川底近くPAR" },
  { key: "bottom_PAR_ratio", label: "川底PAR比" },
  { key: "depth_cm", label: "水深 cm" },
  { key: "measured_depth_cm", label: "測定水深 cm" },
];

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
  const height = 320;
  chartEl.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const pad = { left: 48, right: 64, top: 24, bottom: 62 };
  const minY = Math.min(...values.map((point) => point.y));
  const maxY = Math.max(...values.map((point) => point.y));
  const ySpan = maxY - minY || 1;
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const x = (index) => dates.length === 1 ? pad.left + plotWidth / 2 : pad.left + (index / (dates.length - 1)) * plotWidth;
  const y = (value) => pad.top + (1 - ((value - minY) / ySpan)) * plotHeight;
  const ticks = [minY, minY + ySpan / 2, maxY];
  const dateTicks = dates.filter((_, index) => dates.length <= 10 || index === 0 || index === dates.length - 1 || index % Math.ceil(dates.length / 6) === 0);
  const rainValues = dates
    .map((date) => {
      const record = chartRecords.find((entry) =>
        entry.date === date
        && typeof entry.amedas_precipitation_24h_07_jst_mm === "number"
        && Number.isFinite(entry.amedas_precipitation_24h_07_jst_mm));
      return record ? { date, x: dateIndex.get(date), y: record.amedas_precipitation_24h_07_jst_mm } : null;
    })
    .filter(Boolean);
  const rainMax = rainValues.length ? Math.max(...rainValues.map((point) => point.y)) : 0;
  const rainAxisMax = rainMax > 0 ? rainMax : 1;
  const rainY = (value) => pad.top + (1 - (value / rainAxisMax)) * plotHeight;
  const rainTicks = rainValues.length ? (rainMax > 0 ? [0, rainAxisMax / 2, rainAxisMax] : [0]) : [];
  const rainBarWidth = Math.max(8, Math.min(28, plotWidth / Math.max(dates.length * 2.5, 1)));
  const morningValues = values.filter((point) => point.record.session === "morning").sort((a, b) => a.x - b.x);
  const afternoonValues = values.filter((point) => point.record.session === "afternoon").sort((a, b) => a.x - b.x);
  const linePath = (points) => points.length >= 2
    ? points.map((point, index) => `${index ? "L" : "M"} ${x(point.x).toFixed(1)} ${y(point.y).toFixed(1)}`).join(" ")
    : "";
  const morningPath = linePath(morningValues);
  const afternoonPath = linePath(afternoonValues);
  chartEl.innerHTML = `
    <rect x="0" y="0" width="${width}" height="${height}" fill="transparent"></rect>
    ${rainValues.map((point) => {
      const barTop = rainY(point.y);
      const barHeight = Math.max(0, height - pad.bottom - barTop);
      return `
        <rect x="${(x(point.x) - rainBarWidth / 2).toFixed(1)}" y="${barTop.toFixed(1)}" width="${rainBarWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" class="rain-bar">
          <title>${escapeHtml(point.date)} 07:00時点24h雨量 / ${formatNumber(point.y)} mm</title>
        </rect>
      `;
    }).join("")}
    ${ticks.map((tick) => `
      <line x1="${pad.left}" x2="${width - pad.right}" y1="${y(tick)}" y2="${y(tick)}" class="grid-line"></line>
      <text x="8" y="${y(tick) + 4}" class="axis-label">${formatNumber(tick)}</text>
    `).join("")}
    ${rainValues.length ? `<line x1="${width - pad.right}" x2="${width - pad.right}" y1="${pad.top}" y2="${height - pad.bottom}" class="rain-axis-line"></line>` : ""}
    ${rainTicks.map((tick) => `
      <text x="${width - 8}" y="${rainY(tick) + 4}" class="axis-label rain-axis-label" text-anchor="end">${formatNumber(tick)}</text>
    `).join("")}
    ${rainValues.length ? `<text x="${width - 8}" y="${pad.top - 8}" class="axis-label rain-axis-label" text-anchor="end">24h雨量 mm</text>` : ""}
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
      ${rainValues.length ? `<rect x="${pad.left + 190}" y="8" width="10" height="8" class="rain-legend-bar"></rect><text x="${pad.left + 206}" y="16" class="axis-label">07:00時点24h雨量</text>` : ""}
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
    intradayChartsEl.innerHTML = '<p class="empty">other を含む日はまだありません</p>';
    intradayRecordsEl.innerHTML = '<tr><td colspan="6">other を含む日はまだありません</td></tr>';
    intradayCountEl.textContent = "";
    return;
  }
  const selectedDate = intradayDates.includes(intradayDateSelect.value) ? intradayDateSelect.value : intradayDates[0];
  if (intradayDateSelect.value !== selectedDate) intradayDateSelect.value = selectedDate;
  const dayRecords = records
    .filter((record) => record.date === selectedDate)
    .sort((a, b) => String(a.observed_at).localeCompare(String(b.observed_at)));

  intradayCountEl.textContent = `${dayRecords.length}件`;
  renderIntradayTable(dayRecords);
  renderIntradayCharts(selectedDate, dayRecords);
}

function renderIntradayCharts(selectedDate, dayRecords) {
  const timeValues = dayRecords
    .map((record) => new Date(record.observed_at).getTime())
    .filter((value) => Number.isFinite(value));
  if (!timeValues.length) {
    intradayChartsEl.innerHTML = '<p class="empty">選択日の時刻データがありません</p>';
    return;
  }
  const minX = Math.min(...timeValues);
  const maxX = Math.max(...timeValues);
  intradayChartsEl.innerHTML = intradayMetrics
    .map((metric) => renderIntradayMetricChart(selectedDate, dayRecords, metric, minX, maxX))
    .join("");
}

function renderIntradayMetricChart(selectedDate, dayRecords, metric, minX, maxX) {
  const values = dayRecords
    .map((record) => ({ x: new Date(record.observed_at).getTime(), y: record[metric.key], record }))
    .filter((point) => Number.isFinite(point.x) && typeof point.y === "number" && Number.isFinite(point.y));
  if (!values.length) {
    return `
      <article class="intraday-chart-card">
        <div class="intraday-chart-head">
          <h3>${escapeHtml(metric.label)}</h3>
          <span>データなし</span>
        </div>
        <p class="empty">この日の ${escapeHtml(metric.label)} は記録されていません。</p>
      </article>
    `;
  }

  const width = intradayChartsEl.clientWidth || 680;
  const height = 190;
  const pad = { left: 54, right: 22, top: 14, bottom: 34 };
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
  return `
    <article class="intraday-chart-card">
      <div class="intraday-chart-head">
        <h3>${escapeHtml(metric.label)}</h3>
        <span>${escapeHtml(selectedDate)} / ${escapeHtml(rangeFromValues(values.map((point) => point.y)))}</span>
      </div>
      <svg class="chart intraday-chart" role="img" aria-label="${escapeHtml(metric.label)}の1日内変動" viewBox="0 0 ${width} ${height}">
        <rect x="0" y="0" width="${width}" height="${height}" fill="transparent"></rect>
        ${ticks.map((tick) => `
          <line x1="${pad.left}" x2="${width - pad.right}" y1="${y(tick)}" y2="${y(tick)}" class="grid-line"></line>
          <text x="8" y="${y(tick) + 4}" class="axis-label">${formatNumber(tick)}</text>
        `).join("")}
        ${path ? `<path d="${path}" class="series-line intraday-line"></path>` : ""}
        ${values.map((point) => renderIntradayPoint(point, x(point.x), y(point.y))).join("")}
        <text x="${pad.left}" y="${height - 12}" class="axis-label">${formatTime(new Date(minX).toISOString())}</text>
        <text x="${width - 72}" y="${height - 12}" class="axis-label">${formatTime(new Date(maxX).toISOString())}</text>
      </svg>
    </article>
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

function rangeFromValues(values) {
  const finite = values.filter((value) => typeof value === "number" && Number.isFinite(value));
  if (!finite.length) return "-";
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  return min === max ? formatNumber(min) : `${formatNumber(min)} - ${formatNumber(max)}`;
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

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}
