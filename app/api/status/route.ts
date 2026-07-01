// Config health-check. Open https://<your-app>/api/status to confirm the Vercel
// env is wired before testing the wallet. Reports presence only — never returns
// any private key.
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    merchant: {
      configured: !!(process.env.MERCHANT_ADDRESS && process.env.MERCHANT_PRIVATE_KEY),
      address: process.env.MERCHANT_ADDRESS ?? null,
      keyType: process.env.MERCHANT_KEY_TYPE ?? 'secp256k1',
      relayOverride: !!process.env.MERCHANT_RELAY_URL,
    },
    dripper: {
      operatorConfigured: !!(process.env.OPERATOR_PRIVATE_KEY || process.env.DISTRIBUTOR_PRIVATE_KEY),
      address: process.env.DRIPPER_ADDRESS ?? '0x176E9A0B7a7911d49F70eB42d76b29157cd6cBc2',
    },
    sponsor: {
      url: process.env.NEXT_PUBLIC_SPONSOR_URL ?? null,
      token: process.env.NEXT_PUBLIC_SPONSOR_TOKEN ?? 'native',
      mode: process.env.NEXT_PUBLIC_SPONSOR_MODE ?? 'app-only',
    },
  });
}
