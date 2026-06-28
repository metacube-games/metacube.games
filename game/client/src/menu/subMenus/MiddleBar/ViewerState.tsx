import * as React from "react";
import { Virtuoso } from "react-virtuoso";
import { Camera, ChevronDown, Eye, RefreshCw, RotateCw } from "lucide-react";
import { createToastPopup } from "../../notifications/createToastPopup";
import { colorRed } from "../../styles/colors";
import { CIMainViewer } from "../../../players/model/viewerMode";
import { CIOpponents } from "../../../players/model/computeOpponentsData";
import emitter from "../../../helpers/EventEmitter";
import { useGStore } from "../../useGeneralStore";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { cn } from "../../../lib/utils";

interface TViewerStateProps {
  rightButtonClicked: React.MouseEventHandler<HTMLButtonElement> | undefined;
}

export const ViewerState = ({ rightButtonClicked }: TViewerStateProps) => {
  const { t } = useTranslation();
  const RTR = useGStore((state) => state.readyToRender3);
  const [open, setOpen] = React.useState(false);

  const enterViewer = React.useCallback(() => {
    setOpen(false);
    rightButtonClicked?.({} as React.MouseEvent<HTMLButtonElement, MouseEvent>);
  }, [rightButtonClicked]);

  return (
    <>
      <Button
        variant="outline"
        onClick={rightButtonClicked}
        disabled={!RTR}
        className="min-w-0 flex-1 basis-0 rounded-r-none border-r-0 capitalize"
      >
        <Eye /> {t("viewer.title")}
      </Button>
      {/* `-ml-2` cancels parent gap so the chevron sits flush as a split-button end-cap. */}
      <div className="-ml-2 flex items-stretch">
        <Button
          variant="outline"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          disabled={!RTR}
          className="w-auto min-w-0 rounded-l-none px-2"
        >
          <ChevronDown />
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("viewer.title")}</DialogTitle>
          </DialogHeader>
          <ViewerPicker enterViewer={enterViewer} />
        </DialogContent>
      </Dialog>
    </>
  );
};

type Player = {
  id: string;
  username: string;
};

const PLAYER_LIST_HEIGHT = 360;

type PlayerListContext = {
  onPlayerClick: (player: Player) => void;
};

const PlayerRow = (
  _index: number,
  currplayer: Player,
  context: PlayerListContext,
) => (
  <button
    type="button"
    onClick={() => context.onPlayerClick(currplayer)}
    className={cn(
      "flex h-[46px] w-full items-center px-4 text-left text-foreground",
      "transition-colors hover:bg-accent hover:text-accent-foreground",
    )}
  >
    <span className="text-sm">{currplayer?.username}</span>
  </button>
);

const ViewerPicker = ({ enterViewer }: { enterViewer: () => void }) => {
  const { t } = useTranslation();
  const [state, setState] = React.useState(0);
  const [, startTransition] = React.useTransition();
  const [searchTerm, setSearchTerm] = React.useState("");

  const onFreeCamera = () => {
    CIMainViewer.setFreeCamera();
    emitter.emit("playerSelect", false);
    enterViewer();
  };

  const onRotatingCamera = () => {
    CIMainViewer.setRotatingCamera();
    emitter.emit("playerSelect", false);
    enterViewer();
  };

  const onRefresh = React.useCallback(() => {
    startTransition(() => {
      setState((prevState) => prevState + 1);
    });
  }, []);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    startTransition(() => {
      setSearchTerm(event.target.value);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={onFreeCamera}
          className="min-w-0 flex-1 basis-0 capitalize"
        >
          <Camera /> {t("viewer.free")}
        </Button>
        <Button
          variant="outline"
          onClick={onRotatingCamera}
          className="min-w-0 flex-1 basis-0 capitalize"
        >
          <RotateCw /> {t("viewer.auto")}
        </Button>
      </div>

      <div className="flex gap-2">
        <Input
          type="text"
          value={searchTerm}
          onChange={handleSearch}
          placeholder={t("viewer.searchPlayer")}
          className="flex-1"
        />
        <Button variant="outline" onClick={onRefresh} className="px-3">
          <RefreshCw />
        </Button>
      </div>

      <PlayerList
        state={state}
        searchTerm={searchTerm}
        onRefresh={onRefresh}
        enterViewer={enterViewer}
      />
    </div>
  );
};

function PlayerList({
  state,
  searchTerm,
  onRefresh,
  enterViewer,
}: {
  state: number;
  searchTerm: string;
  onRefresh: () => void;
  enterViewer: () => void;
}) {
  const { t } = useTranslation();

  // `state` is a refresh counter — re-snapshots the non-reactive `CIOpponents.players` singleton.
  const players = React.useMemo(() => {
    return Object.entries(CIOpponents.players)
      .map(([id, player]) => Object.assign({}, player, { id }))
      .sort((a: Player, b: Player) => a?.username?.localeCompare(b?.username));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const filteredPlayers = players.filter((player) =>
    player?.username?.toLowerCase()?.includes(searchTerm.toLowerCase()),
  );

  const onPlayerClick = (player: Player) => {
    if (!player || !player.id || !CIOpponents.players[player.id]) {
      createToastPopup(colorRed, t("viewer.playerNotFound"));
      onRefresh();
      return;
    }
    CIMainViewer.setFollowingPlayerCamera(Number(player.id));
    emitter.emit(
      "playerSelect",
      CIOpponents.players[player.id]?.username ?? "",
    );
    enterViewer();
  };

  return (
    <div
      className="overflow-hidden rounded-md border bg-muted/40"
      style={{ height: PLAYER_LIST_HEIGHT }}
    >
      {filteredPlayers.length === 0 ? (
        <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
          {t("viewer.noPlayers")}
        </div>
      ) : (
        <Virtuoso
          key={state}
          style={{ height: PLAYER_LIST_HEIGHT }}
          data={filteredPlayers}
          overscan={138}
          context={{ onPlayerClick }}
          itemContent={PlayerRow}
        />
      )}
    </div>
  );
}
