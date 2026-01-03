# Ethereum DEX Trade Extractor

A comprehensive tool to extract **ALL** DEX trades from your Ethereum wallet address across **ALL** major decentralized exchanges.

## Overview

This solution identifies and extracts DEX swaps from your Ethereum transaction history by:

1. **Fetching all transactions** from Etherscan API (normal, ERC-20 transfers, internal)
2. **Analyzing transaction patterns** to identify DEX interactions
3. **Parsing swap events** across multiple DEX protocols
4. **Extracting trade details** (tokens, amounts, prices, DEX name)

## Supported DEX Protocols

The tool detects trades from all major DEXes:

- **Uniswap V2 & V3**
- **SushiSwap**
- **Curve Finance**
- **1inch (V4 & V5)**
- **Balancer V2**
- **0x Protocol**
- **KyberSwap**
- **DODO**
- **Paraswap**
- **CowSwap (CoW Protocol)**
- **Bancor Network**
- **And more** (any swap detected via pattern matching)

## Installation

1. Install required dependencies:
```bash
pip install -r requirements.txt
```

2. Get an Etherscan API key (free tier works):
   - Go to https://etherscan.io/apis
   - Sign up and get your API key

## Usage

### Quick Start (Recommended)

Use the main orchestrator script that does everything:

```bash
python get_ethereum_trades.py YOUR_API_KEY 0xYourWalletAddress
```

This will:
1. Fetch all transactions from Etherscan
2. Parse and identify DEX trades
3. Save results to `ethereum_trades.json`

### Step-by-Step Usage

If you prefer to run steps separately:

#### Step 1: Fetch Transactions

```bash
python fetch_ethereum_transactions.py YOUR_API_KEY 0xYourWalletAddress wallet_trades.json
```

This saves all transaction data to `wallet_trades.json`.

#### Step 2: Parse Trades

```bash
python parse_ethereum_trades.py wallet_trades.json ethereum_trades.json
```

This analyzes the transactions and extracts trades.

### Advanced Options

```bash
# Skip fetching and use existing data
python get_ethereum_trades.py YOUR_API_KEY 0xYourAddress --skip-fetch

# Specify custom output file
python get_ethereum_trades.py YOUR_API_KEY 0xYourAddress --output my_trades.json
```

## Output Format

The output JSON file contains:

```json
{
  "address": "0x...",
  "total_trades": 150,
  "trades": [
    {
      "tx_hash": "0x...",
      "block_number": 18500000,
      "timestamp": 1690000000,
      "dex": "Uniswap V2",
      "token_in": "0x...",
      "token_out": "0x...",
      "amount_in": "1000000000000000000",
      "amount_out": "2000000000000000000",
      "type": "swap"
    },
    ...
  ],
  "metadata": {
    "parsed_at": "2024-01-01 12:00:00 UTC",
    "total_transactions": 500,
    "total_erc20_transfers": 300
  }
}
```

## How It Works

### 1. Transaction Fetching (`fetch_ethereum_transactions.py`)

- Uses Etherscan API to fetch:
  - **Normal transactions**: All ETH and contract interactions
  - **ERC-20 transfers**: All token transfers
  - **Internal transactions**: ETH transfers from contracts
- Handles pagination automatically
- Respects rate limits (5 calls/sec for free tier)

### 2. Trade Identification (`parse_ethereum_trades.py`)

The parser uses multiple strategies to identify swaps:

#### Strategy 1: DEX Router Detection
- Checks if transaction interacts with known DEX router addresses
- Identifies DEX by router contract address

#### Strategy 2: Function Signature Matching
- Analyzes transaction input data
- Matches against known swap function signatures:
  - `swapExactTokensForTokens`
  - `swapExactETHForTokens`
  - `exactInputSingle` (Uniswap V3)
  - And 20+ more signatures

#### Strategy 3: Transfer Pattern Analysis
- Groups ERC-20 transfers by transaction hash
- Identifies swaps when:
  - Multiple token transfers in same transaction
  - Your address sends one token and receives another
  - Pattern matches typical DEX swap behavior

#### Strategy 4: ETH Swap Detection
- Detects swaps involving native ETH
- Matches ETH transfers with token transfers
- Handles WETH wrapping/unwrapping

### 3. Trade Extraction

For each identified swap:
- Extracts token addresses (in and out)
- Calculates amounts (in and out)
- Identifies DEX protocol
- Records block number and timestamp
- Saves transaction hash for verification

## Configuration

Edit `ethereum_config.py` to:
- Add more DEX router addresses
- Add new swap function signatures
- Adjust rate limiting
- Add custom token addresses

## Rate Limits

- **Free Etherscan API**: 5 calls/second
- The script automatically handles rate limits with delays
- For large wallets, fetching may take several minutes

## Troubleshooting

### No trades found
- Check that your address has DEX transactions
- Verify the address format (0x followed by 40 hex characters)
- Try viewing your address on Etherscan's DEX Tracker

### API errors
- Verify your API key is correct
- Check your API key rate limit on Etherscan
- Wait a few minutes if rate limited

### Missing trades
- Some DEXes use non-standard patterns
- Check `ethereum_config.py` and add missing router addresses
- The parser catches most swaps via pattern matching even if DEX is unknown

## Files Created

- `wallet_trades.json`: Raw transaction data from Etherscan
- `ethereum_trades.json`: Parsed DEX trades (final output)

## Example Output

```
================================================================
Ethereum DEX Trade Extractor
================================================================
Address: 0xb77Cb8F81A0f704E1E858EBa57C67c072ABBFCAD
Output: ethereum_trades.json
================================================================

[Step 1/2] Fetching transactions from Etherscan...
------------------------------------------------------------
Fetching txlist transactions...
  Page 1... Got 50 transactions (total: 50)
✓ Retrieved 50 txlist transactions total

Fetching tokentx transactions...
  Page 1... Got 200 transactions (total: 200)
✓ Retrieved 200 tokentx transactions total

[Step 2/2] Parsing DEX trades...
------------------------------------------------------------
Analyzing transactions to identify DEX trades...
  Found swap: Uniswap V2 - Block 18500000
  Found swap: SushiSwap - Block 18500100
  ...
✓ Identified 45 DEX trades

================================================================
Summary
================================================================
Total trades found: 45

Trades by DEX:
  Uniswap V2: 20
  SushiSwap: 15
  Uniswap V3: 5
  Curve Router: 3
  1inch V5: 2

Date range: 2023-01-01 to 2024-01-01
================================================================
```

## Next Steps

After extracting trades, you can:
- Import to tax software (Koinly, CoinTracker, etc.)
- Analyze trading patterns
- Calculate P&L
- Generate reports

## Notes

- Token amounts are in raw wei/smallest unit (not human-readable)
- To convert: divide by 10^decimals for the token
- Use token metadata APIs to get token names and decimals
- All timestamps are Unix timestamps (seconds since epoch)

## Support

For issues or questions:
1. Check that your API key is valid
2. Verify your address format
3. Review the transaction data in `wallet_trades.json`
4. Check Etherscan directly to verify trades exist

