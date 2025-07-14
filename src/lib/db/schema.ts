import { pgTable, text, integer, boolean, timestamp, serial } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  address: text("address").notNull().unique(),
  name: text("name"),
  stamp_count: integer("stamp_count").default(0),
  points: integer("points").default(0),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const stamps = pgTable("stamps", {
  id: serial("id").primaryKey(),
  stamp_id: text("stamp_id").notNull(),
  claim_code: text("claim_code"),
  total_count_limit: integer("total_count_limit").default(0),
  user_count_limit: integer("user_count_limit").default(1),
  claim_count: integer("claim_count").default(0),
  claim_code_start_timestamp: integer("claim_code_start_timestamp"),
  claim_code_end_timestamp: integer("claim_code_end_timestamp"),
  public_claim: boolean("public_claim").default(false),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
  promote_url: text("promote_url"),
});

// 新增：记录用户获取stamp的关系表
export const user_stamps = pgTable("user_stamps", {
  id: serial("id").primaryKey(),
  user_address: text("user_address").notNull(),
  stamp_id: text("stamp_id").notNull(),
  tx_hash: text("tx_hash"), // 记录交易hash
  created_at: timestamp("created_at").defaultNow(),
});

// 创建复合唯一索引，确保一个用户不能重复获取同一个stamp
// 如果需要支持用户获取同一类型的多个stamp，可以调整这个约束 