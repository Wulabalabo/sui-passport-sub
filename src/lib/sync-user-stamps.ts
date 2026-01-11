import { db } from './neondb';
import { user_stamps } from './db/schema';
import { passportService, userService } from './db';
import { suiClient, graphqlClient } from '../app/api/SuiClient';
import { eq, and } from 'drizzle-orm';

/**
 * 优化的用户stamp同步脚本 - 适用于大数据量
 */
export async function syncUserStampsFromChain(options: {
  batchSize?: number;
  concurrency?: number;
  startFromUserId?: number;
  packageId?: string;
} = {}) {
  const {
    batchSize = 100,           // 每批处理用户数量
    concurrency = 5,           // 并发数量
    startFromUserId = 0,       // 断点续传支持
    packageId = !process.env.NEXT_PUBLIC_PACKAGE_ID
  } = options;

  console.log('🚀 开始同步用户stamp数据...');
  console.log(`配置: 批大小=${batchSize}, 并发=${concurrency}, 起始ID=${startFromUserId}`);
  
  if (!packageId) {
    throw new Error('Package ID is required');
  }

  let totalProcessed = 0;
  let totalSynced = 0;
  let totalErrors = 0;
  let currentUserId = startFromUserId;

  try {
    // 获取总用户数用于进度显示
    const { total: totalUsers } = await userService.getAll(0, 1);
    console.log(`📊 总用户数: ${totalUsers}`);

    while (currentUserId < totalUsers) {
      console.log(`\n📦 处理批次: ${currentUserId} - ${currentUserId + batchSize}`);
      
      // 分批获取用户
      const { data: userBatch } = await userService.getAll(currentUserId, batchSize);
      
      if (userBatch.length === 0) {
        console.log('✅ 没有更多用户需要处理');
        break;
      }

      // 控制并发处理
      const semaphore = new Semaphore(concurrency);
      const promises = userBatch.map(user => 
        semaphore.acquire().then(async (release) => {
          try {
            const result = await processUser(user.address, packageId as string);
            release();
            return result;
          } catch (error) {
            release();
            throw error;
          }
        })
      );

      try {
        const results = await Promise.allSettled(promises);
        
        // 统计结果
        results.forEach((result, index) => {
          totalProcessed++;
          if (result.status === 'fulfilled') {
            totalSynced += result.value.syncedCount;
          } else {
            totalErrors++;
            console.error(`❌ 用户 ${userBatch[index]?.address} 处理失败:`, result.reason);
          }
        });

        // 显示进度
        const progress = ((currentUserId + userBatch.length) / totalUsers * 100).toFixed(1);
        console.log(`📈 进度: ${progress}% (${totalProcessed}/${totalUsers}), 已同步: ${totalSynced}, 错误: ${totalErrors}`);

      } catch (error) {
        console.error('❌ 批次处理出现严重错误:', error);
        totalErrors += userBatch.length;
      }

      currentUserId += batchSize;
      
      // 批次间添加延迟，避免过载
      await sleep(1000);
    }

    console.log('\n🎉 同步完成!');
    console.log(`📊 最终统计: 处理${totalProcessed}个用户, 同步${totalSynced}条记录, ${totalErrors}个错误`);

  } catch (error) {
    console.error('💥 同步过程中发生严重错误:', error);
    console.log(`💾 可使用 startFromUserId: ${currentUserId} 继续同步`);
    throw error;
  }
}

/**
 * 处理单个用户的stamp同步
 */
async function processUser(userAddress: string, packageId: string): Promise<{ syncedCount: number }> {
  let syncedCount = 0;
  
  try {
    // 获取用户链上状态 - 添加重试机制
    const profile = await retryAsync(
      () => passportService.checkUserState(userAddress, packageId, suiClient, graphqlClient),
      3,  // 最多重试3次
      2000 // 重试间隔2秒
    );
    
    if (!profile?.stamps?.length) {
      return { syncedCount };
    }

    // 处理用户的stamps
    for (const stamp of profile.stamps) {
      try {
        // 使用drizzle类型安全查询检查是否已存在
        const existingRecord = await db.select()
          .from(user_stamps)
          .where(and(
            eq(user_stamps.user_address, userAddress),
            eq(user_stamps.stamp_id, stamp.id)
          ))
          .limit(1);

        if (existingRecord.length > 0) {
          continue; // 记录已存在，跳过
        }

        // 创建新记录
        await db.insert(user_stamps).values({
          user_address: userAddress,
          stamp_id: stamp.id,
          tx_hash: null, // 历史数据没有tx_hash
        });
        
        syncedCount++;
        
      } catch (stampError) {
        // 单个stamp失败不影响其他stamp
        console.warn(`⚠️  同步stamp ${stamp.id} 失败:`, stampError);
      }
    }
    
  } catch (error) {
    console.warn(`⚠️  处理用户 ${userAddress} 失败:`, error);
    throw error;
  }

  return { syncedCount };
}

/**
 * 信号量类 - 控制并发数量
 */
class Semaphore {
  private tasks: (() => void)[] = [];
  private count: number;

  constructor(count: number) {
    this.count = count;
  }

  async acquire(): Promise<() => void> {
    return new Promise(resolve => {
      this.tasks.push(() => resolve(() => this.release()));
      this.tryNext();
    });
  }

  private tryNext(): void {
    if (this.count > 0 && this.tasks.length > 0) {
      this.count--;
      const task = this.tasks.shift()!;
      task();
    }
  }

  private release(): void {
    this.count++;
    this.tryNext();
  }
}

/**
 * 重试机制
 */
async function retryAsync<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  delay: number
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i === maxRetries) break;
      
      console.warn(`🔄 重试 ${i + 1}/${maxRetries}, ${delay}ms后重试...`);
      await sleep(delay);
    }
  }
  
  throw lastError!;
}

/**
 * 睡眠函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 命令行执行
if (require.main === module) {
  const args = process.argv.slice(2);
  const startFromUserId = args[0] ? parseInt(args[0]) : 0;
  
  syncUserStampsFromChain({
    batchSize: 50,        // 减小批次大小
    concurrency: 3,       // 减少并发数
    startFromUserId,
    packageId: process.env.NEXT_PUBLIC_PACKAGE_ID
  })
    .then(() => {
      console.log('✅ 同步脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 同步脚本执行失败:', error);
      process.exit(1);
    });
} 