/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  poweredByHeader: false,
  typescript: {
    tsconfigPath: "./tsconfig.vds.json",
  },
};

export default nextConfig;
