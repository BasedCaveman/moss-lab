// MOSS mockUSDm on MegaETH testnet — the test-cash token the Moss paymaster
// supports (shared by the user). Used here as the "test cash" for balance reads
// and a sponsored/silent approve to exercise the frictionless path.
export const USDM_ADDRESS = '0x72d4db19E3AE6f8ed47B5337ab00D69685277cF4' as const;

// ClimatePool V5 (the live Kalma pool) — used only as a realistic `approve`
// spender target for the silent-permission demo. Swap for the V6 address when
// evaluating against the new deployment.
export const CLIMATE_POOL = '0x73bCf89971563C1Df6C3e059A5B18B6a10eAfFED' as const;

export const erc20Abi = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'transfer', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ name: 'o', type: 'address' }, { name: 's', type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const;
