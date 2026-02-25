# FamilyFolio - Family Wealth Tracker

A modern, multi-user portfolio tracking application built with Next.js 14+, TypeScript, and Tailwind CSS. Track your family's investments across stocks, crypto, and ETFs with support for multiple sub-accounts and an aggregated "Family View".

![FamilyFolio](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC?style=flat-square&logo=tailwind-css)

## Features

- 📊 **Multi-Portfolio Support** - Create separate portfolios for family members (Dad, Mom, Kids, etc.)
- 👨‍👩‍👧‍👦 **Family View** - Aggregated view combining all portfolios into one unified dashboard
- 💹 **Asset Tracking** - Track Stocks, Crypto, and ETFs with real-time mock pricing
- 📈 **Performance Metrics** - View total balance, P/L, top performers, and 24h changes
- 🎨 **Beautiful UI** - Professional fintech design with dark mode default
- 💾 **Local-First** - Data persists in localStorage using Zustand

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **State Management**: Zustand with persist middleware
- **Charts**: Recharts
- **Icons**: Lucide React
- **Date Handling**: date-fns

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd familyfolio

# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/
│   ├── globals.css        # Global styles and CSS variables
│   ├── layout.tsx         # Root layout with providers
│   └── page.tsx           # Dashboard page
├── components/
│   ├── dashboard/
│   │   ├── AllocationChart.tsx   # Pie chart for asset allocation
│   │   ├── Dashboard.tsx         # Main dashboard component
│   │   ├── HoldingsTable.tsx     # Holdings data table
│   │   └── SummaryCards.tsx      # Summary metric cards
│   ├── layout/
│   │   ├── Header.tsx            # App header
│   │   ├── PortfolioSwitcher.tsx # Portfolio dropdown selector
│   │   └── ThemeToggle.tsx       # Dark/light mode toggle
│   ├── providers/
│   │   ├── StoreInitializer.tsx  # Initializes mock data
│   │   └── ThemeProvider.tsx     # Theme context provider
│   ├── transactions/
│   │   └── AddTransactionDialog.tsx # Transaction form dialog
│   └── ui/                       # shadcn/ui components
├── lib/
│   ├── mockData.ts        # Mock data generators and price fetcher
│   └── utils.ts           # Utility functions
├── store/
│   └── usePortfolioStore.ts # Zustand store with selectors
└── types/
    └── index.ts           # TypeScript interfaces
```

## Usage

### Portfolio Management

1. **Switch Portfolios**: Use the dropdown in the header to switch between individual portfolios or "Family View (All)"
2. **Family View**: When selected, all transactions are aggregated - if Portfolio A has 1 BTC and Portfolio B has 2 BTC, you'll see 3 BTC total

### Adding Transactions

1. Click the "Add Transaction" button in the header
2. Select the target portfolio
3. Choose Buy or Sell
4. Enter asset details (symbol auto-suggests common assets)
5. Input quantity and price per unit
6. Submit to add the transaction

### Mock Data

The app comes pre-seeded with:
- **2 Portfolios**: "Main Stash" and "Kids Fund"
- **6 Transactions**: Mix of BTC, ETH, AAPL, VOO, and VTI

Mock prices are provided for common assets:
- BTC: $65,000
- ETH: $3,500
- AAPL: $185
- VOO: $450
- And more...

## Customization

### Adding More Mock Assets

Edit `src/lib/mockData.ts` to add more assets to `MOCK_PRICES` and `ASSET_SUGGESTIONS`.

### Styling

The app uses a professional fintech aesthetic with:
- **Dark mode default**
- **Emerald-500** for profits
- **Rose-500** for losses
- **Cyan accents** for primary actions

Customize colors in `src/app/globals.css`.

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## License

MIT
