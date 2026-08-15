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
| `amedas_sunshine_day_h` | その日のAMeDAS日照時間（府中・八王子平均）h |
| `amedas_global_solar_estimated_day_MJ_m2` | 東京の長期データで推定した月別係数を府中・八王子の日照時間に適用した推定全天日射量 MJ/m2/day |
| `amedas_surface_PAR_estimated_day_mol_m2` | 推定全天日射量から換算した地表付近PAR日積算 mol/m2/day |
| `amedas_bottom_PAR_estimated_day_mol_m2` | 推定地表PAR日積算に川底光到達率を掛けた川底PAR日積算 proxy mol/m2/day |
| `amedas_global_solar_estimated_day` | 推定全天日射量の計算メタデータ |
| `depth_cm` | 水深 cm |
| `measured_depth_cm` | 測定できた水深 cm |
| `bank_to_water_surface_cm` | 岸の基準位置から水面までの距離 cm。小さいほど水面が高い。`depth_cm` と組み合わせると水位変化と川底の砂利厚さの変化を切り分けられる。2026年8月の項目追加以前の記録では未測定のため空 |
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

- `data/daily_metrics.json` / `data/daily_metrics.csv`: morning と afternoon を日付で結合し、`delta_pH`、`delta_DO_pct`、`delta_EC_uScm`、`delta_water_temp_C`、川底PAR平均、雨後フェーズ、簡易イベントコメントを計算した日次データです。
- `water_temp_morning_C` / `water_temp_afternoon_C` / `delta_water_temp_C`: 朝・午後の水温と、その日中変化 ℃。溶存酸素飽和度の解釈に用います。
- `data/observations.csv`: `observations.jsonl` と同じ公開対象レコードをCSVにしたものです。

## Metabolism Derived Files (data/derived/)

観測値から計算した代謝量です。計算は `metabolism-processor` が日次で行っています。
再曝気係数 `k` は午後の測定ペアについて dC/dt を酸素飽和差に回帰した傾きとして推定しており、
NEP はその `k` で再曝気ぶんを差し引いた残差です。

### `data/derived/interval_budget.csv`

連続する2測定の間ごとの酸素収支。`NEP = dCdt − reaeration`。

| field | description |
| --- | --- |
| `date` | JST日付 |
| `t0` / `t1` | 区間の開始・終了時刻 JST |
| `dt_h` | 区間長 h |
| `DO0` / `DO1` | 区間両端の溶存酸素 mg/L |
| `dCdt` | 溶存酸素の変化速度 mg/L/h |
| `deficit_mean` | 区間平均の酸素飽和差（飽和濃度 − 実測）mg/L |
| `temp_mean` | 区間平均水温 ℃ |
| `elev0` / `elev1` | 区間両端の太陽高度 度 |
| `shade_onset_h` | 対岸樹林で日影に入る時刻（JST小数時、太陽高度26.6度） |
| `sunset_h` | 日没時刻 JST小数時 |
| `fully_dark` | 区間全体が太陽高度 −0.833度未満か |
| `reaeration` | 再曝気による酸素供給速度 `k × deficit_mean` mg/L/h |
| `NEP` | 正味生態系生産 mg O2/L/h。正なら生産超過、負なら分解超過 |
| `rate_sigma` | DO計の分解能0.1 mg/Lに由来する速度の1σ mg/L/h |

### `data/derived/co2_budget_daily.csv`

朝と午後のpH・水温から炭酸平衡を解いた日次の炭素収支。

**重要な制約: アルカリ度は未測定です。** 炭酸平衡を解くには pH・水温に加えて
アルカリ度が必要ですが、正確な滴定をまだ実施できていません（簡易試験紙は
必要な精度に届かないことが判明したため使用していません）。
**代替として使っている値:** 酸素側の生産量を炭素側の生産量に回帰した傾きが 1.00 になるアルカリ度を
逆算し、`alk_meq_used` = **1.388 meq/L（69.5 mg/L as CaCO₃、3.89 dKH）** を全期間に適用しています。
`_lo` / `_hi` の 1.12〜1.69 meq/L（56〜85 mg/L as CaCO₃）は、この逆算のブートストラップ95%信頼区間です。
傍証として、電気伝導度 264 µS/cm からの経験推定 1.58 meq/L（79 mg/L）と、滴定手順書に記載した
想定値 85 mg/L が同じ範囲を指しています。ただしこれらも実測ではなく、いずれも測定値の代わりにはなりません。

簡易試験紙（n = 6）は 52〜177 mg/L as CaCO₃ と 3.4 倍ばらつき、電気伝導度との相関も r = 0.57 と低いため
採用していません。

このため以下の点に注意してください。

- `pCO2_*`、`DIC_*`、`F_evasion`、`NEP_C` などの**絶対値は引用に適しません**。
  アルカリ度の仮定に比例して動きます。`_lo` / `_hi` は 1.12〜1.69 meq/L に対応する範囲です。
- `NEP_C` と `NEP_O2_C` が同程度の大きさになることは、**この手法の検証結果ではありません**。
  そうなるようにアルカリ度を選んでいるためです。両者の相関係数はアルカリ度を
  0.8〜4.0 meq/L で動かしてもほぼ変わらず（0.85〜0.86）、相関の高さは仮定の妥当性を示しません。
- 日ごとの相対的な増減や、朝と午後のどちらが高いかという向きの比較は、
  同じ仮定を全日に適用しているため比較的頑健です。
- アルカリ度が観測期間中に変動していた場合、日ごとの比較も成立しません。この点は未検証です。

| field | description |
| --- | --- |
| `alk_meq_used` | 計算に用いた全アルカリ度 meq/L。**実測値ではなく、酸素収支から逆算した代替値 1.388（= 69.5 mg/L as CaCO₃）** |
| `dt_h` | 朝から午後までの経過時間 h |
| `depth_m` | 平均水深 m |
| `pCO2_am` / `pCO2_pm` | 朝・午後の二酸化炭素分圧 μatm |
| `pCO2_am_lo` / `_hi` | アルカリ度の不確かさに対応する朝のpCO2範囲 μatm |
| `pCO2_pm_lo` / `_hi` | 同じく午後のpCO2範囲 μatm |
| `DIC_am` / `DIC_pm` | 朝・午後の溶存無機炭素 mgC/L |
| `dDIC` | 溶存無機炭素の変化速度 mgC/L/h |
| `F_evasion` | 大気へのCO2放出速度 mgC/L/h |
| `NEP_C` | 炭素法による正味生態系生産 mgC/L/h |
| `NEP_O2` | 酸素法による正味生態系生産 mg O2/L/h |
| `NEP_O2_C` | 酸素法NEPを炭素当量に換算した値 mgC/L/h |
| `NEP_C_areal` | 単位面積あたりの炭素法NEP mgC/m2/h |
| `F_evas_areal` | 単位面積あたりのCO2放出速度 mgC/m2/h |

### `data/derived/co2_source_sink_daily.csv`

その日が大気に対する炭素の発生源か吸収源かの判定。

| field | description |
| --- | --- |
| `daylen` | 日長 h |
| `F_night_mgC_m2_h` | 夜間のCO2放出速度 mgC/m2/h |
| `F_day_mgC_m2_h` | 日中のCO2放出速度 mgC/m2/h。負なら吸収 |
| `day_is_sink` | 日中の CO2 フラックスが負（大気から水中へ）だったか。真なら日中は CO2 の吸収側 |
| `E24_mgC_m2_day` | 24時間の正味CO2放出量 mgC/m2/day |
| `NEP24_mgC_m2_day` | 24時間の正味生態系生産 mgC/m2/day |

### `data/derived/night_R_by_date.csv`

日没後の溶存酸素減衰から求めた呼吸速度。現場のDO計は0.1 mg/L刻みですが、
飽和度と水温から高分解能の値を復元して使っています。
`R_k0135` と `R_k055` は `k` の取り方を変えた場合の値で、両者の開きが
`k` の不確かさが呼吸速度推定に与える影響の大きさを示します。

| field | description |
| --- | --- |
| `span` | 使用した測定時刻の範囲 |
| `n_pts` | 使用した測定点数 |
| `dCdt` | 夜間の溶存酸素変化速度 mg/L/h |
| `deficit_mean` | 平均酸素飽和差 mg/L |
| `temp` | 平均水温 ℃ |
| `R_k0135` | k=0.135/h としたときの呼吸速度 mg O2/L/h |
| `R_k055` | k=0.55/h としたときの呼吸速度 mg O2/L/h |
| `dpH` / `dpH_per_h` | 夜間のpH変化と時間あたり変化 |
| `afternoon_DOpct` | その日の午後の最大酸素飽和度 % |

### `data/derived/k_profile.csv`

再曝気係数 `k` を固定して呼吸速度 `R` を当てはめたときの残差プロファイルです。
このファイルは推定の不確かさそのものを示すために公開しています。残差は
`k` の中間で最小になり両端で大きくなるU字ですが、谷が浅いため `k` と `R` は
強く縮退しており、`k` を一意に決めることはできません。
`R` の値を引用する際は、必ずどの `k` を仮定した値かを併記してください。

| field | description |
| --- | --- |
| `k` | 固定した再曝気係数 /h |
| `R` | その `k` のもとで最適な呼吸速度 mg O2/L/h |
| `ssq` | 残差平方和 |
| `rms` | 残差の二乗平均平方根 mg/L |
