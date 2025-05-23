// import { queryD1 } from "../dbHelper";
// import { createUserParams, type CreateUserParams, type DbUserResponse } from "~/types/userProfile";
// import { redis } from "../kv-cache";

// interface DbResponse<T> {
//     success: boolean;
//     meta: unknown;
//     results: T[];
// }


// export const getUsersFromDb = async (): Promise<DbUserResponse[] | undefined> => {
//   const cacheKey = 'top_users';
//   const cached = await redis.get<DbUserResponse[]>(cacheKey);
//   if (cached) {
//     console.log('[Redis HIT] top_users');
//     return cached;
//   }

//   console.log('[Redis MISS] Querying D1...');

//   const query = `SELECT * FROM users ORDER BY points DESC LIMIT 100`;
//   const users = await queryD1<DbUserResponse[]>(query);

//   await redis.set(cacheKey, JSON.stringify(users.data));

//   return users.data
// };


// export const getUserByAddress = async (address: string) => {
//     const query = `SELECT * FROM users WHERE address = ?`;
//     const users = await queryD1<DbResponse<DbUserResponse>>(query, [address]);
//     return users;
// }

// const createUser = async (user: CreateUserParams) => {
//     const validatedUser = createUserParams.parse(user);
//     const query = `
//         INSERT INTO users (address, points, name, stamp_count) 
//         VALUES (?, ?, ?, ?)
//         RETURNING *
//     `;
//     const params = [validatedUser.address, validatedUser.points ?? 0, validatedUser.name ?? null, validatedUser.stamp_count ?? 0];
//     const result = await queryD1<DbUserResponse[]>(query, params);
//     return result;
// }

// export const createOrUpdateUser = async (user: CreateUserParams) => {
//     const validatedUser = createUserParams.parse(user);
//     const db_user = await getUserByAddress(validatedUser.address);
//     if (!db_user?.data?.results[0]?.address) {
//         await createUser(validatedUser);
//     }
//     const query = `UPDATE users 
//         SET points = ?,
//             stamp_count = ?,
//             updated_at = CURRENT_TIMESTAMP
//         WHERE address = ?
//         RETURNING *`;
//     const result = await queryD1<DbUserResponse[]>(query, [validatedUser.points, validatedUser.stamp_count, validatedUser.address]);
//     return result
// }

// export const deleteUser = async (address: string) => {
//     const query = `DELETE FROM users WHERE address = ? RETURNING *`;
//     const result = await queryD1<DbUserResponse[]>(query, [address]);
//     return result
// }