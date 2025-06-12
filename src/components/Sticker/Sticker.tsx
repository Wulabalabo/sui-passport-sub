/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { useState, type FC } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { TextInput } from "../TextInput/TextInput";
import { AnimatedImage } from "../AnimatedImage.tsx/AnimatedImage";
import { cn } from "~/lib/utils";
type StickerProps = {
  stampId: string;
  url: string;
  name: string;
  rotation: number;
  amountLeft: number;
  dropsAmount: number;
  isClaimed?: boolean;
  className?: string;
  isPublicClaim?: boolean;
  open?: boolean;
  isLoading?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClaim?: (code: string) => void;
};

export const Sticker: FC<StickerProps> = (props) => {
  const {
    stampId,
    amountLeft = 0,
    url,
    name,
    rotation = 0,
    isClaimed,
    dropsAmount,
    className,
    isPublicClaim = false,
    onClaim,
    open = false,
    isLoading = false,
    onOpenChange,
  } = props;

  const [status, setStatus] = useState<"pending" | "default" | "success" | "error">(
    "default",
  );
  const [code, setCode] = useState(isPublicClaim ? "00000" : "");

  const handleClaim = async (code: string) => {
    setStatus("pending");
    try {
      onClaim?.(code);
      setStatus("success");
    } catch (error) {
      console.error(error);
      setStatus("error");
      setCode("");
      setTimeout(() => {
        setStatus("default");
      }, 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) {
        setStatus("default");
        setCode(isPublicClaim ? "00000" : "");
      }
      onOpenChange?.(open);
    }}>
      <DialogTrigger className={className} disabled={isClaimed || dropsAmount <= 0}>
        <div
          className={cn("relative flex flex-col items-center justify-center")}
          style={{
            transform: `rotate(${rotation}deg)`,
          }}
        >
          <AnimatedImage
            src={url}
            alt="sticker"
            width={360}
            height={360}
            className={cn(
              `mb-10 h-[240px] w-[240px] cursor-pointer sm:h-[360px] sm:w-[360px]`,
              { "grayscale(100%) cursor-default opacity-40": isClaimed },
            )}
            disabled={Boolean(isClaimed || dropsAmount <= 0)}
          />
          <p className="absolute bottom-0 font-everett uppercase text-[#ABBDCC]">
            {name}
          </p>
          {isClaimed && (
            <div className="absolute z-10 flex h-[29px] w-[78px] items-center justify-center rounded-xl bg-[#33404b] font-inter text-[#6f7f8c]">
              Claimed
            </div>
          )}

          {dropsAmount <= 0 && (
            <div className="absolute z-10 flex h-[29px] w-[78px] items-center justify-center rounded-xl bg-[#33404b] font-inter text-[#6f7f8c]">
              Sold Out
            </div>
          )}
        </div>
      </DialogTrigger>
      <DialogContent aria-describedby={undefined}>
        <DialogTitle />
        <motion.div
          initial={{ y: 200, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 200, opacity: 0 }}
          transition={{ type: "spring" }}
          className="flex h-full w-full flex-col items-center justify-between backdrop-blur-[8px] sm:justify-center"
        >
          <div className="relative flex flex-col items-center">
            <AnimatedImage
              src={url}
              alt="sticker"
              width={480}
              height={480}
              className="mb-20 h-[360px] w-[360px] sm:h-[480px] sm:w-[480px]"
            />
            <div className="absolute bottom-0 flex flex-col items-center gap-4">
              <a
                className="flex cursor-pointer gap-2 font-inter text-[14px] leading-5 text-[#4DA2FF] sm:text-[16px]"
                href={`https://mainnet.suivision.xyz/object/${stampId}`}
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
              <span className="flex gap-2">
                <p className="font-inter text-[16px] leading-6 text-white sm:text-[20px]">
                  {name}
                </p>
                <p className="font-inter text-[16px] leading-6 text-[#ABBDCC] sm:text-[20px]">
                  {amountLeft === Infinity ? "Unlimited" : "Total: " + amountLeft}
                </p>
              </span>
            </div>
          </div>
          <div className="mb-4 flex flex-col items-center">
            {!isPublicClaim && (
              <div
                className={cn(
                  "relative mt-auto flex items-center sm:mt-[103px]",
                )}
              >
                <TextInput
                  labelText="Claim Code"
                  placeholder="1234-5678"
                  disabled={status !== "default"}
                  className={cn(
                    "h-[66px] w-[358px] sm:h-[79px] sm:w-auto",
                    status === "pending" && "border-2 border-[#ABBDCC80]",
                    status === "success" && "border-2 border-[#4DA2FF]",
                  )}
                  onChange={(e) => setCode(e.target.value)}
                  value={code}
                />
                {status === "pending" && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      repeat: Infinity,
                      duration: 2,
                      ease: "linear",
                    }}
                    className="absolute right-6 z-10 h-[31px] w-[31px]"
                  >
                    <Image
                      src={"/images/loader.svg"}
                      alt="loader"
                      width={31}
                      height={31}
                    />
                  </motion.div>
                )}
                {status === "success" && (
                  <Image
                    src={"/images/circle-check.png"}
                    alt="loader"
                    width={31}
                    height={31}
                    className="absolute right-6 z-10"
                  />
                )}
              </div>
            )}
            <div className="mt-[48px] flex gap-2">
              <DialogClose asChild>
                <Button
                  variant="secondary"
                  className="h-[42px] w-[102px] sm:h-[52px] sm:w-[116px]"
                  disabled={isLoading}
                  onClick={() => {
                    setCode(isPublicClaim ? "00000" : "");
                    setStatus("default");
                  }}
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
                className="h-[42px] w-[197px] sm:h-[52px] sm:w-[227px]"
                disabled={isLoading || !isPublicClaim && (status !== "default" || !code)}
                onClick={() => {
                  void handleClaim(code);
                }}
              >
                {isPublicClaim ? "Claim" : "Claim " + name}
                {isLoading && <Image
                  src={"/images/loader.svg"}
                  alt="loader"
                  width={16}
                  height={16}
                />}
              </Button>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
