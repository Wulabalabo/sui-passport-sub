import { type FC } from "react";
import Image from "next/image";
import { Sticker } from "../Sticker/Sticker";
import { useRouter } from "next/navigation";
import type { DisplayStamp } from "~/types/stamp";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface StampGroupProps { 
  stamps?: DisplayStamp[];
  onStampClick?: (code: string, stamp: DisplayStamp) => void;
  isLoading?: boolean;
  openStickers: Record<string, boolean>;
  onOpenChange: (stampId: string, open: boolean) => void;
}

export const StampGroup: FC<StampGroupProps> = ({
  stamps,
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
      <div className="flex flex-col items-center justify-center w-full sm:flex-row gap-8 px-4 gap-y-16 sm:gap-y-0 sm:px-0">
          {stamps && stamps.length > 0 && stamps.map((stamp) => (
            <div className="w-full h-full flex-row items-center justify-center sm:w-auto" key={stamp.id}>
              <Sticker
                stampId={stamp.id}
                url={stamp.imageUrl ?? ""}
                name={stamp.name}
                rotation={0}
                amountLeft={stamp.leftStamps}
                dropsAmount={stamp.leftStamps}
                isClaimed={stamp.isClaimed}
                isPublicClaim={stamp.publicClaim}
                open={openStickers[stamp.id] ?? false}
                onOpenChange={(open) => onOpenChange(stamp.id, open)}
                onClaim={(code) => onStampClick?.(code, stamp)}
                isLoading={isLoading}
                promoteUrl={stamp.promote_url}
                className="w-full h-full"
              />
            </div>
          ))}
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