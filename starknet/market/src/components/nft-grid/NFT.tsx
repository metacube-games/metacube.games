import { Fragment, memo } from "react";
import type { NFT, ButtonAction, NFTData } from "@/interface";
import { Confirmation } from "./confirmationPopover/PopDialogButton";
import { NFTMediaSwitch } from "./confirmationPopover/ConfirmationComponents";
import { usePathname } from "next/navigation";
import { formatPrice } from "@/utils/format";
import { WEI_PER_STRK } from "@/utils/blockchain";
import { StrkIcon } from "@/components/StrkIcon";
import { isRoute } from "@/lib/i18n-utils";
import { ROYALTY_PERCENTAGE } from "@/data/contracts";

interface NFTCardGridProps {
  NBNft: NFT[];
  buttonAction?: ButtonAction;
  getNftData: (nft: NFT) => NFTData | undefined;
}

const EAGER_LOAD_FIRST_N = 10;

export const NFTCardGrid = memo(
  ({ NBNft, buttonAction = "Claim", getNftData }: NFTCardGridProps) => {
    if (!getNftData) return null;
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10">
        {NBNft.map((nft: NFT, index: number) => {
          const nftData = getNftData(nft);
          if (!nftData) return <Fragment key={index} />;
          return (
            <NFTCard
              key={index}
              buttonAction={buttonAction}
              nftData={nftData}
              priority={index < EAGER_LOAD_FIRST_N}
            />
          );
        })}
      </div>
    );
  },
);

NFTCardGrid.displayName = "NFTCardGrid";

interface NFTCardProps {
  buttonAction: ButtonAction;
  nftData: NFTData;
  /** Eager-load the image (above-the-fold LCP candidates). */
  priority?: boolean;
}

export const NFTCard = memo(
  ({ buttonAction, nftData, priority }: NFTCardProps): React.JSX.Element => {
    const pathname = usePathname();
    const isMarketPage = isRoute(pathname, "/market");
    const isInventoryPage = isRoute(pathname, "/inventory");

    const price = nftData.price || 0;
    const feeAmount = price * (ROYALTY_PERCENTAGE / 100);
    const totalPrice = price + feeAmount;

    const cleanCollection = nftData?.collection
      ?.replace(/^Metacube:\s*/i, "")
      .trim();
    const tokenLabel =
      nftData?.tokenId !== undefined ? `#${nftData.tokenId}` : "";
    const displayName =
      [cleanCollection, tokenLabel].filter(Boolean).join(" ") || "NFT";

    return (
      <div
        className="w-full h-full border-2 bg-card rounded-lg flex flex-col overflow-hidden m-auto max-w-[300px] group"
      >
        {((isMarketPage && nftData.price) ||
          (isInventoryPage && nftData.isListed)) && (
          <div className="border-b-2 px-2 py-1 flex items-center justify-center gap-1">
            <StrkIcon width={14} height={14} />
            <span className="text-sm font-semibold">
              {isMarketPage
                ? formatPrice(totalPrice)
                : formatPrice(Number(nftData.listingPrice) / WEI_PER_STRK)}
            </span>
          </div>
        )}

        <div className="relative w-full aspect-[2/3]">
          <div className="absolute inset-0">
            <NFTMediaSwitch
              nftData={nftData}
              isPopup={false}
              priority={priority}
            />
          </div>

          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out bg-black/30 backdrop-blur-sm">
            <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 ease-out">
              <Confirmation mode={buttonAction} nftData={nftData} />
            </div>
          </div>
        </div>

        <div className="border-t-2 px-2 py-1 flex items-center justify-center">
          <p className="text-sm font-semibold w-full text-center truncate">
            {displayName}
          </p>
        </div>
      </div>
    );
  },
);

NFTCard.displayName = "NFTCard";
