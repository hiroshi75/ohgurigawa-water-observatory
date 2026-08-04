const cardsEl = document.querySelector("#latest-cards");
const commentEl = document.querySelector("#latest-comment");

init().catch(function(error) {
  if (cardsEl) cardsEl.innerHTML = '<article class="latest-card"><span>最新データ</span><strong>読み込めませんでした</strong><small>' + esc(error.message) + '</small></article>';
});

async function init() {
  const responses = await Promise.all([
    fetch("data/daily_metrics.json"),
    fetch("data/summary.json")
  ]);
  const days = ((await responses[0].json()).records || []).sort(function(a, b) {
    return String(a.date).localeCompare(String(b.date));
  });
  const summary = await responses[1].json();
  const latest = latestComplete(days);
  if (!latest) return;

  const cards = [
    { label: "最新観察日", value: latest.date, sub: latest.recovery_phase_label || "" },
    { label: "きょうの川の様子", value: latest.event_label || "-", sub: "イベント判定" },
    { label: "pHの日中上昇", value: signed(latest.delta_pH, 2), sub: "朝から午後" },
    { label: "酸素飽和度の日中上昇", value: signed(latest.delta_DO_pct, 1) + " pt", sub: "朝から午後" },
    { label: "推定全天日射量", value: num(latest.amedas_global_solar_estimated_day_MJ_m2, 1), sub: "MJ/m²/day" },
    { label: "公開レコード数", value: String(summary.public_record_count || ""), sub: (summary.date_start || "") + " から" }
  ];
  cardsEl.innerHTML = cards.map(function(card) {
    return '<article class="latest-card"><span>' + esc(card.label) + '</span><strong>' + esc(card.value) + '</strong><small>' + esc(card.sub) + '</small></article>';
  }).join("");
  if (commentEl) commentEl.textContent = latest.summary_note || "";
}

function latestComplete(days) {
  for (let index = days.length - 1; index >= 0; index -= 1) {
    if (days[index].data_status === "complete") return days[index];
  }
  return days[days.length - 1] || null;
}

function signed(value, digits) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  const fixed = value.toLocaleString("ja-JP", { maximumFractionDigits: digits, minimumFractionDigits: digits });
  return value > 0 ? "+" + fixed : fixed;
}

function num(value, digits) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return value.toLocaleString("ja-JP", { maximumFractionDigits: digits });
}

function esc(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, function(char) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
  });
}
