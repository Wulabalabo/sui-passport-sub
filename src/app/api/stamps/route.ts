import { NextResponse } from 'next/server';
import type { VerifyClaimStampResponse, VerifyStampParams, StampItem, VerifyClaimStampRequest } from '~/types/stamp';
import { suiClient, graphqlClient } from '../SuiClient';
import { passportService, stampService } from '~/lib/db';

export async function POST(request: Request) {
    try {
        const requestBody: VerifyClaimStampRequest = await request.json() as VerifyClaimStampRequest;
        if (!requestBody.address || !requestBody.packageId || !requestBody.stamp_id || !requestBody.claim_code || !requestBody.passport_id || !requestBody.last_time || !requestBody.stamp_name) {
            return NextResponse.json(
                { success: false, error: 'Missing required parameters' },
                { status: 400 }
            );
        }

        // 1. 先检查数据库中用户是否已经获取过此stamp
        const userStampCount = await stampService.getUserStampCount(requestBody.address, requestBody.stamp_id);
        const stamp = await stampService.getById(requestBody.stamp_id);
        
        if (!stamp) {
            return NextResponse.json(
                { success: false, error: 'Stamp not found' },
                { status: 404 }
            );
        }

        const userLimit = stamp.user_count_limit || 1;
        if (userStampCount >= userLimit) {
            return NextResponse.json(
                { success: false, error: `You have already claimed the maximum number (${userLimit}) of this stamp` },
                { status: 200 }
            );
        }

        // 2. 检查stamp是否可以claim（时间限制）
        const now = Math.floor(Date.now() / 1000);
        const startTime = stamp?.claim_code_start_timestamp ? Number(stamp.claim_code_start_timestamp) : null
        const endTime = stamp?.claim_code_end_timestamp ? Number(stamp.claim_code_end_timestamp) : null
        if (startTime && endTime && (now < startTime || now > endTime)) {
            return NextResponse.json(
                { success: false, error: 'Stamp is not claimable' },
                { status: 200 }
            );
        }

        // 3. 检查总数限制
        if (stamp?.total_count_limit && stamp.claim_count && stamp.claim_count >= stamp.total_count_limit) {
            return NextResponse.json(
                { success: false, error: 'Stamp is sold out' },
                { status: 200 }
            );
        }

        // 4. 链上状态检查（作为双重验证）
        const profile = await passportService.checkUserState(requestBody.address, requestBody.packageId, suiClient, graphqlClient);
        if (profile?.stamps?.some((stamp: StampItem) => stamp.event === requestBody.stamp_name)) {
            return NextResponse.json(
                { success: false, error: 'You have already claimed this stamp' },
                { status: 200 }
            );
        }

        // 5. 验证claim code和生成签名
        const { isValid, signature } = await stampService.verify({ stamp_id: requestBody.stamp_id, claim_code: requestBody.claim_code, passport_id: requestBody.passport_id, last_time: requestBody.last_time } satisfies VerifyStampParams);

        const response: VerifyClaimStampResponse = {
            success: true,
            valid: isValid,
            signature: signature ?? undefined
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Verification error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Verification failed'
            },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        const result = await stampService.getAll();
        return NextResponse.json(result);
    } catch (error) {
        console.error('Error fetching claim stamps:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Failed to fetch claim stamps' },
            { status: 500 }
        );
    }
}


export async function PATCH(request: Request) {
    try {
        const { stamp_id, user_address, tx_hash } = await request.json();
        
        if (!stamp_id || !user_address) {
            return NextResponse.json(
                { success: false, error: 'Missing required parameters: stamp_id and user_address' },
                { status: 400 }
            );
        }

        // 使用新的recordUserStamp方法，它会自动检查限制并更新计数
        const result = await stampService.recordUserStamp(user_address, stamp_id, tx_hash);
        
        return NextResponse.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error recording user stamp:', error);
        return NextResponse.json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Failed to record user stamp' 
        }, { status: 500 });
    }
}
