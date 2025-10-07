// hooks/useDetectSuiWallet.ts
"use client";
import { useEffect, useState } from "react";
import { getWallets } from "@mysten/wallet-standard";

type Detection = {
  hasAnySuiWallet: boolean;
  isSlushLikely: boolean; // 尝试根据钱包名字/特征判断是否 Slush
  wallets: { name: string; version?: string }[];
};

export function useDetectSuiWallet(): Detection {
  const [state, setState] = useState<Detection>({
    hasAnySuiWallet: false,
    isSlushLikely: false,
    wallets: [],
  });

  useEffect(() => {
    try {
      const { get, on } = getWallets();

      const update = () => {
        const wallets = get().map((w) => ({
          name: w.name,
          version: (w as any).version,
        }));

        // Slush 可能以 “Slush”、“Sui Wallet” 等名称出现（历史更名）
        const isSlushLikely = wallets.some((w) =>
          /slush|sui\s*wallet/i.test(w.name)
        );

        setState({
          hasAnySuiWallet: wallets.length > 0,
          isSlushLikely,
          wallets,
        });
      };

      update();
      const offRegister = on("register", update);
      const offUnregister = on("unregister", update);
      return () => {
        offRegister();
        offUnregister();
      };
    } catch {
      // getWallets 在不支持环境可能抛错，忽略即可
    }
  }, []);

  return state;
}
