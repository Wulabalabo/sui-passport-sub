/* eslint-disable @typescript-eslint/consistent-indexed-object-style */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import { db } from '../neondb';
import { users, stamps, user_stamps } from './schema';
import { eq, and, sql, count } from 'drizzle-orm';
import type { NewUser, UpdateUser, NewStamp, UpdateStamp, DbUserResponse, DbStampResponse } from '../../types/db';
import { redis } from '../kv-cache';
import type {   
  ParsedContent,
  UserProfile,
  StampItem,
  StampFields,
  CollectionQueryResult
} from '../../types/sui';
import { getCollectionDetail } from '../contracts/graphql';
import type { SuiGraphQLClient } from '@mysten/sui/graphql';
import type { PaginatedObjectsResponse, SuiClient, SuiObjectData, SuiObjectResponse } from '@mysten/sui/client';
import { bcs } from '@mysten/sui/bcs';
import { fromHex } from '@mysten/sui/utils';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { keccak256 } from "js-sha3";
import type { VerifyStampParams } from '~/types/stamp';
import { blacklist } from './blacklist';
const CACHE_TTL = 3600; // 1 hour in seconds

// 用户相关操作
export const userService = {
  // 获取所有用户（分页）
  async getAll(cursor?: number, limit = 100) {
    const cacheKey = `neon_users:page:${cursor || 0}:${limit}`;
    const totalCountKey = 'neon_users:total_count';
    const cached = await redis.get<DbUserResponse[]>(cacheKey);
    const cachedTotal = await redis.get<number>(totalCountKey);
    
    if (cached && cachedTotal !== null) {
      console.log('[Redis HIT] users page:', cursor);
      return {
        data: cached,
        nextCursor: cached.length === limit ? (cursor || 0) + limit : null,
        total: cachedTotal
      };
    }

    console.log('[Redis MISS] Querying database...');
    
    // 获取总数
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users) as [{ count: number }];
    
    // 获取分页数据
    const result = await db.select()
      .from(users)
      .orderBy(users.id)
      .limit(limit)
      .offset(cursor || 0);

    // 缓存当前页数据和总数
    await Promise.all([
      redis.set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL, nx: true }),
      redis.set(totalCountKey, count, { ex: CACHE_TTL, nx: true })
    ]);

    return {
      data: result,
      nextCursor: result.length === limit ? (cursor || 0) + limit : null,
      total: count
    };
  },

  // 获取所有用户（流式处理）
  async *getAllStream(batchSize = 500) {
    const cacheKey = 'neon_all_users:chunks';
    const cachedChunks = await redis.get<string[]>(cacheKey);
    
    if (cachedChunks) {
      console.log('[Redis HIT] all_users chunks');
      // 从 Redis 中读取分块数据
      for (const chunkKey of cachedChunks) {
        const chunk = await redis.get<DbUserResponse[]>(chunkKey);
        if (chunk) {
          yield chunk;
        }
      }
      return;
    }

    console.log('[Redis MISS] Querying database...');
    // 从数据库查询并缓存
    const chunks: string[] = [];
    let currentChunk: DbUserResponse[] = [];
    let chunkIndex = 0;

    const result = await db.select({
      id: users.id,
      address: users.address,
      name: users.name,
      points: users.points,
      stamp_count: users.stamp_count,
      created_at: users.created_at,
      updated_at: users.updated_at
    })
      .from(users)
      .orderBy(users.id);

    for (const user of result) {
      currentChunk.push(user);
      
      if (currentChunk.length >= batchSize) {
        const chunkKey = `neon_all_users:chunk:${chunkIndex}`;
        await redis.set(chunkKey, JSON.stringify(currentChunk), { ex: CACHE_TTL });
        chunks.push(chunkKey);
        yield currentChunk;
        
        currentChunk = [];
        chunkIndex++;
      }
    }

    // 处理最后一批数据
    if (currentChunk.length > 0) {
      const chunkKey = `neon_all_users:chunk:${chunkIndex}`;
      await redis.set(chunkKey, JSON.stringify(currentChunk), { ex: CACHE_TTL });
      chunks.push(chunkKey);
      yield currentChunk;
    }

    // 缓存分块信息
    await redis.set(cacheKey, JSON.stringify(chunks), { ex: CACHE_TTL });
  },

  // 获取前100名用户
  async getTopUsers() {
    const cacheKey = 'neon_top_users';
    const cached = await redis.get<DbUserResponse[]>(cacheKey);
    
    if (cached) {
      console.log('[Redis HIT] top_users');
      return cached;
    }

    console.log('[Redis MISS] Querying database...');
    
    

    // 获取更多用户以确保过滤后仍有100个
    const result = await db.select()
      .from(users)
      .orderBy(sql`points DESC`)
      .limit(100 + blacklist.length);

    // 在应用层过滤黑名单地址
    const filteredResult = result.filter(user => !blacklist.includes(user.address)).slice(0, 100);

    await redis.set(cacheKey, JSON.stringify(filteredResult), { ex: CACHE_TTL, nx: true });
    return filteredResult;
  },

  // 根据地址获取用户
  async getByAddress(address: string) {
    const cacheKey = `user:${address}`;
    const cached = await redis.get<DbUserResponse>(cacheKey);
    
    if (cached) {
      console.log('[Redis HIT] user:', address);
      return cached;
    }

    console.log('[Redis MISS] Querying database...');
    const result = await db.select()
      .from(users)
      .where(eq(users.address, address));

    if (result[0]) {
      await redis.set(cacheKey, JSON.stringify(result[0]), { ex: CACHE_TTL, nx: true });
    }
    return result[0];
  },

  // 创建用户
  async create(data: NewUser) {
    const result = await db.insert(users).values(data).returning();
    // 清除相关缓存
    await redis.del('neon_all_users:chunks', 'neon_top_users');
    return result[0];
  },

  // 更新用户
  async update(address: string, data: UpdateUser) {
    const result = await db.update(users)
      .set({ ...data, updated_at: new Date() })
      .where(eq(users.address, address))
      .returning();
    
    // 清除相关缓存
    await redis.del(`user:${address}`, 'neon_all_users:chunks', 'neon_top_users');
    return result[0];
  },

  async createOrUpdate(data: NewUser) {
    const result = await db.insert(users)
      .values(data)
      .onConflictDoUpdate({
        target: users.address,
        set: { 
          ...data,
          updated_at: new Date()
        }
      })
      .returning();
    
    // 清除相关缓存
    await redis.del(`user:${data.address}`, 'neon_all_users:chunks', 'neon_top_users');
    return result[0];
  },

  // 删除用户
  async delete(address: string) {
    const result = await db.delete(users)
      .where(eq(users.address, address))
      .returning();
    
    // 清除相关缓存
    await redis.del(`user:${address}`, 'neon_all_users:chunks', 'neon_top_users');
    return result[0];
  },

};

// 印章相关操作
export const stampService = {

  async signMessage(passport_id: string, last_time: number) {
    try {
        const claim_stamp_info = bcs.struct('ClaimStampInfo', {
            passport: bcs.Address,
            last_time: bcs.u64()
        });

        const claim_stamp_info_bytes = claim_stamp_info.serialize({
            passport: passport_id, 
            last_time
        }).toBytes();
        const hash_data = keccak256(claim_stamp_info_bytes);
        const hash_bytes = fromHex(hash_data);

        if (!process.env.ADDRESS_SECRET_KEY) {
            throw new Error('STAMP_SECRET_KEY is not set');
        }
        const keypair = Ed25519Keypair.fromSecretKey(process.env.ADDRESS_SECRET_KEY);
        const signature = await keypair.sign(hash_bytes);        
        return signature;
    } catch (error) {
        console.error('Signing error:', error);
        throw error;
    }
  },
  
  // 获取所有印章
  async getAll() {
    const cacheKey = 'neon_stamps';
    const cached = await redis.get<DbStampResponse[]>(cacheKey);
    
    if (cached) {
      console.log('[Redis HIT] stamps');
      return cached;
    }

    console.log('[Redis MISS] Querying database...');
    const result = await db.select().from(stamps);
    
    // 处理敏感数据,将claim_code转换为hasClaimCode标志
    const safeResult = result.map(stamp => {
      const { claim_code, ...rest } = stamp;
      return {
        ...rest,
        has_claim_code: Boolean(claim_code)
      };
    });

    await redis.set(cacheKey, JSON.stringify(safeResult), { ex: CACHE_TTL, nx: true });
    return safeResult;
  },

  // 根据ID获取印章
  async getById(id: string) {
    const cacheKey = `stamp:${id}`;
    const cached = await redis.get<DbStampResponse>(cacheKey);
    
    if (cached) {
      console.log('[Redis HIT] stamp:', id);
      return cached;
    }

    console.log('[Redis MISS] Querying database...');
    const result = await db.select()
      .from(stamps)
      .where(eq(stamps.stamp_id, id));

    if (result[0]) {
      await redis.set(cacheKey, JSON.stringify(result[0]), { ex: CACHE_TTL, nx: true });
    }
    return result[0];
  },

  // 创建印章
  async create(data: NewStamp) {
    const result = await db.insert(stamps).values(data).returning();
    // 清除相关缓存
    await redis.del('neon_stamps');
    return result[0];
  },

  // 更新印章
  async update(id: string, data: UpdateStamp) {
    const result = await db.update(stamps)
      .set({ ...data, updated_at: new Date() })
      .where(eq(stamps.stamp_id, id))
      .returning();
    
    // 清除相关缓存
    await redis.del(`stamp:${id}`, 'neon_stamps');
    return result[0];
  },

  // 删除印章
  async delete(id: string) {
    const result = await db.delete(stamps)
      .where(eq(stamps.stamp_id, id))
      .returning();
    
    // 清除相关缓存
    await redis.del(`stamp:${id}`, 'neon_stamps');
    return result[0];
  },

  // 验证印章
  async verify(params: VerifyStampParams) {
    const { stamp_id, claim_code, passport_id, last_time } = params;
    const currentTime = Math.floor(Date.now() / 1000);
    
    console.log('[Stamp Verify] Parameters:', {
      stamp_id,
      claim_code,
      passport_id,
      last_time,
      currentTime
    });

    try {
      // 先获取印章信息
      const stamp = await this.getById(stamp_id);
      console.log('[Stamp Verify] Stamp info:', {
        stamp,
        startTime: stamp?.claim_code_start_timestamp,
        endTime: stamp?.claim_code_end_timestamp,
        claimCode: stamp?.claim_code
      });

      if (!stamp) {
        console.log('[Stamp Verify] Stamp not found');
        return { isValid: false, signature: null };
      }

      // 验证 claim code
      if (stamp.claim_code !== claim_code) {
        console.log('[Stamp Verify] Claim code mismatch:', {
          expected: stamp.claim_code,
          received: claim_code
        });
        return { isValid: false, signature: null };
      }

      // 验证时间
      const startTime = stamp.claim_code_start_timestamp ? Number(stamp.claim_code_start_timestamp) : null;
      const endTime = stamp.claim_code_end_timestamp ? Number(stamp.claim_code_end_timestamp) : null;

      console.log('[Stamp Verify] Time validation:', {
        currentTime,
        startTime,
        endTime,
        isValidTime: !startTime || !endTime || (currentTime >= startTime && currentTime <= endTime)
      });

      if (startTime && endTime && (currentTime < startTime || currentTime > endTime)) {
        console.log('[Stamp Verify] Time validation failed');
        return { isValid: false, signature: null };
      }

      // 验证成功，生成签名
      const signature = await this.signMessage(passport_id, last_time);
      console.log('[Stamp Verify] Success, signature generated');
      return { isValid: true, signature };
    } catch (error) {
      console.error('[Stamp Verify] Error:', error);
      return { isValid: false, signature: null };
    }
  },

  // 增加印章计数
  async increaseCount(id: string) {
    const result = await db.update(stamps)
      .set({ 
        claim_count: sql`COALESCE(claim_count, 0) + 1`,
        updated_at: new Date()
      })
      .where(eq(stamps.stamp_id, id))
      .returning();
    
    // 清除相关缓存
    await redis.del(`stamp:${id}`, 'neon_stamps');
    return result[0];
  },

  // 检查用户是否已经获取过此stamp
  async checkUserStampExists(userAddress: string, stampId: string): Promise<boolean> {
    const result = await db.select({ count: count() })
      .from(user_stamps)
      .where(and(
        eq(user_stamps.user_address, userAddress),
        eq(user_stamps.stamp_id, stampId)
      ));
    return (result[0]?.count ?? 0) > 0;
  },

  // 获取用户某个stamp的获取次数
  async getUserStampCount(userAddress: string, stampId: string): Promise<number> {
    const result = await db.select({ count: count() })
      .from(user_stamps)
      .where(and(
        eq(user_stamps.user_address, userAddress),
        eq(user_stamps.stamp_id, stampId)
      ));
    return result[0]?.count || 0;
  },

  // 记录用户获取stamp（原子操作）
  async recordUserStamp(userAddress: string, stampId: string, txHash?: string) {
    // 使用事务确保原子性
    return await db.transaction(async (tx) => {
      // 检查用户是否已经获取过此stamp
      const existingCount = await tx.select({ count: count() })
        .from(user_stamps)
        .where(and(
          eq(user_stamps.user_address, userAddress),
          eq(user_stamps.stamp_id, stampId)
        ));

      // 获取stamp的用户限制
      const stampResult = await tx.select()
        .from(stamps)
        .where(eq(stamps.stamp_id, stampId))
        .limit(1);

      if (!stampResult[0]) {
        throw new Error('Stamp not found');
      }

      const stamp = stampResult[0];
      const currentCount = existingCount[0]?.count || 0;
      const userLimit = stamp?.user_count_limit || 1;

      if (currentCount >= userLimit) {
        throw new Error(`User has already claimed the maximum number (${userLimit}) of this stamp`);
      }

      // 记录用户获取stamp
      const userStampResult = await tx.insert(user_stamps)
        .values({
          user_address: userAddress,
          stamp_id: stampId,
          tx_hash: txHash
        })
        .returning();

      // 增加stamp的claim_count
      await tx.update(stamps)
        .set({ 
          claim_count: sql`COALESCE(claim_count, 0) + 1`,
          updated_at: new Date()
        })
        .where(eq(stamps.stamp_id, stampId));

      return userStampResult[0];
    });
  }
};

// Passport 相关操作
export const passportService = {
  // 检查用户状态
  async checkUserState(
    address: string,
    packageId: string,
    suiClient: SuiClient,
    graphqlClient: SuiGraphQLClient
  ): Promise<UserProfile | null> {
    const profile: UserProfile = {
      avatar: "",
      collections: { fields: { id: { id: "" }, size: 0 } },
      email: "",
      exhibit: [],
      github: "",
      current_user: address,
      id: { id: "" },
      introduction: "",
      last_time: 0,
      name: "",
      admincap: "",
      points: 0,
      x: "",
      passport_id: "",
      stamps: [],
      collection_detail: [],
    };

    try {
      // 使用分页获取所有对象
      const objects = await fetchAllOwnedObjectsServer(address, packageId, suiClient);

      objects.forEach((obj) => {
        if (!obj.data) return;

        const parsed = parseObjectData(obj.data);
        if (!parsed) return;

        const { type, fields } = parsed;

        switch (type) {
          case `${packageId}::sui_passport::SuiPassport`:
            updateProfileFromPassport(profile, fields as UserProfile);
            break;
          case `${packageId}::stamp::AdminCap`:
            const adminCapId = (fields as { id: { id: string } })?.id?.id;
            if (adminCapId) profile.admincap = adminCapId;
            break;
          case `${packageId}::stamp::Stamp`:
            const stamp = createStampFromFields(fields as StampFields);
            if (stamp) profile.stamps?.push(stamp);
            break;
        }
      });

      await enrichProfileWithCollectionDetails(profile, graphqlClient);

      return profile;
    } catch (error) {
      console.error('Error in checkUserState:', error);
      return null;
    }
  }
};

// 辅助函数
async function fetchAllOwnedObjectsServer(
  address: string,
  packageId: string,
  suiClient: SuiClient
): Promise<SuiObjectResponse[]> {
  const allObjects: SuiObjectResponse[] = [];
  let hasNextPage = true;
  let nextCursor: string | null = null;

  while (hasNextPage) {
    try {
      const response: PaginatedObjectsResponse = await suiClient.getOwnedObjects({
        owner: address,
        options: { showContent: true },
        filter: {
          MatchAny: [
            { StructType: `${packageId}::stamp::AdminCap` },
            { StructType: `${packageId}::sui_passport::SuiPassport` },
            { StructType: `${packageId}::stamp::Stamp` }
          ]
        },
        cursor: nextCursor,
      });

      for (const item of response.data) {
        allObjects.push(item);
      }
      hasNextPage = response.hasNextPage;
      nextCursor = response.nextCursor ?? null;

      if (!response.data.length && hasNextPage) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('Error fetching owned objects:', error);
      break;
    }
  }

  return allObjects;
}

function parseObjectData<T>(data: SuiObjectData): ParsedContent<T> | null {
  if (data.content?.dataType !== "moveObject") return null;
  return {
    type: data.content.type,
    fields: data.content.fields as T,
  };
}

function updateProfileFromPassport(profile: UserProfile, passportFields: Partial<UserProfile>) {
  type ValidKeys = keyof Pick<UserProfile, 'avatar' | 'collections' | 'email' | 'exhibit' |
    'github' | 'id' | 'introduction' | 'last_time' | 'name' | 'points' | 'x'>;

  (Object.keys(passportFields) as ValidKeys[]).forEach(field => {
    if (field in passportFields && field in profile) {
      (profile[field] as UserProfile[ValidKeys]) = passportFields[field] as UserProfile[ValidKeys];
    }
  });

  if (passportFields.id?.id) {
    profile.passport_id = passportFields.id.id;
  }
}

function createStampFromFields(fields: StampFields): StampItem | null {
  try {
    return {
      ...fields,
      id: fields.id.id,
      imageUrl: fields.image_url,
      name: fields.name
    };
  } catch (error) {
    console.error('Error creating stamp:', error);
    return null;
  }
}

async function enrichProfileWithCollectionDetails(
  profile: UserProfile,
  client: SuiGraphQLClient
): Promise<void> {
  const collectionDetail = await client.query({
    query: getCollectionDetail,
    variables: {
      address: profile.collections.fields.id.id,
    }
  }) as CollectionQueryResult;

  profile.collection_detail =
    collectionDetail.data?.owner?.dynamicFields?.nodes
      ?.map(node => node.name?.json)
      ?.filter((item): item is string => Boolean(item)) ?? [];
} 