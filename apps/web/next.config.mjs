/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // `/compare` was its own tab until the benchmark moved onto `/proof`. The URL
  // is in the submission pack and in a published post, so it redirects rather
  // than 404s.
  async redirects() {
    return [{ source: "/compare", destination: "/proof", permanent: true }];
  },
};

export default nextConfig;
