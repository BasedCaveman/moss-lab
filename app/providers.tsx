'use client';

// Mounts the MOSS wallet once. Config mirrors mega.initialise():
// - network testnet (chainId 6343)
// - sponsorToken 'usdm' so users can pay gas in USDm with no ETH (works even
//   without a paymaster). This is the immediately-testable frictionless win.
// - sponsorUrl + sponsorMode 'app-only' enable real gas SPONSORSHIP, but that
//   needs a paymaster signing endpoint (your own paymaster or MegaETH's managed
//   service). Set NEXT_PUBLIC_SPONSOR_URL once you have it; left unset, the lab
//   still works with USDm-paid gas.
import { MegaProvider } from '@megaeth-labs/wallet-sdk-react';

const sponsorUrl = process.env.NEXT_PUBLIC_SPONSOR_URL || undefined;

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MegaProvider
      config={{
        network: 'testnet',
        logging: 'info',
        sponsorToken: 'usdm',
        sponsorMode: 'app-only',
        ...(sponsorUrl ? { sponsorUrl } : {}),
      }}
    >
      {children}
    </MegaProvider>
  );
}
