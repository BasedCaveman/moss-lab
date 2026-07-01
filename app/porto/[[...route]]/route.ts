// MegaETH-native paymaster (merchant) endpoint. Uses @megaeth-labs/wallet-merchant
// — MegaETH's own wrapper that targets the MegaETH relay/chain. This replaces
// raw porto `Route.merchant`, which signed against Porto's default relay and made
// the wallet throw `undefined.eoa` when reading the sponsorship response.
//
// The merchant() Hono app handles CORS itself (imports hono/cors), so we don't
// add CORS in next.config anymore (that would duplicate the header).
//
// Env:
//   MERCHANT_ADDRESS      — the 7702-upgraded merchant account (intent.payer)
//   MERCHANT_PRIVATE_KEY  — its root/authorized key (server-only)
import { Hono } from 'hono';
import { merchant } from '@megaeth-labs/wallet-merchant';

const address = process.env.MERCHANT_ADDRESS as `0x${string}` | undefined;
const rawKey = process.env.MERCHANT_PRIVATE_KEY as `0x${string}` | undefined;
// A bare Hex key is treated as secp256k1. The 7702 merchant created by
// scripts/create-merchant.mjs uses a p256 passkey → set MERCHANT_KEY_TYPE=p256.
const keyType = process.env.MERCHANT_KEY_TYPE; // 'p256' | undefined (secp256k1)
const key = rawKey
  ? keyType === 'p256'
    ? ({ type: 'p256', privateKey: rawKey } as const)
    : rawKey
  : undefined;

const app =
  address && key
    ? new Hono().basePath('/porto').route(
        '/merchant',
        merchant({
          address,
          key,
          // Sponsor everything for the eval. Tighten to a contract allowlist for prod.
          sponsor: () => true,
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
export const OPTIONS = handle;
