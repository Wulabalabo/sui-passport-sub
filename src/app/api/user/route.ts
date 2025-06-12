import { NextResponse } from "next/server";
import { createUserParams } from "~/types/userProfile";
import { suiClient, graphqlClient } from '../SuiClient';
import { passportService, userService } from "~/lib/db";
export async function GET() {
    try {
        const users = await userService.getTopUsers();
        return new NextResponse(JSON.stringify(users));
    } catch (error) {
        console.error('Error in GET /api/users:', error);
        return NextResponse.json(
            { error: "Internal Server Error" }, 
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const validatedUser = createUserParams.parse(body);
        const profile = await passportService.checkUserState(validatedUser.address, validatedUser.packageId, suiClient, graphqlClient);
        
        if (!profile) {
            console.error('[User API] Profile not found:', { address: validatedUser.address });
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        // if(Number(profile.points) !== Number(validatedUser.points)) {
        //     console.error('[User API] Points mismatch:', { 
        //         expected: validatedUser.points, 
        //         actual: profile.points 
        //     });
        //     return NextResponse.json(
        //         { error: "User points not match" },
        //         { status: 400 }
        //     );
        // }

        // if(profile.stamps?.length !== validatedUser.stamp_count) {
        //     console.error('[User API] Stamp count mismatch:', { 
        //         expected: validatedUser.stamp_count, 
        //         actual: profile.stamps?.length 
        //     });
        //     return NextResponse.json(
        //         { error: "User stamps not match" },
        //         { status: 400 }
        //     );
        // }

        const syncUserProfile = {
            name:profile.name,
            address:validatedUser.address,
            stamp_count:profile.stamps?.length,
            points:profile.points,
            packageId:validatedUser.packageId
        }

        const user = await userService.createOrUpdate(syncUserProfile);
        return NextResponse.json(user);
    } catch (error) {
        console.error('[User API] Error:', error);
        return NextResponse.json(
            { error: "Internal Server Error" }, 
            { status: 500 }
        );
    }
}