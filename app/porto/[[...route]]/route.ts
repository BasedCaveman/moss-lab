// Porto-compatible self-hosted paymaster (merchant) endpoint. MOSS's wallet
// (account.megaeth.com) calls this from the BROWSER, so it needs CORS headers +
// an OPTIONS preflight handler — Route.merchant doesn't add them. Without CORS
// the wallet's fetch is blocked and grant/sponsor flows hang.
//
// Env:
//   MERCHANT_ADDRESS      — merchant account address (funded on MegaETH testnet)
//   MERCHANT_PRIVATE_KEY  — its admin/private key (server-only; never NEXT_PUBLIC)
//   MERCHANT_RELAY_URL    — OPTIONAL MegaETH Porto relay override (ask Moss).
import { Router, Route } from 'porto/server';
import { http } from 'viem';

const address = process.env.MERCHANT_ADDRESS as `0x${string}` | undefined;
const key = process.env.MERCHANT_PRIVATE_KEY as `0x${string}` | undefined;
const relayUrl = process.env.MERCHANT_RELAY_URL;

const app =
  address && key
    ? Router({ basePath: '/porto' }).route(
        '/merchant',
        Route.merchant({
          address,
          key,
          ...(relayUrl ? { relay: http(relayUrl) } : {}),
        }),
      )
    : null;

// Allow the wallet host (and localhost devMode) to call the endpoint. `*` is
// fine here — the merchant only signs sponsorship; no credentials are sent.
const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

async function handle(req: Request): Promise<Response> {
  if (!app) {
    return new Response(JSON.stringify({ error: 'MERCHANT_NOT_CONFIGURED' }), {
      status: 501,
      headers: { 'content-type': 'application/json', ...CORS },
    });
  }
  const res = await app.fetch(req);
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS)) headers.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

export const GET = handle;
export const POST = handle;
