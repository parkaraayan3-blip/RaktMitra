/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure firebase-admin is not bundled for the client
  serverExternalPackages: ['firebase-admin'],
};

module.exports = nextConfig;
