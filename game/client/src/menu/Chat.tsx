import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { MessageCircle, Send, X } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { cn } from "../lib/utils";

import { useCounter } from "./subMenus/MiddleBar/hooks/useCounter";
import { containsProfanity } from "./subMenus/MiddleBar/containsProfanity";
import { SAG, SGG, useGStore } from "./useGeneralStore";
import { getIsDesktop } from "../helpers/getIsDesktop";
import { getPublicKey } from "../API/starknet";

const WEBSOCKET_CHAT_URL = import.meta.env.VITE_REACT_APP_WEBSOCKET_CHAT_URL;

const MAX_MESSAGES_PER_CHANNEL = 500;
const SEND_COOLDOWN_SECONDS = 5;
// Delay bot welcome so it lands after the server history backlog.
const BOT_WELCOME_DELAY_MS = 300;
const WS_RECONNECT_DELAY_MS = 100;
const AUTO_SCROLL_THRESHOLD_PX = 50;
const POST_RENDER_TICK_MS = 0;
const SCROLL_DEFER_MS = 40;
const FORBIDDEN_INPUT_CHARS = /[[\]{}^`~´]/g;
const BOT_MESSAGE_KEYS = ["welcome", "closeHint", "respectWarning"] as const;

const CHANNELS = ["english", "spanish", "french"] as const;
type ChannelLang = (typeof CHANNELS)[number];

const CHANNEL_TO_I18N_LANG: Record<ChannelLang, string> = {
  english: "en",
  spanish: "es",
  french: "fr",
};

const ADMIN_BROADCAST_COLOR = "rgb(200, 150, 10)";
const ADMIN_HIGHLIGHT_COLOR = "rgb(20, 200, 150)";
const BANNED_HIGHLIGHT_COLOR = "rgb(255, 80, 80)";

type ChatMessage = {
  from: string;
  msg: string | React.ReactNode;
  ts: number;
  banned: boolean;
  admin: boolean;
  color?: string;
  lang: ChannelLang;
};

type LanguageMessages = Record<ChannelLang, ChatMessage[]>;

const emptyMessages = (): LanguageMessages => ({
  english: [],
  spanish: [],
  french: [],
});

const appendMessages = (
  existing: ChatMessage[],
  next: ChatMessage[],
): ChatMessage[] => {
  const combined = [...existing, ...next];
  return combined.length > MAX_MESSAGES_PER_CHANNEL
    ? combined.slice(-MAX_MESSAGES_PER_CHANNEL)
    : combined;
};

const buildBotMessages = (t: TFunction): LanguageMessages => {
  const out = emptyMessages();
  for (const channel of CHANNELS) {
    out[channel] = BOT_MESSAGE_KEYS.map((key) => ({
      from: "bot",
      msg: t(`chat.bot.${key}`, { lng: CHANNEL_TO_I18N_LANG[channel] }),
      ts: Date.now(),
      banned: false,
      admin: true,
      lang: channel,
    }));
  }
  return out;
};

const translateBannedMessage = (t: TFunction, lang: ChannelLang) =>
  t("chat.bannedUser", { lng: CHANNEL_TO_I18N_LANG[lang] });

// Module-scope so the websocket survives React remounts.
let webSocket: WebSocket | null = null;
let scrollTarget: HTMLElement | null = null;
let firstHistoryReceived = false;

export const setNewUsernameToWS = () => {
  if (webSocket?.readyState !== WebSocket.OPEN) return;
  webSocket.send(JSON.stringify({ lang: "settings", msg: "/username" }));
};

export const Chatroom = React.memo(function Chatroom() {
  const { t } = useTranslation();
  const isDesktop = getIsDesktop();
  const publicKey = getPublicKey();

  const [currentMessage, setCurrentMessage] = useState("");
  const [messages, setMessages] = useState<LanguageMessages>(emptyMessages);
  const [isChatDisplayed, setChatDisplayed] = useState(false);
  const [count, setCount] = useState(0);
  const [helperText, setHelperText] = useState("");
  const [currentChannel, setCurrentChannel] = useState<ChannelLang>("english");
  const refChat = useRef<HTMLInputElement>(null!);
  const virtuosoRef = useRef<VirtuosoHandle>(null!);

  const {
    menuDisplay,
    chatFocus,
    definedUsername,
    isConnected,
    chatToken,
    RTR,
  } = useGStore(
    useShallow((state) => ({
      menuDisplay: state.menuDisplay,
      chatFocus: state.chatFocus,
      definedUsername: state.definedUsername,
      isConnected: state.isConnected,
      chatToken: state.chatToken,
      RTR: state.readyToRender3,
    })),
  );

  const sendMessage = (countNow: number) => {
    if (!currentMessage.trim() || countNow > 0) return;
    if (containsProfanity(currentMessage)) {
      setHelperText(t("chat.profanityNotAllowed"));
      setCurrentMessage("");
      return;
    }
    setCount(SEND_COOLDOWN_SECONDS);
    webSocket?.send(
      JSON.stringify({ lang: currentChannel, msg: currentMessage }),
    );
    setHelperText("");
    setCurrentMessage("");
  };

  const processMessage = (data: {
    type: string;
    lang: ChannelLang | "admin";
    messages: ChatMessage[];
  }) => {
    const { type, lang, messages: incoming } = data;

    if (lang === "admin") {
      if (!incoming?.length) return;
      const adminMessage: ChatMessage = {
        ...incoming[0],
        color: ADMIN_BROADCAST_COLOR,
      };
      setMessages((prev) => ({
        english: appendMessages(prev.english, [adminMessage]),
        spanish: appendMessages(prev.spanish, [adminMessage]),
        french: appendMessages(prev.french, [adminMessage]),
      }));
      return;
    }

    if (type === "message") {
      if (!incoming?.length) return;
      const m = incoming[0];
      const message: ChatMessage = {
        ...m,
        msg: m.banned ? translateBannedMessage(t, lang) : m.msg,
        ...(m.admin ? { color: ADMIN_HIGHLIGHT_COLOR } : {}),
      };
      setMessages((prev) => ({
        ...prev,
        [lang]: appendMessages(prev[lang], [message]),
      }));
      return;
    }

    if (type === "history") {
      const rebuilt: ChatMessage[] = incoming.map((m) => {
        const rebuiltMessage: ChatMessage = {
          from: m.from,
          msg: m.banned ? translateBannedMessage(t, lang) : m.msg,
          ts: m.ts,
          banned: m.banned,
          admin: m.admin,
          color: m.color,
          lang: m.lang,
        };
        if (m.admin) {
          rebuiltMessage.color = ADMIN_HIGHLIGHT_COLOR;
        } else if (m.banned) {
          rebuiltMessage.color = BANNED_HIGHLIGHT_COLOR;
        }
        return rebuiltMessage;
      });
      setMessages((prev) => ({ ...prev, [lang]: rebuilt }));
    }
  };

  useEffect(() => {
    if (!isConnected || !(chatToken?.length > 0)) return;
    if (webSocket !== null) return;

    let reconnectTimeoutId: number | undefined;
    let botMessageTimeoutId: number | undefined;

    const params = new URLSearchParams({ publicKey, token: chatToken });

    const connect = () => {
      webSocket = new WebSocket(`${WEBSOCKET_CHAT_URL}?${params.toString()}`);

      webSocket.onmessage = (event) => {
        processMessage(JSON.parse(event.data));
        if (firstHistoryReceived) return;
        firstHistoryReceived = true;
        botMessageTimeoutId = window.setTimeout(() => {
          const bots = buildBotMessages(t);
          setMessages((prev) => ({
            english: appendMessages(prev.english, bots.english),
            spanish: appendMessages(prev.spanish, bots.spanish),
            french: appendMessages(prev.french, bots.french),
          }));
        }, BOT_WELCOME_DELAY_MS);
      };

      webSocket.onerror = () => {
        webSocket?.close();
        webSocket = null;
        // Single-shot retry; full reconnect loop lives in the engine layer.
        reconnectTimeoutId = window.setTimeout(() => {
          if (webSocket === null) connect();
        }, WS_RECONNECT_DELAY_MS);
      };
    };

    connect();

    return () => {
      if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId);
      if (botMessageTimeoutId) clearTimeout(botMessageTimeoutId);
      if (webSocket) {
        webSocket.onmessage = null;
        webSocket.onerror = null;
        webSocket.onclose = null;
        webSocket.close();
        webSocket = null;
      }
      // Reset so a fresh connection re-triggers the bot welcome backlog.
      firstHistoryReceived = false;
    };
    // Re-running on every dep change would tear down/reopen the websocket each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, chatToken]);

  useKeyHandle(currentMessage, sendMessage, count, refChat, setHelperText);
  useCounter(count, setCount);

  const messageHeight = useComputeHeight();

  const renderChatRow = useCallback(
    (_index: number, message: ChatMessage) => <ChatRow message={message} />,
    [],
  );

  const handleChannelChange = (next: string) => {
    const channel = next as ChannelLang;
    setCurrentChannel(channel);
    // Defer one tick so Virtuoso re-indexes its data prop before scrolling.
    setTimeout(() => {
      virtuosoRef.current?.scrollToIndex({
        index: messages[channel].length - 1,
        align: "end",
      });
    }, POST_RENDER_TICK_MS);
  };

  // Skip auto-scroll if user is scrolled back reading history.
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (!virtuosoRef.current) return;
      const scroll = scrollTarget?.scrollTop;
      const totalHeight = scrollTarget?.scrollHeight;
      const viewHeight = scrollTarget?.clientHeight;
      const isNearBottom =
        Number(scroll) + Number(viewHeight) + AUTO_SCROLL_THRESHOLD_PX >=
        Number(totalHeight);
      if (!isNearBottom && !isChatDisplayed) return;
      virtuosoRef.current.scrollToIndex({
        index: messages[currentChannel].length - 1,
        align: "end",
      });
      if (totalHeight) scrollTarget?.scrollTo(totalHeight, totalHeight);
    }, SCROLL_DEFER_MS);
    return () => clearTimeout(timeoutId);
  }, [messages, currentChannel, isChatDisplayed]);

  const chatEnabled = definedUsername && isConnected;

  const getPlaceholder = () => {
    if (!isConnected) return t("chat.loginToChat");
    if (!definedUsername) return t("chat.confirmUsername");
    if (!chatFocus) return t("chat.pressEnter");
    return helperText || t("chat.sendOrClose");
  };

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentMessage(e.target.value.replace(FORBIDDEN_INPUT_CHARS, ""));
  };

  if (!RTR) return null;
  if (!isDesktop && !menuDisplay) return null;

  const positionClass = menuDisplay ? "bottom-[72px]" : "bottom-3";

  if (isChatDisplayed) {
    return (
      <div
        className={cn(
          "fixed left-3 z-10 flex w-[min(300px,85%)] flex-col gap-3 rounded-md border bg-background/95 p-3 backdrop-blur-sm",
          positionClass,
          isDesktop &&
            "transition-opacity " + (chatFocus ? "opacity-100" : "opacity-90"),
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <Tabs value={currentChannel} onValueChange={handleChannelChange}>
            <TabsList className="h-7 p-0.5">
              {CHANNELS.map((channel) => (
                <TabsTrigger
                  key={channel}
                  value={channel}
                  className="h-6 px-2 text-[10px] uppercase"
                >
                  {t(`chat.channels.${channel}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
            onClick={() => setChatDisplayed(false)}
            aria-label={t("ui.close", "Close")}
          >
            <X />
          </Button>
        </div>

        <div className="rounded-md bg-muted/30 p-2">
          <Virtuoso
            ref={virtuosoRef}
            data={messages[currentChannel]}
            followOutput="smooth"
            scrollerRef={(ref) => {
              if (!ref) return;
              const onScroll = (event: Event) => {
                event.stopPropagation();
                event.preventDefault();
                scrollTarget = event.target as HTMLElement;
              };
              ref.addEventListener("scroll", onScroll);
              return () => ref.removeEventListener("scroll", onScroll);
            }}
            itemContent={renderChatRow}
            style={{ height: messageHeight, width: "100%" }}
          />
        </div>

        <div className="flex items-center gap-2">
          <Input
            ref={refChat}
            type="text"
            value={currentMessage}
            onChange={onInput}
            disabled={!chatEnabled}
            placeholder={getPlaceholder()}
            maxLength={120}
            className={cn(
              "h-9 flex-1 text-sm",
              helperText &&
                chatFocus &&
                "placeholder:text-red-500 focus-visible:ring-red-500",
            )}
            onFocus={() => SAG.setChatFocus(true)}
            onBlur={() => SAG.setChatFocus(false)}
          />
          <Button
            variant="outline"
            className="h-9 w-12 shrink-0 tabular-nums"
            onClick={() => sendMessage(count)}
            disabled={count > 0 || currentMessage.length === 0}
          >
            {count > 0 ? count : <Send />}
          </Button>
        </div>
      </div>
    );
  }

  if (menuDisplay) {
    return (
      <Button
        variant="outline"
        onClick={() => setChatDisplayed(true)}
        className={cn("fixed left-3 z-10", positionClass)}
      >
        <MessageCircle />
        {t("chat.chatButton")}
      </Button>
    );
  }

  return null;
});

function ChatRow({ message }: { message: ChatMessage }) {
  return (
    <div
      className="break-words py-px text-xs leading-snug"
      // Backend still ships raw-RGB highlights; inline until tokens move server-side.
      style={message.color ? { color: message.color } : undefined}
    >
      <span className="font-semibold">{message.from}:&nbsp;</span>
      <span className="font-light">{message.msg}</span>
    </div>
  );
}

const computeChatHeight = () => Math.min(window.innerHeight * 0.4, 300);

function useComputeHeight() {
  const [height, setHeight] = useState(computeChatHeight);
  useEffect(() => {
    const onResize = () => setHeight(computeChatHeight());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return height;
}

function useKeyHandle(
  currentMessage: string,
  sendMessage: (count: number) => void,
  count: number,
  refChat: React.RefObject<HTMLInputElement>,
  setHelperText: React.Dispatch<React.SetStateAction<string>>,
) {
  useEffect(() => {
    if (!getIsDesktop()) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.shiftKey) return;
      event.preventDefault();
      event.stopPropagation();
      if (!SGG.getChatFocus()) {
        refChat.current?.focus();
        setHelperText("");
      } else if (currentMessage.trim().length === 0) {
        refChat.current?.blur();
        setHelperText("");
      } else {
        sendMessage(count);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, currentMessage]);
}
