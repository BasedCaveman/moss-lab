// Paymaster sponsor endpoint (the `sponsorUrl`). The CLIENT picks what to try to
// sponsor; THIS server decides whether to sponsor each request and returns the
// signed paymaster payload. Policy MUST live here (server-side), never in the
// client. This is a STUB: it enforces the required checks but cannot produce a
// real signature without paymaster credentials — wire those from the Moss team
// (your own paymaster signer, or MegaETH's managed paymaster service).
import { NextRequest, NextResponse } from 'next/server';

// Server-side policy (never shipped to the client).
const ALLOWLIST = new Set(
  [
    '0x72d4db19E3AE6f8ed47B5337ab00D69685277cF4', // USDm
    '0x73bCf89971563C1Df6C3e059A5B18B6a10eAfFED', // ClimatePool
  ].map((a) => a.toLowerCase()),
);

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 });
  }

  const target = (body?.to ?? body?.target ?? '').toString().toLowerCase();
  if (!target) return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 });
  if (!ALLOWLIST.has(target)) return NextResponse.json({ error: 'CONTRACT_NOT_ALLOWED' }, { status: 403 });

  // TODO budget cap (global + per-account) and rate limit (per-user + per-IP).
  // TODO sign the paymaster payload with the paymaster signer / managed service.
  const PAYMASTER_CONFIGURED = !!process.env.PAYMASTER_SIGNER_KEY;
  if (!PAYMASTER_CONFIGURED) {
    // Honest stub: no signer wired yet. The lab still works because gas is
    // payable in USDm (sponsorToken: 'usdm') without sponsorship.
    return NextResponse.json({ error: 'PAYMASTER_NOT_CONFIGURED' }, { status: 501 });
  }

  return NextResponse.json({ paymasterAndData: '0xSignedPaymasterPayload' });
}
