/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
"use client";

import { motion } from "motion/react";
import { Button } from "../ui/button";
import Image from "next/image";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "../ui/dialog";
import { StickersLayout } from "./ui/StickersLayout";
import { useCallback, useEffect, useState } from "react";
import { useNetworkVariables } from "~/lib/contracts";
import { useUserProfile } from "~/context/user-profile-context";
import { removeToken } from "~/lib/jwtManager";
import { ConnectModal, useAccounts, useCurrentAccount, useCurrentWallet, useDisconnectWallet } from '@mysten/dapp-kit'
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { useUserCrud } from "~/hooks/use-user-crud";
import { show_stamp } from "~/lib/contracts/passport";
import { useBetterSignAndExecuteTransaction } from "~/hooks/use-better-tx";
import { toast } from "sonner";

interface ProfileModalProps {
  showMobilePopover?: boolean;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ showMobilePopover = true }) => {
  const { refreshProfile, userProfile } = useUserProfile()
  const networkVariables = useNetworkVariables()
  const { mutate: disconnect } = useDisconnectWallet()
  const accounts = useAccounts()
  const currentAccount = useCurrentAccount()
  const { connectionStatus } = useCurrentWallet()
  const [open, setOpen] = useState(false)
  const { clearProfile } = useUserProfile()
  const { createOrUpdateUser } = useUserCrud()

  const { handleSignAndExecuteTransaction: handleShowStampTx, isLoading: isShowingStamp } =
    useBetterSignAndExecuteTransaction({
      tx: show_stamp,
    });

  const checkChainAndConnect = useCallback(async () => {
    if (currentAccount?.address && connectionStatus === "connected") {
      const address = currentAccount.address
      await refreshProfile(address, networkVariables)
    }
    if (connectionStatus === "disconnected") {          
      clearProfile()
      await removeToken()
    }
  }, [currentAccount, connectionStatus, networkVariables, refreshProfile, clearProfile])

  useEffect(() => {
    void checkChainAndConnect()
  }, [checkChainAndConnect])

  // Separate effect for user data synchronization
  useEffect(() => {
    // Only sync if we have all required data
    if (!currentAccount?.address ||
      !userProfile?.passport_id ||
      connectionStatus !== "connected") {
      return;
    }

    // Create a stable reference to the data we want to sync
    const userData = {
      address: currentAccount.address,
      stamp_count: userProfile.stamps?.length ?? 0,
      name: userProfile.name,
      points: Number(userProfile.points),
      packageId: networkVariables.package,
    };

    const syncTimeout = setTimeout(() => {
      void createOrUpdateUser(userData);
    }, 1000);

    return () => clearTimeout(syncTimeout);
  }, [
    currentAccount?.address,
    connectionStatus,
    userProfile?.passport_id,
    userProfile?.stamps?.length,
    userProfile?.name,
    userProfile?.points,
    networkVariables.package,
    createOrUpdateUser // 现在可以安全地加入依赖数组
  ]);

  const handleStickerClick = async (id: string) => {
    if (!userProfile?.passport_id) {
      toast.error("Please create a passport first")
      return
    }
    await handleShowStampTx(
      {
        passport: userProfile?.passport_id ?? "",
        stamp: id,
      },
    ).onSuccess(() => {
      void refreshProfile(currentAccount?.address ?? "", networkVariables)
      setOpen(false)
      toast.success("Stamp shown successfully")
    }).onError((error) => {
      console.error('Error showing stamp:', error)
      toast.error("Error showing stamp")
    }).execute();
  };  

  const handleDisconnect = useCallback(() => {
    void disconnect()
    setOpen(false)
    clearProfile()
  }, [disconnect, setOpen, clearProfile])

  console.log("ProfileModal - showMobilePopover:", showMobilePopover);
  console.log("ProfileModal - accounts.length:", accounts.length);

  if (!accounts.length) {
    return (
      <ConnectModal
        open={open}
        onOpenChange={setOpen}
        trigger={
          <Button
            className="h-[34px] w-[150px] leading-4 sm:h-[52px] sm:w-[189px]"
          >
            <Image src={"/images/wallet.png"} alt="wallet" width={16} height={16} />
            Connect Wallet
          </Button>
        }
      />
    );
  }

  if (showMobilePopover) {
    console.log("ProfileModal - Rendering Popover");
    return (
      <Popover open={true}>
        <PopoverTrigger>
          <Button
            className="h-[34px] leading-4 sm:h-[52px]"
            onClick={() => {
              window.location.href = "slush://";
              setTimeout(() => {
                window.location.href =
                  "https://apps.apple.com/us/app/sui-wallet-mobile/id6476572140";
              }, 5000);
            }}
          >
            <Image
              src={"/images/drop.png"}
              alt="wallet"
              width={12}
              height={16}
            />
            <p className="text-xs">Sui Wallet</p>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[208px] border-none bg-transparent bg-[url(/images/popup-bg.svg)] bg-contain bg-no-repeat px-[14px] pt-5">
          <div className="flex flex-col items-start gap-2">
            <div className="flex items-start gap-2">
              <div className="flex flex-col items-center gap-1.5 font-inter">
                <Image
                  src={"/images/slush.png"}
                  alt="wallet-icon"
                  width={28}
                  height={28}
                />
                <span className="text-[10px] text-white/80">Sui Wallet</span>
              </div>
              <Image
                src={"/images/arrow-right.png"}
                alt="drop-icon"
                width={14}
                height={14}
                className="mt-2"
              />
              <div className="flex flex-col items-center gap-1.5 font-inter">
                <Image
                  src={"/images/slush_app.png"}
                  alt="apps-icon"
                  width={28}
                  height={28}
                />
                <span className="text-[10px] text-white/80">Apps</span>
              </div>
              <Image
                src={"/images/arrow-right.png"}
                alt="drop-icon"
                width={14}
                height={14}
                className="mt-2"
              />
              <div className="flex flex-col items-center gap-1.5 font-inter">
                <Image
                  src={"/images/sui-passport.svg"}
                  alt="passport-icon"
                  width={28}
                  height={28}
                />
                <span className="text-[10px] text-white/80">Passport</span>
              </div>
            </div>
            <div className="font-inter text-[10px] text-white">
            Install the Slush Wallet app on your phone, go to the App section, and enter the URL suipassport.app.
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return connectionStatus === "connected" && (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          className="h-[34px] w-[140px] leading-4 sm:h-[52px] sm:w-[168px]"
        >
          <Image src={"/images/user.png"} alt="user" className="w-4 h-4" width={16} height={16} />
          <p className="text-white truncate">{currentAccount?.address}</p>
        </Button>
      </DialogTrigger>
      <DialogContent className="overflow-y-scroll" >
        <DialogTitle className="sr-only">
          {userProfile?.name}
        </DialogTitle>
        <motion.div
          initial={{ y: 200, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 200, opacity: 0 }}
          transition={{ type: "spring" }}
          className="flex w-full flex-col items-center backdrop-blur-[8px] sm:h-screen"
        >
          <StickersLayout stamps={userProfile?.stamps ?? []} collections={userProfile?.collection_detail ?? []} visitor={currentAccount?.address !== userProfile?.current_user} onStickerClick={handleStickerClick} isLoading={isShowingStamp} />
          <Image
            src={userProfile?.avatar || "/images/profile-avatar-default.png"}
            alt="avatar"
            width={150}
            height={150}
            className="mt-[36px] h-[100px] w-[100px] sm:mt-0 sm:h-[150px] sm:w-[150px]"
            unoptimized
          />
          <div className="mb-6 mt-[32px] flex flex-col items-center gap-4 sm:mt-[48px]">
            <div className="flex flex-col items-center gap-2">
              <p className="font-inter text-[16px] leading-[20px] text-white sm:text-[20px] sm:leading-6">
                {userProfile?.name}
              </p>
              <p className="max-w-[358px] text-center font-inter text-[14px] leading-[18px] text-[#ABBDCC] sm:max-w-[405px] sm:text-[16px] sm:leading-6">
                {userProfile?.introduction}
              </p>
            </div>
            <span className="flex gap-2">
              <p className="font-inter text-[14px] text-white">{userProfile?.points} points</p>
            </span>
            <a
              className="flex cursor-pointer gap-2 font-inter text-[14px] leading-5 text-[#4DA2FF] sm:text-[16px]"
              href={`https://mainnet.suivision.xyz/object/${userProfile?.id?.id}`}
              target="_blank"
            >
              Details on Sui Vision
              <Image
                src={"/images/arrow-up-right.png"}
                width={16}
                height={16}
                alt="arrow"
                className="object-contain"
              />
            </a>
            <div className="flex gap-2">
              <DialogClose asChild>
                <Button
                  variant="secondary"
                  className="mt-6 h-[42px] w-[102px] sm:mt-12 sm:h-[52px] sm:w-[116px]"
                >
                  Close
                  <Image
                    src={"/images/cross.png"}
                    alt="cross"
                    width={16}
                    height={16}
                  />
                </Button>
              </DialogClose>
              <Button
                variant="secondary"
                className="mt-6 h-[42px] w-[102px] sm:mt-12 sm:h-[52px] sm:w-[116px]"
                onClick={handleDisconnect}
              >
                Disconnect
              </Button>
            </div>

          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
