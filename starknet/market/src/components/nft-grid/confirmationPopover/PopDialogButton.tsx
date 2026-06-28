"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import type { Mode, NFTData } from "@/interface";
import { NFTDisplay } from "./ConfirmationComponents";
import {
  ClaimConfirmation,
  BuyConfirmation,
  SellConfirmation,
  DetailsConfirmation,
  MarketplaceBuyConfirmation,
} from "@/components/nft-grid/TypedConfirmations";
import { DialogWrapper } from "./DialogWrapper";
import { Eye, ShoppingCart, Sparkles, Tag } from "lucide-react";

const MODE_ICON = {
  Claim: Sparkles,
  Buy: ShoppingCart,
  Sell: Tag,
  Details: Eye,
  DetailsSell: Eye,
} as const;

interface ConfirmationProps {
  mode: Mode | "DetailsSell";
  nftData?: NFTData;
}

const DEFAULT_NFT_DATA: NFTData = {
  description: "No description available",
  descriptionCollection: "No description available",
  collection: "Unknown Collection",
  rarity: "Common",
  price: 0,
  claimConditions: [],
  contractAddress: "0x0",
  imageUrl: undefined,
  type: "Genesis",
  videoUrl: "",
  glbUrl: "",
};

export function Confirmation({
  mode,
  nftData = DEFAULT_NFT_DATA,
}: ConfirmationProps) {
  const t = useTranslations("nft.actions");
  const [open, setOpen] = useState(false);

  const safeNftData = {
    ...DEFAULT_NFT_DATA,
    ...nftData,
  };

  const handleTransactionSuccess = useCallback(() => {
    setOpen(false);
  }, []);

  const renderConfirmationContent = () => {
    switch (mode) {
      case "Claim":
        return (
          <ClaimConfirmation
            nftData={safeNftData}
            onSuccess={handleTransactionSuccess}
          />
        );
      case "Buy":
        if (safeNftData.isListed) {
          return (
            <MarketplaceBuyConfirmation
              nftData={safeNftData}
              onSuccess={handleTransactionSuccess}
            />
          );
        } else {
          return (
            <BuyConfirmation
              nftData={safeNftData}
              nftAddress={safeNftData.contractAddress}
              onSuccess={handleTransactionSuccess}
            />
          );
        }
      case "Sell":
        return <SellConfirmation nftData={safeNftData} />;
      case "DetailsSell":
        return <DetailsConfirmation nftData={safeNftData} mode="DetailsSell" />;
      case "Details":
      default:
        return <DetailsConfirmation nftData={safeNftData} mode="Details" />;
    }
  };

  const getButtonText = () => {
    switch (mode) {
      case "DetailsSell":
        return t("detailsSell");
      case "Details":
        return t("details");
      default:
        return mode;
    }
  };

  const Icon = MODE_ICON[mode];
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Icon />
          {getButtonText()}
        </Button>
      </DialogTrigger>
      <DialogWrapper>
        <NFTDisplay nftData={safeNftData} />
        <div className="max-w-[290px] sm:max-w-[425px] h-min md:w-full lg:flex-1 flex flex-col lg:h-full bg-background overflow-y-auto">
          {renderConfirmationContent()}
        </div>
      </DialogWrapper>
    </Dialog>
  );
}
