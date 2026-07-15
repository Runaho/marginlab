# MarginLab Educational Platform - Project Specification

<img width="2025" height="1273" alt="marginlab" src="https://github.com/user-attachments/assets/601b8d2a-265b-49fc-b25c-83a124efb42f" />

## Overview

MarginLab is an educational stock market platform that teaches users how to manage a portfolio using margin responsibly. The platform combines portfolio management, margin requirement calculators, and trade suggestions based on available margin and portfolio constraints.

---

## 🎯 Project Vision

**Mission:** Teach retail investors margin mechanics through risk-free simulation, preventing costly real-world mistakes.

**Core Philosophy:** "Learn to fail safely, then succeed confidently" - simulate margin calls before committing real money.

---

## 📊 Key Features

### 1. Portfolio Management
- **Interactive portfolio builder** - add/remove positions with real market data
- **Dynamic valuation** - real-time P/L, sector allocation, concentration risk
- **Scenario stress testing** - 12+ market conditions (Bull, Peak, Credit Stress, etc.)

### 2. Margin Requirement Calculator
- **Reg T margin modeling** - 50% initial, 25% maintenance
- **Account-level calculations** - Portfolio Margin (awaiting broker data)
- **Trading power engine** - PDTRULE, leverage limits, early warnings
- **Scenario-aware** - Shows how portfolio shocks affect new trade capacity

### 3. Trade Finder Engine
- **Portfolio-aware recommendations** - Consider existing positions
- **Risk-budget allocation** - Maximize returns within risk constraints
- **Scenario-resilience scoring** - Best in Bull? Worst in Peak?
- **Educational feedback** - Why this trade? What risks?

---

## 🏗️ Architecture Overview

### Core Engine
```
┌─────────────────────────────────────────────────────────┐
│                    AccountEngine                        │
│  • State Management (cash, holdings, margin)             │
│  • Margin Calculations (Reg T, Portfolio)               │
│  • Scenario Simulations (12 stress tests)              │
│  • Trade Suggestions (Finder)                          │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│                    UI Layer                             │
│  • Portfolio Dashboard (svelte)                          │
│  • Margin Calculator (svelte)                           │
│  • Trade Finder (svelte)                               │
│  • Stress Test Simulator (svelte)                       │
└─────────────────────────────────────────────────────────┘
```

### Data Flow
1. **User actions** → AppState.svelte (reactive state)
2. **Calculations** → AccountEngine (centralized logic)
3. **Visualizations** → Svelte components (presentational)
4. **Persistence** → LocalStorage, Hash-based URLs

---

## 📚 Educational Curriculum

### Module 1: Margin Fundamentals (2 weeks)
1. **Cash vs. Margin Accounts**
   - Benefits: Leverage, position sizing
   - Risks: Interest, margin calls, forced liquidation

2. **Reg T Rules**
   - Initial margin: 50% of stock value
   - Maintenance margin: 25% of stock value
   - Pattern Day Trader (PDT): 4x leverage, $25k minimum

3. **Key Formulas**
   ```
   Position Value = Shares × Price
   Required Equity = Position Value × Initial Margin % (0.50)
   Loan = Position Value - Required Equity  
   Maintenance Requirement = Position Value × Maintenance Margin % (0.25)
   Call Price = (Loan - Cash) / (Shares × (1 - Maintenance Margin %))
   Buffer = (Current Price - Call Price) / Call Price × 100
   ```

4. **Learning Activities**
   - Margin call replay scenarios (2020, 2022 crashes)
   - Portfolio stress tests
   - Trade simulation with different market conditions

### Module 2: Portfolio Risk Management (3 weeks)
1. **Concentration Risk**
   - FINRA Rule 2810: Concentration limits (40% max)
   - Sector diversification
   - Single stock vs. sector risk

2. **Scenario Analysis**
   - 12 predefined scenarios (Bull, Peak, Credit Stress, etc.)
   - Portfolio-level impact analysis
   - Correlation effects

3. **Risk Metrics**
   - Sharpe ratio, standard deviation, VaR
   - Portfolio optimization basics
   - Risk-adjusted returns

### Module 3: Advanced Margin Strategies (2 weeks)
1. **Margin Optimization**
   - Margin ladders, collars, spreads
   - Portfolio margin concepts
   - Option-based strategies

2. **Risk Management Psychology**
   - Behavioral biases
   - Stop-loss discipline
   - Emotion-free decision making

3. **Professional Tools**
   - Advanced risk calculators
   - Alternative margin sources
   - Tax considerations

---

## 💻 Technical Implementation

### Critical Changes Made

#### 1. Fixed Collateral Calculation (`collateral.ts`)
**Before:**
```ts
const existingInitialReq = 0; // Ignored existing positions
```
**After:**
```ts
let initialMarginRequirement = 0;
for (const h of data.holdings) {
  initialMarginRequirement += positionValue * data.account.initialMargin;
}
```

#### 2. Fixed Margin Call Formula (`margin.ts`)
**Before:**
```ts
const callPrice = borrow / (shares * (1 - account.maintenanceMargin));
```
**After:**
```ts
const callPrice = (borrow - (cash ?? availableCollateral)) / (shares * (1 - account.maintenanceMargin));
```

#### 3. Fixed Trade Finder Equity (`finder.ts`)
**Before:**
```ts
const equity = Math.min(config.budget, tradeValue);
```
**After:**
```ts
const equity = Math.min(config.budget, tradeValue * ctx.account.initialMargin);
```

#### 4. New Account Engine (`AccountEngine.ts`)
- **Unified state management** for all margin calculations
- **Scenario testing** with portfolio-level impact
- **Trade suggestions** with risk analysis
- **Educational feedback** for each action

---

## 🚀 MVP Feature Roadmap

### Phase 1 (Weeks 1-3): Core Risk Engine
**Must-Have Features:**
- ✅ Correct margin math (initial/maintenance requirements)
- ✅ Portfolio stress testing (12 scenarios)
- ✅ Interactive portfolio builder
- ✅ Trade finder with scenario resilience
- ✅ Mobile-responsive UI

**Technical Setup:**
- AccountEngine with centralized margin calculations
- Reactive state management (Svelte 5)
- Historical market data for stress scenarios
- Unit tests for margin formulas

### Phase 2 (Weeks 4-8): Educational Content
**Must-Have Features:**
- ✅ 6-module curriculum with assessments
- ✅ Interactive tutorials and walkthroughs
- ✅ Progress tracking and badges
- ✅ Printable educational materials

**Suggested Features:**
- Progressive complexity (easy → hard)
- Real-world case studies
- Expert video interviews (optional)

### Phase 3 (Weeks 9-12): Community & Analytics
**Must-Have Features:**
- ✅ Share portfolios (anonymized)
- ✅ Leaderboards (educational focus)
- ✅ Custom scenario builder
- ✅ Progress analytics

**Suggested Features:**
- Peer comparison
- Success story sharing
- Forum/community (moderated)

---

## 📊 Success Metrics (Learning Outcomes)

### Knowledge Acquisition
| Metric | Target | Method |
|--------|--------|---------|
| Formula retention (30 days) | >70% | Post-module quizzes |
| Concept application | >80% | Scenario simulations |
| Risk understanding | >90% | Stress test scenarios |

### Behavioral Changes (in simulation)
| Metric | Target | Measurement |
|--------|--------|-------------|
| Average leverage used | <1.5x | Simulation logs |
| Margin call experienced | 100% | Simulation forced |
| Stop-loss set | 100% | User interface data |
| Risk diversification | 80% | Portfolio analysis |

### Real-World Impact (opt-in data)
| Metric | Target | Source |
|--------|--------|--------|
| Accounts opened (90 days) | 50% of beta | Partner broker data |
| Average leverage maintained | <1.2x | Usage analytics |
| Margin calls avoided | 95% | Error logging |
| Portfolio survival (6 months) | 95% | Platform data |

### Platform Usage
| Metric | Target | Measurement |
|--------|--------|-------------|
| Weekly active users | 40% | Analytics |
| Module completion rate | 70% | Progress tracking |
| Community engagement | 30% | Forum/threads |
| Satisfaction score | >8/10 | Surveys |

---

## 🎓 User Journey

### New User Flow
1. **Sign Up** → DEMO portfolio loaded automatically
2. **Module 1** → Learn margin basics through interactive tutorials
3. **Module 2** → Build portfolio, simulate scenarios
4. **Module 3** → Advanced strategies, community participation
5. **Live Trading** → Optional graduation path

### Key Pain Points Addressed
1. **Common margin mistakes**:
   - Over-leverage
   - Ignoring PDT rules
   - Not considering portfolio impact

2. **Learning barriers**:
   - Complex broker rules
   - Theoretical vs. practical knowledge
   - No safe way to fail

3. **Educational gaps**:
   - Risk management psychology
   - Correlation effects
   - Margin optimization strategies

---

## 🔒 Technical Challenges & Solutions

### Challenge 1: Complex Margin Rules
**Solution:** Broker-agnostic approach with rule stratification
- Reg T: Standard rules (50%/25%)
- PDT: Automatic leverage limits
- Portfolio Margin: Coming soon

### Challenge 2: Portfolio-Level Risk
**Solution:** AccountEngine with comprehensive margin calculations
- Existing position initial margin requirements
- Portfolio-level maintenance calculations
- Cascade margin call detection

### Challenge 3: Educational Effectiveness
**Solution:** Assessment-driven curriculum
- Pre/post knowledge assessments
- Progressive difficulty levels
- Real-world scenario replication

### Challenge 4: User Engagement
**Solution:** Gamification with learning focus
- Educational badges vs. achievement trophies
- Leaderboard filtered by learning outcomes
- Success sharing and community features

---

## 📈 Monetization Strategy

### B2C Model
- **Free tier:** Educational content, community features
- **Pro tier:** Advanced scenarios, detailed analytics, custom portfolios
- **Institutional:** Teacher/admin accounts, classroom features

### B2B Partnerships
- **Broker integrations:** White-label for IBKR, Schwab, Robinhood
- **Educational platforms:** CAS, CFA Institute integration
- **Fintech APIs:** Wealth management tools

### Revenue Streams
- Subscription tiers (individual + enterprise)
- Premium broker integrations ($)
- Educational webinars (+$)
- Custom portfolio services (+$)

---

## 🔮 Future Roadmap

### Year 1: Foundation
- ✅ MVP complete and beta tested
- ✅ First 1000 educational users
- ✅ Basic broker integrations

### Year 2: Expansion
- ✅ Portfolio Margin support
- ✅ Mobile app development
- ✅ Advanced risk analytics
- ✅ Community features expansion

### Year 3: Advanced
- ✅ Machine learning risk predictions
- ✅ Real-time market integration
- ✅ AI-powered scenario generation
- ✅ Advanced derivatives modeling

---

## 🛠 Development Setup

### Local Development
```bash
# Clone and setup
git clone https://github.com/runaho/marginlab
cd marginlab
# npm install  (or equivalent)

# Development server
npm run dev
# Build for production
npm run build
# Run tests
npm run test
```

### Testing
- **Unit tests:** Margin calculation formulas
- **Integration tests:** Engine-to-UI flow
- **E2E tests:** User journey simulation
- **Accessibility:** WCAG 2.1 AA compliance

### Deployment
- **Frontend:** SvelteKit (Cloudflare Pages)
- **Backend:** Node.js functions (AWS Lambda)
- **Database:** LocalStorage, Hash-based persistence
- **Analytics:** Plausible stats engine

---

## 📝 Technical References

### Key Formulas
1. **Margin Call Buffer:** `
   Buffer = ((Current Price - Call Price) / Call Price) × 100`

2. **Available Funds:** `
   Available = Total Collateral - Initial Margin Requirement`

3. **Position Sizing:** `
   Max Shares = (Available Funds / (Price × Initial Margin %))`

4. **PDTRULE:** `
   If Account < $25k → Max Leverage = 2x, otherwise 4x`

### Broker Disclaimers
> This educational tool uses Rule-based margin modeling (Reg T). Actual broker rules may differ. Consult your broker for specific account terms.

### Educational Notes
- **Risk Disclaimer:** All simulations are educational. Real trading involves additional risks.
- **Historical Context:** Past performance does not guarantee future results.
- **Regulatory:** Users under 18 must have parental consent; verify local regulations.

---

## 🎯 Success Definition

**Primary Success:** Reduce retail margin-related losses by 50% through education and simulation.

**Secondary Success:** Increase financial literacy in retail investors by 30% through engaging educational tools.

---

## 📞 Support & Community

- **Documentation:** /docs (technical, user guides)
- **Community:** Discord/slack for users
- **Support:** Educational focus, no sales pressure
- **Feedback:** Built-in reporting, suggestion system

---

*This project aims to revolutionize retail investor education by making margin trading accessible, safe, and effective through comprehensive simulation and progressive learning.*

> **Remember:** The only margin you should worry about is **margin of error** in your assumptions, not margin in your account.*
