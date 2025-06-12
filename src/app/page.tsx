"use client";
import Image from "next/image";
import { ContributorsTable } from "~/components/ContributorsTable/ContributorsTable";
import { PassportCreationModal } from "~/components/PassportCreationModal/PassportCreationModal";
import { ProfileModal } from "~/components/ProfileModal/ProfileModal";
import { usePassportsStamps } from "~/context/passports-stamps-context";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNetworkVariables } from "~/lib/contracts";
import { type Contributor } from "~/components/ContributorsTable/columns";
import { useUserCrud } from "~/hooks/use-user-crud";
import {
  usersToContributor,
  stampsToDisplayStamps,
  stampsToDisplayStampsWithOutPassport,
} from "~/lib/utils";
import type { VerifyClaimStampRequest, DisplayStamp } from "~/types/stamp";
import { useUserProfile } from "~/context/user-profile-context";
import { useCurrentAccount, useCurrentWallet } from "@mysten/dapp-kit";
import {
  useBetterSignAndExecuteTransaction,
} from "~/hooks/use-better-tx";
import { claim_stamp } from "~/lib/contracts/claim";
import { useStampCRUD } from "~/hooks/use-stamp-crud";
import { type PassportFormSchema } from "~/types/passport";
import { mint_passport } from "~/lib/contracts/passport";
import { toast } from "sonner";
import { Turnstile } from "@marsidev/react-turnstile";
import { StampGroup } from "~/components/StampGroup/StampGroup";
import { RainbowButton } from "~/components/magicui/rainbow-button";

const pulseKeyframes = `
@keyframes pulse-slow {
  0%, 100% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 0.4;
    transform: scale(1.1);
  }
}

@keyframes pulse-slow-delayed {
  0%, 100% {
    opacity: 0.2;
    transform: scale(0.9);
  }
  50% {
    opacity: 0.3;
    transform: scale(1);
  }
}
`;

export default function HomePage() {
  const { stamps, refreshPassportStamps } = usePassportsStamps();
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [displayStamps, setDisplayStamps] = useState<DisplayStamp[]>([]);
  const [uploadedAvatarUrl, setUploadedAvatarUrl] = useState<string>("");
  const networkVariables = useNetworkVariables();
  const { fetchUsers, isLoading: isLoadingUsers, verifyCaptcha } = useUserCrud();
  const { userProfile, refreshProfile, isLoading: isRefreshingProfile } = useUserProfile();
  const { verifyClaimStamp, increaseStampCountToDb, isLoading: isVerifyingClaimStamp } = useStampCRUD();
  const currentAccount = useCurrentAccount();
  const { connectionStatus } = useCurrentWallet();
  const [openStickers, setOpenStickers] = useState<Record<string, boolean>>({});
  const { createOrUpdateUser } = useUserCrud();
  const [token, setToken] = useState<string | null>(null);
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
  const [showMobilePopover, setShowMobilePopover] = useState(false);
  const [isSuiWallet, setIsSuiWallet] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { handleSignAndExecuteTransaction: handleClaimStampTx, isLoading: isClaimingStamp } =
    useBetterSignAndExecuteTransaction({
      tx: claim_stamp,
    });

  // const {
  //   handleSignAndExecuteTransactionWithSponsor,
  //   isLoading: isMintingPassportWithSponsor,
  // } = useBetterSignAndExecuteTransactionWithSponsor({
  //   tx: mint_passport,
  // });

  const { handleSignAndExecuteTransaction: handleMintPassportTx, isLoading: isMintingPassportWithSponsor } = useBetterSignAndExecuteTransaction({
    tx: mint_passport,
  });

  const initializeData = useCallback(async () => {
    const users = await fetchUsers();
    void refreshPassportStamps(networkVariables);
    if (users) {
      setContributors(usersToContributor(users));
    }
  }, [fetchUsers, networkVariables, refreshPassportStamps]);

  useEffect(() => {
    const isSuiWallet = /Slush/i.test(navigator.userAgent);
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    setShowMobilePopover(!isSuiWallet && isMobile);
    setIsSuiWallet(isSuiWallet);

    if (process.env.NODE_ENV === 'production') {
      if (token && !isSuiWallet) {
        void verifyCaptcha(token).then((success) => {
          setIsCaptchaVerified(success);
        });
      }
    } else {
      setIsCaptchaVerified(true);
    }

    console.log("showMobilePopover", !isSuiWallet && isMobile);
    console.log("isSuiWallet", isSuiWallet);
  }, [token, verifyCaptcha]);

  useEffect(() => {
    void initializeData();
  }, [initializeData]);

  useEffect(() => {
    setDisplayStamps([]);
    if (stamps && userProfile) {
      setDisplayStamps(stampsToDisplayStamps(stamps, userProfile));
    } else if (stamps) {
      setDisplayStamps(stampsToDisplayStampsWithOutPassport(stamps));
    }
  }, [stamps, userProfile]);

  useEffect(() => {
    if (connectionStatus === "connected" && networkVariables) {
      void refreshPassportStamps(networkVariables);
    }
  }, [networkVariables, refreshPassportStamps, connectionStatus]);

  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.textContent = pulseKeyframes;
    document.head.appendChild(styleSheet);

    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  const handleClaimStampClick = async (code: string, stamp: DisplayStamp) => {
    console.log("handleClaimStampClick", code, stamp);
    if (!userProfile?.passport_id) {
      toast.error("You should have a passport to claim a stamp");
      return;
    }
    const stamps = userProfile?.stamps;
    if (stamps?.some((stamp) => stamp.event === stamp?.name)) {
      toast.error(`You have already have this stamp`);
      return;
    }
    if (
      stamp.claimCount &&
      stamp.totalCountLimit !== 0 &&
      stamp?.claimCount >= stamp.totalCountLimit!
    ) {
      toast.error("Stamp is claimed out");
      return;
    }
    const requestBody: VerifyClaimStampRequest = {
      stamp_id: stamp?.id,
      claim_code: code,
      passport_id: userProfile?.id.id,
      last_time: Number(userProfile?.last_time),
      stamp_name: stamp?.name,
      address: currentAccount?.address ?? "",
      packageId: networkVariables?.originPackage,
    };
    const data = await verifyClaimStamp(requestBody);
    if (!data.success) {
      toast.error(data.error);
      handleOpenChange(stamp.id, false);
      return;
    }
    if (!data.signature || !data.valid) {
      toast.error("Invalid claim code");
      throw new Error("Invalid claim code");
    }


    // Convert signature object to array
    const signatureArray = Object.values(data.signature);
    await handleClaimStampTx(
      {
        event: stamp?.id ?? "",
        passport: userProfile?.id.id ?? "",
        name: stamp?.name ?? "",
        sig: signatureArray,
      },
    )
      .onSuccess(async () => {
        toast.success("Stamp claimed successfully", {
          duration: 2500
        });
        handleOpenChange(stamp.id, false);
        await refreshProfile(currentAccount?.address ?? "", networkVariables);
        await refreshPassportStamps(networkVariables);
        await increaseStampCountToDb(stamp.id);
      })
      .execute();
  };

  const handlePassportCreation = async (values: PassportFormSchema) => {
    setIsLoading(true);
    let avatarUrl = uploadedAvatarUrl;

    // If we have a new file, upload it and get the URL
    if (values.avatarFile) {
      if (!(values.avatarFile instanceof Blob)) {
        throw new Error("Avatar file must be a valid image file");
      }
      try {
        const formData = new FormData();
        formData.append("file", values.avatarFile);
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = (await response.json()) as { url: string };
        avatarUrl = data.url;
        setUploadedAvatarUrl(data.url);
      } catch (error) {
        console.log(error);
        toast.error("Error uploading avatar");
        setIsLoading(false);
        throw error;
      }
    }

    await handleMintPassportTx(
      {
        name: values.name,
        avatar: avatarUrl,
        introduction: values.introduction ?? "",
        x: "",
        github: "",
        email: "",
      },
    )
      .onSuccess(async () => {
        await refreshProfile(currentAccount?.address ?? "", networkVariables);
        void handleTableRefresh()
        toast.success("Passport minted successfully");
        // Clear the stored URL after successful mint
        setUploadedAvatarUrl("");
      })
      .onError((error) => {
        toast.error(`Error minting passport: ${error}`);
      })
      .execute();
    setIsLoading(false);
  };

  const handleOpenChange = (stampId: string, isOpen: boolean) => {
    setOpenStickers((prev) => ({
      ...prev,
      [stampId]: isOpen,
    }));
  };

  const handleTableRefresh = useCallback(
    async () => {
      if (currentAccount?.address && userProfile?.passport_id) {
        void createOrUpdateUser({
          address: currentAccount.address,
          stamp_count: userProfile.stamps?.length ?? 0,
          name: userProfile.name,
          points: Number(userProfile.points),
          packageId: networkVariables.originPackage,
        })
      }

      void initializeData();
    },
    [initializeData, userProfile, currentAccount, createOrUpdateUser, networkVariables],
  );

  return (
    <main className="flex min-h-screen flex-col items-center bg-[#02101C] text-white">
      <div className="flex w-full flex-col items-center sm:max-w-[1424px]">
        <div className="bg-[#02101C] py-4 sm:py-6 flex w-full flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 sticky top-0 z-20 sm:static gap-4 sm:gap-0">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
              <Image
                src={"/images/sui-logo.png"}
                alt="drop"
                width={24}
                height={24}
                className="h-[24px] w-[24px] sm:h-[32px] sm:w-[32px]"
              />
              <p className="font-inter text-[14px] sm:text-[24px] text-white">
                Sui Community Passport
              </p>
            </div>
            <div className="block sm:hidden">
              <ProfileModal showMobilePopover={showMobilePopover} />
            </div>
          </div>

          <div className="flex items-center justify-between w-full sm:w-auto gap-4">
            <RainbowButton
              onClick={() => window.open("https://x.com/SuiFamOfficial", "_blank")}
              className="hidden sm:block w-full sm:w-auto"
            >
              <div className="flex items-center justify-center gap-2">
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  className="fill-current sm:w-6 sm:h-6"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span className="font-inter text-base sm:text-lg font-medium">Follow @SuiFamOfficial</span>
              </div>
            </RainbowButton>
            <div className="hidden sm:block">
              {isCaptchaVerified && <ProfileModal showMobilePopover={false} />}
            </div>
          </div>
        </div>
        <div className="relative flex w-full flex-col items-center rounded-t-xl bg-[#02101C] overflow-hidden">
          <Image
            className="absolute top-0 hidden rounded-xl sm:block brightness-[60%]"
            src={"/images/card-background.png"}
            alt="background"
            width={1424}
            height={893}
            unoptimized
          />
          <Image
            className="absolute top-0 block rounded-xl sm:top-[-234px] sm:hidden"
            src={"/images/mobile-card-background.png"}
            alt="background"
            width={374}
            height={491}
            unoptimized
          />
          <div className="z-10 flex w-full flex-col items-center justify-center">
            <h1 className="mt-8 max-w-[304px] text-center font-everett text-[40px] leading-[48px] sm:mt-16 sm:max-w-[696px] sm:text-[68px] sm:leading-[80px]">
              Make your mark on the Sui Community
            </h1>
            <div className="mt-6 flex max-w-[342px] flex-col gap-3 text-center font-everett_light text-[14px] text-[#ABBDCC] sm:max-w-[696px] sm:text-[16px] p-2">
              <p>
                The Sui community flourishes because of passionate members like you. Through content and events, your contributions help elevate our Sui Community.
              </p>
              <p>
                Connect your wallet today and claim your first stamp!
              </p>              
              <RainbowButton
                onClick={() => window.open("https://x.com/SuiFamOfficial", "_blank")}
                className="block sm:hidden w-full sm:w-auto"
              >
                <div className="flex items-center justify-center gap-2">
                  <svg
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    className="fill-current sm:w-6 sm:h-6"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  <span className="font-inter text-base sm:text-lg font-medium">Follow @SuiFamOfficial</span>
                </div>
              </RainbowButton>
            </div>
            <div>
            </div>
            {!userProfile?.passport_id && <PassportCreationModal
              onSubmit={handlePassportCreation}
              isLoading={isMintingPassportWithSponsor || isRefreshingProfile || isLoading}
            />}
          </div>
        </div>
        <div className="relative flex w-full flex-col items-center bg-gradient-to-t from-[#02101C] from-95% overflow-hidden">
          <h1 className="mt-10 max-w-[358px] text-center font-everett text-[40px] leading-[48px] sm:my-10 
          sm:max-w-[696px] sm:text-[68px] sm:leading-[80px]">
            Get your stamps
          </h1>
          <StampGroup
            leftStamp={displayStamps[0] ?? undefined}
            rightStamp={displayStamps[1] ?? undefined}
            onStampClick={handleClaimStampClick}
            isLoading={isClaimingStamp || isVerifyingClaimStamp}
            openStickers={openStickers}
            onOpenChange={handleOpenChange}
          />
          <h2 className="mt-20 max-w-[263px] text-center font-everett text-[24px] leading-[28px] sm:text-[32px] sm:leading-[38px]">
            Top Contributors
          </h2>
          <div className="mb-[48px] mt-6 w-full sm:mb-[80px]">
            <ContributorsTable
              data={contributors}
              onRefresh={handleTableRefresh}
              isLoading={isLoadingUsers}
            />
          </div>
        </div>
        {/* Only show Turnstile captcha if:
          * 1. Not using Sui Wallet (!isSuiWallet) - Sui Wallet users don't need captcha verification
          * 2. No captcha token exists (!token) - Don't show if already verified
        */}
        {!isSuiWallet && !token && process.env.NODE_ENV === 'production' && (
          <div className="fixed bottom-4 right-4">
            <Turnstile
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""}
              options={{
                theme: "dark",
                language: "en",
              }}
              onSuccess={(token) => {
                setToken(token);
              }}
            />
          </div>
        )}
      </div>
    </main>
  );
}
