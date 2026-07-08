# 大栗川 Water Observatory

大栗川で行っている水質・光環境の市民観測データ公開リポジトリです。

## 目的

このデータセットは、河川の溶存酸素（DO）、pH、光環境（PAR）などの観測を継続的に公開し、日照・雨後・濁り・流況と水中の一次生産応答の関係をあとから検証できる形で残すことを目的としています。

## 公開データ

- 公開対象: pH、DO、PAR の最低限の測定値が揃った記録
- AMeDAS日照時間から推定した全天日射量と、推定PAR日積算も公開
- 除外対象: 登録システムの内部ID、operator、自由記述メモ、写真ID、削除済み記録、過去revision
- 最新生成: 2026-07-08T19:02:50+09:00
- 公開レコード数: 31
- 期間: 2026-06-23 から 2026-07-08

## ファイル

- `data/observations.jsonl`: 1行1記録の公開データ
- `data/observations.json`: GitHub Pages ダッシュボード用JSON
- `data/observations.csv`: 測定回ごとのCSV
- `data/daily_metrics.json`: 朝午後差分などの日次指標JSON
- `data/daily_metrics.csv`: 朝午後差分などの日次指標CSV
- `data/summary.json`: 件数・期間・主要項目の集計
- `data/data-dictionary.md`: フィールド定義

## ダッシュボード

GitHub Pages を有効にすると、このリポジトリのルートから簡易ダッシュボードを表示できます。

## ライセンス

データ利用条件は未確定です。引用・再利用したい場合は、このリポジトリのownerに確認してください。
