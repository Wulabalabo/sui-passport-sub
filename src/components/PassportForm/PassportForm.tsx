"use client";

import { TextInput } from "../TextInput/TextInput";
import Image from "next/image";
import { Button } from "../ui/button";
import { DialogClose } from "../ui/dialog";
import { type FC } from "react";
import { AvatarUpload } from "../AvatarUpload/AvatarUpload";
import { type PassportFormSchema, passportFormSchema } from "~/types/passport";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FormProvider } from "react-hook-form";
import type { ImageType } from "react-images-uploading";

interface PassportFormProps {
  onSubmit: (data: PassportFormSchema) => Promise<void>;
  setAvatar: (avatar: ImageType | null) => void;
  setName: (name: string) => void;
  setIntro: (intro: string) => void;
  isLoading: boolean;
  defaultValues?: Partial<PassportFormSchema>;
}

export const PassportForm: FC<PassportFormProps> = ({ 
  onSubmit,
  defaultValues,
  setAvatar,
  setName,
  setIntro,
  isLoading
}) => {
  const methods = useForm<PassportFormSchema>({
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    resolver: zodResolver(passportFormSchema),
    defaultValues: {
      name: "",
      avatar: "",
      avatarFile: undefined,
      introduction: "",
      ...defaultValues
    },
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)}
        className="pt-8 sm:pt-0 flex h-full w-full items-center justify-center sm:justify-start bg-black/30 backdrop-blur-3xl"
      >
        <div className="mx-4 flex flex-col sm:ml-[100px] sm:h-[600px]">
          <h1 className="font-everett text-[24px] leading-[24px] text-white sm:text-[32px] sm:leading-[38px]">
            Let&apos;s get you a passport
          </h1>
          <div className="mt-8 sm:mt-12">
            <AvatarUpload onAvatarChange={(avatar) => setAvatar(avatar)} />
          </div>
          <div className="mt-4 flex w-[358px] flex-col gap-4 sm:w-[520px]">
            <TextInput
              labelText="Label"
              placeholder="John Smith"
              className="h-[66px] sm:h-[79px]"
              {...methods.register("name")}
              onChange={(e) => setName(e.target.value)}
            />
            <TextInput
              labelText="Introduction"
              placeholder="23 y.o. designer from San Francisco"
              className="h-[66px] sm:h-[79px]"
              {...methods.register("introduction")}
              onChange={(e) => setIntro(e.target.value)}
            />

            
              <div className="mt-1 flex items-center justify-between rounded-xl border border-[#334155] bg-gradient-to-r from-[#213244] from-10% via-[#13273d] to-[#17293c] p-4">
              <div className="flex items-center gap-4">
                <Image
                  src={"/images/x.png"}
                  alt="x-logo"
                  width={20}
                  height={20}
                  className="h-[20px] w-[20px]"
                />
                <p className="font-inter text-[14px] text-[#ABBDCC]">
                  Follow us on X
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-[40px] w-[100px] rounded-xl border-[#4F46E5] bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white hover:from-[#6366F1] hover:to-[#8B5CF6] shadow-lg transition-all duration-200"
                onClick={() => window.open("https://x.com/SuiFamOfficial", "_blank")}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  className="mr-1 fill-current"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Follow
              </Button>
            </div>
            
            {/* <div className="flex items-center justify-between">
              <div className="flex items-center justify-between">
                <Image
                  src={"/images/x.png"}
                  alt="x-logo"
                  width={20}
                  height={20}
                  className="h-[20px] w-[20px]"
                />
                <p className="ml-4 text-nowrap font-inter text-[14px] text-white">
                  X Profile
                </p>
              </div>
              <TextInput
                placeholder="@jack_on_twitter"
                className="h-[43px] w-[242px] text-white sm:h-[56px] sm:w-[384px]"
                {...methods.register("x")}
              />
            </div> */}
            {/* <div className="flex items-center justify-between">
              <div className="flex items-center justify-between">
                <Image
                  src={"/images/github.png"}
                  alt="github-logo"
                  width={20}
                  height={20}
                />
                <p className="ml-4 font-inter text-white">Github</p>
              </div>
              <TextInput
                placeholder="jack_on_github"
                className="h-[43px] w-[242px] sm:h-[56px] sm:w-[384px]"
                {...methods.register("github")}
              />
            </div> */}
          </div> 
          <div className="mb-[25px] mt-[48px] flex justify-end gap-4">
            <DialogClose asChild>
              <Button
                type="button"
                variant="secondary"
                className="h-[42px] w-[97px] sm:h-[52px] sm:w-[110px]"
              >
                <Image
                  src={"/images/arrow-undo.png"}
                  alt="arrow"
                  width={16}
                  height={16}
                  className="h-[12px] w-[12px]"
                />
                Back
              </Button>
            </DialogClose>
            <Button
              type="submit"
              className="h-[42px] w-[202px] sm:h-[52px] sm:w-[212px]"
              disabled={isLoading}
            >
              <Image
                src={"/images/passport.png"}
                alt="passport"
                width={16}
                height={16}
              />
              {isLoading ? "Submitting..." : "Get Your Passport"}
            </Button>
          </div>
        </div>
      </form>
    </FormProvider>
  );
};
