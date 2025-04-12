"use client";
import Image from "next/image";
import { ContributorsTable } from "~/components/ContributorsTable/ContributorsTable";
import { PassportCreationModal } from "~/components/PassportCreationModal/PassportCreationModal";
import { ProfileModal } from "~/components/ProfileModal/ProfileModal";
import { Sticker } from "~/components/Sticker/Sticker";
import { usePassportsStamps } from "~/context/passports-stamps-context";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNetworkVariables } from "~/lib/contracts";
import { type Contributor } from "~/components/ContributorsTable/columns";
import { useUserCrud } from "~/hooks/use-user-crud";
import {
  usersToContributor,
  stampsToDisplayStamps,
  distributeStamps,
  STICKER_LAYOUT_CONFIG,
  stampsToDisplayStampsWithOutPassport,
} from "~/lib/utils";
import type { VerifyClaimStampRequest, DisplayStamp } from "~/types/stamp";
import { useUserProfile } from "~/context/user-profile-context";
import { useCurrentAccount, useCurrentWallet } from "@mysten/dapp-kit";
import {
  useBetterSignAndExecuteTransactionWithSponsor,
} from "~/hooks/use-better-tx";
import { claim_stamp } from "~/lib/contracts/claim";
import { useStampCRUD } from "~/hooks/use-stamp-crud";
import { type PassportFormSchema } from "~/types/passport";
import { mint_passport } from "~/lib/contracts/passport";
import { toast } from "sonner";
import { Turnstile } from "@marsidev/react-turnstile";

export default function HomePage() {
  const { stamps, refreshPassportStamps } = usePassportsStamps();
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [displayStamps, setDisplayStamps] = useState<DisplayStamp[]>([]);
  const networkVariables = useNetworkVariables();
  const { fetchUsers, isLoading, verifyCaptcha } = useUserCrud();
  const { userProfile, refreshProfile, isLoading: isRefreshingProfile } = useUserProfile();
  const { verifyClaimStamp, increaseStampCountToDb, isLoading: isVerifyingClaimStamp } = useStampCRUD();
  const currentAccount = useCurrentAccount();
  const { connectionStatus } = useCurrentWallet();
  const [openStickers, setOpenStickers] = useState<Record<string, boolean>>({});
  const { createOrUpdateUser } = useUserCrud();
  const [token, setToken] = useState<string | null>(null);
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
  const [isSuiWallet, setIsSuiWallet] = useState(false);

  const { handleSignAndExecuteTransactionWithSponsor: handleClaimStampTx, isLoading: isClaimingStamp } =
    useBetterSignAndExecuteTransactionWithSponsor({
      tx: claim_stamp,
    });

  const {
    handleSignAndExecuteTransactionWithSponsor,
    isLoading: isMintingPassportWithSponsor,
  } = useBetterSignAndExecuteTransactionWithSponsor({
    tx: mint_passport,
  });

  const initializeData = useCallback(async () => {
    const users = await fetchUsers();
    console.log('users', users);
    if (users) {
      setContributors(usersToContributor(users));
    }
  }, [fetchUsers]);

  useEffect(() => {
    const isSuiWallet = /Sui-Wallet/i.test(navigator.userAgent);
    setIsSuiWallet(isSuiWallet);
    if (token && !isSuiWallet) {
      void verifyCaptcha(token).then((success) => {
        setIsCaptchaVerified(success);
      });
    }
    //setIsCaptchaVerified(true);
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
    if (networkVariables) {
      void refreshPassportStamps(networkVariables);
    }
  }, [networkVariables, refreshPassportStamps, connectionStatus]);

  const handleClaimStampClick = async (code: string, stamp: DisplayStamp) => {
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
      packageId: networkVariables?.package,
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
      process.env.NEXT_PUBLIC_NETWORK as "testnet" | "mainnet",
      currentAccount?.address ?? "",
      [currentAccount?.address ?? ""],
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
    const formData = new FormData();
    if (values.avatarFile) {
      if (!(values.avatarFile instanceof Blob)) {
        throw new Error("Avatar file must be a valid image file");
      }
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        formData.append("file", values.avatarFile);
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = await response.json();
        values.avatar = data.url;
      } catch (error) {
        toast.error("Error uploading avatar");
        throw error; // Re-throw to interrupt the method
      }
    }
    await handleSignAndExecuteTransactionWithSponsor(
      process.env.NEXT_PUBLIC_NETWORK as "testnet" | "mainnet",
      currentAccount?.address ?? "",
      [currentAccount?.address ?? ""],
      {
        name: values.name,
        avatar: values.avatar ?? "",
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
      })
      .onError(() => {
        toast.error(`Error minting passport: Too many requests, please try again later`);
      })
      .execute();
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
          packageId: networkVariables.package,
        })
      }

      void initializeData();
    },
    [initializeData, userProfile, currentAccount, createOrUpdateUser, networkVariables],
  );

  const stampsLayout = useMemo(
    () => distributeStamps(displayStamps),
    [displayStamps],
  );

  return (
    <main className="flex min-h-screen flex-col items-center bg-[#02101C] text-white">
      <div className="flex w-full max-w-[375px] flex-col items-center sm:max-w-[1424px]">
        <div className="bg-[#02101C] py-6 flex w-full justify-between px-2 sm:pl-[35px] sm:pr-6 sticky top-0 z-20 sm:static">
          <div className="flex flex-shrink-0 items-center gap-3">
            <Image
              src={"/images/sui-logo.png"}
              alt="drop"
              width={24}
              height={24}
              className="h-[20px] w-[20px] sm:h-[32px] sm:w-[32px]"
            />
            <div className="relative flex items-center">
              <p className="font-inter text-sm sm:text-[24px]">
                2025 Sui Community Passport
              </p>
            </div>
          </div>
          {/* Show ProfileModal if user is using Sui Wallet or has passed captcha verification */}
          {(isSuiWallet || isCaptchaVerified) && <ProfileModal />}
        </div>
        <div className="relative flex w-full flex-col items-center rounded-t-xl bg-[#02101C] pl-2 pr-2 ">
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
          <div className="z-10 flex w-full max-w-[1424px] flex-col items-center justify-center">
            <h1 className="mt-8 max-w-[304px] text-center font-everett text-[40px] leading-[48px] sm:mt-16 sm:max-w-[696px] sm:text-[68px] sm:leading-[80px]">
              Make your mark on the Sui Community
            </h1>
            <div className="mt-6 flex max-w-[342px] flex-col gap-3 text-center font-everett_light text-[14px] text-[#ABBDCC] sm:max-w-[696px] sm:text-[16px]">
              <p>
                The Sui community flourishes because of passionate members like you. Through content and events, your contributions help elevate our Sui Community.
              </p>
              <p>
                Connect your wallet today and claim your first stamp!
              </p>
            </div>
            {/* Coming Soon */}
            <div className="mt-8 flex flex-col items-center gap-6 rounded-xl border border-[#1C3850] bg-[#0B1926] p-8 text-center">
              <div className="flex max-w-[600px] items-center">
                <span className="font-everett text-lg leading-relaxed text-[#ABBDCC]">
                We’re so grateful for the amazing response to Sui Community Passport! We’re making a few adjustments to smoothly handle the increased activity. Everything should be back to normal within a few hours—thanks for your patience!
                </span>
              </div>
              
              {/* <div className="flex flex-col gap-4">
                <p className="font-everett_light text-sm text-[#ABBDCC]">
                  The 2025 Sui Community Passport program will re-launch soon. Stay tuned!
                </p>

                <div className="flex items-center justify-center gap-3">
                  <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#4DA2FF]"></div>
                  <span className="font-everett_light text-sm text-[#4DA2FF]">
                    Preparing for new event...
                  </span>
                </div>
              </div> */}
            </div>
            {/* {!userProfile?.passport_id && <PassportCreationModal
              onSubmit={handlePassportCreation}
              isLoading={isMintingPassportWithSponsor || isRefreshingProfile}
            />} */}
          </div>
        </div>
        {/* <div className="relative mt-16 flex w-full flex-col items-center bg-gradient-to-t from-[#02101C] from-95% pl-2 pr-2">
          <h1 className="mt-40 max-w-[358px] text-center font-everett text-[40px] leading-[48px] sm:mt-16 sm:max-w-[696px] sm:text-[68px] sm:leading-[80px]">
            Get your stamps
          </h1>
          <div className="mt-[37px] flex flex-col-reverse justify-between sm:min-w-[900px] sm:flex-row">
            <div className="flex flex-col">
              {stampsLayout.left.map((stamp, index) => (
                <Sticker
                  key={stamp.id}
                  stampId={stamp.id}
                  url={stamp.imageUrl ?? ""}
                  name={stamp.name}
                  rotation={STICKER_LAYOUT_CONFIG.left[index]?.rotation ?? 0}
                  amountLeft={stamp.leftStamps}
                  dropsAmount={stamp.leftStamps}
                  isClaimed={stamp.isClaimed ?? false}
                  isPublicClaim={stamp.publicClaim}
                  open={openStickers[stamp.id] ?? false}
                  onOpenChange={(open) => handleOpenChange(stamp.id, open)}
                  onClaim={(code) => handleClaimStampClick(code, stamp)}
                  isLoading={isClaimingStamp || isVerifyingClaimStamp}
                />
              ))}
            </div>
            <div className="flex flex-col">
              {stampsLayout.center.map((stamp, index) => (
                <Sticker
                  key={stamp.id}
                  stampId={stamp.id}
                  url={stamp.imageUrl ?? ""}
                  name={stamp.name}
                  rotation={STICKER_LAYOUT_CONFIG.center[index]?.rotation ?? 0}
                  amountLeft={stamp.leftStamps}
                  dropsAmount={stamp.leftStamps}
                  isClaimed={stamp.isClaimed ?? false}
                  isPublicClaim={stamp.publicClaim}
                  open={openStickers[stamp.id] ?? false}
                  onOpenChange={(open) => handleOpenChange(stamp.id, open)}
                  onClaim={(code) => handleClaimStampClick(code, stamp)}
                  isLoading={isClaimingStamp || isVerifyingClaimStamp}
                />
              ))}
            </div>
            <div className="flex flex-col">
              {stampsLayout.right.map((stamp, index) => (
                <Sticker
                  key={stamp.id}
                  stampId={stamp.id}
                  url={stamp.imageUrl ?? ""}
                  name={stamp.name}
                  rotation={STICKER_LAYOUT_CONFIG.right[index]?.rotation ?? 0}
                  amountLeft={stamp.leftStamps}
                  dropsAmount={stamp.leftStamps}
                  isClaimed={stamp.isClaimed ?? false}
                  isPublicClaim={stamp.publicClaim}
                  open={openStickers[stamp.id] ?? false}
                  onOpenChange={(open) => handleOpenChange(stamp.id, open)}
                  onClaim={(code) => handleClaimStampClick(code, stamp)}
                  isLoading={isClaimingStamp || isVerifyingClaimStamp}
                />
              ))}
            </div>
          </div>
          <h2 className="mt-[185px] max-w-[263px] text-center font-everett text-[24px] leading-[28px] sm:text-[32px] sm:leading-[38px]">
            Top Contributors
          </h2>
          <div className="mb-[48px] mt-6 w-full sm:mb-[80px]">
            <ContributorsTable
              data={contributors}
              onRefresh={handleTableRefresh}
              isLoading={isLoading}
            />
          </div>
        </div> */}
        {/* Only show Turnstile captcha if:
          * 1. Not using Sui Wallet (!isSuiWallet) - Sui Wallet users don't need captcha verification
          * 2. No captcha token exists (!token) - Don't show if already verified
        */}
        {/* {!isSuiWallet && !token && (
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
        )} */}
      </div>
    </main>
  );
}
