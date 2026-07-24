# RiverNote MVP 設計

## 画面構成

1. `/upload` — PokerCraft CSV/TXTの選択・端末内解析
2. `/dashboard` — VPIP/PFR/3BET/CBET/Fold to CBET、収支、ポジション別成績
3. `/improvements` — 判断スコア順の改善候補と復習保存
4. `/hands/[id]` — テーブルリプレイ、アクション履歴、Fold/Call/Raise推奨頻度、日本語解説

## データフロー

`File → parser.ts → Hand[] → analyzer.ts → React Context → localStorage / Supabase`

MVPは認証情報なしでもローカル完結します。Supabase接続時は `sessions` と `hands` にユーザー単位で保存します。基準レンジは将来 `range_profiles` テーブルに分離し、ゲーム人数・スタック・オープン位置でバージョン管理します。

## 解析ルール

- VPIP: プリフロップでHeroがCallまたはRaise
- PFR: プリフロップでHeroがRaise
- 3BET: 先行Raise後にHeroが再Raise
- CBET: プリフロップアグレッサーのフロップBet（簡易版はHeroのFlop Bet）
- Fold to CBET: CBET機会にHeroがFold（簡易版はHeroのFlop Fold）
- 改善候補: 基準レンジとの乖離、損失、難しいポストフロップ判断からスコア化

## 開発手順

1. `pnpm install`
2. `.env.example` を `.env.local` にコピー（Supabaseを使う場合のみ入力）
3. Supabase SQL Editorで `supabase/schema.sql` を実行
4. `pnpm dev` でローカル確認
5. 実際のPokerCraftエクスポート列名に合わせて `lib/parser.ts` のマッピングを調整
6. 実データの期待値テスト、基準レンジの精緻化、認証と永続化を追加

公開・デプロイ手順は意図的に含めていません。
