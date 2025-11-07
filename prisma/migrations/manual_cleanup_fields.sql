-- 手动迁移：清理冗余的积分字段
-- 执行前请先备份数据库！

-- 步骤1：确保数据一致性 - 如果gold和points不一致，使用较大值
UPDATE users
SET points = GREATEST(points, gold)
WHERE points != gold;

-- 步骤2：合并Player表的gameGold到User.points（如果需要保留Player数据）
-- 注意：这会将Player.gameGold加到User.points上
UPDATE users u
SET points = u.points + COALESCE((
  SELECT p."gameGold"
  FROM players p
  WHERE p."userId" = u.id
), 0)
WHERE EXISTS (
  SELECT 1 FROM players p WHERE p."userId" = u.id AND p."gameGold" != 50
);

-- 步骤3：删除User表的gold字段
ALTER TABLE users DROP COLUMN IF EXISTS gold;

-- 步骤4：删除Player表的gamePoints和gameGold字段
ALTER TABLE players DROP COLUMN IF EXISTS "gamePoints";
ALTER TABLE players DROP COLUMN IF EXISTS "gameGold";

-- 完成！现在User.points是唯一的积分字段
