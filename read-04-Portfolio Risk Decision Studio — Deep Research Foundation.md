# Portfolio Risk Decision Studio — Deep Research Foundation
## Executive Framing
### What This Product Really Is
This product is not a margin calculator. It is not a paper trading simulator. It is not a portfolio tracker. It sits at the intersection of all three, but it is more accurately described as a **portfolio risk decision studio for stock investors** — a tool that helps an investor understand what a trade will cost, what it risks, and whether the portfolio can safely support it, before making the decision.

The closest analogies in the market are the pre-trade margin requirement preview in IBKR's mobile app, the scenario stress-testing tools inside CME's institutional risk suite, and the educational guided flows inside thinkorswim's paperMoney practice environment. None of those tools do all three things at once, with an educational posture, for a small retail portfolio.[^1][^2][^3]

That gap is the product opportunity.
### What Problem Category It Belongs To
This product addresses **pre-decision risk comprehension for individual retail investors who use margin.** The problem is not that people lack calculators. The problem is that digital platforms promoting ease of rapid decision-making actively encourage underestimation of risk and overexposure to volatile assets, and that financial literacy determines whether a retail investor benefits from these platforms or gets hurt by them. The product's job is to slow the investor down before the trade, not after — and to teach while doing so.[^4]
### What Makes It Hard
Three forces work against this product. First, financial concepts like collateral haircuts, buying power mechanics, and maintenance buffer are technically correct but extremely hard to make intuitive without oversimplifying them to the point of inaccuracy. Second, the user interface challenge in fintech is not just about adding more data — it is about organizing information so that the right things appear at the right time for the right decision. Third, educational tools for investing face a credibility trap: simple tools feel toy-like, complex tools feel overwhelming, and neither teaches effectively.[^5][^6][^7]
### What Makes It Promising
Several structural conditions favor this product. FINRA's 2026 intraday margin rule changes eliminate the $25,000 PDT requirement and replace it with a real-time, account-level monitoring approach effective June 4, 2026. This opens margin day trading to any account over $2,000, massively expanding the population of retail investors who need to understand margin mechanics but who have no institutional support in doing so. At the same time, progressive disclosure techniques in SaaS dashboards reduce time to first action by 30–50% while keeping 70–90% feature discovery intact. The editorial and whitespace-forward design direction chosen for this product is empirically well-supported: high-density finance interfaces can be readable and powerful when information is structured around user mental models rather than database schemas.[^8][^5][^6][^9]

***
## Domain Map
### Core Finance Concepts the Product Must Understand
#### Tier 1 — Essential (Product Cannot Work Without These)

**Initial Margin (Reg T):** Under the Federal Reserve's Regulation T, set in 1934, brokers can lend customers up to 50% of the purchase price of marginable securities. This means for a $1,000 stock purchase on margin, the investor must put in at least $500. The formula: `Market Value = Debit Balance + Equity`. At a 50% initial margin, `Equity = Market Value × 0.50`.[^10][^11]

**Maintenance Margin:** The minimum equity ratio that must be maintained in a margin account at all times. FINRA's standard minimum is 25% of the current market value for long positions. Most brokers set a house requirement of 25–30%. The maintenance call is triggered when: `Equity < Market Value × 0.25`. The trigger price formula for a long position is:[^8]

\[ P_m = \frac{P_0 \times (1 - i)}{1 - m} \]

where \(P_0\) is the initial price, \(i\) is the initial margin percentage, and \(m\) is the maintenance margin percentage. For a stock bought at $196 with 50% initial margin and 25% maintenance: \(P_m = 196 \times (0.50 / 0.75) = \$130.67\).[^12][^13]

**Collateral Value and Buying Power:** In a Reg T margin account, securities already held contribute to buying power through their loan value. Under Reg T, existing stock with no margin loan contributes a loan value equal to `Market Value × (1 - Initial Margin Requirement)`, which under 50% initial margin equals 50% of the holding's value. For a portfolio with $10,000 in fully-paid securities, the loan value is $5,000, which supports the purchase of an additional $10,000 of securities on margin. Brokers operating under Portfolio Margin, rather than Reg T, calculate margin based on overall account risk with requirements generally ranging from 15–30% on individual stocks, depending on volatility and concentration.[^14][^15]

**Collateral Haircuts:** When securities are used as collateral, brokers apply haircuts — discounts to market value — to protect against price declines. Haircuts are set to cover the maximum expected decline in the market price of the collateral over a conservative liquidation horizon. Higher haircut rates are applied to less liquid, more volatile, or highly concentrated positions. For instance, regulatory frameworks distinguish between highly liquid index constituents (lower haircuts, often 15%) and less liquid stocks (haircuts of 30% or more). Concentration also matters: when a single security exceeds certain thresholds of total collateral, additional haircuts apply.[^16][^17][^18]

**Buffer (Maintenance Excess):** The gap between available collateral value and the maintenance margin requirement. This is the most actionable single metric for an investor to monitor. A positive buffer means the account can absorb further price declines; a negative buffer means a margin call is already active. Under Portfolio Margin at Schwab, maintenance excess is defined as: `Net Liquidation Value − Margin Requirements`.[^15][^14]

**Special Memorandum Account (SMA):** The SMA represents excess equity in a Reg T margin account above the 50% initial requirement. It functions as a line of credit that increases buying power — every $1 in SMA generates $2 in buying power. SMA is calculated as: `SMA = Equity − (0.50 × Market Value)`. SMA locks in unrealized gains and does not disappear when market value fluctuates downward, but it cannot be used to satisfy maintenance margin calls.[^19][^20]

**Borrowing Cost / Carry Cost:** The interest paid on the margin loan. This is the silent cost of margin trading. If the margin loan is $294 at 8% annual interest, the monthly carry cost is approximately $1.96. This compounds against the investor if the position is held without generating returns above the interest rate. All other costs — commissions, spreads, SEC fees, and custody fees — contribute to total transaction costs that must be subtracted from any gain to determine true profitability.[^10][^14]

#### Tier 2 — Secondary (Product Becomes Much Better With These)

**Portfolio Margin vs. Reg T:** Reg T treats each position individually with fixed percentages, while portfolio margin evaluates the entire portfolio's theoretical risk using stress-testing models across price scenarios. Portfolio margin typically requires $100,000–$125,000 in account equity and uses OCC's TIMS/STANS methodology to calculate the worst-case theoretical loss across ±15% price scenarios for equities. For the product's target user (small retail portfolio, learning stage), Reg T is the correct model to use and teach.[^21][^22][^15]

**Concentration Risk:** When a single position represents an excessive share of total collateral or total portfolio value, brokers apply additional haircuts or higher margin requirements. The concept directly applies to the product: a portfolio overly concentrated in one sector or one stock receives less favorable treatment from any realistic margin model, and the product should surface this explicitly. A position with a Marginal Contribution to Risk (MCR) ratio above 1.3 is contributing disproportionately more risk than its portfolio weight warrants.[^23][^18][^24]

**Contribution to Risk / Marginal Contribution to Risk:** MCR measures each holding's share of total portfolio volatility: `MCRᵢ = wᵢ × (Σⱼ wⱼσᵢσⱼρᵢⱼ) / σₚ`. The key insight: the sum of all MCRs equals the portfolio volatility exactly (Euler decomposition property). A simpler product version uses sector-level correlation proxies rather than individual stock covariance matrices. Holdings with MCR weight divided by portfolio weight above 1.3 are inefficient risk contributors; below 0.8 they provide diversification benefit.[^24]

**Portfolio Rebalancing Logic:** Rebalancing is a control problem: the portfolio has a target state, markets disturb it, and the algorithm decides when intervention is justified. Three primary approaches exist: calendar-based (fixed schedule, low monitoring burden, best for retail), threshold-based (trades when drift exceeds a band, better aligned with actual risk), and hybrid (check on schedule, trade only if threshold is breached). M1 Finance's "buy underweight first" approach using contributions is an elegant product pattern: auto-invest directs each deposit toward underweight positions, achieving rebalancing without triggering taxable sell events. For the product, this concept translates into a "rebalance with new money" suggestion — telling the investor which positions to increase when adding cash to stay aligned with target allocations.[^25][^26][^27]

**Scenario Analysis and Stress Testing:** Professional margin engines test portfolios across multiple hypothetical market scenarios to estimate potential losses and margin requirement changes. The OCC's margin methodology uses 99% Expected Shortfall as its base component. At the retail-accessible level, this translates into predefined shock scenarios (e.g., –15% trade price + –10% portfolio price) applied to both the trade under evaluation and the collateral portfolio simultaneously. The product's scenario engine already reflects this pattern.[^28][^3]

**Diversification Benefit:** A new trade in the same sector as existing holdings reduces diversification. In margin terms, this matters because brokers may apply concentration adjustments to collateral haircuts when too many holdings in an account occupy the same sector, increasing effective margin requirements. In portfolio terms, adding a correlated position adds more volatility than its individual volatility would suggest.[^29][^30][^23][^24]

#### Tier 3 — Optional for Later (Do Not Build Now)

- Value at Risk (VaR) and Expected Shortfall calculations at the individual security level
- Real-time market data integration for live price updates
- Historical backtesting across actual price histories
- Tax-lot accounting for rebalancing decisions
- Options margin (different formulas, different FINRA rules)
- Short selling mechanics (short maintenance trigger: `Credit Balance / 1.30`)[^31]

***
## Competitor and Pattern Analysis
Existing tools cluster into five distinct solution patterns. Understanding the patterns — not the brands — is what matters for product design.
### Pattern 1: Portfolio Tracker + Visualization (Simply Wall St, Stock Unlock)
**Job solved:** Help investors understand what they own, how diversified they are, and whether individual holdings look fundamentally strong or weak.

**Key functions:** Visual snowflake or health score summary, diversification audit across industry and geography, valuation metrics, dividend yield tracking, alerts on earnings and valuation changes.[^32][^33]

**Mental model:** The portfolio as a garden that needs to be healthy and balanced.

**What they do well:** They make complex financial statements visually intuitive. Simply Wall St transforms fundamental data into snowflake charts that retail investors can read without financial training. They audit diversification across industries, geographic revenue, and holdings in a way that is immediately actionable.[^34][^32]

**What they fail at:** They do not model margin. They do not model pre-trade impact. They do not model how a new position changes the account's risk structure or buying power. They are backward-looking, not forward-looking. They are observers, not decision support tools.

**What to reuse:** The portfolio health framing. The visual diversification audit. The snowflake-style multi-dimensional summary that can be scanned in three seconds.
### Pattern 2: Rebalancing Tool (M1 Finance, Betterment, Wealthfront)
**Job solved:** Keep the portfolio aligned to target allocation weights over time, automatically or semi-automatically.

**Key functions:** Target weight definition (M1's pie/slice metaphor is a standout design pattern), drift calculation, buy-underweight-first logic for contributions, one-click full rebalance.[^26][^27]

**Mental model:** The portfolio as a target allocation that drifts and must be corrected.

**What they do well:** M1's approach is conceptually elegant — each new dollar automatically goes to the most underweight slice, achieving rebalancing without forced selling. The pie metaphor is beginner-accessible while being mathematically sound.[^27][^26]

**What they fail at:** They do not model margin at all. They assume a fully-funded, cash-only account. They are designed for passive, buy-and-hold investors with large enough portfolios for automatic rebalancing to make sense. They do not teach; they automate.

**What to reuse:** The "which position is most underweight" calculation as an input to the best trade suggestion engine. The "new money goes to underweight" recommendation as a complementary mode to margin suggestions.
### Pattern 3: Margin Calculator (NiceBreakout, generic broker tools)
**Job solved:** Calculate how much margin is required for a position and at what price a margin call occurs.

**Key functions:** Entry margin, maintenance margin, liquidation price, margin call price formula.[^35]

**Mental model:** A single trade evaluated in isolation.

**What they do well:** They are mathematically correct. They give the investor a clear number.

**What they fail at:** They evaluate each trade in isolation, ignoring the portfolio context entirely. They do not model collateral contribution from existing holdings. They do not model scenarios. They do not distinguish between opening a position in a sector you already own vs. a diversifying sector. They provide no educational value — they give a number but do not explain why it matters or what to do with it.

**What to reuse:** The core margin call price formula as the analytical foundation. Nothing else. The isolation-based approach is the core failure pattern to avoid.
### Pattern 4: Broker Education + Paper Trading (thinkorswim paperMoney, IBKR Campus)
**Job solved:** Let investors practice trading in a simulated environment, or learn platform mechanics through structured lessons.

**Key functions:** Virtual portfolio with real prices, order simulation, paper trading with real-time data, educational lessons organized by topic, built-in Day Trade Buying Power display.[^1][^36]

**Mental model:** A safe practice environment where mistakes don't cost real money.

**What they do well:** thinkorswim's built-in paperMoney mode is part of all versions of the platform, requiring no separate signup. IBKR Campus provides structured trading lessons including how to view margin information on mobile. These tools create low-risk exploration environments.[^2][^36][^37]

**What they fail at:** The platform complexity of thinkorswim is a documented barrier — it is a professional-grade tool that was not designed for beginners. The education is organized around platform features, not around investor decisions. There is a significant gap between "learning to use the platform" and "learning how to think about risk."[^1]

**What to reuse:** The concept of a "practice mode" where real portfolio composition is used as context for simulated trade decisions. The idea that education should be embedded in the tool flow, not separated into a separate "learn" section.
### Pattern 5: Institutional Risk Engine (CME Core, OCC margin calculator, MSCI Risk Manager)
**Job solved:** Calculate real-time margin requirements, run scenario stress tests, analyze portfolio-level risk decomposition, and produce regulatory-compliant margin calculations.

**Key functions:** What-if scenario analysis, hypothetical portfolio analysis, margin breakdown, portfolio uploads, Expected Shortfall calculation, concentration component, VaR decomposition.[^28][^3]

**Mental model:** A portfolio as a risk object to be stress-tested and capital-charged against.

**What they do well:** CME's Core margin tool supports scenario analysis, Monte Carlo simulation, portfolio uploads, and real-time margin calculations across thousands of instruments. OCC's methodology computes 99% Expected Shortfall with a concentration sub-component for idiosyncratic risk. These are the most mathematically rigorous tools available.[^3][^28]

**What they fail at:** They are designed for professional traders and institutional participants. They require significant financial knowledge to interpret. They produce numbers without educational context. They are access-restricted (institutional accounts required). They are not designed to teach anything.

**What to reuse:** The concept of testing a trade across multiple scenario types simultaneously, not just one. The concentration penalty logic. The "worst-case loss" framing. The distinction between base margin and concentration add-on as two separate components of risk assessment.

***
## Algorithm Opportunities
### Algorithm Layer 1 — Foundation (Build First)
**Collateral-Aware Opening Check:** Before scoring any trade, filter by whether the account can actually open it. Available collateral = Cash + Portfolio Collateral Value (each holding's market value × its collateral percentage). Required equity = Trade Notional × Initial Margin percentage. If Available Collateral < Required Equity, the trade cannot open — score it as -∞ and filter it out before ranking.[^14]

This sounds obvious but most margin calculators skip it. The innovation here is that collateral comes from existing holdings, not just cash, and each holding has its own collateral contribution rate based on broker treatment.

**Buffer Score:** After confirming openability, compute the maintenance buffer under the selected scenario. Buffer = (Available Collateral after shock) − (Maintenance Requirement × Total Position Value after shock). A positive buffer is the primary safety metric. The larger the buffer, the more price deterioration the account can absorb without a margin call.[^8][^14]

**Total Cost Score:** Sum all costs: opening commission + closing commission + spread (shares × half spread × 2) + SEC fee + custody fee + holding-period interest on margin loan. This produces the cost drag — the minimum gain required for the trade to be profitable. Many retail tools ignore interest and custody entirely; those costs are real and compound over holding periods.[^14]

**Timeline Deterioration (MC Day):** Apply a daily decay rate to the trade and portfolio price, and find the first day on which the buffer crosses below zero. This gives the investor a concrete, intuitive "runway" number. "If the market loses 3% per day, your account is safe for 8 days" is a far more useful piece of information than an abstract margin call price.[^13]

**Net Scenario P/L:** After costs and scenario shock, compute: `(Post-shock Trade Price − Entry Price) × Shares − Total Costs`. Compare against the cash-only alternative: `Cash Shares × (Post-shock Price − Entry Price) − Cash-only Costs`. This cash-vs-margin comparison is the single most educational output the tool can produce.[^11]
### Algorithm Layer 2 — Best Trade Finder (Build After Foundation Is Solid)
**Candidate Generation:** For each stock in the preset universe and for each lot count from 1 to N (configurable), generate a candidate trade object. Then apply the opening check filter. Only openable candidates proceed to scoring.

**Multi-Dimensional Scoring:**

In **Balanced mode:** `Score = Safety × 1.15 + NetPnL × 1.0 − TotalCosts − MCDayPenalty × 0.8 − SectorConcentrationPenalty`

In **Safety mode:** `Score = Safety × 1.8 + NetPnL × 0.35 − TotalCosts − MCDayPenalty − SectorConcentrationPenalty`

In **Upside mode:** `Score = Safety × 0.7 + NetPnL × 1.6 − TotalCosts × 0.8 − MCDayPenalty × 0.5 − SectorConcentrationPenalty`

The sector concentration penalty should be a positive number (penalizing trades in sectors already held) or a slight bonus (rewarding diversifying trades).

**Scenario Scope Modes:**
- *Selected-only:* Score is computed against the current active scenario.
- *All-scenarios average:* Score is the mean across all scenario evaluations. Surfaces "consistently good" trades.
- *All-scenarios worst-case:* Score is the minimum across all scenarios. Surfaces "most robust" trades — what a broker's stress-testing would most closely resemble.[^28][^3]

The worst-case mode is the most intellectually aligned with how professional risk engines think. The product should teach this distinction explicitly: "In balanced mode you're asking 'what's the best trade in this market.' In worst-case mode you're asking 'what trade survives the worst possible market.'"

**Best-in-Scenario Badge:** For each candidate trade, record which scenario produced its highest score. This badge is the most educational element in the finder — it teaches the investor that a trade's quality is context-dependent, not absolute.[^3]

**Global Top 3 vs. Per-Stock Top 3:** These two outputs serve different user intents. Global Top 3 answers "what should I do right now?" — it is a decision-support output. Per-Stock Top 3 answers "within this ticker, which lot size makes most sense?" — it is a learning-support output that helps the user understand lot size sensitivity.
### Algorithm Layer 3 — Rebalancing Suggestion (Build in V2)
Once the portfolio setup module is mature, add a lightweight rebalance engine: given the current portfolio weights and a target allocation, compute which existing positions are overweight and which are underweight. Then frame the best trade finder output against this context: "This trade is also the most underweight position in your target allocation." This bridges margin optimization with portfolio health optimization.[^25][^38]

The M1-style "new money goes to underweight first" logic is the cleanest implementation: rank underweight positions by drift magnitude, combine with the margin safety score, and surface the top suggestion as both a "safe to open" trade and an "allocation-improving" trade simultaneously.[^26]
### Algorithm Layer 4 — Risk Contribution Score (Build in V3+)
A simplified version of Marginal Contribution to Risk, using sector-level correlation proxies rather than individual stock covariance matrices: if the new trade is in the same sector as existing concentrated holdings, the concentration penalty in the score increases proportionally. A full MCR implementation (using historical price data and covariance estimation) should be deferred until the product has an API connection to market data.[^24][^30]
### Algorithms to Avoid Building Too Early
- Full VaR or Expected Shortfall at position level (requires good price history data and covariance estimation machinery that creates more complexity than value at early stage)
- Machine-learning score prediction or adaptive algorithms (no training data until the product has users)
- Options margin calculations (entirely different rule set under FINRA Rule 4210, very different formulas)
- Short selling mechanics (negative equity direction adds significant complexity)

***
## Product Architecture Proposal
### Module Map
**Module 1: Portfolio Engine** — the account model. Stores each holding's ticker, shares, cost basis, current price, collateral percentage, and sector. Computes total market value, total collateral value, and total invested capital. Supports adding, editing, and removing positions. Also stores cash balance and account parameters (initial margin %, maintenance margin %, interest rate).

**Module 2: Trade Engine** — the pre-trade analysis module. Takes a proposed trade (ticker, price, shares, collateral %, sector) and a scenario, and computes all derived values: notional, required equity, loan, cost breakdown, post-shock values, buffer, MC day, timeline, and cash alternative comparison.

**Module 3: Scenario Engine** — the stress-testing module. Defines scenario presets (shock magnitudes, daily decay, scope, duration) and applies them to any trade + portfolio combination. Supports single-scenario and multi-scenario evaluation modes.

**Module 4: Finder Engine** — the best trade ranking module. Combines candidate generation, filtering, multi-dimensional scoring, global ranking, per-stock ranking, scenario scope modes, and badge assignment.

**Module 5: Rebalance Engine (V2)** — the allocation-aware suggestion module. Compares current weights against target weights, computes drift, and ranks rebalance candidates by combination of drift magnitude and margin safety.

**Module 6: Education Layer** — inline explanations, guided mode commentary, warn-on-risk interventions, and concept tooltips. This is not a separate "learn" tab — it is embedded in every module's output surface.
### Internal Logic Layers
**Layer 1 — Data:** Holdings data, trade parameters, scenario parameters, account constants (interest rate, commission schedule, maintenance rate, initial margin rate).

**Layer 2 — Core Computation:** All financial calculations live here. Collateral value, required equity, loan, cost decomposition, post-scenario values, buffer, MC price, MC day, timeline.

**Layer 3 — Scoring:** Score functions for balanced, safety, and upside modes. Scenario aggregation (average, worst-case). Penalty and bonus functions for concentration and diversification.

**Layer 4 — Presentation:** Ranked outputs, badges, explanatory text generation, warning triggers, chart data. This layer converts numbers into narratives.

***
## UX and UI Architecture
### Design Philosophy
The fundamental design problem is: how do you present institutional-grade risk logic to a retail investor without either oversimplifying it (making it useless) or preserving all its complexity (making it overwhelming)?

The answer is three-layer progressive disclosure:[^39][^40]

1. **Layer 1 — Decision surface:** The output the investor needs to make a decision right now. Primary KPI, yes/no openability, single scenario P/L, buffer status. This is what 80% of users see 80% of the time.
2. **Layer 2 — Understanding surface:** Expanded breakdown of why the number is what it is. Cost components, scenario detail, MC day, cash comparison. Revealed on one tap.
3. **Layer 3 — Expert surface:** Full scenario matrix, algorithm mode selector, advanced parameters, raw formula exposure. Available but not default.

Research confirms that revealing complexity in stages reduces time to first action by 30–50% while keeping 70–90% feature discovery intact. The EPF Calculator case study shows a real-world instance: replacing a complex form with smart defaults and a single input field increased recalculation rate from 12% to 68% and session duration by 140%. The lesson is identical for this product: reduce the cost of starting, hide complexity without removing capability, reward interaction immediately.[^6][^9]
### Feature-by-Feature User Flows
#### Flow 1: Portfolio Setup

**Goal:** Establish the collateral base. No trade analysis is possible without an accurate portfolio picture.

**Steps:**
1. User opens app. Rail guide says: "Start with your portfolio. Your holdings are the collateral engine."
2. "Fill default portfolio" button pre-populates known holdings (CSCO, CSWC, TRIN, GFS) — eliminates empty-state friction.
3. Table shows one row per holding: ticker, shares, cost, current price, collateral %, sector.
4. User edits any field inline; all calculations update in real time.
5. User sets cash balance and maintenance requirement.
6. Metrics bar at top updates instantly: total portfolio value, collateral value, buying power headline.
7. Warning appears if any holding's collateral % is set above the conservative threshold (e.g., above 80% gets a caution badge).
8. **Exit condition:** User advances to Trade Setup when they're satisfied the portfolio data is accurate.

**Teaching moment embedded:** "Collateral % determines how much of this holding's value counts toward your margin capacity. Brokers discount less liquid or more volatile holdings. Conservative default is 75%."

#### Flow 2: Trade Evaluation

**Goal:** Evaluate a specific proposed trade against the current portfolio and scenario.

**Steps:**
1. User selects a preset (e.g., NVDA) or enters custom ticker.
2. Price, sector, collateral % auto-populate from preset.
3. User selects shares.
4. Core metrics update immediately: notional, required equity, can it open? (green/red), buffer, net P/L.
5. If **cannot open:** Warning card appears with one sentence explaining why (e.g., "Collateral $293 available, $294 required — short by $1"). Next action suggestion: "Reduce lot by 1 or increase collateral allocation on CSCO."
6. If **can open:** Metrics cascade — buffer shown, MC price shown, cost breakdown shown in expandable section.
7. Cash vs. margin comparison shown as two-bar chart: "At this scenario, margin earns $X vs cash earns $Y."
8. Timeline chart shows day-by-day buffer trajectory.
9. Guided mode comment updates with a one-sentence verdict in plain language.

**Teaching moment embedded:** "Your buffer ($X) is how much further prices can fall before a margin call. Positive means you're safe today. Zero means you'll get a call at current prices. Negative means you're already in trouble."

#### Flow 3: Scenario Selection and Configuration

**Goal:** Understand trade performance across different market conditions.

**Steps:**
1. Eight preset chips visible: Bull, Hype, Low Dip, Peak, Slow Bleed, Credit Stress, Tech Selloff, Recovery.
2. User taps a chip. Active chip gets border highlight. All outputs update instantly.
3. Manual sliders visible: Trade Shock %, Portfolio Shock %, Daily Drop %, Timeline Days.
4. Scenario Mode selector: Both shocks / Trade only / Portfolio only.
5. Duration preset links timeline to holding days for coherent scenario framing.
6. Changing a manual slider creates a custom scenario; chip highlight clears.

**Teaching moment embedded:** "Credit Stress shocks your existing portfolio without touching the trade. This is the scenario where existing collateral loses value while your trade stays flat — the 'quiet killer' scenario."

#### Flow 4: Best Trade Finder — Global Top 3

**Goal:** Find the best single trade across all stocks and lot sizes given current portfolio, account, and scenario configuration.

**Steps:**
1. User opens Finder tab.
2. Three controls visible above results: Scoring Mode selector, Scenario Scope selector, Max Lot input.
3. "Run Algorithm" button triggers computation.
4. Three result cards appear in a clear column. Each card shows: ticker × lot size as headline, Best-In badge (which scenario this trade excels in), status badge (Resilient / Time Risk / Buffer Negative), four KPIs (Score, Notional, Net P/L, Buffer), one-sentence plain-language explanation.
5. Expandable section within each card shows detailed breakdown (loan, MC day, cash P/L, best scenario, full cost table).
6. "Load into Trade" button on top card loads it into Trade Evaluation tab for deeper exploration.

**Teaching moment embedded:** "Global #1 under 'worst-case scenarios' mode is different from #1 under 'selected scenario only.' The first survives the worst markets. The second optimizes for today's specific bet."

#### Flow 5: Best Trade Finder — Per-Stock Top 3

**Goal:** Within a single stock, understand which lot size produces the best risk-adjusted outcome.

**Steps:**
1. Per-stock section shows one expandable block per stock in the universe.
2. Default state: collapsed, showing only stock name and top-1 score headline.
3. Tap to expand: three cards appear inside the block for that stock (lot sizes ranked by current scoring mode).
4. Each card within a block uses identical layout to Global Top 3 cards.
5. User can quickly scan: "NVDA top result: 3 lots, score 92.1. CSCO top result: 5 lots, score 71.3."

**Teaching moment embedded:** "Per-stock view answers: within this ticker, how many shares is the sweet spot? Notice how adding more lots initially improves the score but then reverses — that's the lot-size efficiency curve. Beyond a certain point, the margin cost and MC risk grow faster than the potential return."

#### Flow 6: Warning and Intervention

**Goal:** Surface risk early and suggest corrective actions before problems compound.

**Warning triggers:**
- Buffer < 0: "Your buffer is negative under this scenario. This trade is openable today but would already fail in this stress environment."
- Buffer < 50: "Buffer is very thin. A 2% adverse move in any of your holdings would put you in margin call territory."
- MC Day < 5: "Under daily decay, this position reaches a margin call in X days. That is very short runway."
- Sector concentration > 50% of portfolio: "Over half your portfolio is in the same sector. This reduces diversification benefit and may increase broker haircuts."
- Cash < 5% of portfolio: "Cash reserves are critically low. You have minimal buffer for margin calls without selling positions."

**Intervention suggestions (not just warnings):**
- "Reduce lot by 1 to open this trade."
- "Increase CSCO collateral % from 65% to 75% to free up $X in buying power."
- "Switch to 'worst-case scenarios' mode to find a more resilient trade."

#### Flow 7: Guided Teaching Flow

**Goal:** Walk a new user through the product's mental model step by step.

**Steps:**
1. On first load, guided mode is active. Rail sidebar shows context-sensitive explanation for each pane.
2. Each pane has a "next step" prompt at the bottom: "Once your portfolio is set, move to Trade Setup →"
3. Every metric has a tooltip icon (?) that shows a one-sentence plain-language explanation on hover/tap.
4. Guided mode toggle in sidebar allows experienced users to turn it off; setting persists.
5. When guided mode is on and a user reaches a result for the first time, a short animated explanation plays once — not on every subsequent visit.

**Teaching moment structure for every output:**
- Line 1: What this number means in plain language.
- Line 2: Why it matters for this trade.
- Line 3: What the user can do to improve it.

#### Flow 8: Comparison Flow (Cash vs. Margin)

**Goal:** Help users understand the fundamental trade-off of margin.

**Steps:**
1. After trade evaluation, a comparison bar chart shows side by side: Cash P/L vs. Margin P/L under current scenario.
2. A multiplier badge shows how many times larger the margin gain or loss is compared to cash.
3. Breakeven cost line shows the minimum gain required for margin to beat cash (equal to total costs).
4. A toggle switches between scenarios to show how the comparison changes under different market conditions.

**Teaching moment embedded:** "Margin magnifies everything — gains, losses, and costs. Under bull conditions, the leverage works for you. Under Credit Stress, you can lose more than you put in. The comparison chart shows you both realities at once."

***
## Design Principles
### Make It Powerful But Simple
The most important design lesson from the EPF calculator case study is that **the mathematical logic does not need to change to make a product more usable — only the presentation layer needs to change.** The internal model can be as rigorous as an institutional risk engine. The interface should present only what the user needs for the decision at hand.[^6]

Every screen should answer: what is the user trying to decide right now? Everything else should be available one tap away, but not on the primary surface.[^39][^40]
### Make It Readable
Apply editorial typographic standards:[^41]
- Body text: minimum 16px
- Line height: 1.4–1.6
- Line length: 45–75 characters
- Bold serif headings for section identity (Georgia-style)
- Monospace or tabular figures for all financial numbers
- Strict whitespace separation between information categories — whitespace is not wasted space, it is cognitive rest

For color, use a restrained palette: one primary neutral (near-black ink on off-white paper), one accent for positive values (deep green), one for negative (deep red/crimson), one for warnings (dark amber). Avoid gradients and shadows that add visual weight without information content.[^5]
### Make It Educational
Every number should be explainable in one sentence. The product teaches by showing reasoning, not just results. The explain-first output principle means the verdict appears first, the number supports it, and the formula is available for those who want it — never the other way around.[^6]

The product should never hide its logic behind a black box. When the algorithm produces a recommendation, the user should be able to see why — which criteria drove the score, what the margin of safety is, and what would change the result. This is what makes the tool trustworthy rather than opaque.[^42]
### Avoid Cognitive Overload
Research on reducing cognitive load in financial apps emphasizes three specific tactics:[^7][^43]
1. **Chunking:** Group related information into clearly bounded visual units. Never mix cost information with risk information with return information in the same visual block.
2. **Hierarchical disclosure:** Primary decision metrics on top, secondary analysis one tap down, tertiary detail available but not prominent.
3. **Smart defaults:** Pre-fill every input with a reasonable default so the user can start seeing output immediately and then refine. Never start with an empty state. The "Fill default portfolio" button is the most important single UX element in the product.

***
## Build Roadmap
### MVP — Core Decision Lab
**Goal:** A beginner can load their portfolio, evaluate a specific margin trade, and understand whether it is safe under a selected scenario.

**Includes:**
- Portfolio setup with collateral model
- Single trade evaluation with full cost decomposition
- Buffer and MC day calculation
- One active scenario at a time
- Cash vs. margin comparison chart
- Buffer timeline chart
- Guided mode with rail commentary
- Warning system for negative buffer and thin buffer
- Editorial monochrome UI with progressive disclosure cards
- Pre-populated defaults for fast first experience

**Does not include:** Best trade finder, rebalancing, multi-scenario comparison, per-stock top 3.
### V2 — Best Trade Finder + Scenario Engine
**Adds:**
- Full Best Trade Finder with Global Top 3 and Per-Stock Top 3
- Scenario scope switch: selected-only / all-average / worst-case
- Scenario badge (Best in...) on result cards
- Full scenario preset library with 8 presets
- Manual scenario parameter controls
- Load-best-into-trade workflow
- Concentration penalty in scoring
- Sector concentration warning in portfolio setup
### V3+ — Portfolio Intelligence Layer
**Adds:**
- Target allocation setting and drift calculation
- Rebalance-with-new-money suggestion engine
- Simplified MCR-style concentration scoring using sector proxies
- Portfolio health score (diversification, buffer health, cost efficiency, concentration)
- Watchlist integration: evaluate trades from watchlist against portfolio
- Export to CSV for offline review
- Scenario custom builder with save/load
### What Should Not Be Built Yet
- Real-time market data API (adds operational complexity disproportionate to current value)
- Options margin calculations (different rule set, different user)
- Full VaR / Expected Shortfall at position level (requires covariance machinery)
- Social features or leaderboards (not aligned with the product's educational trust-building posture)
- Short selling mechanics (negative equity direction adds significant cognitive load for beginners)
- Mobile native app (web-first is correct for this complexity level)

***
## Open Questions
1. **Collateral percentage assignment:** Should the product auto-assign collateral percentages based on a simple rule (e.g., 75% for all) or teach users to set them based on stock characteristics? The latter is more educational but adds friction at setup.
2. **Interest rate accuracy:** The product uses a configurable annual interest rate. Should it default to a rate derived from current market rates, or remain static? This affects how real the cost model feels.
3. **Scenario realism calibration:** Are the preset scenario magnitudes (e.g., Peak = –28% trade shock) calibrated to historical events? The product would be more credible if each preset referenced a historical analogue (e.g., "Tech Selloff ~ NASDAQ correction Q4 2022").
4. **Beginner vs. returning user mode:** Should the guided mode default differ based on whether this is a first session or a returning session? Persistent state for the guided toggle is implemented, but the onboarding moment for truly new users needs a distinct first-run experience.
5. **Portfolio data accuracy:** The product uses user-entered prices. As market prices change, the analysis becomes stale. What is the right friction level for prompting the user to refresh prices?
6. **Educational validation:** Has any user tested whether the plain-language explanations are actually understood? This is the single highest-value user research question for V1 — get five people who have never used margin to use the tool and speak aloud what they think each number means.

***
## Prioritized Feature List
| Priority | Feature | Why First |
|---|---|---|
| 1 | Portfolio collateral model | Without this, all other analysis is wrong |
| 2 | Buffer calculation under scenario | The single most important safety metric |
| 3 | Cost decomposition (all 6 components) | Silent killer of margin profitability |
| 4 | Cash vs. margin comparison | Most educational single output |
| 5 | MC Day timeline chart | Converts abstract risk into concrete countdown |
| 6 | Warning system (buffer, concentration, cash) | Intervention before damage |
| 7 | Guided mode with rail commentary | Lowers learning barrier without adding screens |
| 8 | Global Top 3 finder (selected-only) | First decision support layer |
| 9 | Scenario preset library | Contextual stress testing |
| 10 | Per-stock Top 3 finder | Lot-size education |
| 11 | Scenario scope switch (all-average / worst-case) | Teaches robustness thinking |
| 12 | Best-in-scenario badge | Teaches scenario dependency |
| 13 | Target allocation + drift calculation | Bridges margin with portfolio management |
| 14 | Rebalance-with-new-money suggestion | Portfolio health layer |
| 15 | Portfolio health score | Summary metric for portfolio state |

***
## Prioritized UX Flow List
| Priority | Flow | Core Contribution |
|---|---|---|
| 1 | Portfolio setup with auto-fill | Eliminates empty-state friction |
| 2 | Single trade evaluation with instant feedback | Core product value |
| 3 | Warning + intervention flow | Risk protection layer |
| 4 | Cash vs. margin comparison | Main educational moment |
| 5 | Scenario chip selection | Contextual stress testing |
| 6 | Guided mode progressive commentary | Teaching layer |
| 7 | Global finder run + load-into-trade | Decision support |
| 8 | Per-stock expansion accordion | Lot size education |
| 9 | Scenario scope mode switch | Robustness vs. optimization framing |
| 10 | Rebalance suggestion flow (V2) | Portfolio alignment layer |

***
## Prioritized Algorithm List
| Priority | Algorithm | Dependency |
|---|---|---|
| 1 | Opening feasibility check (collateral vs. required equity) | Portfolio engine |
| 2 | Buffer calculation (available − maintenance requirement) | Trade engine |
| 3 | Full cost decomposition (6 components) | Trade engine |
| 4 | MC day (timeline decay simulation) | Scenario engine |
| 5 | Net scenario P/L (post-cost, post-shock) | Trade + scenario engine |
| 6 | Cash alternative P/L | Trade engine |
| 7 | Multi-dimensional scorer (balanced / safety / upside) | All prior algorithms |
| 8 | Candidate generator + filter + global sort | Scorer |
| 9 | Per-stock sort (top 3 per ticker) | Scorer |
| 10 | Scenario scope aggregation (average / worst-case) | Scenario engine + scorer |
| 11 | Best-in-scenario badge assignment | All scenarios |
| 12 | Sector concentration penalty | Portfolio engine |
| 13 | Drift calculator (current vs. target weights) | Portfolio engine (V2) |
| 14 | New-money rebalance suggestion | Drift calculator + scorer (V2) |
| 15 | Simplified MCR proxy scorer | Portfolio engine (V3+) |

***
## Biggest Mistakes to Avoid
**Mistake 1: Treating the product as a calculator, not a decision studio.**
Calculators give numbers. Decision studios give verdicts, show why, and suggest next actions. Every output should answer "so what?" not just "what."

**Mistake 2: Evaluating trades in isolation from the portfolio.**
This is the core failure of every generic margin calculator on the market. The product's most differentiated value is that it treats the portfolio as the collateral engine, not cash alone. Never break this assumption.[^35]

**Mistake 3: Building the UI around the data model rather than the user's mental model.**
The EPF Calculator case study shows directly how a technically correct tool can be effectively unusable because its interface reflects database structure rather than user thinking. Always ask: what question is the user trying to answer right now?[^6]

**Mistake 4: Over-building before validating.**
The temptation to build VaR, options margin, live data, and machine learning features before V1 is real. Each of these adds operational and conceptual complexity that delays validating the core product loop. Build what teaches, what decides, what warns — in that order.

**Mistake 5: Making guided mode an afterthought.**
Educational tools fail when education is a separate tab rather than embedded in the flow. The guided mode commentary in the rail sidebar and the inline explain-first output design are not polish — they are core product features that determine whether the tool teaches or merely calculates.[^40][^6]

**Mistake 6: Confusing "simple interface" with "simple logic."**
The internal margin mechanics should be rigorous and correct. The interface should be clean and readable. These are not in tension — they operate at different layers. Oversimplifying the logic in the name of simplicity produces wrong numbers; oversimplifying the interface in the name of rigor produces an unusable tool. Keep the logic institutional, keep the interface editorial.[^5][^6]

**Mistake 7: Ignoring total cost drag.**
Many tools and many investors focus only on the margin call risk and ignore borrowing cost, commission, spread, and custody fees. In a small portfolio, these costs can represent 3–5% of the trade notional on a round trip — a threshold that requires meaningful upside just to break even. The product's value grows dramatically when it shows investors the true cost of a margin position, not just its safety threshold.[^10][^14]

**Mistake 8: Building scenario presets without teaching what they represent.**
Scenario chips are powerful but meaningless without context. Each preset should have a one-sentence description and, ideally, a historical reference point. "Peak Exhaustion ~ S&P correction June 2022" is far more useful than a number labeled "Peak."[^3]

---

## References

1. [thinkorswim ® trading platforms give you the power to go ...](https://www.schwab.com/trading/thinkorswim) - The thinkorswim® online trading platform suite gives you the cutting-edge trading tools you need. Ge...

2. [Looking at Margin on IBKR Mobile | Trading Lesson](https://www.interactivebrokers.com/campus/trading-lessons/looking-at-margin-on-ibkr-mobile/) - The IBKR mobile app allows the investor to view their current margin use as well as show the margin ...

3. [Margin Services - CME Group](https://www.cmegroup.com/solutions/risk-management/margin-services.html) - Calculate margin requirements, access CME Group margin models, run scenarios and more using a suite ...

4. [Impact of Digital Platforms on Investment Decisions](https://mswmanagementj.com/index.php/home/article/view/1831) - Indian economy has witnessed revolutionary changes due to globalization, technological advancements ...

5. [Rethinking Density in UX: How to Design High-Information Interfaces Without Overload](https://www.linkedin.com/pulse/rethinking-density-ux-how-design-high-information-without-de-souza-uc92e) - When we think about UX design, density is often a point of contention. Marketing websites are usuall...

6. [How UX Redesign Increased User Engagement by 140%](https://vittarthi.com/resources/case-study/epf-calculator-ux-case-study-user-engagement-growth) - Discover how a UX-driven redesign transformed an EPF Calculator into a high-engagement financial pla...

7. [Reducing Cognitive Load in Financial Apps](https://www.ijsat.org/papers/2025/3/8000.pdf) - This paper looks at real-world strategies to make financial apps easier to use by reducing cognitive...

8. [Understanding the New Intraday Margin Requirements | FINRA.org](https://www.finra.org/investors/insights/intraday-margin-requirements) - FINRA has adopted significant changes to its margin rule with potential impacts on active investors....

9. [Common Pitfalls](https://uxuiprinciples.com/en/principles/progressive-disclosure) - Reveal complexity in stages so users aren't overwhelmed. Progressive disclosure cuts time to first a...

10. [Margin Regulation | FINRA.org](https://www.finra.org/rules-guidance/key-topics/margin-accounts) - On This PageOverview of Margin RequirementsExtensions of TimeInterpretations of FINRA's Margin RuleC...

11. [Series 7 Margin Accounts Guide 2026: Reg T, SMA & Calculations (FREE Practice)](https://www.youtube.com/watch?v=L6Mp2l7PiC0) - Master margin accounts for the Series 7 exam in 2026! This guide covers Regulation T, SMA (Special M...

12. [Margin Call Price](https://www.financialexamhelp123.com/margin-call-price/)

13. [Margin Call - Definition, Working and How to Avoid - Bajaj Finservwww.bajajfinserv.in › margin-call](https://www.bajajfinserv.in/margin-call) - A margin call occurs when a margin account's value falls below its maintenance requirement, and a br...

14. [Determining Buying Power - IBKR Guides](https://www.ibkrguides.com/kb/en-us/determining-buying-power.htm)

15. [Portfolio Margin vs. Regulation T Margin - Charles Schwab](https://www.schwab.com/learn/story/portfolio-margin-vs-regulation-t-margin) - Portfolio margin offers qualified traders access to risk-based margin. Here's the difference between...

16. [CB1/BC/13/98/2 Bills Committee on Securiti](https://www.legco.gov.hk/yr98-99/english/bc/bc13/minutes/bc131105.pdf)

17. [Regulatory framework for haircuts on non-centrally cleared ...](https://www.fsb.org/uploads/P261119-1.pdf) - The framework of numerical haircut floors applies to non-centrally-cleared securities financing tran...

18. [SECURITIES AND EXCHANGE COMMISSION](https://www.sec.gov/files/rules/sro/nscc/2023/34-98881.pdf)

19. [Special Memorandum Account (SMA): Definition and ...](https://www.investopedia.com/terms/s/specialmemorandumaccount.asp) - An SMA equates to the buying power balance or excess equity in a margin account, which is money an i...

20. [Special memorandum account](https://en.wikipedia.org/wiki/Special_memorandum_account) - Regulation T allows transfers from the SMA to be used as margin for new purchases in their margin ac...

21. [Reg T vs Portfolio Margin: Which Is Best for You? - TradingBlock](https://www.tradingblock.com/blog/reg-t-vs-portfolio-margin) - Reg T sets fixed margin requirements per position, while portfolio margin adjusts based on a portfol...

22. [Portfolio Margin vs Reg-T 2026: Complete Comparison for Option Traders](https://coveredcallcalculator.net/guides/options-portfolio-margin-vs-reg-t-comparison) - A 2026 head-to-head comparison of FINRA Rule 4210 portfolio margin and Reg-T strategy-based margin c...

23. [Collateral and Haircut Policy and Procedure](https://www.cftc.gov/sites/default/files/filings/orgrules/20/01/rule012720iclreu2dco001.pdf)

24. [Marginal Contribution to Risk | Learn | FactorIQ](https://factoriq.dev/learn/risk-decomposition/marginal-contribution-to-risk) - MCR measures each holding's share of total portfolio volatility. Holdings with MCR greater than thei...

25. [What Are Portfolio Rebalancing Algorithms?](https://www.cube.exchange/what-is/portfolio-rebalancing-algorithms) - Learn what portfolio rebalancing algorithms are, how calendar, threshold, and hybrid rules work, and...

26. [M1 Finance on Instagram: "Using Auto-invest, Pies gently rebalance ...](https://www.instagram.com/reel/C-n6vmrsZv4/?hl=en) - Using Auto-invest, Pies gently rebalance over time—without selling. M1 intelligently buys holdings t...

27. [How to rebalance your M1 investment account - M1 Help Center](https://help.m1.com/en/articles/9332105-how-to-rebalance-your-m1-investment-account) - Note: If your portfolio consists of a single Pie, you will need to select that Pie prior to initiati...

28. [OCC - Margin Methodology](https://www.theocc.com/risk-management/margin-methodology) - For collateral types that are subject to "collateral in margins" treatment, the impact of a withdraw...

29. [JSE CLEAR COLLATERAL RISK MANAGEMENT ...](https://jseclear.jse.co.za/pdf/Jse%20Pdf/Resources/JSE_Clear_Collateral_Risk_Management_Framework.pdf) - Haircuts will be applied to each security that is eligible to be posted as collateral2. A discounted...

30. [Risk Decomposition: Marginal Vs. Risk Contributions](https://www.investing.com/analysis/risk-decomposition:-marginal-vs.-risk-contributions-129588) - Market Analysis by covering: . Read 's Market Analysis on Investing.com

31. [9.4 Margin Calculations | Series 7 (General Securities Representative)](https://open-exam-prep.com/exams/series7/chapter-9/margin-calculations) - Formulas for long/short equity, trigger prices, and SMA.

32. [Advanced Stock Portfolio Tracker - Simply Wall St](https://simplywall.st/features/portfolio) - Connect your broker, track detailed returns and dividends, monitor CAGR, get valuation and risk aler...

33. [Simply Wall St Review 2026: Features, Pricing & Alternative](https://stockunlock.com/simply-wall-st-review.html) - Investors will find a Portfolio Health Score derived from Stock Unlock's proprietary stock scores, A...

34. [Simply Wall St. stock analysis platform](https://github.com/Simply-Wall-St-stock-analysis-platform) - Visual Stock Analysis: Use the Simply Wall St. stock analysis platform to transform complex financia...

35. [Margin Trading Calculator - Leverage, Requirements & Margin Calls ...](https://www.nicebreakout.com/calculators/margin-trading) - Professional margin calculator for leverage requirements and margin call analysis.

36. [Getting Started](https://toslc.thinkorswim.com/center/howToTos/thinkManual/Getting-Started) - All versions include paperMoney®, a simulated trading environment where you can practice strategies ...

37. [Intro to IBKR Tools | IBKR Campus](https://www.interactivebrokers.com/campus/traders-academy/intro-to-ibkr-tools/) - Get started by learning the basic features and format of the TWS platform, including its myriad of a...

38. [Portfolio Rebalancing Tool: Build Your Custom Strategy - Quadratic](https://www.quadratichq.com/use-cases/portfolio-rebalancing-tool-rebalance-with-precision) - Build a custom portfolio rebalancing tool in Quadratic. Sync live data, calculate drift, rebalance c...

39. [Solution](https://ui-patterns.com/patterns/ProgressiveDisclosure) - Design Pattern: The user wants to focus on the task at hand with as few distractions as possible whi...

40. [Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/) - Initially, show users only a few of the most important options. · Offer a larger set of specialized ...

41. [Optimal Font Size and Line Height for Digital Reading (2026)](https://www.agentys.io/en/blog/taille-police-interligne-optimal) - The three numbers that make digital text readable: 16 px minimum body size, 1.4-1.6 line height, 45-...

42. [13 XII December 2025 https://doi. ...](https://www.ijraset.com/best-journal/aibased-decision-support-system-for-retail-investors)

43. [Fintech App Design Best Practices: Complete Guide for ...](https://www.saasfactor.co/blogs/fintech-app-design-best-practices) - Reducing cognitive load in fintech navigation means making the interface do more of the work so the ...

