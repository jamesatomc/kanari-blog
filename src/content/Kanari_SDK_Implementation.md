# Building with KanariClient

The Flutter/Dart SDK under `sdk/kanari_pay` exposes a developer-friendly facade named `KanariClient`. It keeps common application code compact while delegating read and write behavior to focused modules internally.

This guide walks through the structure that exists in the repository and shows the core usage pattern.

## The facade pattern

The public client is defined in:

```text
sdk/kanari_pay/lib/src/client/kanari_client.dart
```

Its constructor creates two internal modules:

```dart
KanariClient(this.url, {http.Client? client})
  : _client = client ?? http.Client() {
  _queries = QueriesModule(url, _client);
  _transactions = TransactionOperations(url, _queries, _client);
}
```

Application code talks to `KanariClient`, while the facade delegates the actual work:

| Module | Type of work | Examples |
| --- | --- | --- |
| `QueriesModule` | Read-only RPC calls | Account, balances, tokens, blocks, transactions, stats, health, modules |
| `TransactionOperations` | Signed write operations | Publish module, transfer, execute Move function, burn, transfer custom token |

This split makes it easier to extend one area without turning the public client into one large file.

## Create a client

Initialize the RPC facade with a node URL:

```dart
import 'package:kanari_kit/kanari_kit.dart';

final client = KanariClient('http://localhost:3000/rpc');
```

The SDK also supports environment-based initialization:

```dart
final client = KanariClient.fromEnvironment(KanariEnvironment.testnet);
```

## Read network data

Read methods delegate to `QueriesModule`, which sends JSON-RPC requests through the shared `RpcUtils.request` helper.

```dart
final account = await client.getAccount(walletAddress);
final balances = await client.getAllBalances(walletAddress);
final blockHeight = await client.getBlockHeight();
final health = await client.getHealth();
```

The available facade methods include:

- `getAccount(address)`
- `getTokenBalance(address, tokenType)`
- `getAllBalances(address)`
- `listTokens()`
- `getBlock(height)`
- `getBlockHeight()`
- `getTransaction(hash)`
- `getStats()`
- `getHealth()`
- `getModule(address, name)`
- `listModules()`
- `verifyModule(moduleBytes)`

Addresses are normalized before RPC requests. The query module accepts values with or without the `0x` prefix, validates hexadecimal characters, pads shorter values to 32 bytes, and lowercases the result.

## Submit a transfer

Write operations require a `KanariWallet`. A basic KANARI token transfer looks like this:

```dart
final result = await client.transfer(
  wallet: wallet,
  recipient: '0xrecipient',
  amount: 1000,
);

print(result.hash);
print(result.status);
```

Internally, the transaction module:

1. Loads the sender account and sequence number.
2. Finds a spendable coin object.
3. Encodes transaction arguments with BCS helpers.
4. Serializes transaction data.
5. Hashes the serialized bytes when the Rust bridge is available.
6. Signs the message with the wallet.
7. Sends the RPC request.
8. Accepts successful statuses such as `pending`, `executed`, `committed`, or `success`.

## Execute a Move function

Applications can call Move functions directly through the same facade.

```dart
final result = await client.executeFunction(
  wallet: wallet,
  package: packageAddress,
  module: 'market',
  function: 'create_listing',
  typeArgs: const [],
  args: encodedArgs,
  executeImmediate: true,
);
```

The `args` value is a list of byte arrays. This makes argument encoding explicit and keeps the transaction boundary predictable.

## Publish a Move module

Compiled Move bytecode can be submitted with `publishModule`:

```dart
final result = await client.publishModule(
  wallet: wallet,
  moduleBytes: compiledBytes,
  moduleName: 'my_token',
  executeImmediate: true,
);
```

For the complete package lifecycle, use the CLI alongside the Dart SDK:

```powershell
cargo run -p kanari -- move new my_token
cargo run -p kanari -- move build --package-path ./my_token
cargo run -p kanari -- move test --package-path ./my_token
```

## Add a new query

New read methods belong in `sdk/kanari_pay/lib/src/modules/queries.dart`.

```dart
Future<MyType> myNewQuery(String param) async {
  final resp = await RpcUtils.request(
    client,
    url,
    'kanari_myMethod',
    {'param': param},
    (json) => MyType.fromJson(json as Map<String, dynamic>),
  );

  if (resp.error != null) throw Exception(resp.error!.message);
  return resp.result!;
}
```

Then add a small wrapper to `KanariClient`:

```dart
Future<MyType> myNewQuery(String param) {
  return _queries.myNewQuery(param);
}
```

## Add a new transaction operation

For a new write method:

1. Add the RPC method name to `modules/transactions/constants.dart`.
2. Add the implementation to `modules/transactions/operations.dart`.
3. Fetch the account sequence number when required.
4. Prepare the BCS transaction data and RPC parameters.
5. Reuse `_signAndSubmit`.
6. Add a facade wrapper in `KanariClient`.

The important part is reuse: transaction serialization, signing, RPC submission, and status checks already have one shared path.

## Related modules

The repository includes more than basic transfers:

| Area | Location |
| --- | --- |
| Authentication client | `sdk/kanari_pay/lib/src/client/auth_client.dart` |
| Escrow client | `sdk/kanari_pay/lib/src/client/escrow_client.dart` |
| Escrow module | `sdk/kanari_pay/lib/src/modules/escrow/` |
| Wallet implementation | `sdk/kanari_pay/lib/src/kanari_wallet.dart` |
| Shared RPC utilities | `sdk/kanari_pay/lib/src/core/rpc_utils.dart` |
| BCS helpers | `sdk/kanari_pay/lib/src/core/bcs_utils.dart` |

There are also Move examples under `sdk/kanari_pay/backend/`, including escrow and DEX packages.

## A practical rule for extensions

Keep the public facade small. Put reusable protocol details in `core/`, read operations in query modules, write operations in transaction modules, and application-specific behavior in focused feature modules.

That pattern is already present in the SDK, and following it makes new capabilities easier to review, test, and maintain.
