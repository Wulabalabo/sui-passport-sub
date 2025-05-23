'use client';

import { createContext, useContext, useCallback, useMemo, useState } from 'react';
import type { UserProfile } from '~/types/userProfile';
import { checkUserState } from '~/lib/contracts/query';
import type { NetworkVariables } from '~/lib/contracts';
// import { useUserCrud } from '@/hooks/use-user-crud';
import { setToken } from '~/lib/jwtManager'

interface UserProfileContextType {
  userProfile: UserProfile | null;
  isLoading: boolean;
  error: Error | null;
  refreshProfile: (address: string, networkVariables: NetworkVariables) => Promise<void>;
  getPageUserProfile: (address: string, networkVariables: NetworkVariables) => Promise<UserProfile | undefined | null>;
  clearProfile: () => void;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

interface UserProfileProviderProps {
  children: React.ReactNode;
}

export function UserProfileProvider({ children}: UserProfileProviderProps) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  // const { fetchUserByAddress, syncUserPoints } = useUserCrud();

  const refreshProfile = useCallback(async (address: string, networkVariables: NetworkVariables) => {
    try {
      setIsLoading(true);
      setError(null);
      await setToken({ address })
      const profile = await checkUserState(address, networkVariables);
      console.log('Profile fetched:', profile);
      setUserProfile(profile);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch profile'));
      console.error('Error fetching profile:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getPageUserProfile = useCallback(async (address: string, networkVariables: NetworkVariables): Promise<UserProfile| undefined | null> => {
    try {
      const profile = await checkUserState(address, networkVariables);
      return profile;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch profile'));
      console.error('Error fetching profile:', err);
    }
  }, []);

  const clearProfile = useCallback(() => {
    setUserProfile(null);
    setError(null);
  }, []);

  const value = useMemo(() => ({
    userProfile,
    isLoading,
    error,
    refreshProfile,
    getPageUserProfile,
    clearProfile,
  }), [userProfile, isLoading, error, refreshProfile, getPageUserProfile, clearProfile]);

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
}