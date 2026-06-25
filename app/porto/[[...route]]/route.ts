// Porto-compatible self-hosted paymaster (merchant) endpoint — LIVE on MegaETH
// testnet. MOSS's `sponsorUrl` points here; Route.merchant() signs sponsorship
// with the merchant key so the APP pays gas. Result: the user never sees the
// "Select gas token" picker or the "Set Max Gas Allowance" screen.
//
// Env:
//   MERCHANT_ADDRESS      — merchant account address (funded on MegaETH testnet)
//   MERCHANT_PRIVATE_KEY  — its admin/private key (server-only; never NEXT_PUBLIC)
//   MERCHANT_RELAY_URL    — OPTIONAL. Porto doesn't ship a MegaETH chain, so if
//                           sponsorship is rejected, set this to MegaETH's
//                           Porto-compatible relay URL (ask the Moss team). Left
//                           unset, Route.merchant uses Porto's default relay and
//                           MOSS's relay handles routing.
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
          // sponsor(request) { return true } // narrow which calls to sponsor
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
