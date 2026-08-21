/**
 * The TypeScript half of the shared promotion-predicate check (task T1.5).
 *
 * `contracts/test/fixtures/protect-eligibility-truth-table.json` is hand-written from tracker
 * §0.7 and read by both implementations: the Solidity library
 * (`contracts/test/TinjauRiskTypes.t.sol`) and this file. Neither language generates it, so
 * it is a specification rather than a snapshot of current behaviour, and a drift in either
 * implementation fails on its own side.
 *
 * This matters because the two implementations sit on opposite sides of the trust boundary.
 * The server decides what to propose; the contract decides what to accept. If they disagree
 * about what "may reach PROTECT" means, either the server proposes actions the chain will
 * reject, or worse, the chain accepts something the server would have refused.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  mayReachProtect,
  isRumorOnly,
  SOURCE_CLASS_ORDINALS,
  CONFIRMATION_STATUS_ORDINALS,
  type ConfirmationStatus,
  type SourceClass,
} from "../src/risk/types.js";

const tablePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "contracts",
  "test",
  "fixtures",
  "protect-eligibility-truth-table.json",
);
const table = JSON.parse(readFileSync(tablePath, "utf8"));

const SOURCE_CLASS_BY_ORDINAL = new Map<number, SourceClass>(
  (Object.entries(SOURCE_CLASS_ORDINALS) as [SourceClass, number][]).map(([k, v]) => [v, k]),
);
const CONFIRMATION_BY_ORDINAL = new Map<number, ConfirmationStatus>(
  (Object.entries(CONFIRMATION_STATUS_ORDINALS) as [ConfirmationStatus, number][]).map(([k, v]) => [
    v,
    k,
  ]),
);

test("mayReachProtect matches the shared truth table row for row", () => {
  assert.ok(table.rows.length > 15, "the shared table lost rows; it must cover every branch");

  for (const row of table.rows) {
    const highestClass = SOURCE_CLASS_BY_ORDINAL.get(row.highestClass);
    const confirmation = CONFIRMATION_BY_ORDINAL.get(row.confirmation);

    // Ordinal 0 is the Unknown sentinel and has no string form. The TS predicate is typed so
    // it cannot receive one, which is itself the fail-closed behaviour the table expects.
    if (highestClass === undefined || confirmation === undefined) {
      assert.equal(
        row.expected,
        false,
        `row "${row.name}" uses an Unknown sentinel, so it must expect false`,
      );
      continue;
    }

    const actual = mayReachProtect({
      highestClass,
      independentSources: row.independentSources,
      confirmation,
      officialEvidencePassed: row.officialEvidencePassed,
    });

    assert.equal(actual, row.expected, `${row.name} — ${row.why}`);
  }
});

test("the table pins the schema version both implementations claim", () => {
  assert.equal(table._schemaVersion, "tinjau.risk/1.0.0");
});

test("rumour can never reach PROTECT, swept exhaustively on this side too", () => {
  for (const confirmation of Object.keys(CONFIRMATION_STATUS_ORDINALS) as ConfirmationStatus[]) {
    for (const independentSources of [0, 1, 2, 3, 10, 255]) {
      for (const officialEvidencePassed of [false, true]) {
        assert.equal(
          mayReachProtect({
            highestClass: "RUMOR",
            independentSources,
            confirmation,
            officialEvidencePassed,
          }),
          false,
        );
      }
    }
  }
  assert.equal(isRumorOnly("RUMOR"), true);
  assert.equal(isRumorOnly("NEWS"), false);
  assert.equal(isRumorOnly("OFFICIAL"), false);
});

test("only exact CONFIRMED satisfies the gate, never an ordering comparison", () => {
  // Guards against a refactor to `confirmation >= CONFIRMED`, which would silently widen the
  // gate the moment a new status was appended to the enum.
  for (const confirmation of Object.keys(CONFIRMATION_STATUS_ORDINALS) as ConfirmationStatus[]) {
    assert.equal(
      mayReachProtect({
        highestClass: "NEWS",
        independentSources: 2,
        confirmation,
        officialEvidencePassed: false,
      }),
      confirmation === "CONFIRMED",
    );
  }
});
