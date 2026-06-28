import * as React from "react";
import { Virtuoso } from "react-virtuoso";
import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";

import { Card } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Separator } from "../../../components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../../components/ui/tooltip";
import { cn } from "../../../lib/utils";

import { getAllStatistics } from "../../../API/backendAPI";
import { useGStore } from "../../useGeneralStore";

interface IUserStats {
  cubes: number;
  username: string;
  deaths: number;
  totalCoins: number;
  id?: string;
  rank?: number;
  referrals?: number;
}

const calculateRankScore = (player: IUserStats): number =>
  (player.cubes ?? 0) * 100 +
  (player.totalCoins ?? 0) -
  (player.deaths ?? 0) * 2000 +
  (player.referrals ?? 0) * 50000;

const sortAndRankPlayers = (players: IUserStats[]): IUserStats[] =>
  [...players]
    .sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0))
    .map((player, index) => {
      const ranked: IUserStats = {
        cubes: player.cubes,
        username: player.username,
        deaths: player.deaths,
        totalCoins: player.totalCoins,
        id: player.id,
        rank: index + 1,
        referrals: player.referrals,
      };
      return ranked;
    });

const COLUMNS = [
  { key: "rank", labelKey: "leaderboard.rank", flex: 1 },
  { key: "username", labelKey: "leaderboard.username", flex: 2.5 },
  { key: "id", labelKey: "leaderboard.id", flex: 1.2 },
  { key: "cubes", labelKey: "leaderboard.cubes", flex: 1.2 },
  { key: "coins", labelKey: "leaderboard.coins", flex: 1.5 },
  { key: "deaths", labelKey: "leaderboard.deaths", flex: 1 },
  { key: "referrals", labelKey: "leaderboard.referrals", flex: 1.2 },
] as const;

// Index 0 reserved for the "self pin" row; 1-3 are gold/silver/bronze.
const PODIUM_CLASSES = [
  null,
  "bg-yellow-400/40",
  "bg-zinc-300/30",
  "bg-amber-600/40",
] as const;

const TABLE_MIN_WIDTH_PX = 680;

const LIST_HEIGHT_MAX_PX = 650;
const LIST_HEIGHT_VIEWPORT_RATIO = 0.79;
const LIST_HEIGHT_CHROME_PX = 220;
const computeListHeight = () =>
  Math.min(
    LIST_HEIGHT_MAX_PX,
    window.innerHeight * LIST_HEIGHT_VIEWPORT_RATIO,
  ) - LIST_HEIGHT_CHROME_PX;

const VALID_ADDRESS_MIN_LENGTH = 5;

export const StatsPanel = React.memo(function StatsPanel() {
  const { t } = useTranslation();
  const [, startTransition] = React.useTransition();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [listHeight, setListHeight] = React.useState(computeListHeight);

  React.useEffect(() => {
    const onResize = () => setListHeight(computeListHeight());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    startTransition(() => setSearchTerm(event.target.value));
  };

  return (
    <div className="flex flex-col gap-3">
      <Input
        type="text"
        value={searchTerm}
        onChange={handleSearch}
        placeholder={t("leaderboard.searchPlayer")}
        className="w-full sm:w-72"
      />
      <LeaderboardList searchTerm={searchTerm} listHeight={listHeight} />
    </div>
  );
});

function LeaderboardList({
  searchTerm,
  listHeight,
}: {
  searchTerm: string;
  listHeight: number;
}) {
  const address = useGStore((state) => state.address);
  const username = useGStore((state) => state.username);

  const [playerStats, setPlayerStats] = React.useState<IUserStats[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const players = await getAllStatistics();
      if (cancelled) return;
      const ranked = Object.entries(players.statistics).reduce<IUserStats[]>(
        (acc, [id, p]) => {
          const player = Object.assign(p as IUserStats, { id });
          if (player.username && player.username.length > 0) acc.push(player);
          return acc;
        },
        [],
      );
      ranked.forEach((p) => {
        p.rank = calculateRankScore(p);
      });
      setPlayerStats(sortAndRankPlayers(ranked));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isLoggedIn = address.length > VALID_ADDRESS_MIN_LENGTH;
  const hideSelfPlayer = !isLoggedIn || searchTerm.length > 0;

  const filtered = React.useMemo(() => {
    const lower = searchTerm.toLowerCase();
    const matches = (p: IUserStats) =>
      p.id?.toLowerCase().includes(lower) ||
      p.username?.toLowerCase().includes(lower);

    if (hideSelfPlayer) {
      return playerStats.filter(matches);
    }
    const selfIndex = playerStats.findIndex((p) => p.username === username);
    if (selfIndex < 0) return playerStats.filter(matches);
    const selfPin = { ...playerStats[selfIndex], rank: selfIndex + 1 };
    return [selfPin, ...playerStats].filter(matches);
  }, [playerStats, hideSelfPlayer, searchTerm, username]);

  const renderRow = React.useCallback(
    (index: number, player: IUserStats) => (
      <LeaderboardRow
        player={player}
        index={index}
        hideSelfPlayer={hideSelfPlayer}
      />
    ),
    [hideSelfPlayer],
  );

  return (
    <Card className="overflow-x-auto p-3">
      <div className="flex flex-col" style={{ minWidth: TABLE_MIN_WIDTH_PX }}>
        <LeaderboardHeader />
        <Separator className="my-1 bg-border/60" />
        <Virtuoso
          style={{ height: listHeight }}
          data={filtered}
          overscan={105}
          itemContent={renderRow}
        />
      </div>
    </Card>
  );
}

function LeaderboardHeader() {
  const { t } = useTranslation();
  return (
    <div className="flex w-full items-center">
      {COLUMNS.map((col) => (
        <div
          key={col.key}
          style={{ flex: col.flex }}
          className="flex min-w-0 items-center gap-1 px-1 py-1 text-xs font-medium text-muted-foreground"
        >
          <span className="truncate">
            {"raw" in col && col.raw ? col.labelKey : t(col.labelKey)}
          </span>
          {col.key === "rank" && (
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info
                    className="size-3 shrink-0 cursor-help"
                    aria-label={t("leaderboard.rankScoreFormula")}
                  />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>{t("leaderboard.rankScoreFormula")}</p>
                  <p className="mt-1 text-[10px] italic text-muted-foreground">
                    {t("leaderboard.rankScoreNote")}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      ))}
    </div>
  );
}

function LeaderboardRow({
  player,
  index,
  hideSelfPlayer,
}: {
  player: IUserStats;
  index: number;
  hideSelfPlayer: boolean;
}) {
  const pID = player?.id
    ? `${player.id.substring(0, 3)}...${player.id.slice(-3)}`
    : "";
  const colorIndex = index + (hideSelfPlayer ? 1 : 0);
  const podiumClass = PODIUM_CLASSES[colorIndex] ?? null;
  const firstSelf = index === 0 && !hideSelfPlayer;

  const cellValues: Record<string, React.ReactNode> = {
    rank: player?.rank,
    username: player?.username,
    id: pID,
    cubes: player?.cubes,
    coins: player?.totalCoins,
    deaths: player?.deaths,
    referrals: player?.referrals,
  };

  return (
    <div
      className={cn(
        "relative flex h-[35px] w-full items-center",
        podiumClass,
        firstSelf && "rounded-sm shadow-[inset_0_0_16px_0_rgba(0,0,0,0.5)]",
      )}
    >
      {COLUMNS.map((col) => (
        <div
          key={col.key}
          style={{ flex: col.flex }}
          className="min-w-0 px-1 py-1 text-xs"
        >
          <span className="block truncate">{cellValues[col.key]}</span>
        </div>
      ))}
      {!firstSelf && (
        <span className="absolute bottom-0 left-0 h-px w-full bg-border/40" />
      )}
    </div>
  );
}
