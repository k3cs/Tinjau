// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {TinjauRiskTypes} from "../src/TinjauRiskTypes.sol";

/// @notice Verifies the Solidity promotion predicate against the shared truth table
/// (task T1.5).
///
/// The table in `test/fixtures/protect-eligibility-truth-table.json` is hand-written from
/// tracker §0.7 and is read by BOTH implementations — this one and the TypeScript mirror in
/// `apps/server/test/riskPromotionParity.test.ts`. Neither language generates it, so it is a
/// specification rather than a snapshot of whatever the code currently does.
contract TinjauRiskTypesTest is Test {
    struct Row {
        uint8 highestClass;
        uint8 independentSources;
        uint8 confirmation;
        bool officialEvidencePassed;
        bool expected;
        string name;
    }

    function test_mayReachProtectMatchesTheSharedTruthTable() public view {
        string memory raw = vm.readFile("test/fixtures/protect-eligibility-truth-table.json");
        uint256 count = abi.decode(vm.parseJson(raw, ".rows"), (bytes[])).length;
        assertGt(count, 15, "the shared table lost rows; it must cover every branch");

        for (uint256 i = 0; i < count; i++) {
            string memory base = string.concat(".rows[", vm.toString(i), "]");
            Row memory row = Row({
                highestClass: uint8(abi.decode(vm.parseJson(raw, string.concat(base, ".highestClass")), (uint256))),
                independentSources: uint8(
                    abi.decode(vm.parseJson(raw, string.concat(base, ".independentSources")), (uint256))
                ),
                confirmation: uint8(abi.decode(vm.parseJson(raw, string.concat(base, ".confirmation")), (uint256))),
                officialEvidencePassed: abi.decode(
                    vm.parseJson(raw, string.concat(base, ".officialEvidencePassed")), (bool)
                ),
                expected: abi.decode(vm.parseJson(raw, string.concat(base, ".expected")), (bool)),
                name: abi.decode(vm.parseJson(raw, string.concat(base, ".name")), (string))
            });

            bool actual = TinjauRiskTypes.mayReachProtect(
                TinjauRiskTypes.SourceClass(row.highestClass),
                row.independentSources,
                TinjauRiskTypes.ConfirmationStatus(row.confirmation),
                row.officialEvidencePassed
            );

            assertEq(actual, row.expected, row.name);
        }
    }

    /// @dev The rumour cap, proven by exhaustion rather than by the table's examples. Every
    /// source count, every confirmation status, both bonded outcomes.
    function testFuzz_rumorCanNeverReachProtect(
        uint8 sources,
        uint8 rawConfirmation,
        bool officialPassed
    ) public pure {
        TinjauRiskTypes.ConfirmationStatus confirmation =
            TinjauRiskTypes.ConfirmationStatus(bound(rawConfirmation, 0, 4));

        assertFalse(
            TinjauRiskTypes.mayReachProtect(
                TinjauRiskTypes.SourceClass.Rumor, sources, confirmation, officialPassed
            )
        );
        assertTrue(TinjauRiskTypes.isRumorOnly(TinjauRiskTypes.SourceClass.Rumor));
    }

    /// @dev Only exact `Confirmed` may satisfy the gate. This is fuzzed because the failure
    /// mode it guards is a refactor to `>= Confirmed`-style ordering comparison, which would
    /// silently widen the gate the moment a new enum member was appended.
    function testFuzz_onlyExactConfirmedSatisfiesTheGate(uint8 rawConfirmation, uint8 sources) public pure {
        uint8 c = uint8(bound(rawConfirmation, 0, 4));
        uint8 n = uint8(bound(sources, 2, 255));

        bool result = TinjauRiskTypes.mayReachProtect(
            TinjauRiskTypes.SourceClass.News, n, TinjauRiskTypes.ConfirmationStatus(c), false
        );
        assertEq(result, c == uint8(TinjauRiskTypes.ConfirmationStatus.Confirmed));
    }

    function test_validatorsRejectTheUnknownSentinels() public {
        vm.expectRevert();
        this.callValidateSourceClass(TinjauRiskTypes.SourceClass.Unknown);

        vm.expectRevert();
        this.callValidateConfirmation(TinjauRiskTypes.ConfirmationStatus.Unknown);

        vm.expectRevert();
        this.callValidateConfidence(TinjauRiskTypes.ConfidenceBand.Unknown);

        vm.expectRevert();
        this.callValidateDataMode(TinjauRiskTypes.DataMode.Unknown);

        // A bit no reason defines must be refused, not silently ignored: a newer writer
        // setting "evidence retracted" must never read as though nothing happened.
        vm.expectRevert();
        this.callValidateReasonBits(uint32(1 << 31));
    }

    function test_definedReasonBitsAreAccepted() public view {
        this.callValidateReasonBits(TinjauRiskTypes.REASON_ALL_DEFINED);
        this.callValidateReasonBits(TinjauRiskTypes.REASON_NONE);
    }

    // External wrappers so `vm.expectRevert` can observe library reverts.
    function callValidateSourceClass(TinjauRiskTypes.SourceClass v) external pure {
        TinjauRiskTypes.validateSourceClass(v);
    }

    function callValidateConfirmation(TinjauRiskTypes.ConfirmationStatus v) external pure {
        TinjauRiskTypes.validateConfirmationStatus(v);
    }

    function callValidateConfidence(TinjauRiskTypes.ConfidenceBand v) external pure {
        TinjauRiskTypes.validateConfidenceBand(v);
    }

    function callValidateDataMode(TinjauRiskTypes.DataMode v) external pure {
        TinjauRiskTypes.validateDataMode(v);
    }

    function callValidateReasonBits(uint32 bits) external pure {
        TinjauRiskTypes.validateReasonBits(bits);
    }
}
