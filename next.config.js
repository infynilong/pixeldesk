/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // 优化大文件处理
    optimizePackageImports: ['phaser']
  },
  webpack: (config) => {
    // 支持 Phaser 的资源加载
    config.resolve.alias = {
      ...config.resolve.alias,
      'phaser': 'phaser/dist/phaser.js'
    };
    
    // 处理 Node.js 内置模块
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'crypto': require.resolve('crypto-browserify'),
      'stream': require.resolve('stream-browserify'),
      'buffer': require.resolve('buffer/'),
      'util': require.resolve('util/'),
      'querystring': require.resolve('querystring-es3'),
      'path': require.resolve('path-browserify'),
      'events': require.resolve('events/'),
      'net': require.resolve('net-browserify'),
      'timers': require.resolve('timers-browserify'),
      'url': require.resolve('url'),
      'tls': false,
      'fs': false,
      'zlib': false,
      'http': false,
      'https': false
    };

    // 处理 node: 协议
    config.module.rules.push({
      test: /\.js$/,
      exclude: /node_modules\/phaser/, // 排除Phaser库避免处理大文件
      use: {
        loader: 'babel-loader',
        options: {
          plugins: [
            [
              'module-resolver',
              {
                alias: {
                  'node:crypto': 'crypto-browserify',
                  'node:stream': 'stream-browserify',
                  'node:buffer': 'buffer',
                  'node:util': 'util',
                  'node:querystring': 'querystring-es3',
                  'node:path': 'path-browserify',
                  'node:events': 'events',
                  'node:net': 'net-browserify',
                  'node:timers/promises': 'timers-browserify',
                  'node:url': 'url',
                  'node:tls': './empty-module.js',
                }
              }
            ]
          ]
        }
      }
    });
    
    return config;
  },
  // 支持静态资源
  images: {
    domains: ['localhost']
  }
}

module.exports = nextConfig