/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // 优化大文件处理
    optimizePackageImports: ['phaser'],
    // 禁用Webpack构建工作线程以减少内存消耗
    webpackBuildWorker: false
  },
  // 开发模式性能优化
  onDemandEntries: {
    // 减少页面保持在内存中的时间
    maxInactiveAge: 25 * 1000,
    // 减少并发编译的页面数量
    pagesBufferLength: 2,
  },
  webpack: (config, { dev, isServer }) => {
    // 支持 Phaser 的资源加载
    config.resolve.alias = {
      ...config.resolve.alias,
      'phaser': 'phaser/dist/phaser.js'
    };
    
    // 开发模式性能优化
    if (dev && !isServer) {
      // 禁用不必要的日志输出
      config.infrastructureLogging = {
        level: 'error',
      };

      // 优化文件监听以减少CPU占用
      config.watchOptions = {
        // 忽略node_modules以减少文件监听
        ignored: ['**/node_modules/**', '**/.git/**', '**/.next/**'],
        // 减少轮询频率
        poll: 3000,
        // 增加防抖延迟
        aggregateTimeout: 600,
      };

      // 减少HMR客户端资源消耗
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
      };

      // Configure HMR client to be more resilient to WebSocket errors
      const originalEntry = config.entry;
      config.entry = async () => {
        const entries = await originalEntry();
        if (entries['main.js'] && !entries['main.js'].includes('webpack-hot-middleware')) {
          entries['main.js'].unshift('webpack-hot-middleware/client?path=/__webpack_hmr&timeout=20000&reload=true&overlay=false');
        }
        return entries;
      };
    }
    
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
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
    unoptimized: false,
  }
}

module.exports = nextConfig