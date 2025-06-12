/* eslint-disable @next/next/no-img-element */
import Image from "next/image";
import React, { type FC } from "react";
import ImageUploading, {
  type ImageListType,
  type ImageType,
} from "react-images-uploading";
import { Button } from "../ui/button";
import { useFormContext } from "react-hook-form";
import type { PassportFormSchema } from "~/types/passport";
import { toast } from "sonner";

interface AvatarUploadProps {
  onAvatarChange: (avatar: ImageType | null) => void;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export const AvatarUpload: FC<AvatarUploadProps> = ({ onAvatarChange }) => {
  const { setValue, watch } = useFormContext<PassportFormSchema>();
  const avatarImage = watch("avatar");

  const onChange = (imageList: ImageListType) => {
    if (imageList?.[0]) {
      if (imageList[0].file && imageList[0].file.size > MAX_FILE_SIZE) {
        toast.error("Image size should not exceed 2MB");
        return;
      }
      setValue("avatar", imageList[0].dataURL);
      setValue("avatarFile", imageList[0].file);
      onAvatarChange(imageList[0]);
    } else {
      setValue("avatar", "");
      setValue("avatarFile", undefined);
      onAvatarChange(null);
    }
  };

  return (
    <div>
      <ImageUploading
        multiple={false}
        value={avatarImage ? [{ dataURL: avatarImage }] : []}
        onChange={onChange}
        maxNumber={1}
        acceptType={["jpg", "jpeg", "png", "gif", "webp"]}
      >
        {({
          onImageUpload,
          onImageRemoveAll,
          dragProps,
          onImageUpdate,
        }) => (
          <div className="flex items-center justify-between font-inter">
            <div className="relative flex items-center gap-4 sm:gap-6">
              {!avatarImage && (
                <Image
                  src={"/images/avatar-upload.png"}
                  alt="avatar-upload"
                  width={80}
                  height={80}
                  className="max-sm:h-[66px] max-sm:w-[66px]"
                  {...dragProps}
                />
              )}
              {avatarImage && (
                <div className="relative h-[66px] w-[66px] sm:h-[80px] sm:w-[80px]">
                  <img
                    src={avatarImage}
                    alt="avatar"
                    className="h-full w-full rounded-xl object-cover"
                  />
                  <div
                    onClick={() => onImageUpdate(0)}
                    className="absolute top-0 flex h-full w-full cursor-pointer items-center justify-center rounded-xl bg-[#02101C]/[.50] opacity-0 hover:opacity-100"
                  >
                    <Image
                      src={"/images/arrow-rotate.png"}
                      alt="arrow-rotate"
                      width={32}
                      height={32}
                    />
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-[7px]">
                <h2 className="text-[16px] text-white sm:text-[20px]">
                  Profile Picture
                </h2>
                <button
                  type="button"
                  onClick={onImageUpload}
                  {...dragProps}
                  className="flex text-[14px] text-[#ABBDCC]"
                >
                  <p>Drag and drop, or</p>
                  &nbsp;
                  <p className="underline">upload image</p>
                </button>
              </div>
            </div>
            {avatarImage && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  onImageRemoveAll();
                  setValue("avatar", "");
                  setValue("avatarFile", undefined);
                }}
              >
                <Image
                  src={"/images/trash.png"}
                  alt="trash"
                  width={16}
                  height={16}
                />
              </Button>
            )}
          </div>
        )}
      </ImageUploading>
    </div>
  );
};
