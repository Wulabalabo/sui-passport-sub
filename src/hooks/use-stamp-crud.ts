'use client'

import { useState } from 'react'
import { apiFetch } from '~/lib/apiClient'
import type { VerifyClaimStampResponse, DbStampResponse, VerifyClaimStampRequest} from '~/types/stamp'

export function useStampCRUD() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const getStamps = async () => {
    try {
      setIsLoading(true)
      const response = await apiFetch<DbStampResponse[]>(`/api/stamps`,{
        method: 'GET'
      })
      return response
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch claim stamps'))
      throw err
    } finally {
      setIsLoading(false)
    }
  }
  const verifyClaimStamp = async (data: VerifyClaimStampRequest) => {
    try {
      setIsLoading(true)
      const response = await apiFetch<VerifyClaimStampResponse>(`/api/stamps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      return response
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to verify claim stamp'))
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const increaseStampCountToDb = async (id: string, userAddress: string, txHash?: string) => {
    try {
      const response = await apiFetch<any>(`/api/stamps`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          stamp_id: id, 
          user_address: userAddress,
          tx_hash: txHash 
        })
      })
      return response
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to record user stamp'))
      throw err
    }
  }

  return {
    isLoading,
    error,
    getStamps,
    verifyClaimStamp,
    increaseStampCountToDb
  }
}