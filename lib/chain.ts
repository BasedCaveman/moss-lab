import { defineChain } from 'viem';

export const megaethTestnet = defineChain({
  id: 6343,
  name: 'MegaETH Testnet',
  nativeCurrency: { name: 'MegaETH', symbol: 'METH', decimals: 18 },
  rpcUrls: { default: { http: [process.env.RPC_URL || 'https://carrot.megaeth.com/rpc'] } },
  testnet: true,
});
