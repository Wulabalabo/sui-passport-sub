import { z } from "zod";

export type StampItem = {
    id: string
    name: string
    imageUrl?: string
    description?: string
    points?: number
    timestamp?: number
    hasClaimCode?: boolean
    claimCodeStartTimestamp?: string
    claimCodeEndTimestamp?: string
    totalCountLimit?: number
    userCountLimit?: number
    claimCount?: number
    event?: string
    publicClaim?: boolean
    promote_url?: string | null
}

export interface StampGridProps {
    items: StampItem[]
    currentPage?: number
    totalPages?: number
    onPageChange?: (page: number) => void
}

export type DisplayStamp = StampItem & {
    isActive?: boolean
    eventId?: string
    isClaimable?: boolean
    isClaimed?: boolean
    leftStamps: number
}

export interface DistributedStamps {
    left: DisplayStamp[];
    center: DisplayStamp[];
    right: DisplayStamp[];
}

export type VerifyClaimStampRequest = {
    stamp_id: string
    claim_code: string
    passport_id: string
    last_time: number
    stamp_name: string
    address: string
    packageId: string
}

export type VerifyClaimStampResponse = {
    success: boolean;
    valid: boolean;
    signature?: Uint8Array;
    error?: string;
}

export const ClaimStampRequest = z.object({
    stamp_id: z.string(),
    claim_code: z.string().or(z.number()).nullable(),
    claim_code_start_timestamp: z.string().or(z.number()).nullable(),
    claim_code_end_timestamp: z.string().or(z.number()).nullable(),
    total_count_limit: z.number().nullable(),
    user_count_limit: z.number().nullable(),
    public_claim: z.boolean()
})

export interface DbStampResponse {
    stamp_id: string;
    claim_code_start_timestamp: string | null;
    claim_code_end_timestamp: string | null;
    has_claim_code: boolean;
    total_count_limit: number | null;
    user_count_limit: number | null;
    claim_count: number;
    public_claim: boolean;
    promote_url: string | null;
}

export interface VerifyStampParams {
    stamp_id: string;
    passport_id: string;
    last_time: number;
    claim_code: string;
}

export type ClaimStampRequest = z.infer<typeof ClaimStampRequest>

