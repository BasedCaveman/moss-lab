/** @type {import('next').NextConfig} */
// CORS for /porto/merchant is handled inside @megaeth-labs/wallet-merchant's
// merchant() (it applies hono/cors), so we don't set it here — adding it would
// duplicate the Access-Control-Allow-Origin header and browsers reject that.
module.exports = { reactStrictMode: true };
