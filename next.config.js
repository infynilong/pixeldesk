/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // 支持 Phaser 的资源加载
    config.resolve.alias = {
      ...config.resolve.alias,
      'phaser': 'phaser/dist/phaser.js'
    };
    return config;
  },
  // 支持静态资源
  images: {
    domains: ['localhost']
  }
}

module.exports = nextConfig