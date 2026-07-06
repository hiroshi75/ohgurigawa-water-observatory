const el = {
  latestCards: document.querySelector("#latest-cards"),
  latestComment: document.querySelector("#latest-comment"),
  responseCharts: document.querySelector("#response-charts"),
  lightCharts: document.querySelector("#light-charts"),
  photoCharts: document.querySelector("#photo-charts"),
  scatterPh: document.querySelector("#scatter-ph"),
  scatterDo: document.querySelector("#scatter-do"),
  eventList: document.querySelector("#event-list"),
  ecCharts: document.querySelector("#ec-charts"),
  intradayDateSelect: document.querySelector("#intraday-date-select"),
  intradayCharts: document.querySelector("#intraday-charts"),
  intradayRecords: document.querySelector("#intraday-records"),
  dailyFilter: document.querySelector("#daily-filter"),
  dailyTable: document.querySelector("#daily-table"),
  records: document.querySelector("#records")
};

const EVENT_LABELS = {
  none: "通常",
  clear_low_flow: "晴天・低流量・透明",
  rain_turbid: "雨後・濁り/遮光",
  rain_scour: "雨後・洗い流し",
  human_input_suspected: "人為入力候補",
  unknown: "判定不能"
};

const INTRADAY_METRICS = [
  { key: "pH", label: "pH" },
  { key: "DO_mgL", label: "DO mg/L" },
  { key: "DO_pct", label: "DO %" },
  { key: "EC_uScm", label: "EC μS/cm" },
  { key: "PAR_air_mean", label: "水面上PAR" },
  { key: "PAR_subsurface_mean", label: "水面直下PAR" },
  { key: "PAR_bottom_mean", label: "川底PAR" },
  { key: "bottom_PAR_ratio", label: "川底光到達率" },
  { key: "depth_cm", label: "水深 cm" },
  { key: "measured_depth_cm", label: "測定水深 cm" }
];

let records = [];
let dailyMetrics = [];
let summary = null;
let intradayDates = [];
let resizeTimer = null;

init().catch(function(error) {
  document.body.insertAdjacentHTML("afterbegin", '<div class="load-error">公開データを読み込めませんでした: ' + escapeHtml(error.message) + '</div>');
});

async function init() {
  const responses = await Promise.all([
    fetch("data/observations.json"),
    fetch("data/daily_metrics.json"),
    fetch("data/summary.json")
  ]);
  records = ((await responses[0].json()).records || []).sort(function(a, b) {
    return String(a.observed_at).localeCompare(String(b.observed_at));
  });
  dailyMetrics = ((await responses[1].json()).records || []).sort(function(a, b) {
    return String(a.date).localeCompare(String(b.date));
  });
  summary = await responses[2].json();

  renderAll();
  el.dailyFilter.addEventListener("input", renderDailyTable);
  el.intradayDateSelect.addEventListener("change", renderIntraday);
  window.addEventListener("resize", function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderCharts, 120);
  });
}

function renderAll() {
  renderLatestCards();
  renderCharts();
  renderEvents();
  renderIntradayDateOptions();
  renderIntraday();
  renderDailyTable();
  renderRecordsTable();
}

function renderCharts() {
  renderResponseCharts();
  renderLightCharts();
  renderPhotoCharts();
  renderScatterCharts();
  renderEcCharts();
  renderIntraday();
}

function renderLatestCards() {
  const latest = latestDailyMetric();
  const latestRecord = records[records.length - 1];
  const cards = [
    { label: "最新観察日", value: latest ? latest.date : "-", sub: latestRecord ? formatDateTime(latestRecord.observed_at) : "" },
    { label: "イベント型", value: latest ? eventLabel(latest.event_type) : "-", sub: latest ? latest.recovery_phase_label || "" : "" },
    { label: "pHの日中上昇", value: signedNumber(latest && latest.delta_pH, 2), sub: "朝から午後" },
    { label: "DO%の日中上昇", value: signedNumber(latest && latest.delta_DO_pct, 1), sub: "朝から午後" },
    { label: "川底光到達率", value: numberOrDash(latest && latest.bottom_PAR_ratio_mean, 2), sub: "bottom / air" },
    { label: "測定信頼度", value: latest ? latest.measurement_confidence || "-" : "-", sub: summary ? String(summary.public_record_count || records.length) + " records" : "" }
  ];
  el.latestCards.innerHTML = cards.map(function(card) {
    return '<article class="latest-card"><span>' + escapeHtml(card.label) + '</span><strong>' + escapeHtml(card.value) + '</strong><small>' + escapeHtml(card.sub || "") + '</small></article>';
  }).join("");
  el.latestComment.textContent = latest ? latest.summary_note || "" : "";
}

function renderResponseCharts() {
  el.responseCharts.innerHTML = [
    chartPanel({
      title: "pHの日中上昇",
      description: "朝から午後にpHがどれだけ上がったか。CO2消費を含む日中応答のproxyです。",
      svg: timeSeriesSvg(dailyMetrics, {
        series: [{ key: "delta_pH", label: "ΔpH", className: "series-ph" }],
        yLabel: "ΔpH",
        zeroLine: true,
        includeRain: true
      })
    }),
    chartPanel({
      title: "DO%の日中上昇",
      description: "朝から午後に水中の酸素飽和度がどれだけ上がったか。光合成、再曝気、混合の影響を受けます。",
      svg: timeSeriesSvg(dailyMetrics, {
        series: [{ key: "delta_DO_pct", label: "ΔDO%", className: "series-do" }],
        yLabel: "ΔDO%",
        zeroLine: true,
        includeRain: true
      })
    })
  ].join("");
}

function renderLightCharts() {
  el.lightCharts.innerHTML = [
    chartPanel({
      title: "川底PAR",
      description: "川底付近に届いた光。藻類やバイオフィルムが利用できる光のproxyです。",
      svg: timeSeriesSvg(dailyMetrics, {
        series: [{ key: "PAR_bottom_mean", label: "川底PAR", className: "series-light" }],
        yLabel: "PAR",
        includeRain: true
      })
    }),
    chartPanel({
      title: "川底光到達率",
      description: "水面上の光のうち、川底近くにどれくらい届いたか。濁り、泥、水深変化で下がります。",
      svg: timeSeriesSvg(dailyMetrics, {
        series: [{ key: "bottom_PAR_ratio_mean", label: "川底光到達率", className: "series-ratio" }],
        yLabel: "ratio",
        yMin: 0,
        includeRain: true
      })
    })
  ].join("");
}

function renderPhotoCharts() {
  const hasScore = dailyMetrics.some(function(day) {
    return ["visual_algae_score", "mud_cover_score", "bare_stone_score", "bed_visibility_score"].some(function(key) {
      return isFiniteNumber(day[key]);
    });
  });
  if (!hasScore) {
    el.photoCharts.innerHTML = '<p class="empty">写真スコアの公開対象データはまだありません。</p>';
    return;
  }
  el.photoCharts.innerHTML = chartPanel({
    title: "藻類・膜、泥、裸石、見え方",
    description: "0-3の同じ縦軸で、川底の見え方と表面状態の変化を並べます。",
    svg: timeSeriesSvg(dailyMetrics, {
      series: [
        { key: "visual_algae_score", label: "藻類・膜", className: "series-algae" },
        { key: "mud_cover_score", label: "泥被覆", className: "series-mud" },
        { key: "bare_stone_score", label: "裸石感", className: "series-stone" },
        { key: "bed_visibility_score", label: "川底の見え方", className: "series-visibility" }
      ],
      yLabel: "score",
      yMin: 0,
      yMax: 3
    })
  });
}

function renderScatterCharts() {
  el.scatterPh.innerHTML = scatterSvg(dailyMetrics, {
    xKey: "PAR_bottom_mean",
    yKey: "delta_pH",
    xLabel: "川底PAR",
    yLabel: "ΔpH"
  });
  el.scatterDo.innerHTML = scatterSvg(dailyMetrics, {
    xKey: "PAR_bottom_mean",
    yKey: "delta_DO_pct",
    xLabel: "川底PAR",
    yLabel: "ΔDO%"
  });
}

function renderEcCharts() {
  el.ecCharts.innerHTML = [
    chartPanel({
      title: "EC morning / afternoon",
      description: "ECの急変日は、光や泥だけでは説明できない溶存成分イベント候補として扱います。",
      svg: timeSeriesSvg(dailyMetrics, {
        series: [
          { key: "EC_morning_uScm", label: "morning", className: "series-morning" },
          { key: "EC_afternoon_uScm", label: "afternoon", className: "series-afternoon" }
        ],
        yLabel: "μS/cm"
      })
    }),
    chartPanel({
      title: "EC変化と直近平均との差",
      description: "朝午後差と、直近7日中央値からのずれを重ねて見ます。",
      svg: timeSeriesSvg(dailyMetrics, {
        series: [
          { key: "delta_EC_uScm", label: "朝午後差", className: "series-ec-delta" },
          { key: "EC_deviation_uScm", label: "直近平均との差", className: "series-ec-shift" }
        ],
        yLabel: "μS/cm",
        zeroLine: true
      })
    })
  ].join("");
}

function renderEvents() {
  const eventDays = dailyMetrics.filter(function(day) {
    return (day.flags || []).length
      || (day.event_type && !["none", "unknown"].includes(day.event_type))
      || (day.amedas_precipitation_24h_07_jst_mm || 0) > 0;
  }).slice().reverse();
  if (!eventDays.length) {
    el.eventList.innerHTML = '<p class="empty">イベント候補日はまだありません。</p>';
    return;
  }
  el.eventList.innerHTML = eventDays.slice(0, 18).map(function(day) {
    const flags = (day.flags || []).map(function(flag) {
      return '<span class="flag">' + escapeHtml(flag.label) + '</span>';
    }).join("");
    return '<article class="event-card">'
      + '<div><strong>' + escapeHtml(day.date) + '</strong><span class="event-badge ' + eventClass(day.event_type) + '">' + escapeHtml(eventLabel(day.event_type)) + '</span></div>'
      + '<p>' + escapeHtml(day.summary_note || "") + '</p>'
      + '<div class="event-meta"><span>雨量 ' + numberOrDash(day.amedas_precipitation_24h_07_jst_mm, 1) + ' mm</span><span>ΔpH ' + signedNumber(day.delta_pH, 2) + '</span><span>ΔDO% ' + signedNumber(day.delta_DO_pct, 1) + '</span><span>ECずれ ' + signedNumber(day.EC_deviation_uScm, 1) + '</span></div>'
      + '<div class="flag-row">' + flags + '</div>'
      + '</article>';
  }).join("");
}

function renderDailyTable() {
  const query = el.dailyFilter.value.trim().toLowerCase();
  const rows = dailyMetrics.slice().reverse().filter(function(day) {
    if (!query) return true;
    return [day.date, day.event_type, day.event_label, day.recovery_phase_label, day.summary_note, day.water_clarity, day.flow]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
  el.dailyTable.innerHTML = rows.map(function(day) {
    return '<tr>'
      + '<td><strong>' + escapeHtml(day.date) + '</strong><br><span>' + escapeHtml([day.morning_time, day.afternoon_time].filter(Boolean).join(" -> ") || day.data_status || "") + '</span></td>'
      + '<td><span class="event-badge ' + eventClass(day.event_type) + '">' + escapeHtml(eventLabel(day.event_type)) + '</span><br><span>' + escapeHtml(day.recovery_phase_label || "") + '</span></td>'
      + '<td>' + signedNumber(day.delta_pH, 2) + '</td>'
      + '<td>' + signedNumber(day.delta_DO_pct, 1) + '</td>'
      + '<td>' + numberOrDash(day.PAR_bottom_mean, 1) + '</td>'
      + '<td>' + numberOrDash(day.bottom_PAR_ratio_mean, 2) + '</td>'
      + '<td>' + signedNumber(day.delta_EC_uScm, 0) + '</td>'
      + '<td>' + scorePills(day) + '</td>'
      + '<td>' + escapeHtml(day.summary_note || "-") + '</td>'
      + '</tr>';
  }).join("") || '<tr><td colspan="9">該当する日次データがありません</td></tr>';
}

function renderRecordsTable() {
  const rows = records.slice(-120).reverse();
  el.records.innerHTML = rows.map(function(record) {
    return '<tr>'
      + '<td><strong>' + escapeHtml(formatDateTime(record.observed_at)) + '</strong><br><span>' + escapeHtml(record.public_id || "") + '</span></td>'
      + '<td>' + escapeHtml(record.session || "") + '</td>'
      + '<td>' + numberOrDash(record.pH, 2) + '</td>'
      + '<td>' + numberOrDash(record.DO_mgL, 1) + ' mg/L<br><span>' + numberOrDash(record.DO_pct, 1) + ' %</span></td>'
      + '<td>上 ' + numberOrDash(record.PAR_air_mean, 1) + '<br>底 ' + numberOrDash(record.PAR_bottom_mean, 1) + '</td>'
      + '<td>' + escapeHtml([eventLabel(record.event_type), record.water_clarity, record.flow].filter(Boolean).join(" / ") || "-") + '</td>'
      + '</tr>';
  }).join("") || '<tr><td colspan="6">公開対象レコードがありません</td></tr>';
}

function renderIntradayDateOptions() {
  intradayDates = Array.from(new Set(records.filter(function(record) {
    return record.session === "other" && record.date;
  }).map(function(record) {
    return record.date;
  }))).sort().reverse();
  if (!intradayDates.length) {
    el.intradayDateSelect.disabled = true;
    el.intradayDateSelect.innerHTML = '<option value="">otherを含む日はありません</option>';
    return;
  }
  el.intradayDateSelect.disabled = false;
  el.intradayDateSelect.innerHTML = intradayDates.map(function(date) {
    return '<option value="' + escapeHtml(date) + '">' + escapeHtml(date) + '</option>';
  }).join("");
}

function renderIntraday() {
  if (!intradayDates.length) {
    el.intradayCharts.innerHTML = '<p class="empty">other を含む日はまだありません。</p>';
    el.intradayRecords.innerHTML = '<tr><td colspan="6">other を含む日はまだありません</td></tr>';
    return;
  }
  const selectedDate = intradayDates.includes(el.intradayDateSelect.value) ? el.intradayDateSelect.value : intradayDates[0];
  if (el.intradayDateSelect.value !== selectedDate) el.intradayDateSelect.value = selectedDate;
  const dayRecords = records.filter(function(record) {
    return record.date === selectedDate;
  }).sort(function(a, b) {
    return String(a.observed_at).localeCompare(String(b.observed_at));
  });
  el.intradayCharts.innerHTML = INTRADAY_METRICS.map(function(metric) {
    return chartPanel({
      title: metric.label,
      description: selectedDate + " / " + rangeText(dayRecords.map(function(record) { return record[metric.key]; })),
      svg: intradaySvg(dayRecords, metric)
    });
  }).join("");
  el.intradayRecords.innerHTML = dayRecords.map(function(record) {
    return '<tr>'
      + '<td><strong>' + escapeHtml(formatTime(record.observed_at)) + '</strong><br><span>' + escapeHtml(formatDateTime(record.observed_at)) + '</span></td>'
      + '<td>' + escapeHtml(record.session || "") + '</td>'
      + '<td>' + numberOrDash(record.pH, 2) + '</td>'
      + '<td>' + numberOrDash(record.DO_mgL, 1) + ' mg/L<br><span>' + numberOrDash(record.DO_pct, 1) + ' %</span></td>'
      + '<td>上 ' + numberOrDash(record.PAR_air_mean, 1) + '<br>底 ' + numberOrDash(record.PAR_bottom_mean, 1) + '</td>'
      + '<td>' + escapeHtml([eventLabel(record.event_type), record.water_clarity, record.flow].filter(Boolean).join(" / ") || "-") + '</td>'
      + '</tr>';
  }).join("");
}

function chartPanel(options) {
  return '<article class="chart-card">'
    + '<div class="chart-card-head"><div><h3>' + escapeHtml(options.title) + '</h3><p>' + escapeHtml(options.description || "") + '</p></div></div>'
    + options.svg
    + '</article>';
}

function timeSeriesSvg(rows, options) {
  const width = 920;
  const height = 300;
  const pad = { left: 56, right: options.includeRain ? 72 : 24, top: 28, bottom: 48 };
  const dates = rows.map(function(row) { return row.date; }).filter(Boolean);
  const points = [];
  options.series.forEach(function(series) {
    rows.forEach(function(row, index) {
      if (isFiniteNumber(row[series.key])) {
        points.push({ row: row, index: index, y: row[series.key], series: series });
      }
    });
  });
  if (!points.length || !dates.length) return emptySvg("対象データがまだありません", width, height);
  const yDomain = yDomainFor(points.map(function(point) { return point.y; }), options);
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const x = function(index) {
    return dates.length === 1 ? pad.left + plotWidth / 2 : pad.left + (index / (dates.length - 1)) * plotWidth;
  };
  const y = function(value) {
    return pad.top + (1 - ((value - yDomain.min) / (yDomain.max - yDomain.min || 1))) * plotHeight;
  };
  const ticks = [yDomain.min, yDomain.min + (yDomain.max - yDomain.min) / 2, yDomain.max];
  const dateTicks = dates.filter(function(_, index) {
    return dates.length <= 9 || index === 0 || index === dates.length - 1 || index % Math.ceil(dates.length / 6) === 0;
  });
  let html = '<svg class="chart" role="img" viewBox="0 0 ' + width + ' ' + height + '">';
  html += '<rect x="0" y="0" width="' + width + '" height="' + height + '" fill="transparent"></rect>';
  if (options.includeRain) html += rainBarsSvg(rows, dates, x, pad, width, height);
  html += ticks.map(function(tick) {
    return '<line x1="' + pad.left + '" x2="' + (width - pad.right) + '" y1="' + y(tick).toFixed(1) + '" y2="' + y(tick).toFixed(1) + '" class="grid-line"></line>'
      + '<text x="10" y="' + (y(tick) + 4).toFixed(1) + '" class="axis-label">' + escapeHtml(formatNumber(tick, 2)) + '</text>';
  }).join("");
  if (options.zeroLine && yDomain.min < 0 && yDomain.max > 0) {
    html += '<line x1="' + pad.left + '" x2="' + (width - pad.right) + '" y1="' + y(0).toFixed(1) + '" y2="' + y(0).toFixed(1) + '" class="zero-line"></line>';
  }
  html += dateTicks.map(function(date) {
    const index = dates.indexOf(date);
    return '<text x="' + x(index).toFixed(1) + '" y="' + (height - 18) + '" class="axis-label date-label" text-anchor="middle">' + escapeHtml(shortDate(date)) + '</text>';
  }).join("");
  options.series.forEach(function(series, seriesIndex) {
    const seriesPoints = rows.map(function(row, index) {
      return isFiniteNumber(row[series.key]) ? { row: row, index: index, y: row[series.key] } : null;
    }).filter(Boolean);
    const linePoints = seriesPoints.filter(function(point) {
      return point.row.measurement_confidence !== "poor";
    });
    const path = linePoints.length >= 2 ? linePoints.map(function(point, index) {
      return (index ? "L " : "M ") + x(point.index).toFixed(1) + " " + y(point.y).toFixed(1);
    }).join(" ") : "";
    if (path) html += '<path d="' + path + '" class="series-line ' + series.className + '"></path>';
    html += seriesPoints.map(function(point) {
      const title = point.row.date + " " + series.label + " " + formatNumber(point.y, 2) + " / " + eventLabel(point.row.event_type);
      return eventShape(point.row, x(point.index), y(point.y), "series-point " + series.className, title);
    }).join("");
    html += '<g class="chart-legend"><line x1="' + (pad.left + seriesIndex * 150) + '" x2="' + (pad.left + 22 + seriesIndex * 150) + '" y1="14" y2="14" class="series-line ' + series.className + '"></line><text x="' + (pad.left + 30 + seriesIndex * 150) + '" y="18" class="axis-label">' + escapeHtml(series.label) + '</text></g>';
  });
  html += '<text x="' + (width - pad.right) + '" y="' + (pad.top - 8) + '" text-anchor="end" class="axis-label">' + escapeHtml(options.yLabel || "") + '</text>';
  html += '</svg>';
  return html;
}

function rainBarsSvg(rows, dates, x, pad, width, height) {
  const values = rows.map(function(row, index) {
    return isFiniteNumber(row.amedas_precipitation_24h_07_jst_mm) ? { index: index, y: row.amedas_precipitation_24h_07_jst_mm, date: row.date } : null;
  }).filter(Boolean);
  if (!values.length) return "";
  const plotHeight = height - pad.top - pad.bottom;
  const maxRain = Math.max.apply(null, values.map(function(point) { return point.y; })) || 1;
  const barWidth = Math.max(7, Math.min(24, (width - pad.left - pad.right) / Math.max(dates.length * 2.8, 1)));
  return values.map(function(point) {
    const barHeight = Math.max(0, (point.y / maxRain) * plotHeight);
    const top = height - pad.bottom - barHeight;
    return '<rect x="' + (x(point.index) - barWidth / 2).toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + barWidth.toFixed(1) + '" height="' + barHeight.toFixed(1) + '" class="rain-bar"><title>' + escapeHtml(point.date + " 07:00時点24h雨量 " + formatNumber(point.y, 1) + " mm") + '</title></rect>';
  }).join("")
    + '<text x="' + (width - 8) + '" y="18" class="axis-label rain-axis-label" text-anchor="end">24h雨量</text>';
}

function scatterSvg(rows, options) {
  const width = 420;
  const height = 300;
  const pad = { left: 58, right: 20, top: 18, bottom: 48 };
  const points = rows.map(function(row) {
    return { row: row, x: row[options.xKey], y: row[options.yKey] };
  }).filter(function(point) {
    return isFiniteNumber(point.x) && isFiniteNumber(point.y);
  });
  if (!points.length) return '<text x="24" y="48" class="axis-label">対象データがまだありません</text>';
  const xDomain = yDomainFor(points.map(function(point) { return point.x; }), { yMin: 0 });
  const yDomain = yDomainFor(points.map(function(point) { return point.y; }), { zeroLine: true });
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const x = function(value) {
    return pad.left + ((value - xDomain.min) / (xDomain.max - xDomain.min || 1)) * plotWidth;
  };
  const y = function(value) {
    return pad.top + (1 - ((value - yDomain.min) / (yDomain.max - yDomain.min || 1))) * plotHeight;
  };
  const ticks = [yDomain.min, yDomain.min + (yDomain.max - yDomain.min) / 2, yDomain.max];
  let html = '<rect x="0" y="0" width="' + width + '" height="' + height + '" fill="transparent"></rect>';
  html += ticks.map(function(tick) {
    return '<line x1="' + pad.left + '" x2="' + (width - pad.right) + '" y1="' + y(tick).toFixed(1) + '" y2="' + y(tick).toFixed(1) + '" class="grid-line"></line>'
      + '<text x="8" y="' + (y(tick) + 4).toFixed(1) + '" class="axis-label">' + escapeHtml(formatNumber(tick, 2)) + '</text>';
  }).join("");
  if (yDomain.min < 0 && yDomain.max > 0) {
    html += '<line x1="' + pad.left + '" x2="' + (width - pad.right) + '" y1="' + y(0).toFixed(1) + '" y2="' + y(0).toFixed(1) + '" class="zero-line"></line>';
  }
  html += points.map(function(point) {
    const title = point.row.date + " / " + eventLabel(point.row.event_type) + " / " + options.xLabel + " " + formatNumber(point.x, 1) + " / " + options.yLabel + " " + formatNumber(point.y, 2);
    return eventShape(point.row, x(point.x), y(point.y), "series-point", title);
  }).join("");
  html += '<text x="' + pad.left + '" y="' + (height - 14) + '" class="axis-label">' + escapeHtml(options.xLabel) + '</text>';
  html += '<text x="' + (width - 8) + '" y="16" text-anchor="end" class="axis-label">' + escapeHtml(options.yLabel) + '</text>';
  return html;
}

function intradaySvg(dayRecords, metric) {
  const width = 920;
  const height = 210;
  const pad = { left: 58, right: 24, top: 16, bottom: 38 };
  const points = dayRecords.map(function(record) {
    return { row: record, x: new Date(record.observed_at).getTime(), y: record[metric.key] };
  }).filter(function(point) {
    return Number.isFinite(point.x) && isFiniteNumber(point.y);
  });
  if (!points.length) return emptySvg("この日の記録はありません", width, height);
  const minX = Math.min.apply(null, points.map(function(point) { return point.x; }));
  const maxX = Math.max.apply(null, points.map(function(point) { return point.x; }));
  const yDomain = yDomainFor(points.map(function(point) { return point.y; }), { zeroLine: false });
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const x = function(value) {
    return minX === maxX ? pad.left + plotWidth / 2 : pad.left + ((value - minX) / (maxX - minX)) * plotWidth;
  };
  const y = function(value) {
    return pad.top + (1 - ((value - yDomain.min) / (yDomain.max - yDomain.min || 1))) * plotHeight;
  };
  const path = points.length >= 2 ? points.map(function(point, index) {
    return (index ? "L " : "M ") + x(point.x).toFixed(1) + " " + y(point.y).toFixed(1);
  }).join(" ") : "";
  let html = '<svg class="chart chart-short" role="img" viewBox="0 0 ' + width + ' ' + height + '">';
  html += '<rect x="0" y="0" width="' + width + '" height="' + height + '" fill="transparent"></rect>';
  [yDomain.min, yDomain.min + (yDomain.max - yDomain.min) / 2, yDomain.max].forEach(function(tick) {
    html += '<line x1="' + pad.left + '" x2="' + (width - pad.right) + '" y1="' + y(tick).toFixed(1) + '" y2="' + y(tick).toFixed(1) + '" class="grid-line"></line>';
    html += '<text x="8" y="' + (y(tick) + 4).toFixed(1) + '" class="axis-label">' + escapeHtml(formatNumber(tick, 2)) + '</text>';
  });
  if (path) html += '<path d="' + path + '" class="series-line intraday-line"></path>';
  html += points.map(function(point) {
    const title = formatTime(point.row.observed_at) + " " + (point.row.session || "") + " / " + formatNumber(point.y, 2);
    return sessionShape(point.row, x(point.x), y(point.y), "series-point", title);
  }).join("");
  html += '<text x="' + pad.left + '" y="' + (height - 12) + '" class="axis-label">' + escapeHtml(formatTime(new Date(minX).toISOString())) + '</text>';
  html += '<text x="' + (width - 74) + '" y="' + (height - 12) + '" class="axis-label">' + escapeHtml(formatTime(new Date(maxX).toISOString())) + '</text>';
  html += '</svg>';
  return html;
}

function emptySvg(message, width, height) {
  return '<svg class="chart" role="img" viewBox="0 0 ' + width + ' ' + height + '"><text x="24" y="48" class="axis-label">' + escapeHtml(message) + '</text></svg>';
}

function eventShape(row, cx, cy, className, title) {
  const event = eventClass(row.event_type);
  const confidence = row.measurement_confidence === "poor" ? " point-poor" : row.measurement_confidence === "usable" ? " point-usable" : "";
  return shapeSvg(event, cx, cy, className + " " + event + confidence, title);
}

function sessionShape(row, cx, cy, className, title) {
  const session = row.session === "afternoon" ? "session-afternoon" : row.session === "other" ? "session-other" : "session-morning";
  return shapeSvg(session, cx, cy, className + " " + session, title);
}

function shapeSvg(kind, cx, cy, className, title) {
  const safeTitle = '<title>' + escapeHtml(title) + '</title>';
  if (kind === "event-rain-turbid" || kind === "session-afternoon") {
    return '<rect x="' + (cx - 5).toFixed(1) + '" y="' + (cy - 5).toFixed(1) + '" width="10" height="10" class="' + className + '">' + safeTitle + '</rect>';
  }
  if (kind === "event-rain-scour") {
    return '<path d="M ' + cx.toFixed(1) + ' ' + (cy - 6).toFixed(1) + ' L ' + (cx + 6).toFixed(1) + ' ' + (cy + 5).toFixed(1) + ' L ' + (cx - 6).toFixed(1) + ' ' + (cy + 5).toFixed(1) + ' Z" class="' + className + '">' + safeTitle + '</path>';
  }
  if (kind === "event-human-input-suspected" || kind === "session-other") {
    return '<path d="M ' + cx.toFixed(1) + ' ' + (cy - 6).toFixed(1) + ' L ' + (cx + 6).toFixed(1) + ' ' + cy.toFixed(1) + ' L ' + cx.toFixed(1) + ' ' + (cy + 6).toFixed(1) + ' L ' + (cx - 6).toFixed(1) + ' ' + cy.toFixed(1) + ' Z" class="' + className + '">' + safeTitle + '</path>';
  }
  if (kind === "event-unknown") {
    return '<path d="M ' + (cx - 5).toFixed(1) + ' ' + (cy - 5).toFixed(1) + ' L ' + (cx + 5).toFixed(1) + ' ' + (cy + 5).toFixed(1) + ' M ' + (cx + 5).toFixed(1) + ' ' + (cy - 5).toFixed(1) + ' L ' + (cx - 5).toFixed(1) + ' ' + (cy + 5).toFixed(1) + '" class="' + className + '">' + safeTitle + '</path>';
  }
  return '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="5" class="' + className + '">' + safeTitle + '</circle>';
}

function yDomainFor(values, options) {
  const finite = values.filter(isFiniteNumber);
  let min = options && typeof options.yMin === "number" ? options.yMin : Math.min.apply(null, finite);
  let max = options && typeof options.yMax === "number" ? options.yMax : Math.max.apply(null, finite);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1 };
  if (options && options.zeroLine) {
    min = Math.min(min, 0);
    max = Math.max(max, 0);
  }
  if (min === max) {
    min -= 1;
    max += 1;
  } else if (!(options && (typeof options.yMin === "number" || typeof options.yMax === "number"))) {
    const pad = (max - min) * 0.12;
    min -= pad;
    max += pad;
  }
  return { min: min, max: max };
}

function latestDailyMetric() {
  for (let index = dailyMetrics.length - 1; index >= 0; index -= 1) {
    if (dailyMetrics[index].data_status === "complete") return dailyMetrics[index];
  }
  return dailyMetrics[dailyMetrics.length - 1] || null;
}

function scorePills(day) {
  const scores = [
    ["視", day.bed_visibility_score],
    ["藻", day.visual_algae_score],
    ["泥", day.mud_cover_score],
    ["裸", day.bare_stone_score]
  ];
  return '<div class="score-pills">' + scores.map(function(item) {
    return '<span>' + escapeHtml(item[0]) + ' ' + numberOrDash(item[1], 1) + '</span>';
  }).join("") + '</div>';
}

function eventLabel(value) {
  return EVENT_LABELS[value] || value || "判定不能";
}

function eventClass(value) {
  return "event-" + String(value || "unknown").replace(/_/g, "-").replace(/[^a-z0-9-]/gi, "").toLowerCase();
}

function signedNumber(value, digits) {
  if (!isFiniteNumber(value)) return "-";
  const fixed = Number(value).toLocaleString("ja-JP", { maximumFractionDigits: digits, minimumFractionDigits: digits });
  return value > 0 ? "+" + fixed : fixed;
}

function numberOrDash(value, digits) {
  return isFiniteNumber(value) ? formatNumber(value, digits) : "-";
}

function formatNumber(value, digits) {
  const options = { maximumFractionDigits: typeof digits === "number" ? digits : 2 };
  if (typeof digits === "number" && digits > 0) options.minimumFractionDigits = 0;
  return Number(value).toLocaleString("ja-JP", options);
}

function rangeText(values) {
  const finite = values.filter(isFiniteNumber);
  if (!finite.length) return "データなし";
  const min = Math.min.apply(null, finite);
  const max = Math.max.apply(null, finite);
  return min === max ? formatNumber(min, 2) : formatNumber(min, 2) + " - " + formatNumber(max, 2);
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "";
  return date.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", dateStyle: "medium", timeStyle: "short" });
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "";
  return date.toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" });
}

function shortDate(value) {
  return value ? value.slice(5).replace("-", "/") : "";
}

function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, function(char) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char];
  });
}
