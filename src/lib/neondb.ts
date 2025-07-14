import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import * as schema from "./db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

// 使用连接池支持事务
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// 创建重试函数
const createDbWithRetry = () => {
  try {
    return drizzle(pool, {
      schema,
      logger: process.env.NODE_ENV === 'development',
    });
  } catch (error) {
    console.error("Failed to initialize database connection:", error);
    throw error;
  }
};

export const db = createDbWithRetry();