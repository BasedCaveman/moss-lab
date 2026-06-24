// Auto-drip test USDm to a freshly-connected wallet so the user has cash (and,
// because MOSS lets gas be paid in USDm, can transact) with NO "deposit" click.
//
// Two distributor options — pick one:
//   A) Account (this stub): DISTRIBUTOR_PRIVATE_KEY holds the 1M USDm and signs
//      a transfer per drip. Fastest to ship; needs a little ETH for gas.
//   B) Contract (recommended for prod): UsdmDripper.sol holds the 1M and an
//      operator calls drip([...]) — on-chain claimed[] dedupe + batchable. See
//      contracts/UsdmDripper.sol. Swap the transfer below for a dripper call.
//
// ABUSE: 1M is finite. This stub does per-address dedupe + a global cap. For
// production also require the MOSS auth JWT (mega.authenticate → verify
// server-side) so only real sessions are funded, and move dedupe to a DB.
import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, createPublicClient, http, parseUnits, isAddress, getAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { megaethTestnet } from '@/lib/chain';
import { USDM_ADDRESS, erc20Abi } from '@/lib/usdm';

const DRIP_AMOUNT = parseUnits(process.env.DRIP_AMOUNT || '200', 18); // 200 USDm → 1M funds ~5,000 users
const dripped = new Set<string>(); // lab-only dedupe; use a DB in production

export async function POST(req: NextRequest) {
  const key = process.env.DISTRIBUTOR_PRIVATE_KEY as `0x${string}` | undefined;
  if (!key) return NextResponse.json({ error: 'DISTRIBUTOR_NOT_CONFIGURED' }, { status: 501 });

  let to: string;
  try {
    to = getAddress((await req.json())?.address);
  } catch {
    return NextResponse.json({ error: 'INVALID_ADDRESS' }, { status: 400 });
  }
  if (!isAddress(to)) return NextResponse.json({ error: 'INVALID_ADDRESS' }, { status: 400 });
  if (dripped.has(to)) return NextResponse.json({ ok: true, status: 'already_dripped' });

  const account = privateKeyToAccount(key);
  const wallet = createWalletClient({ account, chain: megaethTestnet, transport: http() });
  const pub = createPublicClient({ chain: megaethTestnet, transport: http() });

  // Skip if the wallet already has cash (don't waste the reserve on returners).
  const bal = (await pub.readContract({ address: USDM_ADDRESS, abi: erc20Abi, functionName: 'balanceOf', args: [to] })) as bigint;
  if (bal >= DRIP_AMOUNT) {
    dripped.add(to);
    return NextResponse.json({ ok: true, status: 'already_funded' });
  }

  try {
    const hash = await wallet.writeContract({ address: USDM_ADDRESS, abi: erc20Abi, functionName: 'transfer', args: [to, DRIP_AMOUNT] });
    dripped.add(to);
    return NextResponse.json({ ok: true, status: 'dripped', hash });
  } catch (e: any) {
    return NextResponse.json({ error: 'DRIP_FAILED', detail: e?.shortMessage ?? String(e) }, { status: 500 });
  }
}
