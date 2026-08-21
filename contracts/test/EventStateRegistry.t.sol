// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {EventStateRegistry} from "../src/EventStateRegistry.sol";
import {MockUSDT0} from "./mocks/MockUSDT0.sol";

/// @notice Tests for P1.6 (posting / reads) and P1.7 (challenge / resolution) of
/// EventStateRegistry. All local, using a MockUSDT0 (6-decimal) bond token — no live RPC,
/// no forked state, no deployment.
contract EventStateRegistryTest is Test {
    EventStateRegistry registry;
    MockUSDT0 usdt0;

    address owner = makeAddr("owner");
    address poster = makeAddr("poster");
    address resolver = makeAddr("resolver");
    address challenger = makeAddr("challenger");
    address randomUser = makeAddr("randomUser");
    address equityToken = makeAddr("equityToken");

    uint256 constant CHALLENGE_WINDOW = 48 hours;
    uint256 constant BOND_AMOUNT = 1_000 * 1e6; // 1,000.000000 USD₮0 (6 decimals)

    event EventPosted(
        uint256 indexed eventId,
        address indexed token,
        bytes32 indexed sourceContentHash,
        EventStateRegistry.EventType eventType,
        uint256 bondAmount,
        address poster
    );

    function setUp() public {
        usdt0 = new MockUSDT0();

        vm.prank(owner);
        registry = new EventStateRegistry(address(usdt0), poster, resolver, CHALLENGE_WINDOW);

        // Fund poster with USD₮0 and approve the registry.
        usdt0.mint(poster, 1_000_000 * 1e6);
        vm.prank(poster);
        usdt0.approve(address(registry), type(uint256).max);
    }

    // ---------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------

    function _defaultFacts() internal view returns (EventStateRegistry.FactualFields memory) {
        return EventStateRegistry.FactualFields({
            effectiveDate: block.timestamp + 7 days,
            declaredAmount: 250, // e.g. $0.25/share dividend in cents
            affectedToken: equityToken,
            currency: "USD",
            extraDataURI: "",
            extraDataHash: bytes32(0)
        });
    }

    function _fullAgreement() internal pure returns (EventStateRegistry.FieldAgreement memory) {
        return EventStateRegistry.FieldAgreement({
            eventTypeAgreement: 3,
            effectiveDateAgreement: 3,
            declaredAmountAgreement: 3,
            affectedTokenAgreement: 3,
            nextEventDateAgreement: 3
        });
    }

    function _neutralSeverity() internal pure returns (EventStateRegistry.SeverityGrade memory) {
        return EventStateRegistry.SeverityGrade({severity: 0, confidence: 80});
    }

    function _postDefaultEvent() internal returns (uint256 eventId) {
        vm.prank(poster);
        eventId = registry.postEvent(
            equityToken,
            EventStateRegistry.EventType.Form8K_Earnings,
            "8-K Item 2.02",
            _defaultFacts(),
            _fullAgreement(),
            _neutralSeverity(),
            "https://www.sec.gov/example-filing",
            keccak256("source-document-bytes"), // stand-in for a real SHA-256 hash in tests
            block.timestamp + 30 days,
            BOND_AMOUNT
        );
    }

    // ---------------------------------------------------------------
    // P1.6 — postEvent
    // ---------------------------------------------------------------

    function test_postEvent_storesFieldsAndLocksBond() public {
        uint256 posterBalanceBefore = usdt0.balanceOf(poster);

        uint256 eventId = _postDefaultEvent();

        assertEq(eventId, 1, "first event id should be 1");
        assertEq(usdt0.balanceOf(address(registry)), BOND_AMOUNT, "bond should be locked in registry");
        assertEq(usdt0.balanceOf(poster), posterBalanceBefore - BOND_AMOUNT, "bond should be pulled from poster");

        EventStateRegistry.EventState memory e = registry.getEvent(eventId);
        assertEq(e.token, equityToken);
        assertEq(uint8(e.eventType), uint8(EventStateRegistry.EventType.Form8K_Earnings));
        assertEq(e.eventTypeLabel, "8-K Item 2.02");
        assertEq(e.facts.declaredAmount, 250);
        assertEq(e.facts.currency, "USD");
        assertEq(e.agreement.declaredAmountAgreement, 3);
        assertEq(e.severity.severity, 0);
        assertEq(e.sourceUrl, "https://www.sec.gov/example-filing");
        assertEq(e.bondAmount, BOND_AMOUNT);
        assertEq(e.poster, poster);
        assertFalse(e.challenged);
        assertFalse(e.resolved);

        assertEq(registry.latestEventIdForToken(equityToken), eventId);
    }

    function test_postEvent_emitsEventPosted() public {
        vm.expectEmit(true, true, true, true, address(registry));
        emit EventPosted(
            1,
            equityToken,
            keccak256("source-document-bytes"),
            EventStateRegistry.EventType.Form8K_Earnings,
            BOND_AMOUNT,
            poster
        );
        _postDefaultEvent();
    }

    function test_postEvent_revertsForNonPoster() public {
        vm.prank(randomUser);
        vm.expectRevert(EventStateRegistry.NotPoster.selector);
        registry.postEvent(
            equityToken,
            EventStateRegistry.EventType.Form8K_Earnings,
            "8-K Item 2.02",
            _defaultFacts(),
            _fullAgreement(),
            _neutralSeverity(),
            "https://www.sec.gov/example-filing",
            keccak256("x"),
            0,
            BOND_AMOUNT
        );
    }

    function test_postEvent_revertsWithoutApproval() public {
        address unapprovedPoster = makeAddr("unapprovedPoster");
        vm.prank(owner);
        registry.setPoster(unapprovedPoster);
        usdt0.mint(unapprovedPoster, BOND_AMOUNT);
        // no approve() call

        vm.prank(unapprovedPoster);
        vm.expectRevert(); // MockUSDT0 reverts with "insufficient allowance"
        registry.postEvent(
            equityToken,
            EventStateRegistry.EventType.Form8K_Earnings,
            "8-K Item 2.02",
            _defaultFacts(),
            _fullAgreement(),
            _neutralSeverity(),
            "url",
            keccak256("x"),
            0,
            BOND_AMOUNT
        );
    }

    function test_postEvent_zeroBondAllowed() public {
        vm.prank(poster);
        uint256 eventId = registry.postEvent(
            equityToken,
            EventStateRegistry.EventType.Form4_InsiderBuy,
            "Form 4",
            _defaultFacts(),
            _fullAgreement(),
            _neutralSeverity(),
            "url",
            keccak256("x"),
            0,
            0
        );
        assertEq(registry.getEvent(eventId).bondAmount, 0);
    }

    function test_getLatestEvent_revertsWhenNoneExists() public {
        vm.expectRevert(EventStateRegistry.EventDoesNotExist.selector);
        registry.getLatestEvent(equityToken);
    }

    function test_getLatestEvent_tracksMostRecentPost() public {
        _postDefaultEvent();
        vm.prank(poster);
        uint256 secondId = registry.postEvent(
            equityToken,
            EventStateRegistry.EventType.Form8K_ExecutiveChange,
            "8-K Item 5.02",
            _defaultFacts(),
            _fullAgreement(),
            _neutralSeverity(),
            "url2",
            keccak256("y"),
            0,
            BOND_AMOUNT
        );

        EventStateRegistry.EventState memory latest = registry.getLatestEvent(equityToken);
        assertEq(latest.sourceUrl, "url2");
        assertEq(registry.latestEventIdForToken(equityToken), secondId);
    }

    function test_getEventSummary_returnsBondedAndUnbondedFieldsSeparately() public {
        uint256 eventId = _postDefaultEvent();
        (
            EventStateRegistry.EventType eventType,
            EventStateRegistry.FieldAgreement memory agreement,
            EventStateRegistry.SeverityGrade memory severity,
            uint256 timestamp,
            bool isDisputedUnresolved
        ) = registry.getEventSummary(eventId);

        assertEq(uint8(eventType), uint8(EventStateRegistry.EventType.Form8K_Earnings));
        assertEq(agreement.declaredAmountAgreement, 3);
        assertEq(severity.severity, 0);
        assertEq(timestamp, block.timestamp);
        assertFalse(isDisputedUnresolved);
    }

    // ---------------------------------------------------------------
    // P1.7 — challenge / resolveChallenge
    // ---------------------------------------------------------------

    function test_challenge_withinWindow_succeeds() public {
        uint256 eventId = _postDefaultEvent();

        vm.prank(challenger);
        registry.challenge(eventId);

        EventStateRegistry.EventState memory e = registry.getEvent(eventId);
        assertTrue(e.challenged);
        assertEq(e.challenger, challenger);
    }

    function test_challenge_revertsAfterWindowCloses() public {
        uint256 eventId = _postDefaultEvent();

        vm.warp(block.timestamp + CHALLENGE_WINDOW + 1);

        vm.prank(challenger);
        vm.expectRevert(EventStateRegistry.ChallengeWindowClosed.selector);
        registry.challenge(eventId);
    }

    function test_challenge_atExactWindowBoundary_succeeds() public {
        uint256 eventId = _postDefaultEvent();
        vm.warp(block.timestamp + CHALLENGE_WINDOW); // exactly at boundary, inclusive

        vm.prank(challenger);
        registry.challenge(eventId);
        assertTrue(registry.getEvent(eventId).challenged);
    }

    function test_challenge_revertsIfAlreadyChallenged() public {
        uint256 eventId = _postDefaultEvent();
        vm.prank(challenger);
        registry.challenge(eventId);

        address secondChallenger = makeAddr("secondChallenger");
        vm.prank(secondChallenger);
        vm.expectRevert(EventStateRegistry.AlreadyChallenged.selector);
        registry.challenge(eventId);
    }

    function test_challenge_revertsForNonexistentEvent() public {
        vm.expectRevert(EventStateRegistry.EventDoesNotExist.selector);
        registry.challenge(999);
    }

    function test_resolveChallenge_challengerWins_paysBondToChallenger() public {
        uint256 eventId = _postDefaultEvent();
        vm.prank(challenger);
        registry.challenge(eventId);

        uint256 challengerBalanceBefore = usdt0.balanceOf(challenger);

        vm.prank(resolver);
        registry.resolveChallenge(eventId, true);

        assertEq(usdt0.balanceOf(challenger), challengerBalanceBefore + BOND_AMOUNT);
        assertEq(usdt0.balanceOf(address(registry)), 0);

        EventStateRegistry.EventState memory e = registry.getEvent(eventId);
        assertTrue(e.resolved);
        assertTrue(e.challengerWon);
    }

    function test_resolveChallenge_challengerLoses_returnsBondToPoster() public {
        uint256 eventId = _postDefaultEvent();
        uint256 posterBalanceAfterPost = usdt0.balanceOf(poster);

        vm.prank(challenger);
        registry.challenge(eventId);

        vm.prank(resolver);
        registry.resolveChallenge(eventId, false);

        assertEq(usdt0.balanceOf(poster), posterBalanceAfterPost + BOND_AMOUNT);
        assertEq(usdt0.balanceOf(address(registry)), 0);

        EventStateRegistry.EventState memory e = registry.getEvent(eventId);
        assertTrue(e.resolved);
        assertFalse(e.challengerWon);
    }

    function test_resolveChallenge_revertsForNonResolver() public {
        uint256 eventId = _postDefaultEvent();
        vm.prank(challenger);
        registry.challenge(eventId);

        vm.prank(randomUser);
        vm.expectRevert(EventStateRegistry.NotResolver.selector);
        registry.resolveChallenge(eventId, true);
    }

    function test_resolveChallenge_revertsIfNotChallenged() public {
        uint256 eventId = _postDefaultEvent();

        vm.prank(resolver);
        vm.expectRevert(EventStateRegistry.NotChallenged.selector);
        registry.resolveChallenge(eventId, true);
    }

    function test_resolveChallenge_revertsIfAlreadyResolved() public {
        uint256 eventId = _postDefaultEvent();
        vm.prank(challenger);
        registry.challenge(eventId);
        vm.prank(resolver);
        registry.resolveChallenge(eventId, true);

        vm.prank(resolver);
        vm.expectRevert(EventStateRegistry.AlreadyResolved.selector);
        registry.resolveChallenge(eventId, true);
    }

    function test_resolveChallenge_posterCannotResolveOwnEvent() public {
        // Enforces the "separate key" self-dealing protection: poster != resolver.
        uint256 eventId = _postDefaultEvent();
        vm.prank(challenger);
        registry.challenge(eventId);

        vm.prank(poster);
        vm.expectRevert(EventStateRegistry.NotResolver.selector);
        registry.resolveChallenge(eventId, false);
    }

    // ---------------------------------------------------------------
    // Admin / key rotation
    // ---------------------------------------------------------------

    function test_setPoster_onlyOwner() public {
        address newPoster = makeAddr("newPoster");
        vm.prank(randomUser);
        vm.expectRevert(EventStateRegistry.NotOwner.selector);
        registry.setPoster(newPoster);

        vm.prank(owner);
        registry.setPoster(newPoster);
        assertEq(registry.poster(), newPoster);
    }

    function test_setResolver_onlyOwner() public {
        address newResolver = makeAddr("newResolver");
        vm.prank(randomUser);
        vm.expectRevert(EventStateRegistry.NotOwner.selector);
        registry.setResolver(newResolver);

        vm.prank(owner);
        registry.setResolver(newResolver);
        assertEq(registry.resolver(), newResolver);
    }

    function test_constructor_revertsOnZeroAddress() public {
        vm.expectRevert(EventStateRegistry.ZeroAddress.selector);
        new EventStateRegistry(address(0), poster, resolver, CHALLENGE_WINDOW);

        vm.expectRevert(EventStateRegistry.ZeroAddress.selector);
        new EventStateRegistry(address(usdt0), address(0), resolver, CHALLENGE_WINDOW);

        vm.expectRevert(EventStateRegistry.ZeroAddress.selector);
        new EventStateRegistry(address(usdt0), poster, address(0), CHALLENGE_WINDOW);
    }

    // ---------------------------------------------------------------
    // 6-decimal sanity check (guards against the 18-decimal bug class)
    // ---------------------------------------------------------------

    function test_bondToken_is6Decimals() public view {
        assertEq(usdt0.decimals(), 6, "USDT0 must be treated as 6 decimals, not 18");
    }

    function test_bondAmount_humanUnitsUse6DecimalScale() public view {
        // 1,000 USD₮0 should be represented as 1_000 * 1e6, i.e. 1_000_000_000 base units,
        // NOT 1_000 * 1e18. This test locks that convention in.
        assertEq(BOND_AMOUNT, 1_000_000_000);
        assertEq(BOND_AMOUNT, 1_000 * 10 ** usdt0.decimals());
    }
}
