# Tinjau contracts

## Setup: there isn't one

Dependencies are vendored and committed. From a bare clone of this repository:

```shell
cd contracts && forge test
```

Expected: **137 passed, 0 failed, 0 skipped** across 7 suites. Foundry is the only prerequisite.
No `forge install`, no `git submodule update`, no network access during the build.

**Do not run `forge install` here.** It replaces the pinned dependency sources with upstream
HEAD, which does not compile against these contracts. [`lib/VENDORED.md`](./lib/VENDORED.md)
records the exact upstream revision of each vendored dependency, its licence, what was deleted
to keep the committed tree at ~3.2 MB, and why git submodules were rejected.

## Foundry

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

- **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
- **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
- **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
- **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy (X Layer Testnet 1952)

Order matters — P0.5 first, then the registry (P1.8, no script yet — deploy
`EventStateRegistry` directly with `cast send` or a small script, same pattern), then P4.2:

```shell
# P0.5 — PoolManager + mock wNVDAx/USDG (no real capital, testnet OKB only)
$ forge script script/DeployTestnetInfra.s.sol:DeployTestnetInfra \
    --rpc-url https://testrpc.xlayer.tech --broadcast --private-key $POSTER_PRIVATE_KEY

# P4.2 — hook + pool, once P0.5 and the registry (P1.8) are both deployed
$ POOL_MANAGER=0x... REGISTRY=0x... MOCK_WNVDAX=0x... MOCK_USDG=0x... \
  forge script script/DeployTestnetHookAndPool.s.sol:DeployTestnetHookAndPool \
    --rpc-url https://testrpc.xlayer.tech --broadcast --private-key $POSTER_PRIVATE_KEY
```

See `../docs/buildx-orion-2026/outputs/04-planning/task-tracker.md` P0.5/P1.8/P4.2 for the
full task acceptance criteria and evidence trail.

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```
