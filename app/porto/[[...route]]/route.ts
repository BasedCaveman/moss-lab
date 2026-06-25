// Porto-compatible self-hosted paymaster (merchant) endpoint. MOSS's wallet
// (account.megaeth.com) calls this cross-origin from the browser; CORS headers
// (incl. the OPTIONS preflight) are added in next.config.js for /porto/:path*.
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

async function handle(req: Request): Promise<Response> {
  if (!app) {
    return new Response(JSON.stringify({ error: 'MERCHANT_NOT_CONFIGURED' }), {
      status: 501,
      headers: { 'content-type': 'application/json' },
    });
  }
  return app.fetch(req);
}

export const GET = handle;
export const POST = handle;
