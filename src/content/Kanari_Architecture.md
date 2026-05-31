# Kanari DAG Architecture

Kanari separates transaction execution from consensus. Applications submit signed transactions to the execution engine, while the DAG layer groups work into vertices, shares those vertices between authorities, and commits finalized work through checkpoints.

This note follows the implementation paths in `crates/kanari-core` and `crates/centauri`.

The core boundary is deliberate:

| Layer | Main types | Responsibility |
| --- | --- | --- |
| Execution | `BlockchainEngine`, `DagEngine` | Accept transactions, execute work, produce vertices, apply checkpoints |
| Consensus | `DagConsensus`, `DagVertex`, `Checkpoint` | Validate DAG relationships, evaluate quorum, commit ordered work |
| Persistence | `PersistentDagStore`, database helpers | Persist DAG state and support restart recovery |
| Verification | State roots, transaction roots, sparse Merkle tree support | Make finalized state independently checkable |
| Network support | Vertex broadcast and state sync modules | Share vertices and recover missing history |

## A transaction becomes a vertex

`DagEngine` is implemented in:

```text
crates/kanari-core/src/engine/produce_dag_vertex.rs
```

Its `produce_vertex()` path connects the base execution engine with `DagConsensus`. Conceptually, the flow is:

1. Select pending transactions.
2. Execute the selected work through the engine.
3. Produce a `DagVertex`.
4. Add the vertex to consensus storage.
5. Attempt a commit.
6. Return checkpoint information when consensus has enough support.

The public engine also exposes a path for network vertices:

```rust
pub fn add_network_dag_vertex(
    &self,
    vertex: centauri::consensus::DagVertex,
) -> Result<bool>
```

That allows locally produced work and remotely received work to enter the same validation and commit flow.

## Why vertices reference parents

A DAG vertex is not an isolated block. It references earlier vertices, creating a graph of observed work across authorities.

```text
Round 1        Round 2        Round 3

 A1 ----\      B1 ----\      C1
 A2 -----+---> B2 -----+---> C2
 A3 -----+---> B3 -----+---> C3
 A4 ----/      B4 ----/      C4
```

The graph gives consensus evidence about which work was observed by enough authorities. In the implementation, vertices are indexed, validated, and selected for checkpoint creation by the consensus modules under:

```text
crates/centauri/src/consensus/
```

## Quorum is based on the committee

Centauri defines the quorum threshold as:

```text
floor(2n / 3) + 1
```

For four authorities:

| Value | Result |
| --- | --- |
| Committee size | `4` |
| Quorum threshold | `3` |
| Faults tolerated by the usual BFT model | `1` |

The checkpointing code checks support before committing a leader selection. The relevant implementation lives in:

```text
crates/centauri/src/consensus/dag_consensus/checkpointing.rs
```

## Checkpoints turn the graph into finalized history

Vertices describe graph-shaped work. Applications still need a finalized, ordered history. Checkpoints provide that boundary.

A checkpoint contains the committed vertex selection and the transactions derived from those vertices. The store validates checkpoint payloads before accepting them, including checks for:

- Duplicate vertices.
- References to missing vertices.
- Transactions that do not match the referenced DAG vertices.

`DagConsensus::try_commit()` creates a checkpoint only when the decision conditions are satisfied.

## Canonical replay protects state roots

Finalization is not only a consensus event. The execution engine replays checkpoint transactions to derive canonical state.

The integration code lives in:

```text
crates/kanari-core/src/engine/dag_integration.rs
crates/kanari-core/src/engine/apply_checkpoint.rs
```

The replay path compares computed state roots and avoids applying already finalized checkpoints twice. This keeps the committed DAG history and the persisted execution state aligned.

## Persistence and recovery

Consensus state must survive restarts. Centauri includes persistent DAG storage and recovery-oriented modules:

| Module | Purpose |
| --- | --- |
| `persistent_store` | Persist vertices and consensus state |
| `state_sync` | Track checkpoints, vertices, missing parents, and orphan buffering |
| `pruning` | Remove old DAG data according to retention policy |
| `vertex_broadcast` | Batch and share vertices efficiently |

The state sync implementation is conservative about checkpoints: synced vertices can be replayed through local consensus so the receiving node derives committed state from its own validation path.

## Run the DAG demo

The repository includes a demo for exploring vertex production and checkpoint flow:

```bash
cargo run --package kanari-core --example dag_consensus_demo
```

For focused checks:

```bash
cargo test --package kanari-core --lib dag
cargo test --package centauri
```

## About performance numbers

The repository documentation includes performance targets and example configurations. Treat those numbers as environment-dependent measurements, not universal guarantees. Real throughput and latency depend on hardware, committee size, network conditions, transaction shape, storage configuration, and build profile.

The architecture is the durable part: execution is separated from consensus, DAG vertices carry observed work, quorum rules produce checkpoints, and canonical replay turns checkpoints into verifiable state.

## Read the source next

Use this sequence for a deeper tour:

1. `crates/kanari-core/src/engine/produce_dag_vertex.rs`
2. `crates/kanari-core/src/engine/dag_integration.rs`
3. `crates/centauri/src/consensus/dag_consensus/vertices.rs`
4. `crates/centauri/src/consensus/dag_consensus/checkpointing.rs`
5. `crates/centauri/src/consensus/state_sync.rs`
6. `crates/centauri/src/consensus/persistent_store.rs`
