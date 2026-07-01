// Creates a 7702-upgraded MegaETH merchant account for the paymaster.
// Transcribed from MegaETH's sample. upgradeAccount() only SIGNS the 7702
// authorization; the account isn't a real smart account until a sendCalls
// consumes it on-chain — sponsored here by MegaETH's HOSTED sponsor endpoint,
// so creating the merchant is gasless.
//
// Run:  node scripts/create-merchant.mjs
// Then: put the printed MERCHANT_* vars in Vercel, fund the address, redeploy.
import { upgradeAccount, sendCalls } from '@megaeth-labs/wallet-intent';
import { Account, Key } from 'porto';
import { createHeadlessWebAuthnP256 } from 'porto/viem/Key';
import { createClient, http, encodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { megaethTestnet } from 'viem/chains';

const relayer = createClient({
  chain: megaethTestnet,
  transport: http('https://carrot.megaeth.com/relay'),
});

const originWallet = Key.createSecp256k1({ role: 'admin' });
const passkey = createHeadlessWebAuthnP256(originWallet);
const account = Account.from({ address: originWallet.publicKey, keys: [passkey] });
const eoaWallet = privateKeyToAccount(originWallet.privateKey());

console.log('Getting upgrade authorization...');
const upgrade = await upgradeAccount(relayer, {
  account: eoaWallet,
  authorizeKeys: [passkey],
});

// Consummate the 7702 delegation with a sponsored dummy call (MegaETH testnet
// example `store(uint256)` contract), paid by MegaETH's hosted sponsor.
const contractAddress = '0x3e942744C21Eec1D88FBD463Fd0CcE42891Aec5C';
const abi = [
  { inputs: [{ internalType: 'uint256', name: 'num', type: 'uint256' }], name: 'store(uint256)', outputs: [], stateMutability: 'nonpayable', type: 'function' },
];

console.log('Consummating upgrade on-chain (sponsored)...');
await sendCalls(relayer, {
  account,
  calls: [
    {
      to: contractAddress,
      abi,
      functionName: 'store(uint256)',
      data: encodeFunctionData({ abi, functionName: 'store(uint256)', args: [10] }),
    },
  ],
  merchantUrl: 'https://wallet-api.megaeth.com/v1/sponsor/testnet',
  authorization: upgrade,
});

console.log('\n=== MERCHANT CREDENTIALS — put these in Vercel env ===');
console.log('MERCHANT_ADDRESS=' + account.address);
console.log('MERCHANT_PRIVATE_KEY=' + passkey.privateKey.privateKey());
console.log('MERCHANT_KEY_TYPE=p256');
console.log('\n--- READ THIS ---');
console.log('• MERCHANT_ADDRESS is the real 7702-upgraded EOA. FUND THIS ONE (a little METH + USDm).');
console.log('• MERCHANT_PRIVATE_KEY is a P256 passkey (an authorized signer the paymaster uses');
console.log('  server-side). It is NOT the EOA key — do NOT import it into MetaMask/Rabby.');
console.log('  Rabby runs secp256k1 on it and derives an unrelated address. That is EXPECTED,');
console.log('  not a bug. MegaETH accounts only accept the P256 signer path (raw secp256k1 root');
console.log('  signatures are rejected by the relay with "intent signature is invalid").');
