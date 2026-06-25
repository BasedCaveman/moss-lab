// Porto-compatible self-hosted paymaster (merchant) endpoint — LIVE on MegaETH
// testnet. MOSS's `sponsorUrl` points here; Route.merchant() signs sponsorship
// with the merchant key so the APP pays gas. Result: the user never sees the
// "Select gas token" picker or the "Set Max Gas Allowance" screen.
//
// Setup:
//   1. Create a merchant account:  pnpx porto onboard --admin-key --testnet
//   2. Fund it (ETH for gas, or USDm if sponsorToken=usdm).
//   3. Env: MERCHANT_ADDRESS, MERCHANT_PRIVATE_KEY.
//   4. Point MOSS at it: NEXT_PUBLIC_SPONSOR_URL = the ABSOLUTE url of
//      /porto/merchant (the MOSS relay calls it server-side, so it can't be a
//      relative path), e.g. https://moss-lab.vercel.app/porto/merchant
import { Router, Route } from 'porto/server';

const address = process.env.MERCHANT_ADDRESS as `0x${string}` | undefined;
const key = process.env.MERCHANT_PRIVATE_KEY as `0x${string}` | undefined;

const app =
  address && key
    ? Router({ basePath: '/porto' }).route(
        '/merchant',
        Route.merchant({
          address,
          key,
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
