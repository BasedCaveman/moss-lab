# MOSS Lab — wallet evaluation for Kalma

A minimal Next.js 15 / React 19 app to evaluate the **MOSS embedded wallet**
(`@megaeth-labs/wallet-sdk-react`) as a replacement for Privy in Kalma, with the
two things Kalma actually needs proven out: **paymaster / USDm gas** and
**silent (signless) execution**.

```bash
npm install
npm run dev        # http://localhost:3000  (localhost is a valid secure context for passkeys)
```

Then: **Connect (passkey) → Deposit test cash → Grant session (once) → Silent approve.**

## What this exercises

| Card | Flow | Kalma equivalent |
| --- | --- | --- |
| 1 Wallet | passkey connect / status / disconnect | login (replaces Privy social/passkey) |
| 2 Test cash | `useBalances` (USDm), `useDeposit` built-in funding | test-cash balance + faucet |
| 3 Frictionless | `useGrantPermissions` once → `useCallContract({ silent:true })` | one-tap predict/claim with no per-tx prompt |
| — | `sponsorToken:'usdm'`, `sponsorUrl`→`/api/sponsor` | gasless onboarding |

Config lives in [`app/providers.tsx`](app/providers.tsx); the USDm address (the
Moss mockUSDm the paymaster supports) and a sample spender in [`lib/usdm.ts`](lib/usdm.ts);
the sponsor endpoint stub in [`app/api/sponsor/route.ts`](app/api/sponsor/route.ts).

The eight MOSS skills are vendored under `.claude/skills/` so any coding agent
working in this repo gets the correct API patterns automatically.

---

## Assessment vs Privy (for Kalma)

### Functional? — Yes
Packages are published and real (`wallet-sdk` 0.1.24, `wallet-sdk-react` 0.1.23,
`wallet-wagmi-connector` 0.3.0). This lab installs, typechecks, and **builds**
against the real SDK types. The integration surface is small and clean.

### Where MOSS is clearly *better* than Privy for Kalma
- **MegaETH-native.** No `eip155:6343` CAIP-2 BigInt bug — *the exact reason
  Kalma left Reown and adopted Privy as a workaround.* MOSS targets chain 6343
  directly, so that whole class of problem disappears.
- **Gas in USDm with zero ETH** (`sponsorToken: 'usdm'`) — works with **no
  paymaster backend at all**. Full sponsorship is available via a `sponsorUrl`
  signer when wanted.
- **Silent execution is stronger than Privy's `showWalletUIs:false`.** A
  one-time scoped grant (allowed `calls` + on-chain `spend` cap + `expiry`) then
  prompt-free txs, **revocable**, limits enforced on-chain — not just auto-sign.
- **Passkey auth = native Face ID / Touch ID, free.** This *solves the Apple
  problem* we hit earlier (no $99 Apple Developer account, no expiring Apple
  client secret).
- No API keys/env for the core SDK; built-in deposit/send/swap UI; a **wagmi
  connector** so Kalma's existing wagmi/viem contract hooks can be reused; and an
  official **Privy→MOSS asset-migration** path.

### Gaps / risks to weigh
- **No social OAuth verification (X, Farcaster).** This is the real gap — see
  below. MOSS does passkey login + `mega.authenticate()` (JWT for backend
  ownership), but it is a *wallet*, not an identity provider.
- **Hosted wallet via iframe** (`account.megaeth.com`) — third-party dependency,
  and the account is **non-exportable** (MOSS Recovery Code; can't import into
  MetaMask). Lock-in to weigh.
- **Full gas sponsorship needs a paymaster signer** (your own, or MegaETH's
  managed service which the docs mark *"in progress"*). USDm-paid gas works now;
  *sponsored* gas needs that endpoint.
- Young SDK (0.1.x) vs Privy's maturity.

### The social-verification question (X + Farcaster)
Kalma uses Privy to verify/link **X** and **Farcaster**. MOSS can't do this, so
moving the wallet to MOSS means replacing that piece. Privy-free options:

- **Farcaster → Sign In With Farcaster (AuthKit, `@farcaster/auth-kit`)** —
  official, free, standalone.
- **X → X OAuth 2.0** with your own X app — verify the handle server-side, store
  the link in Kalma's existing Supabase `profiles`/identity tables.

**Recommended shape:** MOSS for wallet + auth + silent + paymaster; Farcaster
AuthKit + X OAuth for social identity, wired into Supabase. This removes Privy
entirely. (Fallback: keep Privy *only* as a social-linking provider — but that's
two SDKs for little gain.)

---

## Auto-onboarding: dripping the 1M test USDm (no "deposit" click)

The Moss team can send **1M of their official mock USDm**. The plan: park it in a
distributor and push a small amount to each new wallet automatically, so the user
never clicks "deposit." Because MOSS lets **gas be paid in USDm**, that single
silent drip *also* covers gas — one step fully onboards the user.

**Flow (wired in this lab):** wallet connects → the app silently POSTs the
address to [`/api/drip`](app/api/drip/route.ts) → server sends ~200 USDm → done.
No button. See the `useEffect` auto-drip in [`app/page.tsx`](app/page.tsx).

**Two distributor options:**

| | A) Account (stub, ready) | B) Contract (recommended) |
| --- | --- | --- |
| Holds the 1M | `DISTRIBUTOR_PRIVATE_KEY` EOA | [`UsdmDripper.sol`](contracts/UsdmDripper.sol) |
| Dedupe | API/DB (`claimed` set) | **on-chain `claimed[]`** (can't be replayed) |
| Batch | one tx/user | `dripBatch([...])` — one tx, many users |
| Gas | EOA needs a little ETH | operator pays; cheap on MegaETH |

**Sizing:** at **1000 USDm/user the 1M funds ~1,000 users** (`DRIP_AMOUNT` env).
Kalma's min seed is 10 USDm and min position 1 USDm, so 1000 lets a beta user
take many positions. Pick the amount against expected beta size.

**Abuse — important:** 1M is finite and `/api/drip` is public. The stub does
**one drip per address** and **one drip per IP** (the IP is blocked after its
first successful drop) + skips already-funded wallets — but a determined script
behind many IPs could still spray addresses. Before beta, also gate it with the
**MOSS auth JWT**
(`mega.authenticate()` → verify server-side via the `moss-wallet-server-verify`
skill) so only real sessions are funded, plus an IP rate-limit and a DB-backed
`claimed` table. The on-chain `claimed[]` in option B stops double-funding even
if the API is abused.

**To run it:** set `DISTRIBUTOR_PRIVATE_KEY` (an account holding the 1M + a little
ETH for gas) — or deploy `UsdmDripper.sol`, fund it with the 1M, and point the
route at it. Then every connect auto-funds.

---

## Verified vs needs-hands-on

**Verified here:** packages real + installable; integration compiles + builds;
API usage matches the SDK's TypeScript types; silent/permission/paymaster config
matches the docs.

**Needs a real browser + passkey (you):** the passkey onboarding UX, the hosted
iframe flow, a live silent tx, a live USDm-gas tx, and the subjective
"is this smoother than Privy?" judgment. Run `npm run dev` and click through —
that's what this lab is for.

To test **sponsored** gas (not just USDm-paid), get a `sponsorUrl` + paymaster
signer from the Moss team, set `NEXT_PUBLIC_SPONSOR_URL` and `PAYMASTER_SIGNER_KEY`,
and implement the signing in `app/api/sponsor/route.ts`.
