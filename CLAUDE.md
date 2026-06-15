# CLAUDE.md — overflow-tester

Chrome拡張機能「overflow-tester」の開発コンテキスト。
UIの堅牢性チェックツール（テキスト膨張・要素複製）。

---

## プロジェクト概要

| 項目 | 内容 |
|------|------|
| 種別 | Chrome拡張機能（Manifest V3） |
| 用途 | コーディング・レビュー時のUIストレステスト |
| ビルド | Vite + React |
| UI | shadcn/ui + Tailwind CSS v3 |

---

## ディレクトリ構成

```
src/
├── App.jsx              # ポップアップUI全体 + runOverflowTest関数（ページ注入）
├── main.jsx             # Reactエントリーポイント
├── index.css            # Tailwind @layer base + shadcn CSS変数定義
├── lib/
│   └── utils.js         # cn()のみ（clsx + tailwind-merge）
└── components/ui/       # shadcnコンポーネント（手動管理）
    ├── button.jsx
    ├── label.jsx
    ├── separator.jsx
    └── switch.jsx
```

**重要：** `dist/` はビルド成果物。直接編集しない。

---

## アーキテクチャ

### ポップアップ → ページ注入の流れ

```
popup (React) → chrome.scripting.executeScript → runOverflowTest() がページDOMを操作
```

- `runOverflowTest` は `App.jsx` 内に同居する通常関数（`export` なし）
- `chrome.scripting.executeScript` の `func` 引数として渡す → シリアライズされてページのコンテキストで実行される
- **クロージャは使えない**。`func` が参照する変数は `args` 経由で渡すこと

### 除外ロジック

```js
// excludeList: string[] (例: ["header", "#sidebar", ".skip"])
// 1. querySelectorAll で excludedEls Set を構築
// 2. isExcluded(el) で祖先まで遡って判定
// 3. テキストノードのparentElementと要素複製のparent/childrenに適用
```

---

## コーディングルール

### 全般

- **言語:** JavaScript（TypeScript未導入。導入する場合はClaude Codeに相談）
- **フォーマット:** Prettierなし。インデント2スペース
- **コメント:** 日本語OK。処理の「なぜ」を書く。「何を」はコードを読めばわかる

### React

- コンポーネントは関数コンポーネントのみ（クラス不使用）
- `useState` で状態管理。状態が増えたら `useReducer` を検討
- ポップアップのルートコンポーネントは `App.jsx` 1ファイルに集約（小規模なので分割不要）

### ページ注入関数（`runOverflowTest`）

- `App.jsx` の末尾に配置し、`export` しない
- React / shadcn / Tailwind には一切依存しない純粋なDOM操作のみ
- `try/catch` で無効セレクタや権限エラーを吸収する
- DOMを破壊的に変更する（復元機能なし）。これは意図した仕様

### スタイル

- **Tailwind CSS v3** のユーティリティクラスを使う
- 動的クラスはテンプレートリテラルまたは `cn()` で結合
- shadcn CSS変数（`hsl(var(--primary))` 等）に準拠。独自カラーは追加しない
- `!important` 不使用

---

## UIコンポーネント方針

### shadcnコンポーネント（`src/components/ui/`）

CLIではなく**手動管理**。`npx shadcn-ui@latest add` は使わない。

現在使用中のコンポーネント：

| コンポーネント | 用途 |
|--------------|------|
| `Switch` | 機能のON/OFF |
| `Label` | スイッチ・入力のラベル |
| `Button` | Runボタン |
| `Separator` | セクション区切り |

新しいshadcnコンポーネントが必要な場合は `src/components/ui/` に手動で追加する。

### ポップアップのUI制約

- **幅:** 280px 固定（`body { width: 280px }` で指定）
- **高さ:** コンテンツに依存（固定しない）
- フォントサイズ: 本文 `text-xs`（12px）、ラベル `text-xs`、補足 `text-[10px]`
- セクション間は必ず `<Separator />` で区切る
- 各セクションは `space-y-2` で内部余白を統一

### 除外セレクタ textarea

- `rows={2}` 初期高さ、`resize-y` で縦方向のみリサイズ可
- `minHeight: "3rem"` でスタイル上の最小高さを保証
- `font-mono` でセレクタ文字列を見やすく表示

---

## Chrome拡張機能の必須ファイル（絶対に削除・変更しないこと）

以下のファイルは Chrome拡張機能の動作に必須。**作業中に削除・上書きしてはならない。**

```
public/
├── manifest.json       # 拡張機能の定義（権限・エントリーポイント等）
├── favicon.svg
├── icons.svg
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

- `public/` が正ソース。ビルドのたびに Vite が `dist/` へ自動コピーする
- `dist/` が消えても `npm run build` で完全に再生成できる
- `public/` 内のファイルは消えると復元できないため、触る場合は必ず事前確認すること

---

## 作業後の必須手順

コード変更を行ったら、**必ずビルドまで完了させること**。

```bash
source ~/.nvm/nvm.sh && nvm use v22.22.3 && npm run build
```

> **注意:** Node.js v22以上が必要（ローカルのデフォルトはv20のため `nvm use v22.22.3` で切り替えること）

---

## ビルド・開発フロー

```bash
# 依存インストール
npm install

# プロダクションビルド（拡張機能として読み込む dist/ を生成）
npm run build

# ビルド後にdist/index.htmlのパスを修正（絶対パス→相対パス）
# vite.config.js の base: "./" で自動化することも可能
sed -i 's|src="/assets/|src="assets/|g; s|href="/assets/|href="assets/|g' dist/index.html
```

> **Tip:** `vite.config.js` に `base: "./"` を追加すれば `sed` コマンドが不要になる。

### Chrome拡張機能として読み込む

1. `chrome://extensions/` を開く
2. デベロッパーモード ON
3. 「パッケージ化されていない拡張機能を読み込む」→ `dist/` を選択
4. ソース変更後は `npm run build` → 拡張機能ページで「更新」

---

## 設計上の決定事項（ADR）

### なぜ content_scripts ではなく executeScript を使うか

`manifest.json` に `content_scripts` を定義するとページロード時に自動注入される。
overflow-tester は「ユーザーが手動で実行する」ツールなので、`chrome.scripting.executeScript` で明示的に注入する方が意図に合っている。

### なぜ復元機能を持たないか

- 実装コスト（変更前DOMのシリアライズ）に対してリターンが小さい
- 対象ページのリロードで確実に元に戻せる
- シンプルさを優先する

### なぜ要素複製は最大グループのみか

複数グループを同時複製すると意図しない組み合わせで爆発的に要素が増える。
「最も影響の大きいグループ1つを見る」という検証の目的に合っている。

### なぜ TypeScript を使わないか

現状のコード量（1ファイル中心）では型の恩恵より導入コストが高い。
規模が大きくなった場合は `.jsx` → `.tsx` への移行を検討する。

---

## 今後の拡張候補

- [ ] `vite.config.js` に `base: "./"` を追加してsedコマンドを不要にする
- [ ] 除外セレクタをlocalStorageに保存して次回起動時に復元
- [ ] テキスト膨張の対象タグを選択できるオプション
- [ ] 要素複製を「最大グループのみ」から「全グループ」に切り替えるオプション
- [ ] 実行結果のサマリー表示（何件のテキスト・何件の要素を変更したか）
