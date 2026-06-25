/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  // CORS for the paymaster endpoint — the MOSS wallet (account.megaeth.com)
  // calls /porto/merchant cross-origin from the browser. Applied here (not only
  // in the route handler) so it also covers Next's auto-generated OPTIONS preflight.
  async headers() {
    return [
      {
        source: '/porto/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          { key: 'Access-Control-Max-Age', value: '86400' },
        ],
      },
    ];
  },
};
