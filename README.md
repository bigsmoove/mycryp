# Solana Token Scanner Bot

A real-time token scanner for Solana blockchain that helps identify trending tokens while checking for potential risks and scams.

## Features

- Real-time trending token tracking
- Price change monitoring (24h)
- Volume analysis
- Liquidity tracking
- Token safety scanning
- Scam detection patterns

## Tech Stack

- Next.js 14
- TypeScript
- TailwindCSS
- Solana Web3.js
- DexScreener API Integration

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/bigsmoove/mycryp.git
cd mycryp
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Safety Checks

The scanner performs multiple safety checks including:
- Minimum liquidity requirements ($50k+)
- 24h trading volume analysis ($10k+)
- Suspicious token name detection
- Contract verification
- Trading pattern analysis

## Token Scanning Features

- Auto-refresh every 30 seconds
- Real-time price updates
- Volume tracking
- Liquidity monitoring
- Percentage change indicators
- One-click detailed token scanning

## API Integration

Using DexScreener API for:
- Token data
- Price information
- Trading volume
- Liquidity data
- Pair information

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/YourFeature`)
3. Commit your changes (`git commit -m 'Add some feature'`)
4. Push to the branch (`git push origin feature/YourFeature`)
5. Open a Pull Request

## License

MIT License
