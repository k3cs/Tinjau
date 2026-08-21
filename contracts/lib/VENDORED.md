# Vendored Foundry dependencies

These directories are **committed sources, not submodules and not `forge install` output**.
`git clone https://github.com/k3cs/Tinjau && cd Tinjau/contracts && forge test` is the whole
setup. There is no `forge install` step, no `git submodule update`, and no network access
required to compile or test.

Recorded 2026-08-21, before the hackathon submission deadline (2026-08-21 23:59 UTC).

## What is here, and at which upstream revision

| Path | Upstream | Pinned at | Licence |
|---|---|---|---|
| `forge-std/` | https://github.com/foundry-rs/forge-std | `v1.16.2` (from its own `package.json`) | MIT OR Apache-2.0 (`forge-std/LICENSE-MIT`, `LICENSE-APACHE`) |
| `v4-core/` | https://github.com/Uniswap/v4-core | `46c6834698c48bc4a463a86d8420f4eb1d7f3b75` (2026-04-02) | BUSL-1.1 / MIT (`v4-core/licenses/`) |
| `v4-core/lib/solmate/` | https://github.com/transmissions11/solmate | `89365b880c4f3c786bdd453d4b8e8fe410344a69` (2025-07-21), package version 6.8.0 | AGPL-3.0 (`v4-core/lib/solmate/LICENSE`) |

Every upstream licence file is preserved in place. Nothing in these trees has been edited; the
only changes are deletions (below).

## Why vendored instead of git submodules

Submodules were the first choice and were rejected on evidence, not preference:

1. **`forge-std` here has no revision to pin.** It is a plain directory with no `.git`, so its
   exact commit is not recoverable from this machine. `package.json` reports `1.16.2`, which is a
   release tag, but a submodule entry claiming a commit nobody verified would be a fabricated
   pin — worse than no pin.
2. **`v4-core`'s own submodule pin does not match the tree that compiles.** `v4-core` at
   `46c6834` pins `lib/solmate` at `4b47a19038b798b4a33d9749d25e570443520647`; the checkout that
   actually produces the 137-test pass has solmate at `89365b880c4f3c786bdd453d4b8e8fe410344a69`.
   A submodule setup would either reproduce the pinned-but-untested combination or require
   overriding a dependency's own nested pin from the parent repository.

Point 2 is the concrete mechanism behind the reported defect: installing current upstream
`Uniswap/v4-core` does not compile against these sources. Vendoring removes the class of
problem rather than re-encoding it.

## What was removed before committing

Only files that neither the compiler nor the test run reads, to keep the committed tree at
~3.2 MB instead of ~26 MB:

- every nested `.git/` directory (required — git will not track files inside an embedded repo)
- `v4-core/docs/` (8.8 MB of rendered documentation)
- `v4-core/test/js-scripts/` (4.8 MB of JavaScript reference implementations; the Solidity that
  `test/utils/Deployers.sol` pulls in is untouched)
- `.github/` workflow directories and `.DS_Store` files

`forge test` was re-run after the deletions: **137 passed, 0 failed**, identical to the result
before them. (That was the suite size on 2026-08-21 when the vendoring was verified. The suite
has since grown to 145 with the integration example; the figure above is left as the number that
actually verified the deletion, not silently updated to today's.)

## Consequence for maintainers

Do not run `forge install` in this directory. It would replace these pinned sources with
upstream HEAD and reintroduce the exact breakage this file exists to prevent. To upgrade a
dependency deliberately, replace its directory, re-run `forge test`, and update the table above
in the same commit.
