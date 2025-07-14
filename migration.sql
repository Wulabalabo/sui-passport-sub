-- 数据库迁移脚本：添加user_stamps表
-- 这个脚本是为了在不删除现有数据的情况下添加新的user_stamps表

-- 创建 user_stamps 表（记录用户获取stamp的关系）
CREATE TABLE IF NOT EXISTS user_stamps (
    id SERIAL PRIMARY KEY,
    user_address TEXT NOT NULL,
    stamp_id TEXT NOT NULL,
    tx_hash TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_address, stamp_id) -- 确保用户不能重复获取同一个stamp
);

-- 创建索引以优化查询
CREATE INDEX IF NOT EXISTS idx_user_stamps_user_address ON user_stamps(user_address);
CREATE INDEX IF NOT EXISTS idx_user_stamps_stamp_id ON user_stamps(stamp_id);
CREATE INDEX IF NOT EXISTS idx_user_stamps_tx_hash ON user_stamps(tx_hash);

-- 如果需要，可以添加promote_url字段到stamps表（检查是否已存在）
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stamps' AND column_name='promote_url') THEN
        ALTER TABLE stamps ADD COLUMN promote_url TEXT;
    END IF;
END $$;

-- 注意：运行这个脚本后，您需要：
-- 1. 重新部署应用程序
-- 2. 考虑从链上数据重新同步现有的用户stamp记录到新的user_stamps表中 