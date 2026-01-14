-- 创建品牌配置表
CREATE TABLE IF NOT EXISTS brand_config (
  id VARCHAR(255) PRIMARY KEY,
  key VARCHAR(100) NOT NULL,
  locale VARCHAR(10) NOT NULL DEFAULT 'zh-CN',
  value TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'text',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(key, locale)
);

-- 创建索引
CREATE INDEX idx_brand_config_key ON brand_config(key);
CREATE INDEX idx_brand_config_locale ON brand_config(locale);

-- 插入默认配置（中文）
INSERT INTO brand_config (id, key, locale, value, type) VALUES
  (gen_random_uuid()::text, 'app_name', 'zh-CN', '象素工坊', 'text'),
  (gen_random_uuid()::text, 'app_slogan', 'zh-CN', '社交办公游戏', 'text'),
  (gen_random_uuid()::text, 'app_logo', 'zh-CN', '/assets/icon.png', 'image'),
  (gen_random_uuid()::text, 'app_description', 'zh-CN', '一个有趣的社交办公游戏平台', 'text')
ON CONFLICT (key, locale) DO NOTHING;

-- 插入默认配置（英文）
INSERT INTO brand_config (id, key, locale, value, type) VALUES
  (gen_random_uuid()::text, 'app_name', 'en-US', 'Pixel Workshop', 'text'),
  (gen_random_uuid()::text, 'app_slogan', 'en-US', 'Social Office Game', 'text'),
  (gen_random_uuid()::text, 'app_logo', 'en-US', '/assets/icon.png', 'image'),
  (gen_random_uuid()::text, 'app_description', 'en-US', 'An interesting social office game platform', 'text')
ON CONFLICT (key, locale) DO NOTHING;
