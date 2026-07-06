# Data Dictionary

| field | description |
| --- | --- |
| `public_id` | Internal record IDから生成した公開用ハッシュID |
| `observed_at` | 観測日時（ISO 8601） |
| `date` | JST日付 |
| `time_jst` | JST時刻 |
| `session` | morning / afternoon / other |
| `location_label` | 公開用地点名 |
| `pH` | pH |
| `DO_mgL` | 溶存酸素 mg/L |
| `DO_pct` | 溶存酸素 飽和度 % |
| `DO_temp_C` | DO計の水温 ℃ |
| `water_temp_C` | 水温 ℃ |
| `EC_uScm` | 電気伝導度 μS/cm |
| `PAR_air` | 水面上PARの反復測定配列 |
| `PAR_air_mean` | 水面上PAR平均 |
| `PAR_bottom` | 川底近くPARの反復測定配列 |
| `PAR_bottom_mean` | 川底近くPAR平均 |
| `PAR_subsurface` | 水面直下PARの反復測定配列 |
| `PAR_subsurface_mean` | 水面直下PAR平均 |
| `bottom_PAR_ratio` | 川底近くPAR / 水面上PAR |
| `amedas_precipitation_24h_07_jst_mm` | その日07:00 JSTを終端にした直近24時間AMeDAS雨量（府中・八王子平均）mm |
| `amedas_precipitation_24h_07_jst` | 07:00 JST直近24時間雨量の計算メタデータ |
| `depth_cm` | 水深 cm |
| `measured_depth_cm` | 測定できた水深 cm |
| `water_level` | 水位の観察カテゴリ |
| `flow` | 流速の観察カテゴリ |
| `water_clarity` | 透明度カテゴリ |
| `bed_visibility` | 川底視認カテゴリ |
| `bed_visibility_score` | 川底の見え方 0-3 |
| `visual_algae` | 藻類・膜の見え方カテゴリ |
| `visual_algae_score` | 藻類・膜の見え方 0-3 |
| `mud_cover` | 泥被覆カテゴリ |
| `mud_cover_score` | 泥被覆 0-3 |
| `bare_stone` | 裸石感カテゴリ |
| `bare_stone_score` | 裸石感 0-3 |
| `odor` | 異臭 |
| `foam` | 泡 |
| `turbidity_direction` | 濁りの入り方 |
| `event_type` | 観察時のイベント型 |
| `measurement_confidence` | 測定信頼度 |

## Derived Files

- `data/daily_metrics.json` / `data/daily_metrics.csv`: morning と afternoon を日付で結合し、`delta_pH`、`delta_DO_pct`、`delta_EC_uScm`、川底PAR平均、雨後フェーズ、簡易イベントコメントを計算した日次データです。
- `data/observations.csv`: `observations.jsonl` と同じ公開対象レコードをCSVにしたものです。
