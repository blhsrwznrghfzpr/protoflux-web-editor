# ProtoFlux Web Visual Editor 設計書（実装向け / AI Agent対応）

このドキュメントは、**AI Agent がそのまま実装に着手できる粒度**を目標に整理した設計書です。

---

## 0. 目的と前提

### 0.1 目的

Resonite の ProtoFlux をブラウザで編集できる Web ビジュアルエディターを実装する。

### 0.2 必須要件

1. 静的ホスティングでデプロイ可能
2. ResoniteLink 接続なしでノード配置・接続・編集が可能
3. 作成データをブラウザで Import / Export 可能
4. ResoniteLink 接続時のみ Resonite へ Import（Push）可能
5. 可能であれば Resonite から読み込み（Pull）可能

### 0.3 非目標（MVP時点）

- 全ノードの完全実装
- Resonite 側の全バージョンとの完全互換
- 高度な共同編集

---

## 1. 全体アーキテクチャ（3層）

## 1.1 構成

- **Editor Core（必須）**
  - ノード編集、接続、検証、Undo/Redo
- **Serialization / File I/O（必須）**
  - `.protoflux.json` の Import/Export
  - スキーマバージョン管理と migration
- **Resonite Bridge（任意）**
  - ResoniteLink への接続、Push/Pull

## 1.2 設計原則

- オフラインで完結する機能を最優先
- Bridge は交換可能（Noop / ResoniteLink）
- Document JSON を source of truth とする
- 未対応ノードを破棄しない（round-trip保全）

---

## 2. 推奨技術スタック

- フロントエンド: **Vite + React + TypeScript**
- グラフ UI: React Flow（または同等ライブラリ）
- 状態管理: Zustand（Undo/Redo用ミドルウェア併用）
- 検証: Zod（Document検証とmigration境界で使用）
- テスト: Vitest + Testing Library

---

## 3. ディレクトリ構成（推奨）

```txt
src/
  app/
    App.tsx
    providers/
  editor-core/
    model/
      graph.ts
      node.ts
      edge.ts
    commands/
      add-node.ts
      connect-edge.ts
      delete-node.ts
    services/
      validator.ts
      history.ts
  serialization/
    schema/
      v1.ts
    migrations/
      index.ts
    serialize.ts
    deserialize.ts
  bridge/
    types.ts
    noop-bridge.ts
    resonite-link-bridge.ts
  features/
    canvas/
    palette/
    inspector/
    file-io/
    bridge-panel/
  shared/
    types/
    utils/
```

---

## 4. データモデル（v1）

```ts
export type NodeId = string;
export type PortId = string;

export interface ProtofluxDocument {
  schemaVersion: 1;
  meta: {
    name: string;
    createdAt: string;
    updatedAt: string;
  };
  graph: {
    nodes: NodeModel[];
    edges: EdgeModel[];
  };
  warnings?: string[]; // migration/変換時の注意情報
}

export interface NodeModel {
  id: NodeId;
  type: string; // 例: "Math/Add"
  position: { x: number; y: number };
  inputs: PortModel[];
  outputs: PortModel[];
  params?: Record<string, unknown>;

  // 未対応ノードの原文保持（round-tripのため）
  unknownRaw?: Record<string, unknown>;
}

export interface PortModel {
  id: PortId;
  name: string;
  dataType: string;
}

export interface EdgeModel {
  id: string;
  from: { nodeId: NodeId; portId: PortId };
  to: { nodeId: NodeId; portId: PortId };
}
```

---

## 5. ノード定義方式（将来の全ノード対応前提）

## 5.1 Node Registry

ノード仕様はハードコードではなく、登録形式で管理する。

```ts
export interface NodeDefinition {
  type: string;
  category: string;
  inputs: Array<{ name: string; dataType: string }>;
  outputs: Array<{ name: string; dataType: string }>;
  defaultParams?: Record<string, unknown>;
  capabilities: {
    editable: boolean;
    renderable: boolean;
  };
  validate?: (params: Record<string, unknown>) => string[];
}

export interface NodeRegistry {
  get(type: string): NodeDefinition | undefined;
  list(): NodeDefinition[];
}
```

## 5.2 MVPの最小ノードセット（推奨）

- 定数: Bool / Int / Float / String
- 演算: Add / Sub / Mul / Div
- 比較: Equal / Greater / Less
- 制御: Branch 相当

## 5.3 全ノード対応方針

- **今やること**: Registry化、UnknownNode保持、migration設計
- **今やらないこと**: 全ノードのUI詳細固定

> 結論: MVPは最小ノードでよいが、アーキテクチャは拡張前提で実装する。

---

## 6. 型システム方針

### 6.1 MVP方針

- 暗黙変換なし（厳格型）
- 接続可否は `output.dataType === input.dataType` を基本

### 6.2 将来拡張

- 限定的暗黙変換（例: Int → Float）を whitelist で導入
- 変換発生時は UI に明示（線色・tooltip等）

---

## 7. Editor Core 仕様

## 7.1 コマンドモデル

変更操作は Command 化する。

- `AddNodeCommand`
- `MoveNodeCommand`
- `ConnectEdgeCommand`
- `DeleteNodeCommand`
- `UpdateParamCommand`

これにより Undo/Redo を一貫実装できる。

## 7.2 バリデーション

最低限の検証:

- 存在しないポートへの接続禁止
- 型不一致接続の拒否
- 同一ポートへの多重接続ポリシー（入力側は1本など）
- 循環参照の検出（必要に応じて）

## 7.3 状態管理

- `graph`: ノード・エッジ
- `selection`: 選択ノード
- `viewport`: ズーム・パン
- `history`: undoStack / redoStack
- `dirty`: 未保存フラグ

---

## 8. Serialization / File I/O 仕様

## 8.1 ファイル形式

- 拡張子: `.protoflux.json`
- 文字コード: UTF-8
- `schemaVersion` 必須

## 8.2 API契約

```ts
function serialize(graph: GraphModel): ProtofluxDocument;
function deserialize(doc: ProtofluxDocument): GraphModel;
function migrateToLatest(input: unknown): ProtofluxDocument;
```

## 8.3 失敗時挙動

- 不正JSON: import中断 + エラー通知
- 旧バージョン: migration実行
- 未対応ノード: UnknownNodeとして保持し warning 追加

---

## 9. Resonite Bridge 仕様

## 9.1 Bridge Interface

```ts
export type BridgeStatus = "disconnected" | "connecting" | "connected" | "error";

export interface IResoniteBridge {
  getStatus(): BridgeStatus;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  pushGraph(doc: ProtofluxDocument): Promise<void>;
  pullGraph?(): Promise<ProtofluxDocument>;
}
```

## 9.2 実装

- `NoopBridge`: 常に未接続、Push/Pull不可
- `ResoniteLinkBridge`: 実接続版

## 9.3 UIルール

- `connected` 以外は Push/Pull ボタン disabled
- 未接続でも編集・保存・読込は常時可

---

## 10. エラーモデル

分類:

- 入力エラー（JSON不正、型不一致）
- 接続エラー（ResoniteLink未起動、タイムアウト）
- 同期エラー（Push/Pull失敗）

ポリシー:

- ユーザー操作起点のみ最大2回自動リトライ
- エラーは toast + status bar に表示
- 失敗時も編集継続可（オフライン機能を止めない）

---

## 11. 画面仕様（最小）

- 左: Node Palette
- 中央: Canvas
- 右: Inspector
- 上: Toolbar（Import / Export / Connect / Push / Pull）

必須UX:

- キーボードショートカット（Undo/Redo/Delete）
- 変更未保存時の警告
- ノード検索

---

## 12. 実装フェーズ

### Phase 1（MVP / オフライン完結）

- Canvas + ノード配置/接続
- Inspector 編集
- Import / Export
- Undo / Redo
- LocalStorage 自動保存

### Phase 2（Bridge連携）

- 接続状態表示
- Push 実装
- 接続エラー処理

### Phase 3（拡張）

- Pull 実装
- ノード定義拡張
- パフォーマンス最適化

---

## 13. 受け入れ条件（Definition of Done）

### 13.1 要件1-3の完了条件

- ResoniteLinkなしでノード編集・接続・保存が可能
- ImportしたJSONを再Exportして構造が保たれる
- 未接続時はPushが実行不可、接続時のみPush可能

### 13.2 可能であれば要件4

- PullによりResoniteのgraphを表示できる
- 未対応ノードが存在してもアプリが落ちない

---

## 14. テスト方針

- Unit
  - validator
  - serialize/deserialize
  - migration
- Integration
  - Import→編集→Export round-trip
  - Bridge状態に応じたUI活性制御
- E2E（可能なら）
  - ノード配置→接続→保存までの基本導線

---

## 15. 先に決めるべき仕様（確定リスト）

1. MVP対象ノードセット
2. 型接続ルール（厳格型 or 限定暗黙変換）
3. 未対応ノード保持方式（UnknownNode + raw）
4. schemaVersion運用とmigration責務
5. Push/Pull失敗時の通知・リトライルール

この5点を先に固定すると、実装中の仕様揺れを最小化できる。
