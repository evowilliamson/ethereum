"""
Fetch all Ethereum transactions for a given address using Etherscan API
Fetches: normal transactions, ERC-20 transfers, and internal transactions
"""

import requests
import time
import json
import sys
from typing import List, Dict, Optional
from ethereum_config import ETHERSCAN_API_BASE, ETHEREUM_CHAIN_ID, RATE_LIMIT_DELAY


class EthereumTransactionFetcher:
    """Fetches all transaction data from Etherscan API"""
    
    def __init__(self, api_key: str, address: str):
        self.api_key = api_key
        self.address = address
        self.base_url = ETHERSCAN_API_BASE
        
    def _make_request(self, params: Dict) -> Optional[List[Dict]]:
        """Make a request to Etherscan API V2 with rate limiting"""
        params['apikey'] = self.api_key
        params['address'] = self.address
        params['chainid'] = ETHEREUM_CHAIN_ID  # Required for V2 API
        
        try:
            response = requests.get(self.base_url, params=params, timeout=30)
            time.sleep(RATE_LIMIT_DELAY)  # Respect rate limit
            
            if response.status_code != 200:
                print(f"HTTP Error {response.status_code}: {response.text}")
                return None
            
            data = response.json()
            
            result = data.get('result', [])
            message = data.get('message', '')
            status = data.get('status')
            
            if status == '0':
                if 'rate limit' in message.lower():
                    print("Rate limit hit, waiting 5 seconds...")
                    time.sleep(5)
                    return self._make_request(params)  # Retry
                elif 'No transactions found' in message or 'No records found' in message:
                    return []  # Empty result, not an error
                elif 'Invalid API Key' in message:
                    print(f"ERROR: Invalid API Key! Please check your Etherscan API key.")
                    return None
                elif 'Max rate limit reached' in message:
                    print(f"ERROR: Rate limit exceeded. Please wait and try again later.")
                    return None
                else:
                    # Check if we still got results despite status 0
                    if isinstance(result, list) and len(result) > 0:
                        return result
                    print(f"API Error: {message}")
                    return None
            
            # Handle case where result is a string (error message)
            if isinstance(result, str):
                if 'rate limit' in result.lower():
                    print("Rate limit in result, waiting...")
                    time.sleep(5)
                    return self._make_request(params)
                if 'deprecated' in result.lower():
                    print(f"  Warning: API returned deprecation message")
                    return []
                return []
            
            return result if isinstance(result, list) else []
            
        except Exception as e:
            print(f"Request error: {e}")
            return None
    
    def fetch_transactions(self, action: str, startblock: int = 0, 
                          endblock: int = 99999999, page: int = 1, 
                          offset: int = 10000, sort: str = 'asc') -> List[Dict]:
        """
        Fetch transactions with pagination
        
        Args:
            action: 'txlist' (normal), 'tokentx' (ERC-20), 'txlistinternal' (internal)
            startblock: Starting block number
            endblock: Ending block number
            page: Page number
            offset: Number of results per page (max 10000)
            sort: 'asc' or 'desc'
        """
        params = {
            'module': 'account',
            'action': action,
            'startblock': startblock,
            'endblock': endblock,
            'page': page,
            'offset': offset,
            'sort': sort
        }
        
        return self._make_request(params) or []
    
    def fetch_all_transactions(self, action: str) -> List[Dict]:
        """Fetch all transactions with automatic pagination"""
        all_txs = []
        page = 1
        
        print(f"\nFetching {action} transactions...")
        
        while True:
            print(f"  Page {page}...", end=' ', flush=True)
            txs = self.fetch_transactions(action, page=page)
            
            if txs is None:
                print("\nERROR: Failed to fetch transactions. Check API key and network connection.")
                break
            
            if len(txs) == 0:
                if page == 1:
                    print("No transactions found for this address.")
                else:
                    print("No more transactions.")
                break
            
            all_txs.extend(txs)
            print(f"Got {len(txs)} transactions (total: {len(all_txs)})")
            
            # If we got less than the max, we're done
            if len(txs) < 10000:
                break
            
            page += 1
        
        print(f"✓ Retrieved {len(all_txs)} {action} transactions total\n")
        return all_txs
    
    def fetch_all_data(self) -> Dict:
        """Fetch all transaction types for the address"""
        print(f"Fetching all transactions for address: {self.address}")
        print("=" * 60)
        
        # Fetch normal transactions
        normal_txs = self.fetch_all_transactions('txlist')
        
        # Fetch ERC-20 token transfers
        erc20_txs = self.fetch_all_transactions('tokentx')
        
        # Fetch internal transactions
        internal_txs = self.fetch_all_transactions('txlistinternal')
        
        return {
            "address": self.address,
            "normal_transactions": normal_txs,
            "erc20_token_transfers": erc20_txs,
            "internal_transactions": internal_txs,
            "metadata": {
                "total_normal": len(normal_txs),
                "total_erc20": len(erc20_txs),
                "total_internal": len(internal_txs),
                "fetched_at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
            }
        }


def main():
    """Main function to fetch transactions"""
    if len(sys.argv) < 3:
        print("Usage: python fetch_ethereum_transactions.py <API_KEY> <ADDRESS> [OUTPUT_FILE]")
        print("\nExample:")
        print("  python fetch_ethereum_transactions.py YOUR_API_KEY 0xYourAddress wallet_trades.json")
        sys.exit(1)
    
    api_key = sys.argv[1]
    address = sys.argv[2]
    output_file = sys.argv[3] if len(sys.argv) > 3 else "wallet_trades.json"
    
    if not address.startswith('0x') or len(address) != 42:
        print("Error: Invalid Ethereum address format")
        sys.exit(1)
    
    fetcher = EthereumTransactionFetcher(api_key, address)
    data = fetcher.fetch_all_data()
    
    # Save to file
    print(f"\nSaving data to {output_file}...")
    with open(output_file, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"✓ Data saved successfully!")
    print(f"\nSummary:")
    print(f"  Normal transactions: {data['metadata']['total_normal']}")
    print(f"  ERC-20 transfers: {data['metadata']['total_erc20']}")
    print(f"  Internal transactions: {data['metadata']['total_internal']}")
    print(f"\nNext step: Run extract_ethereum_trades.py to identify DEX swaps")


if __name__ == "__main__":
    main()

