'use client';

import { useState, useEffect, useRef } from 'react';
import {
  useStatus,
  useConnect,
  useDisconnect,
  useBalances,
  useDeposit,
  useCallContract,
  useGrantPermissions,
  useRevokePermissions,
} from '@megaeth-labs/wallet-sdk-react';
import { parseUnits } from 'viem';
import { USDM_ADDRESS, CLIMATE_POOL, erc20Abi } from '@/lib/usdm';

export default function Lab() {
  const { status, address, initialised } = useStatus();
  const { mutateAsync: connect, isPending: connecting } = useConnect();
  const { mutateAsync: disconnect } = useDisconnect();
  const { data: balances, refetch: refetchBalances } = useBalances();
  const { mutateAsync: deposit } = useDeposit();
  const { mutateAsync: callContract, isPending: calling } = useCallContract();
  const { mutateAsync: grant } = useGrantPermissions();
  const { mutateAsync: revoke } = useRevokePermissions();

  const [log, setLog] = useState<string[]>([]);
  const add = (m: string) => setLog((l) => [`${new Date().toLocaleTimeString()}  ${m}`, ...l].slice(0, 40));

  // One-time scoped session: lets the app run approve(USDm) silently, capped.
  async function grantSession() {
    const ttl = 60 * 60 * 6; // 6h
    const res = await grant({
      permissions: {
        expiry: Math.floor(Date.now() / 1000) + ttl,
        permissions: {
          calls: [{ to: USDM_ADDRESS, signature: 'approve(address,uint256)' }],
          spend: [{ limit: parseUnits('10000', 18), period: 'day', token: USDM_ADDRESS }],
        },
      },
    });
    add(`grantPermissions → ${res.status}`);
  }

  // Frictionless: no per-action wallet prompt once the grant is in place.
  async function silentApprove() {
    const res = await callContract({
      address: USDM_ADDRESS,
      abi: erc20Abi,
      functionName: 'approve',
      args: [CLIMATE_POOL, parseUnits('10', 18)],
      silent: true,
      silentUIApproveFallback: true,
    });
    if (res.status === 'approved') add(`silent approve OK — ${res.receipt?.hash}${res.silentHasUsedFallback ? ' (fell back to UI; re-grant)' : ' (no prompt)'}`);
    else if (res.status === 'cancelled') add('silent approve cancelled (neutral)');
    else add(`silent approve error: ${res.error ?? 'unknown'}`);
  }

  const connected = status === 'connected';

  // Auto-drip: the moment a wallet connects, fund it server-side (no "deposit"
  // click). Fires once per address. Because MOSS can pay gas in USDm, this one
  // silent step fully onboards the user.
  const dripped = useRef<string | null>(null);
  useEffect(() => {
    if (!connected || !address || dripped.current === address) return;
    dripped.current = address;
    add('auto-drip: requesting test USDm…');
    fetch('/api/drip', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ address }) })
      .then((r) => r.json())
      .then((d) => {
        add(`auto-drip → ${d.status ?? d.error}${d.hash ? ` (${d.hash})` : ''}`);
        refetchBalances();
      })
      .catch((e) => add(`auto-drip failed: ${e}`));
  }, [connected, address]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-grant the session once at onboarding (one consent), so subsequent
  // predict/claim/approve run silently — no per-action wallet prompt. With the
  // paymaster (sponsorUrl) set, gas is sponsored too, so after this single
  // consent the wallet never interrupts the user again.
  const granted = useRef<string | null>(null);
  useEffect(() => {
    if (!connected || !address || granted.current === address) return;
    granted.current = address;
    grantSession()
      .then(() => add('session granted → actions now silent'))
      .catch((e) => add(`grant failed/declined: ${e}`));
  }, [connected, address]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: 24, display: 'grid', gap: 16 }}>
      <h1 style={{ fontSize: 22 }}>MOSS Lab — wallet eval for Kalma</h1>
      <p style={{ color: '#BFB6A8', fontSize: 14, lineHeight: 1.5, margin: 0 }}>
        Exercises the flows Kalma needs: passkey connect, USDm test-cash balance, built-in deposit,
        a one-time permission grant, and a <strong>silent</strong> (signless) USDm approve. Gas is
        configured to be payable in USDm (<code>sponsorToken: &apos;usdm&apos;</code>).
      </p>

      <Card title="1 · Wallet">
        {!initialised ? (
          <span>Booting wallet…</span>
        ) : connected ? (
          <Row>
            <code style={{ fontSize: 13 }}>{address}</code>
            <button onClick={() => disconnect().then(() => add('disconnected'))} style={btn}>Disconnect</button>
          </Row>
        ) : (
          <button onClick={() => connect().then((r) => add(`connect → ${r.status}`))} disabled={connecting} style={btnPrimary}>
            {connecting ? 'Connecting…' : 'Connect MOSS (passkey)'}
          </button>
        )}
      </Card>

      <Card title="2 · Test cash (USDm) + funding">
        <Row>
          <button onClick={() => deposit().then(() => add('opened deposit UI'))} disabled={!connected} style={btn}>Deposit (built-in)</button>
          <button onClick={() => refetchBalances().then(() => add('balances refreshed'))} disabled={!connected} style={btn}>Refresh balances</button>
        </Row>
        <pre style={pre}>{balances ? JSON.stringify(balances, null, 2) : '— connect to read balances —'}</pre>
      </Card>

      <Card title="3 · Frictionless (paymaster + silent)">
        <Row>
          <button onClick={() => grantSession()} disabled={!connected} style={btn}>Grant session (once)</button>
          <button onClick={() => silentApprove()} disabled={!connected || calling} style={btnPrimary}>Silent approve 10 USDm</button>
          <button onClick={() => revoke().then(() => add('revoke → done (all grants cleared)'))} disabled={!connected} style={btn}>Revoke</button>
        </Row>
        <small style={{ color: '#948B7D' }}>
          Grant once → every later approve runs with no wallet prompt. With a paymaster
          <code> sponsorUrl</code> set, gas is also sponsored; otherwise gas is paid in USDm.
        </small>
      </Card>

      <Card title="Log">
        <pre style={pre}>{log.join('\n') || '—'}</pre>
      </Card>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ border: '1px solid #223328', borderRadius: 12, padding: 16, background: '#162019', display: 'grid', gap: 10 }}>
      <div style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: 1, color: '#948B7D', textTransform: 'uppercase' }}>{title}</div>
      {children}
    </section>
  );
}
const Row = ({ children }: { children: React.ReactNode }) => <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>{children}</div>;
const btn: React.CSSProperties = { padding: '8px 14px', borderRadius: 8, border: '1px solid #223328', background: '#1E2D24', color: '#E9E2D6', cursor: 'pointer', fontSize: 13 };
const btnPrimary: React.CSSProperties = { ...btn, background: '#5AAF72', color: '#0D1710', border: 'none', fontWeight: 700 };
const pre: React.CSSProperties = { margin: 0, fontSize: 12, color: '#BFB6A8', whiteSpace: 'pre-wrap', wordBreak: 'break-all' };
