"use client";
import { useEffect, useState } from "react";
import { getWallets } from "@mysten/wallet-standard";

export function useDetectSuiWallet() {
  const [hasAnySuiWallet, setHasAnySuiWallet] = useState(false);
  const [isSlushLikely, setIsSlushLikely] = useState(false);
  const [walletNames, setWalletNames] = useState<string[]>([]);

  useEffect(() => {
    try {
      const { get, on } = getWallets();

      const update = () => {
        const names = get().map((w) => w.name ?? "");
        setWalletNames(names);
        setHasAnySuiWallet(names.length > 0);
        // 允许“Slush”或“Sui Wallet”命名（历史/变体）
        setIsSlushLikely(names.some((n) => /slush|sui\s*wallet/i.test(n)));
      };

      update();
      const offReg = on("register", update);
      const offUnreg = on("unregister", update);
      return () => {
        offReg();
        offUnreg();
      };
    } catch {
      // 不支持环境则维持默认 false
    }
  }, []);

  return { hasAnySuiWallet, isSlushLikely, walletNames };
}
