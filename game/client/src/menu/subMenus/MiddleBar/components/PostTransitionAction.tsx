import * as React from "react";
import { ArrowRightCircle, Check, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { postTransition } from "../../../../API/backendAPI";
import { useGStore } from "../../../useGeneralStore";
import { Button } from "../../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../../components/ui/dialog";

// Wallet addresses allowed to trigger the post-transition action. Configured
// via env (comma-separated) so the list isn't baked into source.
const AUTHORIZED_ADDRESSES = new Set(
  (
    (import.meta.env.VITE_REACT_APP_AUTHORIZED_ADDRESSES as
      | string
      | undefined) ?? ""
  )
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean),
);

export const PostTransitionAction = React.memo(() => {
  const { t } = useTranslation();
  const walletAddress = useGStore((state) => state.walletAddress);
  const [open, setOpen] = React.useState(false);

  if (!AUTHORIZED_ADDRESSES.has(walletAddress)) return null;

  const handleConfirm = () => {
    postTransition();
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="destructive"
        onClick={() => setOpen(true)}
        className="w-full capitalize"
      >
        <ArrowRightCircle />
        {t("ui.buttons.postTransition")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("dialogs.confirmTransition.title")}</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            {t("dialogs.confirmTransition.message")}
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              <X />
              {t("common.cancel")}
            </Button>
            <Button variant="outline" onClick={handleConfirm}>
              <Check />
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});

PostTransitionAction.displayName = "PostTransitionAction";
