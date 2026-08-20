# 大栗川 Water Observatory

大栗川で行っている水質・光環境の市民観測データ公開リポジトリです。

## 目的

このデータセットは、河川の溶存酸素（DO）、pH、光環境（PAR）などの観測を継続的に公開し、日照・雨後・濁り・流況と水中の一次生産応答の関係をあとから検証できる形で残すことを目的としています。

## 公開データ

- 公開対象: pH、DO、PAR の最低限の測定値が揃った記録
- AMeDAS日照時間から推定した全天日射量と、推定PAR日積算も公開
- 除外対象: 登録システムの内部ID、operator、自由記述メモ、写真ID、削除済み記録、過去revision
- 最新生成: 2026-08-21T00:03:22+09:00
- 公開レコード数: 124
- 期間: 2026-06-23 から 2026-08-20

## ファイル

- `data/observations.jsonl`: 1行1記録の公開データ
- `data/observations.json`: GitHub Pages ダッシュボード用JSON
- `data/observations.csv`: 測定回ごとのCSV
- `data/daily_metrics.json`: 朝午後差分などの日次指標JSON
- `data/daily_metrics.csv`: 朝午後差分などの日次指標CSV
- `data/derived/interval_budget.csv`: 区間別の酸素収支（dC/dt・再曝気・NEP・誤差）
- `data/derived/co2_budget_daily.csv`: 日次の炭素収支（pCO2・DIC・放出量・炭素法NEP）
- `data/derived/co2_source_sink_daily.csv`: その日が炭素の発生源か吸収源かの判定
- `data/derived/night_R_by_date.csv`: 日没後の減衰から求めた呼吸速度
- `data/derived/k_profile.csv`: 再曝気係数の残差プロファイル（推定の不確かさ）
- `data/summary.json`: 件数・期間・主要項目の集計
- `data/data-dictionary.md`: フィールド定義

## 公開ページ

- トップ: https://hiroshi75.github.io/ohgurigawa-water-observatory/
- 日々の最新情報: https://hiroshi75.github.io/ohgurigawa-water-observatory/daily.html
- 月報コーナー: https://hiroshi75.github.io/ohgurigawa-water-observatory/monthly/

トップページは観測の概要と最新状態、日々の最新情報ページは1時間ごとに自動更新されるダッシュボード、月報コーナーは1か月分をまとめた確定版の読み物です。月報の本文は `lambda/public-publisher/index.js` の `monthlyReports()` が保持しており、日次データの更新では書き換わりません。

## ライセンス

データ利用条件は未確定です。引用・再利用したい場合は、このリポジトリのownerに確認してください。
