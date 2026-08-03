<div align="center">

# PlanForge FE

**ホテル運営者・フロントデスク向け Web UI**

予約からナイトオーディット・実績まで、現場で実際に使う画面。データはすべてサーバー
コンポーネントから BE を呼び出して取得します。

[한국어](README.md) · [English](README.en.md) · [中文](README.zh.md) · **日本語**

![TSX](https://img.shields.io/badge/TSX-67.0%25-61DAFB?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-26.2%25-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Markdown](https://img.shields.io/badge/Markdown-1.7%25-083FA1?style=flat-square)
![YAML](https://img.shields.io/badge/YAML-1.3%25-CB171E?style=flat-square)
![CSS](https://img.shields.io/badge/CSS-0.9%25-1572B6?style=flat-square&logo=css3&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-0.5%25-2496ED?style=flat-square&logo=docker&logoColor=white)

</div>

---

## プロジェクト背景

ホテルのフロントは**ひとつの画面で複数の仕事を同時にこなします。** 客が目の前に立っている間に
予約を探し、客室を割り当て、カードを発行し、決済を受けます。そのためこの UI は華やかさよりも
**いま何がどうなっているかがはっきり見えること**を優先しています。

三つの原則で作りました。

**サーバーコンポーネント優先** —— データはすべてサーバーで取得します。クライアント
コンポーネントはフォーム状態が必要な箇所にのみ置きます。`cache: 'no-store'` で常に最新を見て、
BE が応答しなくてもルートは落ちず、画面にエラー案内が表示されます。

**結果を隠さない** —— OPERA や決済代行が拒否したら、その理由をそのまま見せます。「処理に失敗
しました」しか出ない画面では、フロントは何を直せばよいか分かりません。

**モックモードを隠さない** —— 施錠装置と決済がモックで動いていれば、画面がその事実を伝えます。
カードが発行されたと信じているのに客室に入れない状況を防ぎます。

### プラットフォーム構成

| リポジトリ                                                                            | 役割                                  |
| ------------------------------------------------------------------------------------- | ------------------------------------- |
| **PlanForge-Package-FE**                                                              | **運営・フロントデスク Web UI**       |
| [PlanForge-Package-BE](https://github.com/PlanForge-Package/PlanForge-Package-BE)     | 業務ロジック・自前データベース        |
| [PlanForge-Package-Core](https://github.com/PlanForge-Package/PlanForge-Package-Core) | Oracle OPERA（OHIP）連携 API サーバー |

呼び出し経路：`FE → BE → Core → OPERA Cloud (OHIP)`

---

## 言語とスタック

| 区分           | 技術                                                             |
| -------------- | ---------------------------------------------------------------- |
| 言語           | TypeScript 5.9（strict）                                         |
| フレームワーク | Next.js 15（App Router・サーバーコンポーネント・Server Actions） |
| UI             | React 19                                                         |
| スタイル       | Tailwind CSS 4（`@theme` トークン・ダークモード対応）            |
| 状態           | `useActionState` —— 別途の状態ライブラリなし                     |
| 認証           | httpOnly Cookie + ミドルウェア + レイアウトガード                |
| 品質           | ESLint・Prettier・GitHub Actions                                 |
| デプロイ       | Docker（standalone 出力・非 root 実行）                          |
| パッケージ管理 | pnpm 9                                                           |

### デザイントークン

```css
--color-ink: #333d4b /* 本文 */ --color-muted: #8b95a1 /* 補助テキスト */ --color-brand: #3182f6
  /* ボタン */ --color-brand-hover: #2272eb /* ボタンホバー */;
```

---

## ディレクトリ構成

```
src/
├── app/
│   ├── login/                    ログイン（公開）
│   ├── logout/route.ts           Cookie の削除 —— ルートハンドラーでのみ可能
│   └── (app)/                    要認証 —— レイアウトが requireUser() を呼ぶ
│       ├── page.tsx              ダッシュボード
│       ├── reservations/         一覧・新規・詳細（変更・チェックイン・フォリオ・キー・決済）
│       ├── blocks/               団体ブロック・詳細（割当グリッド・ルーミングリスト）
│       ├── profiles/             ゲスト検索・詳細（履歴・重複統合）
│       ├── rooms/                客室ステータス
│       ├── housekeeping/         作業割当・進捗・不一致
│       ├── night-audit/          締めチェックリスト・ノーショー
│       ├── reports/              稼働率・ADR・RevPAR・チャネル別内訳
│       ├── pos-outlets/          POS アウトレットキー管理
│       ├── users/                アカウント管理（管理者）
│       └── account/              マイアカウント
├── components/
│   ├── action-feedback.tsx       ActionMessage・SubmitButton（送信中は無効化）
│   ├── nav.tsx                   役割別メニュー・ホテル切替
│   ├── booking-form.tsx          在庫選択 → ゲスト情報 → 予約
│   ├── front-desk.tsx            チェックイン・チェックアウト
│   ├── folio-panel.tsx           フォリオ・取引登録
│   ├── payment-panel.tsx         オーソリ・売上確定・取消・返金
│   ├── room-key-panel.tsx        カード発行・無効化
│   ├── block-form.tsx            ブロック作成・変更
│   ├── profile-editor.tsx        嗜好・会員・メモ・統合
│   ├── outlet-admin.tsx          POS アウトレット発行・再発行
│   ├── housekeeping-board.tsx    作業割当・進捗
│   ├── night-audit-board.tsx     チェックリスト・ノーショー
│   └── notice.tsx                ErrorNotice・InfoNotice・EmptyState
├── lib/
│   ├── api.ts                    apiFetch（サーバー専用）・ApiError・tryFetch
│   ├── action-state.ts           ActionState・失敗時に入力値を保持
│   ├── auth.ts                   requireUser・logoutUrl
│   ├── property.ts               選択中ホテルのコンテキスト
│   ├── types.ts                  BE レスポンス型
│   ├── channel-labels.ts         予約経路コードの表示名
│   └── profile-labels.ts         嗜好コードの表示名
└── middleware.ts                 Cookie がなければ /login へ
```

---

## 実行方法

### 必要環境

- Node.js 20.11 以上
- pnpm 9
- 起動中の [PlanForge BE](https://github.com/PlanForge-Package/PlanForge-Package-BE)

### インストールと起動

```bash
pnpm install
cp .env.example .env.local     # BE_BASE_URL を設定
pnpm dev -- -p 3200
```

`http://localhost:3200` を開きます。シードアカウントは `manager@planforge.local` /
パスワード `planforge` です（BE リポジトリ参照）。

### 主なコマンド

| コマンド                                       | 説明              |
| ---------------------------------------------- | ----------------- |
| `pnpm dev`                                     | 開発サーバー      |
| `pnpm build` / `pnpm start`                    | ビルド / 本番実行 |
| `pnpm lint` / `pnpm typecheck` / `pnpm format` | 品質チェック      |

### 環境変数

| 名前                      | 説明                                                                |
| ------------------------- | ------------------------------------------------------------------- |
| `BE_BASE_URL`             | BE のアドレス（サーバーコンポーネント専用・コンテナ内部アドレス可） |
| `CORE_BASE_URL`           | Core のアドレス                                                     |
| `NEXT_PUBLIC_BE_BASE_URL` | ブラウザ側でも必要な場合の代替値                                    |

---

## 画面

| パス                         | 説明                                                                     |
| ---------------------------- | ------------------------------------------------------------------------ |
| `/`                          | ダッシュボード —— 当日の到着・出発・在館、客室ステータス概況             |
| `/reservations`              | 予約一覧 —— 確認番号・氏名検索、状態・チャネルで絞り込み                 |
| `/reservations/new`          | 新規予約 —— 在庫・料金を照会して作成                                     |
| `/reservations/[id]`         | 予約詳細 —— 変更・取消、チェックイン/アウト、フォリオ、客室キー、決済    |
| `/blocks` `/blocks/[id]`     | 団体ブロック —— 確保とピックアップ、日付別割当グリッド、ルーミングリスト |
| `/profiles` `/profiles/[id]` | ゲストプロファイル —— 検索、宿泊履歴、重複統合                           |
| `/rooms`                     | 客室 —— ステータス変更（OPERA へ委譲）と在館状況                         |
| `/housekeeping`              | ハウスキーピング —— 作業割当・進捗、不一致の確認                         |
| `/night-audit`               | ナイトオーディット —— 締めチェックリスト、ノーショー処理                 |
| `/reports`                   | 実績 —— 稼働率・ADR・RevPAR、経路別内訳（支配人）                        |
| `/pos-outlets`               | POS アウトレット —— キーの発行・再発行・停止（支配人）                   |
| `/users`                     | アカウント管理 —— 入社・役割・退社（管理者）                             |
| `/account`                   | マイアカウント —— パスワード変更                                         |

---

## 設計判断

### 認証

アクセストークンは **httpOnly Cookie** に置きます。`localStorage` は XSS が一度成功しただけで
そのまま流出しますが、httpOnly Cookie はスクリプトから読めません。

保護は三層です。

1. **ミドルウェア** —— Cookie がなければ `/login` へ送ります。署名は検証しません。エッジ
   バンドルに秘密鍵を載せず、検証ルールが二か所に分かれないようにするためです。
2. **`(app)` レイアウト** —— `requireUser()` でリクエストごとに BE へアカウント状態を確認します。
   新しいページを追加する際に保護を忘れることがありません。
3. **BE のガード** —— 実際の遮断はここで行います。メニューを隠すのは利便性のためだけです。

期限切れ・偽造トークンは `/logout` ルートハンドラーが Cookie を削除してログインへ送ります。
Cookie は Server Actions とルートハンドラーでしか変更できないため、レイアウトで消そうとすると
例外になりエラー画面に閉じ込められます。

### 複数ホテル

ナビゲーションのホテル切替が画面全体の基準ホテルを決め、選択は Cookie（12 時間）で保持されます。
優先順位は Cookie → アカウントの所属 → 先頭のホテルです。

ホテルは URL ではなく切替が決めます。クエリ文字列で受け取ると、アドレスを書き換えれば他ホテルを
見られるという印象を与えますが、実際の判断は BE が行います。

所属が指定されたスタッフには自分のホテル 1 件だけが返るため、切替の代わりにホテル名を表示します。
選べない項目を見せる理由はなく、一覧に他ホテルの名前が出ること自体が組織構造を明かします。

### フォームアクション

アクションは例外を投げず `ActionState` で結果を返します —— Server Action が投げると Next は本番
でメッセージを消して digest だけを残すため、ユーザーは何を直せばよいか分かりません。

失敗したアクションは**入力値も併せて返します**（`ActionState.values`）。React 19 はフォーム
アクションが終わると非制御入力を初期化するため、値を返さないと日付や数量を埋めきったフォームが
エラー 1 行とともに空になります。画面はその値を `defaultValue` として植え直します。

アクションの状態は**行ではなく、その行を収めたパネル**が持ちます。処理した項目は一覧から外れ、
行に紐づけたメッセージも一緒に消えてしまうからです。表示するメッセージは固定の優先順位ではなく
**最後に実行したアクション**に従います。

### 冪等キー

決済フォームの冪等キーは `crypto.randomUUID()` で試行ごとに作り直します。`useId()` を使っては
いけません —— コンポーネントの位置で決まる値のためページを開き直すたびに同じになり、新しい決済
が前回の再送として扱われて、**実際には決済されていないのに別の金額が成功として報告されます。**

サーバーレンダリングでは空にしておき、マウント後に埋めます。初期値を乱数にするとサーバーと
クライアントが食い違い、ハイドレーションが壊れます。

---

## デプロイ

```bash
docker build -t planforge-fe .
```

Next.js standalone 出力・非 root 実行です。スタック全体の構成は BE リポジトリの
`deploy/docker-compose.yml` を参照してください。

---

## ライセンス

UNLICENSED —— 社内専用。
