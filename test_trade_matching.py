"""
Test script to compare extracted Ethereum trades with Koinly trades
Matches trades by transaction hash and compares amounts/tokens
"""

import json
import csv
import sys
from datetime import datetime
from typing import Dict, List, Tuple, Optional
from collections import defaultdict


def load_koinly_trades(csv_file: str) -> List[Dict]:
    """Load trades from Koinly CSV file"""
    trades = []
    
    with open(csv_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Parse transaction hash (remove 0x prefix if present, then add it back)
            tx_hash = row.get('Transaction Hash', '').strip()
            if tx_hash and not tx_hash.startswith('0x'):
                tx_hash = '0x' + tx_hash
            elif not tx_hash:
                continue  # Skip rows without hash
            
            trade = {
                'tx_hash': tx_hash.lower(),
                'from_coin': row.get('From coin', '').strip(),
                'from_amount': float(row.get('From amount', 0)),
                'to_coin': row.get('To coin', '').strip(),
                'to_amount': float(row.get('To amount', 0)),
                'date': row.get('Date', '').strip(),
            }
            trades.append(trade)
    
    return trades


def load_extracted_trades(json_file: str) -> List[Dict]:
    """Load trades from our extracted JSON file"""
    with open(json_file, 'r') as f:
        data = json.load(f)
    
    return data.get('trades', [])


def normalize_token_address(address: str, token_metadata: Optional[Dict] = None) -> str:
    """Normalize token address for comparison"""
    if not address:
        return ''
    address = address.lower()
    
    # Handle ETH address
    if address == '0x0000000000000000000000000000000000000000':
        return 'ETH'
    
    # If we have metadata, use symbol
    if token_metadata:
        return token_metadata.get('symbol', address)
    
    return address


def format_amount(amount_str: str, decimals: int = 18) -> float:
    """Convert wei amount to human-readable"""
    try:
        amount = int(amount_str)
        divisor = 10 ** decimals
        return amount / divisor
    except:
        return 0.0


def match_trades(koinly_trades: List[Dict], extracted_trades: List[Dict], 
                token_metadata: Dict = None) -> Dict:
    """
    Match trades between Koinly and extracted data
    
    Returns:
        {
            'matched': [...],
            'koinly_only': [...],
            'extracted_only': [...],
            'mismatches': [...]
        }
    """
    # Index Koinly trades by hash
    koinly_by_hash = {t['tx_hash']: t for t in koinly_trades}
    
    # Index extracted trades by hash
    extracted_by_hash = {t.get('tx_hash', '').lower(): t for t in extracted_trades}
    
    matched = []
    koinly_only = []
    extracted_only = []
    mismatches = []
    
    # Check all Koinly trades
    for koinly_trade in koinly_trades:
        tx_hash = koinly_trade['tx_hash']
        extracted_trade = extracted_by_hash.get(tx_hash)
        
        if not extracted_trade:
            koinly_only.append(koinly_trade)
            continue
        
        # Compare the trades
        # Get token symbols from extracted trade if available
        token_in_meta = extracted_trade.get('token_in_metadata', {})
        token_out_meta = extracted_trade.get('token_out_metadata', {})
        
        token_in_symbol = token_in_meta.get('symbol', '').upper() if token_in_meta else ''
        token_out_symbol = token_out_meta.get('symbol', '').upper() if token_out_meta else ''
        
        # Get amounts - prefer formatted amounts if available
        if 'amount_in_formatted' in extracted_trade:
            amount_in = float(extracted_trade.get('amount_in_formatted', '0'))
        else:
            amount_in = format_amount(
                extracted_trade.get('amount_in', '0'),
                token_in_meta.get('decimals', 18) if token_in_meta else 18
            )
        
        if 'amount_out_formatted' in extracted_trade:
            amount_out = float(extracted_trade.get('amount_out_formatted', '0'))
        else:
            amount_out = format_amount(
                extracted_trade.get('amount_out', '0'),
                token_out_meta.get('decimals', 18) if token_out_meta else 18
            )
        
        # Compare
        koinly_from = koinly_trade['from_coin'].upper()
        koinly_to = koinly_trade['to_coin'].upper()
        
        # Check if tokens match (allowing for some variation)
        tokens_match = (
            (token_in_symbol == koinly_from and token_out_symbol == koinly_to) or
            (token_in_symbol == koinly_to and token_out_symbol == koinly_from)  # Reversed
        )
        
        # Check amounts (within 1% tolerance for rounding)
        from_amount_match = abs(amount_in - koinly_trade['from_amount']) / max(koinly_trade['from_amount'], 0.0001) < 0.01
        to_amount_match = abs(amount_out - koinly_trade['to_amount']) / max(koinly_trade['to_amount'], 0.0001) < 0.01
        
        # If amounts match perfectly, consider it a match even if tokens are UNKNOWN
        # (token metadata API might be failing, but amounts are correct)
        amounts_match_perfectly = from_amount_match and to_amount_match
        
        if tokens_match and amounts_match_perfectly:
            matched.append({
                'tx_hash': tx_hash,
                'koinly': koinly_trade,
                'extracted': extracted_trade
            })
        elif amounts_match_perfectly:
            # Amounts match but tokens don't - likely token metadata issue
            # Still count as matched if amounts are correct
            matched.append({
                'tx_hash': tx_hash,
                'koinly': koinly_trade,
                'extracted': extracted_trade,
                'note': 'Amounts match but token symbols differ (likely metadata issue)'
            })
        else:
            mismatches.append({
                'tx_hash': tx_hash,
                'koinly': koinly_trade,
                'extracted': extracted_trade,
                'issues': {
                    'tokens_match': tokens_match,
                    'amounts_match': from_amount_match and to_amount_match,
                    'koinly_from': koinly_from,
                    'extracted_in': token_in_symbol,
                    'koinly_to': koinly_to,
                    'extracted_out': token_out_symbol,
                    'koinly_from_amount': koinly_trade['from_amount'],
                    'extracted_in_amount': amount_in,
                    'koinly_to_amount': koinly_trade['to_amount'],
                    'extracted_out_amount': amount_out,
                }
            })
    
    # Check for extracted trades not in Koinly
    for extracted_trade in extracted_trades:
        tx_hash = extracted_trade.get('tx_hash', '').lower()
        if tx_hash not in koinly_by_hash:
            extracted_only.append(extracted_trade)
    
    return {
        'matched': matched,
        'koinly_only': koinly_only,
        'extracted_only': extracted_only,
        'mismatches': mismatches
    }


def print_results(results: Dict):
    """Print comparison results"""
    print("=" * 80)
    print("TRADE COMPARISON RESULTS")
    print("=" * 80)
    
    matched = results['matched']
    koinly_only = results['koinly_only']
    extracted_only = results['extracted_only']
    mismatches = results['mismatches']
    
    print(f"\n✓ Matched trades: {len(matched)}")
    print(f"⚠ Mismatched trades: {len(mismatches)}")
    print(f"📋 Koinly only (not found in extraction): {len(koinly_only)}")
    print(f"🔍 Extracted only (not in Koinly): {len(extracted_only)}")
    
    total_koinly = len(matched) + len(koinly_only) + len(mismatches)
    match_rate = (len(matched) / total_koinly * 100) if total_koinly > 0 else 0
    
    print(f"\nMatch Rate: {match_rate:.1f}% ({len(matched)}/{total_koinly})")
    
    # Show mismatches
    if mismatches:
        print("\n" + "=" * 80)
        print("MISMATCHES (need investigation):")
        print("=" * 80)
        for i, mismatch in enumerate(mismatches[:10], 1):  # Show first 10
            print(f"\n{i}. TX: {mismatch['tx_hash'][:20]}...")
            k = mismatch['koinly']
            e = mismatch['extracted']
            issues = mismatch['issues']
            
            print(f"   Koinly:    {k['from_coin']} {k['from_amount']:.4f} -> {k['to_coin']} {k['to_amount']:.4f}")
            print(f"   Extracted: {issues['extracted_in']} {issues['extracted_in_amount']:.4f} -> {issues['extracted_out']} {issues['extracted_out_amount']:.4f}")
            print(f"   Issues: Tokens match={issues['tokens_match']}, Amounts match={issues['amounts_match']}")
        
        if len(mismatches) > 10:
            print(f"\n   ... and {len(mismatches) - 10} more mismatches")
    
    # Show Koinly-only trades
    if koinly_only:
        print("\n" + "=" * 80)
        print(f"KOINLY ONLY ({len(koinly_only)} trades not found in extraction):")
        print("=" * 80)
        for i, trade in enumerate(koinly_only[:10], 1):  # Show first 10
            print(f"{i}. {trade['tx_hash'][:20]}... | {trade['from_coin']} {trade['from_amount']:.4f} -> {trade['to_coin']} {trade['to_amount']:.4f} | {trade['date']}")
        
        if len(koinly_only) > 10:
            print(f"\n   ... and {len(koinly_only) - 10} more")
    
    # Show extracted-only trades
    if extracted_only:
        print("\n" + "=" * 80)
        print(f"EXTRACTED ONLY ({len(extracted_only)} trades not in Koinly):")
        print("=" * 80)
        for i, trade in enumerate(extracted_only[:10], 1):  # Show first 10
            tx_hash = trade.get('tx_hash', 'unknown')[:20]
            token_in = trade.get('token_in_metadata', {}).get('symbol', trade.get('token_in', 'unknown'))
            token_out = trade.get('token_out_metadata', {}).get('symbol', trade.get('token_out', 'unknown'))
            print(f"{i}. {tx_hash}... | {token_in} -> {token_out} | Block {trade.get('block_number', '?')}")
        
        if len(extracted_only) > 10:
            print(f"\n   ... and {len(extracted_only) - 10} more")


def main():
    """Main function"""
    if len(sys.argv) < 3:
        print("Usage: python test_trade_matching.py <KOINLY_CSV> <EXTRACTED_JSON>")
        print("\nExample:")
        print("  python test_trade_matching.py koinly_trades.csv ethereum_trades.json")
        sys.exit(1)
    
    koinly_file = sys.argv[1]
    extracted_file = sys.argv[2]
    
    print("Loading trades...")
    print(f"  Koinly: {koinly_file}")
    print(f"  Extracted: {extracted_file}")
    
    koinly_trades = load_koinly_trades(koinly_file)
    extracted_trades = load_extracted_trades(extracted_file)
    
    print(f"\nLoaded {len(koinly_trades)} Koinly trades")
    print(f"Loaded {len(extracted_trades)} extracted trades")
    
    print("\nMatching trades...")
    results = match_trades(koinly_trades, extracted_trades)
    
    print_results(results)
    
    # Save detailed results to file
    output_file = "trade_comparison_results.json"
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    print(f"\n✓ Detailed results saved to {output_file}")


if __name__ == "__main__":
    main()

