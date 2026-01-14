const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

async function main() {
  const configs = [
    // zh-CN
    {
      key: 'about_title',
      locale: 'zh-CN',
      value: '关于 Tembo PX Workshop',
      type: 'text'
    },
    {
      key: 'about_content',
      locale: 'zh-CN',
      value: '象素工坊 (Tembo PX Workshop) 是一个将办公、社交与虚拟身份完美融合的趣味像素世界。在这里，你不仅拥有专属的像素化身与工位，更能体验到一种全新的互动方式——让协同工作变得像游戏一样有趣。我们相信，办公不应只是任务的叠加，更是一场充满生命力的社交探索。每一个像素，都承载着连接与创造的无限可能。',
      type: 'textarea'
    },
    // en-US
    {
      key: 'about_title',
      locale: 'en-US',
      value: 'About Tembo PX Workshop',
      type: 'text'
    },
    {
      key: 'about_content',
      locale: 'en-US',
      value: 'Tembo PX Workshop is a vibrant pixel universe where work, social life, and virtual identity seamlessly blend. Here, you own more than just a workstation; you gain a unique avatar and an immersive way to interact—making collaboration as engaging as a game. Every pixel is a gateway to connection and creativity.',
      type: 'textarea'
    },
    // zh-TW
    {
      key: 'about_title',
      locale: 'zh-TW',
      value: '关于 Tembo PX Workshop',
      type: 'text'
    },
    {
      key: 'about_content',
      locale: 'zh-TW',
      value: '象素工坊 (Tembo PX Workshop) 是一个将办公、社交与虚拟身份完美融合的趣味像素世界。在这里，你不仅拥有专属的像素化身与工位，更能体验到一种全新的互动方式——让协同工作变得像游戏一样有趣。我们相信，办公不应只是任务的叠加，更是一场充满生命力的社交探索。每一个像素，都承载着连接与创造的无限可能。',
      type: 'textarea'
    },
    // ja-JP
    {
      key: 'about_title',
      locale: 'ja-JP',
      value: 'Tembo PX Workshopについて',
      type: 'text'
    },
    {
      key: 'about_content',
      locale: 'ja-JP',
      value: 'Tembo PX Workshopは、仕事、ソーシャルライフ、そしてバーチャルアイデンティティがシームレスに融合する活気あるピクセルユニバースです。ここでは、単なるワークステーション以上のものを所有し、独自のアバターと没入感のあるインタラクションスタイルを手に入れることができます。コラボレーションをゲームのように魅力的なものに変えましょう。すべてのピクセルは、繋がりと創造性への入り口です。',
      type: 'textarea'
    }
  ];

  for (const config of configs) {
    await prisma.brand_config.upsert({
      where: {
        key_locale: {
          key: config.key,
          locale: config.locale
        }
      },
      update: {
        value: config.value,
        type: config.type
      },
      create: {
        id: crypto.randomUUID(),
        ...config
      }
    });
  }
  console.log('Default about content seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
