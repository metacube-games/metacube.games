import * as React from "react";
import { useGStore, SAG } from "../../../useGeneralStore";
import { useTranslation } from "react-i18next";
import { Input } from "../../../../components/ui/input";
import { cn } from "../../../../lib/utils";

interface UsernameDisplayerProps {
  isValid: boolean;
  infoText: string;
  isConnected: boolean;
}

export const UsernameDisplayer: React.FC<UsernameDisplayerProps> = ({
  isValid,
  infoText,
  isConnected,
}) => {
  const { t } = useTranslation();
  const definedUsername = useGStore((state) => state.definedUsername);
  const username = useGStore((state) => state.username);

  const showError = isConnected && !definedUsername && infoText && !isValid;
  const isInputDisabled = !isConnected || definedUsername;

  return (
    <div className="flex flex-col gap-2">
      <Input
        placeholder={t("ui.placeholders.username")}
        value={isConnected ? username : ""}
        onChange={(e) => SAG.setUsername(e.target.value)}
        disabled={isInputDisabled}
        autoComplete="off"
        aria-invalid={showError ? true : undefined}
        className={cn(
          // Override shadcn's `disabled:opacity-50` — invisible on our translucent backdrop.
          isInputDisabled && "border-muted-foreground/40 disabled:opacity-100",
          showError && "border-red-500 focus-visible:ring-red-500",
        )}
      />
      {showError && <p className="text-xs text-red-500">{infoText}</p>}
    </div>
  );
};
