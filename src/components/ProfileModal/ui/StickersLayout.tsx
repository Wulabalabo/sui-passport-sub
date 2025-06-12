import { AnimatedImage } from "~/components/AnimatedImage.tsx/AnimatedImage";
import { type StickerData } from "../stickers";
import { type StampItem } from "~/types/stamp";
import { useEffect, useMemo, useState } from "react";
import { stampsToStickerData } from "~/lib/utils";
import { useMediaQuery } from "react-responsive";

interface StickersLayoutProps {
  stamps: StampItem[];
  collections: string[];
  visitor: boolean;
  onStickerClick?: (id: string) => void;
  isLoading?: boolean;
}

export const StickersLayout = ({ stamps, collections, visitor, onStickerClick, isLoading }: StickersLayoutProps) => {
  const [stickerData, setStickerData] = useState<StickerData[]>([]);
  const isMobile = useMediaQuery({ query: `(max-width: 640px)` });

  useEffect(() => {
    setStickerData(stampsToStickerData(stamps, collections));
  }, [stamps, collections, visitor]);

  // 计算网格列数
  const gridCols = useMemo(() => {
    if (isMobile) return 2;
    if (stickerData.length <= 4) return 2;
    if (stickerData.length <= 9) return 3;
    return 4;
  }, [stickerData.length, isMobile]);

  // 计算贴纸大小
  const stickerSize = useMemo(() => {
    if (isMobile) return 150;
    if (stickerData.length <= 4) return 200;
    if (stickerData.length <= 9) return 180;
    return 160;
  }, [stickerData.length, isMobile]);

  return (
    <div className="flex w-full justify-center p-4">
      <div
        className={`grid gap-6 w-full max-w-[1200px] place-items-center`}
        style={{
          gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
        }}
      >
        {stickerData.map(
          ({
            id,
            isActive,
            url,
            name,
            rotation,
          }) => (
            <div
              key={id}
              className={`flex flex-col items-center justify-between relative ${!isActive && onStickerClick && "cursor-pointer"}`}
              style={{
                height: `${stickerSize}px`,
                width: `${stickerSize}px`,
                transform: `rotate(${rotation}deg)`,
              }}
              onClick={() => !isActive && !isLoading && onStickerClick?.(id)}
            >
              <AnimatedImage
                src={url}
                width={stickerSize}
                height={stickerSize}
                alt="sticker"
                disabled={!isActive}
              />
              {!isActive && onStickerClick && (
                <div className="absolute inset-0 flex items-center hover:scale-110 transition-transform duration-200 justify-center bg-black/50 rounded-lg">
                  <p className="font-everett text-[16px] uppercase text-white text-center px-2">
                    Click to get Points
                  </p>
                </div>
              )}
              <p className="absolute bottom-0 font-everett sm:text-[14px] uppercase text-[#ABBDCC] text-center text-sm text-nowrap">
                {name}
              </p>
            </div>
          ),
        )}
      </div>
    </div>
  );
};
