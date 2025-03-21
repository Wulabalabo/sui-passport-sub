/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
"use client";

import { motion } from "motion/react";
import { Button } from "../ui/button";
import Image from "next/image";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "../ui/dialog";
import { StickersLayout } from "./ui/StickersLayout";
import { type FC, useEffect, useState } from "react";
import { useNetworkVariables } from "~/lib/contracts";
import { useUserProfile } from "~/context/user-profile-context";
import { isValidSuiAddress } from "@mysten/sui/utils";
import { type UserProfile } from "~/types/userProfile";
import { useCurrentAccount } from "@mysten/dapp-kit";
interface UserProfileModalProps {
  address: string;
  onClose: () => void;
}

export const UserProfileModal: FC<UserProfileModalProps> = ({
  address,
  onClose,
}) => {
  const { getPageUserProfile } = useUserProfile();
  const networkVariables = useNetworkVariables();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const currentAccount = useCurrentAccount();

  useEffect(() => {
    if (!isValidSuiAddress(address)) {
      onClose();
      return;
    }
    if (!userProfile) {
      getPageUserProfile(address, networkVariables)
        .then((profile) => {
          if (profile) {
            setUserProfile(profile);
          }
        })
        .catch((err) => console.error(err));
    }
  }, [address, networkVariables, userProfile, getPageUserProfile, onClose]);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="overflow-y-scroll">
        <DialogTitle className="sr-only">{userProfile?.name}</DialogTitle>
        <motion.div
          initial={{ y: 200, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 200, opacity: 0 }}
          transition={{ type: "spring" }}
          className="flex w-full flex-col items-center backdrop-blur-[8px] sm:h-screen"
        >
          <StickersLayout stamps={userProfile?.stamps ?? []} collections={userProfile?.collection_detail ?? []} visitor={currentAccount?.address !== address} />
          <Image
            src={userProfile?.avatar || "/images/profile-avatar-default.png"}
            alt="avatar"
            width={150}
            height={150}
            className="mt-[36px] h-[100px] w-[100px] rounded-full object-cover sm:mt-0 sm:h-[150px] sm:w-[150px]"
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
              <p className="font-inter text-[14px] text-white">
                {userProfile?.points} points
              </p>
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
                  onClick={onClose}
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
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
