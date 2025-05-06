import { type FC } from "react";
import Image from "next/image";
import { Sticker } from "../Sticker/Sticker";
import { useRouter } from "next/navigation";
import type { DisplayStamp } from "~/types/stamp";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface StampGroupProps {
  leftStamp?: DisplayStamp;
  rightStamp?: DisplayStamp;
  onStampClick?: (code: string, stamp: DisplayStamp) => void;
  isLoading?: boolean;
  openStickers: Record<string, boolean>;
  onOpenChange: (stampId: string, open: boolean) => void;
}

export const StampGroup: FC<StampGroupProps> = ({
  leftStamp,
  rightStamp,
  onStampClick,
  isLoading = false,
  openStickers,
  onOpenChange,
}) => {
  const router = useRouter();
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  const handleEventCardClick = () => {
    setIsEventModalOpen(true);
  };

  const handleTwitterClick = () => {
    window.open("https://twitter.com/SuiFamOfficial", "_blank");
    setIsEventModalOpen(false);
  };

  return (
    <>
      <div className="flex flex-col items-center justify-center w-full sm:flex-row gap-8 px-4 sm:px-0">
        {/* Left Stamp */}
        <div className="relative isolate w-full max-w-[350px]">
          {leftStamp && (
            <div className="w-full h-full flex items-center justify-center">
              <Sticker
                stampId={leftStamp.id}
                url={leftStamp.imageUrl ?? ""}
                name={leftStamp.name}
                rotation={0}
                amountLeft={leftStamp.leftStamps}
                dropsAmount={leftStamp.leftStamps}
                isClaimed={leftStamp.isClaimed}
                isPublicClaim={leftStamp.publicClaim}
                open={openStickers[leftStamp.id] ?? false}
                onOpenChange={(open) => onOpenChange(leftStamp.id, open)}
                onClaim={(code) => onStampClick?.(code, leftStamp)}
                isLoading={isLoading}
                className="w-full h-full"
              />
            </div>
          )}
        </div>

        {/* Middle Event Card */}
        {/* <div 
          className="relative isolate w-full max-w-[350px] aspect-[3/4] sm:h-[470px] flex flex-col items-center justify-center bg-[url('/images/qmark_bg.png')] bg-cover bg-center bg-no-repeat rounded-xl cursor-pointer transform transition-transform duration-300 hover:scale-105"
          onClick={handleEventCardClick}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-[140%] h-[140%]">
            <div className="absolute inset-0 bg-purple-500 opacity-30 blur-[100px] rounded-full animate-[pulse_4s_ease-in-out_infinite]"></div>
            <div className="absolute inset-0 bg-fuchsia-500 opacity-20 blur-[80px] rounded-full transform scale-90 animate-[pulse_4s_ease-in-out_infinite_1s]"></div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/5 to-purple-500/10 rounded-xl"></div>
          <Image src="/images/qmark.png" alt="qmark" sizes="100%" fill className="object-contain p-10" />
        </div> */}

        {/* Right Stamp */}
        <div className="relative isolate w-full max-w-[350px]">
          {rightStamp && (
              <Sticker
                stampId={rightStamp.id}
                url={rightStamp.imageUrl ?? ""}
                name={rightStamp.name}
                rotation={0}
                amountLeft={rightStamp.leftStamps}
                dropsAmount={rightStamp.leftStamps}
                isClaimed={rightStamp.isClaimed}
                isPublicClaim={rightStamp.publicClaim}
                open={openStickers[rightStamp.id] ?? false}
                onOpenChange={(open) => onOpenChange(rightStamp.id, open)}
                onClaim={(code) => onStampClick?.(code, rightStamp)}
                isLoading={isLoading}
                className="w-full h-full"
              />
          )}
        </div>
      </div>

      {isEventModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => setIsEventModalOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-[480px] min-h-[320px] bg-[#0A1B2B] rounded-xl flex flex-col items-center justify-center p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-[140%] h-[140%]">
              <div className="absolute inset-0 bg-purple-500 opacity-30 blur-[100px] rounded-full animate-[pulse_4s_ease-in-out_infinite]"></div>
              <div className="absolute inset-0 bg-fuchsia-500 opacity-20 blur-[80px] rounded-full transform scale-90 animate-[pulse_4s_ease-in-out_infinite_1s]"></div>
            </div>

            <div className="text-2xl sm:text-[32px] font-bold text-white mb-6 sm:mb-8 text-center">Next Stamp Drop?</div>
            <div
              className="flex items-center gap-3 text-[#4DA2FF] hover:text-[#3A8FFF] cursor-pointer transition-all duration-300 hover:scale-105"
              onClick={handleTwitterClick}
            >
              <svg
                viewBox="0 0 24 24"
                width="24"
                height="24"
                className="fill-current sm:w-7 sm:h-7"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span className="text-lg sm:text-xl font-medium">Follow @SuiFamOfficial</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}; 