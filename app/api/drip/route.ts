// Auto-drip test USDm to a freshly-connected wallet so the user has cash (and,
// because MOSS lets gas be paid in USDm, can transact) with NO "deposit" click.
//
// Distributor: the deployed UsdmDripper contract (on-chain claimed[] dedupe).
// The server signs drip(user) as the dripper's OPERATOR. Set:
//   - OPERATOR_PRIVATE_KEY: the dripper operator key (the deployer by default,
//     or whatever you set via setOperator). Needs a little ETH for gas.
//   - DRIPPER_ADDRESS: defaults to the deployed contract below.
//
// ABUSE: 1M is finite and /api/drip is public. This route does one-drip-per-IP +
// per-address dedupe and pre-checks the contract's claimed[] to avoid wasting
// gas. The contract's claimed[] is the on-chain backstop (can't be double-funded
// even if the API is abused). For production also require the MOSS auth JWT
// (mega.authenticate → verify server-side) so only real sessions are funded.
import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, createPublicClient, http, isAddress, getAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { megaethTestnet } from '@/lib/chain';

const DRIPPER_ADDRESS = (process.env.DRIPPER_ADDRESS ||
  '0x176E9A0B7a7911d49F70eB42d76b29157cd6cBc2') as `0x${string}`;

const dripperAbi = [
  { type: 'function', name: 'drip', stateMutability: 'nonpayable', inputs: [{ name: 'user', type: 'address' }], outputs: [] },
  { type: 'function', name: 'claimed', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'bool' }] },
] as const;

const blockedIps = new Set<string>(); // one drip per IP — blocked after its first successful drop

function clientIp(req: NextRequest): string {
  return (req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown').trim();
}

export async function POST(req: NextRequest) {
  const key = (process.env.OPERATOR_PRIVATE_KEY || process.env.DISTRIBUTOR_PRIVATE_KEY) as `0x${string}` | undefined;
  if (!key) return NextResponse.json({ error: 'OPERATOR_NOT_CONFIGURED' }, { status: 501 });

  const ip = clientIp(req);
  if (blockedIps.has(ip)) return NextResponse.json({ error: 'IP_ALREADY_DRIPPED' }, { status: 429 });

  let to: string;
  try {
    to = getAddress((await req.json())?.address);
  } catch {
    return NextResponse.json({ error: 'INVALID_ADDRESS' }, { status: 400 });
  }
  if (!isAddress(to)) return NextResponse.json({ error: 'INVALID_ADDRESS' }, { status: 400 });

  const pub = createPublicClient({ chain: megaethTestnet, transport: http() });

  // On-chain dedupe pre-check — skip (no gas) if this wallet already claimed.
  const alreadyClaimed = (await pub.readContract({
    address: DRIPPER_ADDRESS, abi: dripperAbi, functionName: 'claimed', args: [to as `0x${string}`],
  })) as boolean;
  if (alreadyClaimed) return NextResponse.json({ ok: true, status: 'already_dripped' });

  const account = privateKeyToAccount(key);
  const wallet = createWalletClient({ account, chain: megaethTestnet, transport: http() });

  try {
    const hash = await wallet.writeContract({
      address: DRIPPER_ADDRESS, abi: dripperAbi, functionName: 'drip', args: [to as `0x${string}`],
    });
    blockedIps.add(ip); // one drip per IP
    return NextResponse.json({ ok: true, status: 'dripped', hash });
  } catch (e: any) {
    // AlreadyClaimed (race), NotAuthorized (wrong operator key), or empty reserve.
    return NextResponse.json({ error: 'DRIP_FAILED', detail: e?.shortMessage ?? String(e) }, { status: 500 });
  }
}
