import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ExternalLink } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { getIsDesktop } from "../../helpers/getIsDesktop";

import emitter from "../../helpers/EventEmitter";
import { WARNING_AFK_DELAY_S } from "../../players/model/delayWarning";
import { WalletDeploy } from "./WalletDeploy";

const RELOAD_TIME = 2;

interface AlertConfig {
  title?: string;
  description?: string;
  btn?: boolean;
  btnX?: boolean;
  counter?: boolean | number;
  hideBack?: boolean;
  jsx?: React.ReactNode;
}

class CAlert {
  private static idG = 0;
  public id: number;
  public config: AlertConfig;
  constructor({
    title = "",
    description = "",
    btn = false,
    btnX = true,
    counter = false,
    hideBack = false,
    jsx = null,
  }: AlertConfig) {
    this.id = CAlert.idG++;
    this.config = { title, description, btn, btnX, counter, hideBack, jsx };
  }

  emit() {
    emitter.emit("alertDialog", this);
  }
}

const createAlert = (config: AlertConfig) => new CAlert(config);

// Lazy `t` resolution so the catalog can be built before i18n initialises.
const createAlertDialogs = (t: (key: string) => string) => ({
  nothing: createAlert({}),
  afk: createAlert({
    title: t("alerts.afk.title"),
    description: t("alerts.afk.description"),
    btn: true,
  }),
  dead: createAlert({
    title: t("alerts.dead.title"),
    description: t("alerts.dead.description"),
    btn: true,
  }),
  kicked: createAlert({
    title: t("alerts.kicked.title"),
    description: t("alerts.kicked.description"),
    btn: true,
  }),
  connecting: createAlert({
    title: t("alerts.connecting.title"),
    description: t("alerts.connecting.description"),
  }),
  afkWarning: createAlert({
    title: t("alerts.afkWarning.title"),
    description: t("alerts.afkWarning.description"),
    btn: true,
    counter: WARNING_AFK_DELAY_S,
    hideBack: true,
  }),
  connectionLost: createAlert({
    title: t("alerts.connectionLost.title"),
    btn: true,
  }),
  loginFailed: createAlert({
    title: t("alerts.loginFailed.title"),
    description: t("alerts.loginFailed.description"),
  }),
  kickedForInactivity: createAlert({
    title: t("alerts.kickedForInactivity.title"),
    description: t("alerts.kickedForInactivity.description"),
    btn: true,
  }),
  memoryOutOfBounds: createAlert({
    title: t("alerts.memoryOutOfBounds.title"),
    btn: true,
    counter: RELOAD_TIME,
  }),
  noStarknetID: createAlert({
    title: t("alerts.noStarknetID.title"),
    description: t("alerts.noStarknetID.description"),
    btn: true,
    jsx: (
      <Button asChild variant="outline">
        <a
          href="https://app.starknet.id/?sponsor=0x2ba4ea61d80d1a60adf03150b7634af5fee6f4b3167d915ab8cce2be3ac2023"
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink />
          {t("ui.links.getStarknetId")}
        </a>
      </Button>
    ),
  }),
  barrier: createAlert({
    title: t("alerts.barrier.title"),
    description: t("alerts.barrier.description"),
    hideBack: true,
  }),
  banned: createAlert({
    title: t("alerts.banned.title"),
    description: t("alerts.banned.description"),
    btn: true,
  }),
  walletNotDeployed: createAlert({
    title: t("alerts.walletNotDeployed.title"),
    description: t("alerts.walletNotDeployed.description"),
    jsx: <WalletDeploy />,
  }),
  walletCNotDeployed: createAlert({
    title: t("alerts.walletNotDeployed.title"),
    description: t("alerts.walletNotDeployed.description"),
    jsx: <WalletDeploy />,
  }),
  unExpectedError: createAlert({
    title: t("alerts.unExpectedError.title"),
    description: t("alerts.unExpectedError.description"),
    btn: true,
  }),
  issueVerifyingSignature: createAlert({
    title: t("alerts.issueVerifyingSignature.title"),
    description: t("alerts.issueVerifyingSignature.description"),
    btn: true,
  }),
});

class CAlertMng {
  public currentState = 0;
  public dialogs: ReturnType<typeof createAlertDialogs>;

  constructor() {
    this.dialogs = createAlertDialogs((key) => key);
  }

  public updateDialogs(t: (key: string) => string) {
    this.dialogs = createAlertDialogs(t);
  }

  public isCurrState = (alert: CAlert) => this.currentState === alert.id;
}

export const CIAlertMng = new CAlertMng();

export const AlertDialog: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const [open, setOpen] = useState<CAlert>(CIAlertMng.dialogs.nothing);
  const [count, setCount] = useState(0);
  const okButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    CIAlertMng.updateDialogs(t);
  }, [t]);

  const handleClose = useCallback(
    () => setOpen(CIAlertMng.dialogs.nothing),
    [],
  );

  useEffect(() => {
    const onListen = (alert: CAlert) => {
      CIAlertMng.currentState = alert.id;
      setOpen(alert);
      if (alert.config.counter) {
        setCount(alert.config.counter as number);
      }
    };
    const listener = emitter.addListener("alertDialog", onListen);
    return () => listener.remove();
  }, []);

  useEffect(() => {
    if (!open.config.counter) return;
    const intervalId = setInterval(() => {
      setCount((prev) => {
        if (prev > 1) return prev - 1;
        setOpen(CIAlertMng.dialogs.nothing);
        return 0;
      });
    }, 1000);
    return () => clearInterval(intervalId);
  }, [open]);

  const isDesktop = getIsDesktop();

  useEffect(() => {
    if (isDesktop && open.config.btn) okButtonRef.current?.focus();
  }, [isDesktop, open]);

  const hasContent = Boolean(
    open.id &&
    (open.config.title || open.config.description || open.config.jsx),
  );

  return (
    <Dialog
      open={hasContent}
      onOpenChange={(o) => {
        if (!o && !open.config.hideBack) handleClose();
      }}
    >
      <DialogContent
        hideClose={!open.config.btnX}
        onEscapeKeyDown={(e) => {
          if (open.config.hideBack) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (open.config.hideBack) e.preventDefault();
        }}
        onOpenAutoFocus={(e) => {
          if (!isDesktop) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{open.config.title}</DialogTitle>
        </DialogHeader>
        {open.config.description && (
          <DialogDescription className="whitespace-pre-wrap break-words text-base leading-relaxed">
            {open.config.description}
            {Boolean(open.config.counter) && (
              <>
                <br />
                <span className="font-semibold text-primary">
                  {count} {t("alerts.seconds")}
                </span>
              </>
            )}
          </DialogDescription>
        )}
        {(open.config.jsx || open.config.btn) && (
          <DialogFooter>
            {open.config.jsx}
            {open.config.btn && (
              <Button ref={okButtonRef} variant="outline" onClick={handleClose}>
                <Check />
                {t("walletDeploy.ok")}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
});

export { CAlert, CAlertMng };
