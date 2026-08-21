import { EXPOSURE } from "./exposure";

/**
 * The questions a judge would ask, answered before they have to ask.
 *
 * Two rules shaped this file. Every answer states a fact that can be checked
 * somewhere else on the site or in the repository, and the last group exists
 * because the fastest way to lose a technical audience is to let them discover
 * a weakness you did not mention. The benchmark result, the constructed price
 * path, the fabricated rumour and the builder-controlled pool are all findable
 * in ten minutes, so they are answered here in the project's own words.
 *
 * The seven categories are the official judging criteria, verbatim from the
 * event's terms. No weights are published, so nothing here is ordered by
 * importance.
 */
export interface FaqItem {
  q: string;
  a: string;
  /** Where the reader can go and check it. */
  href?: string;
  hrefLabel?: string;
}

export interface FaqGroup {
  id: string;
  title: string;
  blurb: string;
  items: FaqItem[];
}

const { headline, byForm, scope } = EXPOSURE;
const ratio = Math.round(Math.abs(byForm[0].medianUsd) / Math.abs(byForm[1].medianUsd));

export const FAQ: FaqGroup[] = [
  {
    id: "ai",
    title: "Application of AI",
    blurb: "Where the model is used, and where it is deliberately not.",
    items: [
      {
        q: "What does the model actually do here?",
        a: "Four things, all of them language problems. It resolves which company and token a claim is about, groups republished copies back to a single origin, notices when two claims contradict each other or when one is hedged rather than asserted, and explains why its confidence moved. Nothing in that list is a decision to act.",
        href: "/risk",
        hrefLabel: "See the four jobs",
      },
      {
        q: "What is the model never allowed to do?",
        a: "Set a fee or any number the pool charges, choose a threshold at run time, authorise an action or overrule a refusal, extend a protection, cancel a cooldown, move funds, or change a state already recorded on chain. The thresholds are frozen in versioned configuration, not chosen by a model at runtime, and the contract rejects a proposal that fails its checks.",
        href: "/risk",
        hrefLabel: "See the boundary",
      },
      {
        q: "Could this be built without AI?",
        a: "The deciding half already is: promotion is deterministic rules over a structured evidence graph, and it would run unchanged if the graph were assembled by hand. What cannot be done by rule is reading a filing written in prose and working out that a CNBC story and a Wall Street Journal story are the same story. That is the part a model is used for, and it is the part that makes the rest possible.",
      },
      {
        q: "What happens when the model is wrong?",
        a: "It depends which way. If it under-reports, the state stays lower and the pool keeps its baseline fee, which is the status quo. If it over-reports, the deterministic gate still has to agree: rumour-only evidence cannot pass, a single source cannot pass, and stale or missing market data cannot create a new protection. The failure it cannot cause is an unbounded one, because the fee ceiling, the duration cap and the cooldown are contract constants.",
      },
    ],
  },
  {
    id: "innovation",
    title: "Innovation",
    blurb: "What is new, stated without a superlative.",
    items: [
      {
        q: "What is actually new here?",
        a: "The combination, and specifically the direction of the flow: cause first, then market confirmation, then a bounded action, rather than reacting to a price move and inferring a cause afterwards. A dynamic-fee hook that watches volatility is well-trodden. One that will not act until it can name the document behind the move, and that treats four outlets carrying one story as one source, is the part we could not find a public equivalent of.",
        href: "/proof",
        hrefLabel: "See the architecture comparison",
      },
      {
        q: "Are you claiming to be first at anything?",
        a: "No. The strongest sentence the review supports is a negative one: no complete public product with this exact reviewed combination was found. That is a statement about a search, not a claim about the world, and no page here says first.",
      },
      {
        q: "Why is the response only a fee?",
        a: "Because it is the narrowest action that still helps, and narrow is the point. Selling positions or moving liquidity would require trusting the whole pipeline with custody. A temporary fee rise inside a ceiling, on a clock that no component can extend, means the worst case of a total system failure is that a pool charged too much for a few hours and then stopped.",
      },
    ],
  },
  {
    id: "completeness",
    title: "Product completeness",
    blurb: "What runs, and what does not.",
    items: [
      {
        q: "What works end to end today?",
        a: "Both frozen scenarios run the full path: intake, evidence graph, deterministic decision, on-chain record, hook, and a real swap whose fee is decoded from the pool's own Swap event. The registry and the Uniswap v4 hook are deployed on X Layer Testnet with published addresses and verified bytecode, and a zero-dependency reader in the repository reads the record without touching our server.",
        href: "/proof",
        hrefLabel: "See the deployment ledger",
      },
      {
        q: "What is not finished?",
        a: "Live news and social discovery, a live OKX index leg, a production assessor key with its own lifecycle, third-party consumers, an SDK, mainnet, and an Exchange OS adapter. Each is listed with the specific condition that gates it rather than a date, because none of them is part-way through.",
        href: "/roadmap",
        hrefLabel: "See what is not built",
      },
      {
        q: "How much of this is tested?",
        a: "594 server tests, 137 contract tests including fuzz properties on the fee band, and 30 tests on the web layer that check claim discipline rather than rendering. The frozen scenarios are byte-identical across runs, and the demo manifest is re-derived from its source artifacts and diffed, so a number here cannot drift from the evidence it came from.",
      },
    ],
  },
  {
    id: "value",
    title: "User value",
    blurb: "Who benefits, and the one thing we cannot claim.",
    items: [
      {
        q: "Does Tinjau make liquidity providers money?",
        a: "We cannot say that, and the measurement is why. On our four frozen replay scenarios Tinjau never reached PROTECT, so its fee never left the baseline and its replayed economics tie a do-nothing policy rather than beating it. The pre-registered claim gate failed on exactly that condition, and the loss-reduction claim stays disabled everywhere on this site.",
        href: "/proof",
        hrefLabel: "See the claim gate",
      },
      {
        q: "Then what is the value?",
        a: "Restraint that can be checked, and a record anyone can read. A policy watching only price raised its fee on a routine filing at every trigger setting we tested; Tinjau declined it at every setting. On real pools, material filings cost the pool roughly " + ratio + " times the median routine one, and price alone cannot tell those two apart at the moment of the trade.",
        href: "/why-it-matters",
        hrefLabel: "See the measurement",
      },
      {
        q: "Is the problem real, or assumed?",
        a: "Measured. " + headline.eventCount + " real SEC filings against " + scope.pools + " real tokenised-equity pools on X Layer mainnet: " + headline.lossCount + " of them left the pool on the wrong side of the first trade afterwards. Those pools had no Tinjau hook attached, so this sizes the problem and says nothing about what Tinjau prevented.",
        href: "/why-it-matters",
        hrefLabel: "See all 32 events",
      },
    ],
  },
  {
    id: "x-layer",
    title: "Integration with X Layer",
    blurb: "Both directions, addressable.",
    items: [
      {
        q: "What is deployed on X Layer?",
        a: "A risk registry, a Uniswap v4 fee hook, a swap router, a liquidity router and a pool, on X Layer Testnet, chain 1952. Every address is published with its on-chain bytecode size, and the reference reader runs against the public RPC with no key.",
        href: "/x-layer",
        hrefLabel: "See the addresses",
      },
      {
        q: "Why does this need X Layer specifically?",
        a: "Because the three things the decision needs are already there together: tokenised US stocks trade on it, the pool whose price has to be defended is on it, and the block clock that ends the defence is the same clock. Nothing has to be bridged for the record and the enforcement to agree, and an expiring record plus a bounded fee are both cheap enough to put on chain.",
      },
      {
        q: "Is the OKX index leg working?",
        a: "No, and no artifact here says otherwise. No committed OKX index data covers any of the four frozen scenarios, so the OKX leg reads UNAVAILABLE for all of them and the X Layer pool leg carries confirmation alone. Dual-venue confirmation is a design property that is not yet demonstrated, and the phrase is banned from every surface.",
      },
    ],
  },
  {
    id: "growth",
    title: "Growth potential",
    blurb: "What scales, stated with the part that does not.",
    items: [
      {
        q: "The measured amounts are cents. Why does this matter?",
        a: "Because the cost scales with the size of the trade that arrives first, not with the mechanism. Two of the thirty-two events carried 76% of the entire dollar total, and both were driven by first trades roughly ten times the usual size. On today's thin pools the median event is immaterial against pool TVL, and we say so on the page that reports it. What changes as tokenised-equity liquidity deepens is the amount, not the shape.",
        href: "/why-it-matters",
        hrefLabel: "See the concentration",
      },
      {
        q: "Who else could use this without your permission?",
        a: "Anyone reading the registry. The risk record is a public on-chain object with a versioned schema, not an API behind a key, and the reference consumer in the repository proves it is readable with zero dependencies and no import from our server. That consumer was built by us, so it demonstrates reusability and is not adoption. This project claims no external users.",
        href: "/developers",
        hrefLabel: "Read the record yourself",
      },
      {
        q: "What would have to become true for this to be used for real?",
        a: "A live evidence feed rather than frozen fixtures, a live OKX index leg so confirmation rests on two venues, an assessor key with a lifecycle independent of the poster key, an audit, and a pool that is not ours. Each is on the roadmap with that condition named, and none of them is claimed as done.",
        href: "/roadmap",
        hrefLabel: "See the gates",
      },
    ],
  },
  {
    id: "ecosystem",
    title: "Contribution to the X Layer ecosystem",
    blurb: "What is useful to someone who never touches Tinjau.",
    items: [
      {
        q: "What did you give back?",
        a: "Three things. A measured characterisation of the public RPC's read consistency: it is load-balanced across nodes at differing heights, with a convergence lag of 2,519 to 2,746 ms per write, which for any risk consumer is a correctness bug rather than a latency annoyance. A zero-dependency reference reader that handles it correctly, pinning reads and reconciling stored against effective state. And an open measurement of the tokenised-equity pools themselves, with method, raw rows and limitations published so anyone can re-run or disagree with it.",
        href: "/x-layer",
        hrefLabel: "See all three",
      },
      {
        q: "Is any of this reusable by other builders?",
        a: "The RPC finding and the reader are, immediately and without using Tinjau at all. The risk record is reusable by design: a versioned public object with a documented schema. Whether anyone reuses it is not something this project can claim, and it does not.",
      },
    ],
  },
  {
    id: "hard",
    title: "The awkward questions",
    blurb: "Everything a careful reviewer would find anyway, in our own words.",
    items: [
      {
        q: "Your own benchmark went against you. Why publish it?",
        a: "Because we pre-registered it before seeing results, and a pre-registration you abandon when it disappoints is worth nothing. The economic comparison also flips sign between the two metric bases: every one of the 27 comparable cells reverses. Quoting either number alone would be picking a winner by picking an arithmetic convention, so both are published and neither is chosen.",
        href: "/proof",
        hrefLabel: "See both bases",
      },
      {
        q: "The PROTECT you demonstrate, is it a real result?",
        a: "No, and it is labelled on every surface that shows it. Tinjau reaches PROTECT on none of the four frozen replay scenarios. To show the bounded action at all, real replayed filing evidence was paired with a constructed price path on a pool we control. The confirmation verdict is the engine's; the price path is not real, and the canonical replay of that same event resolves to WATCH.",
        href: "/risk",
        hrefLabel: "See the caveat in place",
      },
      {
        q: "Is the rumour real?",
        a: "No. The social claim in the rumour scenario is SIMULATED, written by this project as a safety test, and carries a null source URL and a simulated identifier. The four news items alongside it are real and source-linked. It proves containment logic and proves nothing about live discovery, coverage or latency.",
      },
      {
        q: "Is the pool real?",
        a: "The two pools Tinjau deployed are builder-controlled test liquidity seeded with freely-mintable mock tokens that have no value. They demonstrate enforcement and they are not markets, so no figure measured on them is a market result. The ten pools in the exposure measurement are real third-party pools on X Layer mainnet, and they had no Tinjau hook attached.",
      },
      {
        q: "What is the weakest part of this project?",
        a: "That the evidence side runs on frozen fixtures rather than a live feed, which means latency and coverage are entirely unproven, and that the one economic claim we pre-registered failed. The behavioural finding survives, the enforcement path is real and on chain, and the measurement of the problem is on real pools. Everything else is labelled as what it is.",
      },
    ],
  },
];
