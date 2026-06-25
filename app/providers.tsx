'use client';

// Mounts the MOSS wallet once.
// - network testnet (chainId 6343)
// - GAS IS AUTOMATIC when sponsorUrl is set: the Porto-compatible self-hosted
//   paymaster (/porto/merchant, LIVE on testnet) pays gas, so the user never
//   sees the "Select gas token" / "Set Max Gas Allowance" screens. Set
//   NEXT_PUBLIC_SPONSOR_URL to the ABSOLUTE /porto/merchant url + fund the
//   merchant account (see app/porto/[[...route]]/route.ts).
// - sponsorMode 'app-only' (default) sponsors app-initiated calls (predict /
//   claim / approve); wallet-UI swaps/sends stay user-paid. Use 'everything'
//   for a testing-only "nothing ever asks for gas" demo.
// - Without sponsorUrl, gas is user-paid — payable in USDm with no ETH (the
//   default token-gas path), but the wallet still shows a gas approval.
import { MegaProvider } from '@megaeth-labs/wallet-sdk-react';

const sponsorUrl = process.env.NEXT_PUBLIC_SPONSOR_URL || undefined;
const sponsorMode = (process.env.NEXT_PUBLIC_SPONSOR_MODE as 'app-only' | 'explicit' | 'everything') || 'app-only';
const sponsorToken = (process.env.NEXT_PUBLIC_SPONSOR_TOKEN as 'native' | 'usdm') || 'native';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MegaProvider
      config={{
        network: 'testnet',
        logging: 'info',
        sponsorMode,
        sponsorToken,
        ...(sponsorUrl ? { sponsorUrl } : {}),
      }}
    >
      {children}
    </MegaProvider>
  );
}
