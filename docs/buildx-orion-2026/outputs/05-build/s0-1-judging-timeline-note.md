# S0.1 — Judging timeline, judging surface, and the Liquidity Grant window

- Date: **2026-08-21** (written 17:53–18:30 UTC / 2026-08-22 00:53 WIB, i.e. ~6 hours before the
  2026-08-21 23:59 UTC submission deadline, which has **not** yet passed at time of writing)
- Task: `../04-planning/tinjau-score-improvement-task-tracker.md` §2, S0.1
- Method: repo terms records first, then the organizer's own published pages. **No contact with
  the organizer of any kind** — no email, no Discord/Telegram, no form submission, no support
  ticket. Every source below is a page any member of the public can open.
- Event under examination: **X Layer "Build X Series — AI Season"** (Event A in
  `../../HACKATHON.md`), the event whose 2026-08-21 23:59 UTC deadline governs this project.
  Event B (Orion Builder Hackathon, deadline 2026-09-02) is out of scope for this note.
- Primary URL: <https://web3.okx.com/xlayer/build-x-series>
- Submission form URL (read only; nothing was submitted):
  <https://docs.google.com/forms/d/e/1FAIpQLSfgU_3zcXdxK0GJQxj33QeUWdEcAaYnieVe9p5cFDb2JFQa4Q/viewform>

A note on how the primary source was read. `../../REFERENCES.md` REF-027 records a standing
caution (LEARN-006) that WebFetch summarises and can therefore hide absence. For this note the
event page was fetched as **raw HTML with `curl`** and converted to text locally, and the Google
Form's field list was read from its raw `FB_PUBLIC_LOAD_DATA_` blob. Every quotation below is
verbatim from that raw text, not from a summarising layer. Working copies of both fetches are in
this session's scratchpad and are not committed.

---

## 1. What is known

Everything in this section is a **fact** with a verbatim quotation and a URL.

### 1.1 (a) When does judging occur, and are there multiple rounds?

**The competition window is published. The judging window is not.**

Source: <https://web3.okx.com/xlayer/build-x-series>, "Terms and conditions", clause 2:

> 2. Hackathon Period. The Hackathon runs from August 7, 2026, until August 21, 2026, at 23:59
> UTC (the "Hackathon Period"). The Organizer reserves the right to extend, shorten, or otherwise
> modify the Hackathon Period.

Source: same page, "Requirements" → "Participation Requirements":

> Complete the submission through the designated Google Form by August 21, 2026, at 23:59 UTC.

The page's clause on judging says **nothing about when judging happens**. Same page, "Terms and
conditions", clause 4, quoted in full:

> 4. Judging. Projects will be evaluated based on their application of AI, innovation, product
> completeness, user value, integration with X Layer, growth potential, and contribution to the X
> Layer ecosystem. The Organizer's decisions regarding eligibility, judging results, and winners
> are final.

The only post-deadline dates the page publishes belong to the **Launch Grant**, which is a
separate, volume-based prize that Tinjau is not pursuing. Same page, FAQ, "How will the Launch
Grant be awarded?":

> Projects must generate at least USD 10,000,000 in cumulative trading volume by August 31, 2026,
> at 23:59 (UTC+8). Only transactions executed through the OKX DEX interface will count toward
> this trading-volume requirement; transactions executed via the OKX DEX API will be excluded. A
> grant of 50,000 USDT will be unlocked for every full USD 10,000,000 in trading volume, up to a
> maximum of 200,000 USDT per project.
>
> The official data snapshot will be taken on September 1, 2026, and the data will be reviewed by
> the anti-fraud team. Projects found to have engaged in wash trading, volume manipulation, or
> other fraudulent activity will be disqualified from receiving the Launch Grant.

Same page, "Terms and conditions", clause 5, is the only other timing signal, and it is relative
rather than dated:

> 5. Prizes and Distribution. Prize categories and amounts are described on the Hackathon webpage.
> Digital asset prizes will be sent to the winners' designated wallet addresses after the
> Hackathon and completion of all applicable verification procedures.

**Rounds:** the page describes no phases, no shortlist, no finalist round, and no demo day. The
word "finalist" appears exactly once, in a disclaimer about what winning does not mean
("Selection as a winner or finalist does not constitute an endorsement…"), which shows the concept
exists in the organizer's boilerplate but is never given a schedule or a mechanism anywhere on the
page.

**Status of (a):** the deadline is fact. **The judging date, the announcement date, and whether
there are multiple rounds are not published.** See §3.

### 1.2 (b) Frozen artifact, or live repo and site?

**No rule on this exists in the published terms.** What *is* known is the submission mechanism and
four clauses that bear on it indirectly.

**The submission is links, not an artifact.** The Google Form was read directly (its
`FB_PUBLIC_LOAD_DATA_` blob), and it contains exactly eight fields, all free-text, in this order:

> `Project Name`, `Project Description`, `Project URL`, `Github`, `Email`, `Telegram`,
> `X ( Twitter ) Handle`, `X ( Twitter ) Post URL`

Form title: `AI Season Hackathon`. URL:
<https://docs.google.com/forms/d/e/1FAIpQLSfgU_3zcXdxK0GJQxj33QeUWdEcAaYnieVe9p5cFDb2JFQa4Q/viewform>

There is **no file upload, no archive, no commit hash field, no tag field, no version field, and
no release-URL field**. Nothing in the form pins a point in time. Whatever a judge opens from
`Project URL` or `Github` is whatever those URLs serve at the moment the judge opens them. This is
a fact about the submission channel's mechanics; it is not a statement by the organizer about what
judges are instructed to look at.

**Three published clauses refer to state that continues past the deadline.**

Source: <https://web3.okx.com/xlayer/build-x-series>, "Requirements" → "Participation
Requirements", whose preamble reads *"Participating projects must meet all of the following
requirements. Projects that fail to meet any requirement will be ineligible to participate in the
Hackathon or receive prizes."* Two of the listed requirements are:

> During the Hackathon, the project must be deployed on the X Layer Testnet and subsequently
> launched on the X Layer Mainnet.

> The project must have a dedicated X account and keep it active throughout the project's
> lifetime.

Both describe obligations that extend beyond 2026-08-21 23:59 UTC — "subsequently" and "throughout
the project's lifetime" are both, on their face, post-deadline. (REF-027 in `../../REFERENCES.md`
already established the reading that "subsequently" places mainnet launch *after* the hackathon
window and that testnet deployment satisfies the submission-time requirement. That reading is
unchanged by this note.)

Source: same page, "Disclaimer", clause 4:

> 4. Final Determination. The Organizer will consider onchain data, code quality, innovation, and
> market potential. Final rankings will be determined at the Organizer's sole discretion.

"Onchain data" and "code quality" are properties of live artifacts — a chain and a repository —
not of anything captured in an eight-field form.

Source: same page, "Terms and conditions", clause 12:

> 12. Modification Rights. The Organizer may interpret, modify, suspend, cancel, or terminate any
> part of the Hackathon or these Terms at any time. The Organizer has sole discretion regarding
> the interpretation and application of these Terms.

**Status of (b):** **not determinable from public material as a stated rule.** The organizer has
published no sentence saying either "submissions are frozen at the deadline" or "judges evaluate
the live project". See §3.

### 1.3 (c) The AI-RWA Liquidity Grant's evaluation window

Source: <https://web3.okx.com/xlayer/build-x-series>, FAQ, "How can I receive a Liquidity Grant?",
quoted in full:

> The Liquidity Grant is available to projects competing in the AI-RWA track. The Organizer will
> evaluate projects based on their overall performance during the Hackathon, including product
> quality, innovation, user value, and contribution to the ecosystem. The best-performing project
> will receive the grant. The grant must be used to support the winning project's growth and
> further develop the X Layer ecosystem.

Source: same page, "Prizes" table, "Liquidity Grant" row:

> 50,000 USDT. Awarded to the best-performing project in the AI-RWA track. The grant must be used
> to support the project's growth and further develop the X Layer ecosystem.

Two facts follow directly from the text:

- The phrase is **"during the Hackathon"**, and "the Hackathon" is a defined term: clause 2 defines
  the Hackathon Period as **August 7 – August 21, 2026, 23:59 UTC**. Read strictly, the grant's
  evaluation window is that fourteen-day span.
- **No separate snapshot date, cutoff, or measurement date is published for the Liquidity Grant.**
  This is a meaningful absence rather than an oversight: the Launch Grant on the very same page
  *does* get an explicit cutoff (Aug 31 23:59 UTC+8) and an explicit snapshot date (Sep 1, 2026).
  The organizer publishes measurement dates when the measurement is mechanical. The Liquidity
  Grant's four criteria are qualitative and receive none.

**Status of (c):** the *wording* of the window is fact ("during the Hackathon" = Aug 7–21). Whether
that phrase operates as a hard cutoff on what counts, or as a loose description of the body of
work, is not resolved by the text. See §3.

### 1.4 A correction to an existing repo record (no file edited)

`../../HACKATHON.md:67` currently states:

> **Correction:** "code quality", "onchain data" and "market potential" appear in the spreadsheet
> extraction but **not** in the official terms — do not treat them as criteria.

That correction is **itself wrong**, and this note records the fact without editing the file (S0.1
is scoped to create one file only). All three phrases *do* appear on the official event page,
verbatim, in the **Disclaimer** block's clause 4 ("Final Determination", quoted in §1.2 above) —
which is a different numbered list from the **Terms and conditions** block's clause 4 ("Judging").
The page has two separate numbered lists, and the earlier reading appears to have checked only one
of them.

Practical effect: **eleven** distinct evaluation words are published across the two clauses, not
seven. The seven from Terms clause 4 (application of AI, innovation, product completeness, user
value, integration with X Layer, growth potential, contribution to the X Layer ecosystem) plus
four from Disclaimer clause 4 (onchain data, code quality, innovation, market potential;
"innovation" is shared). This does not invalidate the seven-criterion framing the site and the
evaluation prompts are built around — that framing is still directly sourced from the Judging
clause — but "code quality" and "onchain data" are legitimately citable organizer criteria, which
is relevant to §4's ranking. Recommend Dien or a later task fix `HACKATHON.md:67`.

---

## 2. What is assumed

Everything in this section is **inference**, mine, labelled as such. None of it is organizer policy.

### 2.1 [Inference] Judging almost certainly happens after the deadline and before mid-September

Basis: three published facts constrain it. Prizes are sent "after the Hackathon and completion of
all applicable verification procedures" (Terms clause 5), so judging is post-deadline. The Launch
Grant's anti-fraud review is keyed to a Sep 1 snapshot, so an organizer process is already
scheduled for early September. And the immediately preceding event in the same series completed
its cycle in one week (see §2.2). Confidence: moderate for the direction, low for any specific
date.

### 2.2 [Inference] Roughly one week from deadline to announcement, based on the previous season

Basis: the previous event in the same Build X Series, run by the same organizer — the **OKX.AI
Genesis Hackathon** — ran "Jul 2, 2026 11:00 – Jul 27, 2026 22:59" with "Winner Announcement Aug
3, 2026 23:00" per its HackQuest listing (<https://www.hackquest.io/hackathons/OKXAI-Genesis-Hackathon>).
That is **seven days** from close to announcement. The X Layer account's own post before that
deadline said *"Winner announcements begin Aug 3"*
(<https://x.com/XLayerOfficial/status/2081674886662299692>).

Two caveats I will not paper over. **HackQuest is a third-party listing platform, not the
organizer's own site** — secondary source. And the X post text is quoted from a **search-result
snippet**; x.com returned HTTP 402 to a direct fetch, so I could not open the post itself and
verify the full wording. Treat both as corroborating, not as established.

Applied to AI Season: an announcement in the **week of 2026-08-28** would match the precedent. The
official AI Season page publishes no such date, and Genesis had a different structure (ASP
listings, category prizes, "OKXAI Internal Review" as the stated judging mechanism), so the
transfer is loose.

### 2.3 [Inference] The evidence leans toward live evaluation, but does not establish it

Basis, in descending strength:

1. **Mechanics.** The submission captures URLs and nothing else (§1.2). Freezing would require the
   organizer to archive each entry separately at 23:59 UTC — possible, but nothing in the public
   material suggests they do, and no field lets a participant pin a version.
2. **Stated criteria.** "Onchain data" and "code quality" (Disclaimer clause 4) are read off live
   systems. A reviewer assessing code quality is in the repository as it stands when they open it.
3. **Precedent behaviour.** During the Genesis review the organizer's account posted: *"We'd like
   to thank everyone who participated in the OKX AI Genesis Hackathon. We've received a high
   volume of applications and are reviewing them as quickly as possible. During the review
   process, we found that several promising ASPs are currently offline or not functioning as…"*
   (<https://x.com/XLayerOfficial/status/2084142790049673640>). If accurate, the organizer checked
   whether submitted things were **live during post-deadline review**, and treated being offline
   as a problem. Genesis's own rules, per HackQuest, went further: ASPs *"must pass OKX AI's
   internal review and go live to remain eligible. If the ASP listing is not approved or cannot go
   live, your hackathon submission will be deemed invalid."* **Both of these are secondary
   sources** — a search snippet from an unfetchable x.com post, and a third-party listing page —
   and both describe a *different event with different rules*. AI Season's own terms contain no
   equivalent clause.
4. **Ongoing obligations.** "keep it active throughout the project's lifetime" and "subsequently
   launched on the X Layer Mainnet" only make sense if the organizer expects to look at the
   project after the deadline (§1.2).

What this does **not** establish: that a judge will *credit* improvements made after the deadline.
"The judge sees the current state" and "the judge scores work done after the deadline" are
different propositions. A reviewer opening the repo on Aug 28 sees post-deadline commits; whether
they weigh them, ignore them, or hold them against the entry is unpublished and unknowable.

### 2.4 [Inference] "During the Hackathon" in the Liquidity Grant clause is descriptive, not a fence

Basis: the sentence's job is to say *what* is evaluated (overall performance, four named
dimensions) and *who* is eligible (the AI-RWA track). Compare the Launch Grant paragraph, which
when the organizer wants a hard cutoff says so with a date, a time, a timezone, and a snapshot
day. The Liquidity Grant paragraph has none of those instruments. Confidence: moderate. A strict
reading — that only Aug 7–21 activity counts — is textually available and I cannot rule it out.

### 2.5 [Inference] The Liquidity Grant is the one prize with a structural interest in what happens next

Basis: it is the only prize whose published purpose is forward-looking — *"The grant must be used
to support the winning project's growth and further develop the X Layer ecosystem."* It is
restricted-use growth funding for a project the organizer expects to keep building on X Layer, and
one of its four named criteria is "contribution to the ecosystem". An evaluator picking a
recipient for growth funding has an obvious reason to care about whether the project is still
moving. This is reasoning about incentives, not a published rule.

---

## 3. What is unknowable from public material

Stated plainly, with no substitute answer manufactured.

- **(a) The judging date and the winner-announcement date are not published.** The AI Season page
  gives the competition window and the Launch Grant's mechanical dates, and nothing else. §2.2's
  one-week estimate is an extrapolation from a *different* event, corroborated only by secondary
  sources.
- **(a) Whether judging has multiple rounds is not published.** The page describes no phases,
  shortlist, finalist stage, or demo day. The single appearance of "finalist" is in a disclaimer,
  not a schedule.
- **(b) Whether judges are directed at a frozen submission artifact or at the live repository and
  website is not determinable from public material.** This is the question S0.1 most wanted
  answered, and the honest answer is that the organizer has never addressed it in writing. §2.3
  gives circumstantial reasons to lean live; leaning is not knowing.
- **(b) Whether a post-deadline commit would be credited, ignored, or penalised is unknowable.**
  Even under the live reading, no public material says how a judge treats work visibly dated after
  2026-08-21.
- **(c) Whether "during the Hackathon" fences the Liquidity Grant to Aug 7–21 is unresolved.** Both
  readings survive the text. No Liquidity Grant snapshot date exists to settle it.
- **Anything requiring a question to the organizer is out of scope by construction.** Under this
  task's rules the correct output for such an item is exactly this line, and it is worth stating
  that a single clarifying question would likely resolve (b) — that route is closed here by
  instruction, not by difficulty.

One structural fact worth holding alongside all of the above. Terms clause 12 lets the Organizer
*"interpret, modify, suspend, cancel, or terminate any part of the Hackathon or these Terms at any
time"* with *"sole discretion regarding the interpretation and application of these Terms."* Even
a definitive answer today would be revocable. **No plan should be built that only works under one
reading of an unpublished rule.**

---

## 4. Consequences for prioritisation

This section presents the decision. **Dien approves the ranking; this proposes it.**

### 4.0 Two things that are settled and do not move

- **Eligibility is secured and cannot be lost by later work.** `TinjauRiskRegistry` and
  `TinjauFeeHook` deployment transactions landed in block **38 824 844** at **2026-08-21 03:41:21
  UTC**, before the deadline, satisfying the published requirement that the project *"be deployed
  on the X Layer Testnet"* during the Hackathon. Nothing in this note puts that at risk, and
  nothing below should be read as protecting it — it does not need protecting.
- **The pre-deadline sprint is complete** (S1.1–S1.4 and the S2.1 stretch goal all landed
  pre-deadline). This note informs what happens next. It gates nothing.

### 4.1 Which branch the evidence supports

**The evidence does not settle it.** There is no published rule either way (§3).

The lean, stated with its actual confidence: the mechanics of the submission channel and two
stated criteria ("onchain data", "code quality") point toward judges opening live URLs at judging
time, and the previous season's organizer behaviour is consistent with that — but that behaviour
is documented only in secondary sources describing a differently-structured event. I would put it
no higher than *more likely than not* that a judge sees the repo and site as they stand when they
look. And "sees" still does not imply "credits" (§2.3).

The Liquidity Grant pulls slightly the other way in its own wording ("during the Hackathon"), and
strongly the other way in its purpose (forward-looking growth funding, §2.5). Those two pressures
partly cancel.

**Therefore the recommended posture is the one that survives both readings**, rather than a bet on
either. Concretely: prefer work that is worth doing even if no judge ever sees it, and do the cheap
bookkeeping that makes the branch question moot.

### 4.2 Unconditional first, in both branches: S0.2

**S0.2 (tag `submission-final`, start `POST-SUBMISSION.md`) ranks first regardless of branch**, and
its value is *higher* in the frozen branch, not lower.

- Frozen branch: the tag is what lets anyone reconstruct exactly what was submitted, and
  `POST-SUBMISSION.md` is what stops a later reader mistaking added work for submitted work.
- Live branch: the same two artifacts are what let post-deadline work be shown honestly instead of
  ambiguously. A judge who opens the repo on Aug 28 and finds a dated changelog saying plainly
  what arrived after the deadline reads a project with claim discipline — which the independent
  evaluation named as this project's strongest asset.

It is minutes of work and it is the only task whose payoff does not depend on resolving §3.

### 4.3 Branch LIVE — if post-deadline changes CAN influence hackathon judging

The tracker's ranking stands as-is. The judged criteria are the seven from Terms clause 4, and the
evaluation's own stated movers drive the order.

1. **S0.2** — tag and changelog (§4.2)
2. **S3.1 → S3.2** — pre-register and run the paired-pool experiment. User value is the largest
   scored gap (3→5) and the evaluator named this exact task.
3. **S5.1** — wire the live X listener. Product completeness 7→8, evaluator-named.
4. **S2.2** — live LLM evidence-graph derivations. Application of AI 6→8; S2.1 already landed, so
   this compounds a path that is half-built.
5. **S4.1** — competitor survey. Converts an unverified novelty claim into a cited one; also the
   cheapest task on the list that carries claim-discipline risk if left undone.
6. **S6.1 → S6.2** — integration kit and the RPC read-consistency note. Ecosystem contribution 6→7.
7. **S3.3** — widen the canonical scenario set.
8. **S5.2** — live news intake.
9. **S7.1** — mainnet readiness memo.
10. **S6.3** — demand-evidence outreach kit (P2; gated on S3.2 and on Dien for all contact).

### 4.4 Branch FROZEN — if post-deadline changes CANNOT influence hackathon judging

The remaining work keeps real value, for two named reasons: the **AI-RWA Liquidity Grant** (same
track, judged on *"overall performance during the Hackathon, including product quality,
innovation, user value, and contribution to the ecosystem"*) and the project's life after the
event. But the weighting changes, because the grant names **four** dimensions rather than seven,
and two of them (user value, ecosystem contribution) carry 1/4 each here versus 1/7 each in the
hackathon criteria. Ecosystem and durable-value work rises; work whose only payoff was a judged
score falls.

1. **S0.2** — tag and changelog (§4.2). Highest value in this branch, per above.
2. **S6.2** — the X Layer RPC read-consistency note. Promoted sharply. It is a standalone
   contribution to the X Layer ecosystem, usable by any X Layer builder without cloning Tinjau,
   and "contribution to the ecosystem" is 1 of the grant's 4 dimensions. It is also the single
   task here whose value is entirely independent of whether Tinjau wins anything.
3. **S6.1** — the integration kit. Same reasoning; also the concrete form "contribution to the
   ecosystem" takes for a registry.
4. **S3.1 → S3.2** — paired-pool experiment. Still top-tier: user value is 1 of the grant's 4, and
   this is the project's only route to a measured economic result.
5. **S7.1** — mainnet readiness memo. Promoted from P2. The Liquidity Grant is restricted-use
   growth funding for further X Layer development, and mainnet launch is a stated (undated,
   post-deadline) participation requirement. A memo that lets Dien make that call in one sitting
   is directly grant-relevant and durable. It still recommends rather than decides, and deploying
   remains outside this tracker.
6. **S4.1** — competitor survey. Innovation is 1 of the grant's 4, and the survey is durable
   regardless of the event.
7. **S5.1 → S5.2** — live intake. Demoted one band. Product completeness maps onto the grant's
   "product quality", so it still counts, just less sharply than under the seven criteria.
8. **S2.2** — live LLM derivations. Demoted most. "Application of AI" is a hackathon criterion and
   is **not** among the grant's four named words; S2.1 already landed pre-deadline and carries the
   submitted state on its own.
9. **S3.3** — widen the canonical scenario set.
10. **S6.3** — demand-evidence outreach kit. Unchanged at the bottom by dependency, though note it
    becomes the most grant-relevant P2 item if S3.2 produces anything worth showing.

### 4.5 The overlap, if Dien prefers not to pick a branch

Under both rankings the first four items are drawn from the same pool: **S0.2, S3.1→S3.2, S6.1,
S6.2**. Starting there costs nothing in either branch and buys time for the ambiguity in §3 to
resolve itself — an announcement, a post from `@XLayerOfficial`, or simply the passage of the week
of 2026-08-28.

The one place the branches genuinely diverge is **S2.2 versus S7.1**: S2.2 is worth more if judging
is live, S7.1 is worth more if it is not. That single trade is the only decision that actually
needs the branch resolved, and it can be deferred until after the four overlap tasks.

### 4.6 Two constraints that hold in every branch

- **The integrity rules of the tracker's §0.3 are not relaxed by any finding here.** Nothing is
  backdated; post-deadline additions are labelled as post-deadline; the submitted state stays
  reconstructible. If it turns out judging is live, that makes honest labelling more valuable, not
  less.
- **§0.8 boundaries still require Dien at the moment of the action** — mainnet, real money, paid
  APIs, new accounts, outbound posting, and all contact with third parties including the
  organizer.

---

## Sources

Primary (organizer's own published material):

- X Layer "Build X Series — AI Season" event page, including Prizes, Participation Requirements,
  FAQ, Disclaimer, and Terms and conditions — <https://web3.okx.com/xlayer/build-x-series>
  (fetched as raw HTML, 2026-08-21)
- AI Season Hackathon submission Google Form, field list read from the page's own data blob;
  **read only, nothing submitted** —
  <https://docs.google.com/forms/d/e/1FAIpQLSfgU_3zcXdxK0GJQxj33QeUWdEcAaYnieVe9p5cFDb2JFQa4Q/viewform>

Secondary, used only for the §2.2 and §2.3 precedent inferences and labelled as such in place:

- HackQuest listing for the OKX.AI Genesis Hackathon (third-party platform, not the organizer's
  site) — <https://www.hackquest.io/hackathons/OKXAI-Genesis-Hackathon>
- `@XLayerOfficial` post, "Winner announcements begin Aug 3" — quoted from a search-result
  snippet; direct fetch returned HTTP 402 —
  <https://x.com/XLayerOfficial/status/2081674886662299692>
- `@XLayerOfficial` post on the Genesis review process ("several promising ASPs are currently
  offline or not functioning as…") — quoted from a search-result snippet; direct fetch returned
  HTTP 402 — <https://x.com/XLayerOfficial/status/2084142790049673640>

In-repo records consulted:

- `../../HACKATHON.md` (event identity, deadlines, prize structure; see the §1.4 correction)
- `../../REFERENCES.md` REF-001, REF-002, REF-027
- `../04-planning/tinjau-score-improvement-task-tracker.md` §0.3, §2, §4
