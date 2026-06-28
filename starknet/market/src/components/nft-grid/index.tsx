import { NFTClientGrid } from "./NFTClientGrid";
import type {
  FetchConfig,
  StarknetConfig,
  ButtonAction,
  DisplayMode,
} from "@/interface";

export default function NftGallery({
  fetchConfig,
  starknetConfig,
  buttonAction = "Claim",
  displayMode = "owned",
}: {
  fetchConfig?: FetchConfig;
  starknetConfig?: StarknetConfig;
  buttonAction?: ButtonAction;
  displayMode?: DisplayMode;
}) {
  return (
    <NFTClientGrid
      fetchConfig={fetchConfig}
      starknetConfig={starknetConfig}
      buttonAction={buttonAction}
      displayMode={displayMode}
    />
  );
}
