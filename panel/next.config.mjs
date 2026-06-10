/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false, // wyłącza ikonę i inne wskaźniki deweloperskie
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;