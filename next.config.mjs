/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    // the old calendar and work-summary pages are gone: old links land on the new calendar
    return [
      { source: "/calendar", destination: "/v2/calendar", permanent: false },
      { source: "/workload", destination: "/v2/calendar", permanent: false },
    ];
  },
};

export default nextConfig;
