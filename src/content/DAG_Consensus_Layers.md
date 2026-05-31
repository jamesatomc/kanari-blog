# DAG Consensus Layers

Kanari's consensus path is easier to understand when it is read as a stack of responsibilities. The Move runtime, DAG production, committee decisions, storage, broadcast, and recovery code are related, but they do not solve the same problem.

This article maps the layers that exist in `crates/kanari-core` and `crates/centauri`.

## Layer map

| Layer | Main responsibility | Key implementation areas |
| --- | --- | --- |
| Application | Define transactions and Move-powered application behavior | Move packages, signed transactions, RPC entry points |
| DAG execution | Turn pending work into executed DAG vertices | `crates/kanari-core/src/engine/produce_dag_vertex.rs` |
| Consensus | Validate vertices, apply committee rules, and decide commits | `crates/centauri/src/consensus/dag_consensus/` |
| Data availability | Keep vertices addressable and shareable across authorities | `DagStore`, `VertexBroadcaster` |
| Persistence | Store DAG history and support restart recovery | `PersistentDagStore`, pruning |
| State synchronization | Recover missing graph history without trusting remote checkpoints blindly | `StateSynchronizer` |

These boundaries keep consensus reasoning separate from application code and storage mechanics.

## 1. Application layer

The application layer is where signed transactions enter the system. It includes:

- Move smart contracts.
- Transaction payloads.
- Wallet signatures.
- RPC-facing submission paths.

The consensus layer does not need to understand product-specific intent. It receives signed work that can be validated and executed through the engine.

```text
Wallet or application
  -> signed transaction
  -> RPC or local submission
  -> BlockchainEngine
```

Keeping this boundary narrow makes the protocol reusable across different application surfaces.

## 2. DAG execution layer

The DAG execution layer lives primarily in `kanari-core`. `DagEngine` bridges the base execution engine and Centauri consensus.

```rust
pub struct DagEngine {
    engine: Arc<BlockchainEngine>,
    consensus: Arc<RwLock<DagConsensus>>,
    // ...
}
```

Its central method is:

```rust
pub fn produce_vertex(&self) -> Result<DagBlockInfo>
```

Conceptually, `produce_vertex()` performs four jobs:

1. Select work from pending transactions.
2. Execute the selected work.
3. Produce a DAG vertex that represents the result.
4. Pass that vertex into consensus and return checkpoint information when available.

The same engine also accepts vertices received from peers:

```rust
pub fn add_network_vertex(
    &self,
    vertex: centauri::consensus::DagVertex,
) -> Result<()>
```

Locally produced and network-received vertices therefore converge on the same validation path.

## 3. Consensus layer

Centauri's `DagConsensus` owns the committee-aware DAG logic.

```text
crates/centauri/src/consensus/dag_consensus.rs
crates/centauri/src/consensus/dag_consensus/vertices.rs
crates/centauri/src/consensus/dag_consensus/checkpointing.rs
```

Its responsibilities include:

- Creating vertices.
- Validating incoming vertices.
- Tracking graph relationships.
- Evaluating quorum support.
- Selecting committed work.
- Producing checkpoints.

The convenience path is explicit:

```rust
pub fn add_vertex_and_try_commit(
    &mut self,
    vertex: DagVertex,
) -> Result<Option<Checkpoint>> {
    self.add_vertex(vertex)?;
    self.try_commit()
}
```

This shows the boundary clearly: first accept a valid graph update, then attempt a commit.

## 4. Quorum and checkpoints

Centauri calculates its quorum threshold as:

```text
floor(2n / 3) + 1
```

For a committee of four authorities, quorum is three.

```text
Auth 1 ----\
Auth 2 -----+--> enough support --> Checkpoint
Auth 3 ----/
Auth 4 --------> not required for this quorum
```

A checkpoint converts graph-shaped work into finalized, ordered history. The checkpointing module rejects malformed payloads such as:

- Duplicate vertex references.
- Missing vertices.
- Transaction lists that do not match referenced vertices.

The execution engine then replays finalized work to derive canonical state roots.

## 5. Data availability layer

Consensus needs reliable access to vertices before it can make decisions. `DagStore` keeps DAG state indexed and available to the consensus algorithm.

The in-memory store is represented by:

```rust
pub struct DagStore {
    // vertex and checkpoint indexes
}
```

Centauri also includes `VertexBroadcaster`:

```text
crates/centauri/src/consensus/vertex_broadcast.rs
```

Its responsibilities include:

- Queuing vertices for broadcast.
- Creating vertex batches.
- Tracking likely already-broadcast vertices with bloom filters.
- Compressing and decompressing batches.
- Supporting adaptive batch configuration.

The important distinction is that broadcast moves data; consensus decides what that data means.

## 6. Persistence layer

An authority cannot lose its DAG history every time it restarts. `PersistentDagStore` gives the protocol a durable storage boundary.

```text
crates/centauri/src/consensus/persistent_store.rs
```

Persistence supports:

- Storing vertices.
- Loading stored consensus data.
- Recovering after restart.
- Reporting storage statistics.

The pruning module complements persistence:

```text
crates/centauri/src/consensus/pruning.rs
```

Pruning removes old graph data according to configured policy while preserving the state needed for correct operation.

## 7. State synchronization layer

Nodes may join late, restart, or discover that parents are missing. `StateSynchronizer` tracks recovery state:

```text
crates/centauri/src/consensus/state_sync.rs
```

It maintains:

- Checkpoints.
- Vertices grouped by round.
- Vertex lookup indexes.
- Orphan vertices waiting for missing parents.
- Missing-parent relationships.

The sync implementation takes a careful position on checkpoints: synced vertices should flow through local consensus so the receiving node derives commits through its own validation path. A remote checkpoint is not accepted merely because another peer sent it.

## 8. What is implemented and what is still maturing

The `ADVANCED_FEATURES_PLAN.md` roadmap distinguishes the current baseline from integration work still in progress.

### Present in the repository

- Core DAG consensus.
- Checkpointing.
- Pruning and persistence.
- State sync.
- Deterministic multi-leader selection.
- Parallel validation.
- Metrics export.
- Adaptive quorum policy hooks.
- Cross-shard consensus-layer primitives.

### Still requiring runtime hardening

- Stable end-to-end integration across engine and RPC paths.
- Expanded operational metrics.
- Full runtime integration for sharding primitives.
- Real telemetry feeding adaptive quorum policy.

That distinction matters. A primitive existing in the consensus crate is not the same as a production-ready feature exposed through the complete node runtime.

## A practical reading order

Read the source in this order:

1. `crates/kanari-core/src/engine/produce_dag_vertex.rs`
2. `crates/centauri/src/consensus/dag_consensus.rs`
3. `crates/centauri/src/consensus/dag_consensus/vertices.rs`
4. `crates/centauri/src/consensus/dag_consensus/checkpointing.rs`
5. `crates/centauri/src/consensus/vertex_broadcast.rs`
6. `crates/centauri/src/consensus/persistent_store.rs`
7. `crates/centauri/src/consensus/state_sync.rs`
8. `crates/centauri/ADVANCED_FEATURES_PLAN.md`

The stack has one consistent idea: each layer owns a narrow problem. Execution produces work, consensus decides commits, data availability shares graph history, persistence keeps it durable, and sync helps nodes recover safely.
