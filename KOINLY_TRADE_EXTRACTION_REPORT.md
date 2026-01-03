# Koinly Trade Extraction Project Report

## Project Overview

This project was created to extract cryptocurrency trade data from Koinly's web interface without requiring a paid subscription. By leveraging browser developer tools (F12), we were able to access the underlying JSON data and create a custom parser to extract and format trade information.

## Inception & Motivation

### The Problem
- **Goal**: Extract trade history from Koinly without paying for premium features
- **Discovery**: While using Koinly's web interface, JSON data containing all transaction information was visible in the browser's developer console (F12)
- **Opportunity**: This JSON data could be scraped and parsed to extract trade information independently

### The Idea
Instead of paying for Koinly's export features, we could:
1. Open Koinly in a web browser
2. Use F12 developer tools to access the network/console data
3. Extract the JSON transaction data
4. Parse it to extract only exchange trades
5. Format the output in a usable format (CSV)

## Project Timeline

### Phase 1: Data Discovery
- Identified that Koinly's web interface loads transaction data as JSON
- Located the JSON structure in browser developer tools (F12)
- Examined the structure of exchange transactions
- Identified a specific trade example: 31,356.779802 USDC → 31,383.338735 USDT

### Phase 2: Structure Analysis
Analyzed the JSON structure for exchange transactions:
```json
{
  "type": "exchange",
  "from": {
    "amount": "31356.779802",
    "currency": {
      "symbol": "USDC",
      ...
    }
  },
  "to": {
    "amount": "31383.338735",
    "currency": {
      "symbol": "USDT",
      ...
    }
  }
}
```

### Phase 3: Script Development
Created `parse_koinly_trades.py` with the following features:
- **Input**: JSON file extracted from browser console (`dump.txt`)
- **Filtering**: Only processes transactions with `type: "exchange"` (ignores deposits, withdrawals, accruals, etc.)
- **Extraction**: Extracts:
  - From coin (currency symbol)
  - From amount
  - To coin (currency symbol)
  - To amount
  - Date
  - Transaction hash
- **Output**: 
  - Formatted table in console
  - CSV file (`koinly_trades.csv`) with all trade data

### Phase 4: Testing & Verification
- Tested with a large JSON file (594,321 lines, 2,115 transactions)
- Successfully extracted 340 exchange trades
- Verified the specific 30K USDC→USDT trade was correctly extracted
- Confirmed all trades follow the same structure and are properly formatted

## Technical Implementation

### Key Features

1. **Robust JSON Parsing**
   - Handles large files efficiently
   - Progress indicators for long processing times
   - Error handling for malformed data

2. **Smart Filtering**
   - Only extracts `type: "exchange"` transactions
   - Ignores: deposits, withdrawals, accruals, transfers, etc.
   - Validates that both `from` and `to` data exist

3. **Data Formatting**
   - Formats amounts with proper decimal places and comma separators
   - Preserves raw amounts for CSV export
   - Includes metadata (date, transaction hash) for reference

4. **Output Formats**
   - **Console**: Human-readable formatted table
   - **CSV**: Spreadsheet-compatible format with all details

### Script Structure

```python
parse_koinly_trades.py
├── format_amount()          # Format numbers with commas
├── parse_koinly_trades()    # Main parsing logic
├── print_trades_table()      # Console output formatting
├── save_to_csv()            # CSV file generation
└── main()                    # Entry point and orchestration
```

## Results

### Success Metrics
- ✅ Successfully parsed 594,321 lines of JSON data
- ✅ Extracted 340 exchange trades from 2,115 total transactions
- ✅ Correctly identified and formatted the target trade (30K USDC→USDT)
- ✅ Generated clean, usable CSV output
- ✅ Zero data loss - all valid exchange trades extracted

### Output Format

**Console Output:**
```
From coin       From amount          To coin         To amount           
================================================================================
USDC            31,356.78            USDT            31,383.34           
USDC            7,008.00             USN             7,004.59            
...
```

**CSV Output:**
- Columns: From coin, From amount, To coin, To amount, Date, Transaction Hash
- 341 rows (340 trades + header)
- Ready for import into Excel, Google Sheets, or other analysis tools

## Usage

### Basic Usage
```bash
python3 parse_koinly_trades.py
```

### With Custom Files
```bash
python3 parse_koinly_trades.py dump.txt output.csv
```

### Process
1. Open Koinly in browser
2. Open Developer Tools (F12)
3. Find the JSON data in Network/Console
4. Copy and save to `dump.txt`
5. Run the script
6. Get formatted trades in `koinly_trades.csv`

## Benefits Achieved

1. **Cost Savings**: No need to pay for Koinly premium features
2. **Data Access**: Full access to all trade data in the account
3. **Custom Formatting**: Output tailored to specific needs
4. **Reusability**: Script can be run anytime with new data
5. **Transparency**: Full control over data extraction and processing

## Technical Challenges Overcome

1. **Large File Handling**: File with 594K+ lines required efficient memory management
2. **JSON Structure**: Complex nested structure required careful parsing
3. **Data Filtering**: Distinguishing trades from other transaction types
4. **Format Consistency**: Ensuring all trades follow the same structure

## Future Enhancements (Optional)

Potential improvements that could be added:
- Filter by date range
- Filter by specific coins
- Calculate profit/loss per trade
- Add fee information
- Support for other transaction types if needed
- Web scraping automation (directly from browser)
- Real-time monitoring/updates

## Files Created

1. **`parse_koinly_trades.py`**: Main extraction script (203 lines)
2. **`koinly_trades.csv`**: Output file with all extracted trades (342 lines)
3. **`KOINLY_TRADE_EXTRACTION_REPORT.md`**: This report

## Conclusion

This project successfully demonstrates how developer tools and custom scripting can provide access to data that would otherwise require paid services. By understanding the underlying data structure and creating a targeted parser, we achieved:

- Complete trade extraction from Koinly's interface
- Cost-free access to trade data
- Custom-formatted output for analysis
- A reusable solution for future data exports

The script is production-ready and has been verified with real-world data, successfully extracting 340 exchange trades from a complex JSON structure.

---

**Project Date**: January 2026  
**Status**: ✅ Complete and Verified  
**Script Version**: 1.0


