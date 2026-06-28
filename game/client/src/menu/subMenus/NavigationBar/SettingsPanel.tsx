import * as React from "react";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";

import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Slider } from "../../../components/ui/slider";
import { Switch } from "../../../components/ui/switch";
import {
  CISettingsMng,
  type CSettingSlider,
  type CSettingSwitch,
} from "../NavigationBar/Model/CSettingsManager";
import { useGStore, SAG } from "../../useGeneralStore";
import { getStarkName, setStarkname } from "../../../API/backendAPI";
import { setNewUsernameToWS } from "../../Chat";
import { CIAlertMng } from "../AlertDialog";

// Engine instantiates settings with English identifiers; map them to i18n keys here.
const SETTING_TRANSLATION_KEY: Record<string, string> = {
  FPS: "settings.fps",
  Coordinates: "settings.coordinates",
  "Total blocks": "settings.totalBlocks",
  Players: "settings.players",
  Events: "settings.events",
  Damages: "settings.damages",
  Spectator: "settings.spectator",
  Resolution: "settings.resolution",
  "Render distance": "settings.renderDistance",
  "Field of view": "settings.fieldOfView",
  Luminosity: "settings.luminosity",
  "Dark future ambiance": "settings.darkFutureAmbiance",
  Antialiasing: "settings.antialiasing",
  "Fogs effects": "settings.fogsEffects",
  "Particles effects": "settings.particlesEffects",
  "Spatial Objects": "settings.spatialObjects",
  Spacecraft: "settings.spacecraft",
  "Power Jauges": "settings.powerJauges",
  "Camera sensitivity": "settings.cameraSensitivity",
  "Master volume": "settings.masterVolume",
  "Ambient volume": "settings.ambientVolume",
  "Fx volume": "settings.fxVolume",
};

const settingKey = (name: string) => SETTING_TRANSLATION_KEY[name] ?? name;

export const SettingsPanel = React.memo(function SettingsPanel() {
  const { t } = useTranslation();

  const renderSettings = useMemo(() => Object.values(CISettingsMng.render), []);
  const hudSettings = useMemo(() => Object.values(CISettingsMng.hud), []);
  const audioSettings = useMemo(() => Object.values(CISettingsMng.audio), []);
  const controlsSettings = useMemo(
    () => Object.values(CISettingsMng.controls),
    [],
  );

  return (
    <div className="flex flex-col gap-3">
      <AccountSection />
      <SettingsCategory title={t("settings.render")} items={renderSettings} />
      <SettingsCategory title={t("settings.hud")} items={hudSettings} />
      <SettingsCategory title={t("settings.audio")} items={audioSettings} />
      <SettingsCategory
        title={t("settings.controls")}
        items={controlsSettings}
      />
    </div>
  );
});

function CategoryCard({
  title,
  children,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-3 p-3">
      <p className="text-sm font-semibold uppercase tracking-wide text-foreground">
        {title}
      </p>
      {children}
    </Card>
  );
}

function SettingsCategory({
  title,
  items,
}: {
  title: React.ReactNode;
  items: Array<CSettingSlider | CSettingSwitch>;
}) {
  return (
    <CategoryCard title={title}>
      <div className="flex flex-col divide-y divide-border/60">
        {items.map((item) => (
          <div key={item.name} className="py-2 first:pt-0 last:pb-0">
            {item.inputType === "Slider" ? (
              <SliderRow setting={item as CSettingSlider} />
            ) : (
              <SwitchRow setting={item as CSettingSwitch} />
            )}
          </div>
        ))}
      </div>
    </CategoryCard>
  );
}

function SettingRowLabel({ name }: { name: string }) {
  const { t } = useTranslation();
  return (
    <span className="text-sm font-medium text-muted-foreground">
      {t(settingKey(name))}
    </span>
  );
}

function SwitchRow({ setting }: { setting: CSettingSwitch }) {
  const [checked, setChecked] = useState(() => setting.getVal());

  const handleChange = useCallback(
    (next: boolean) => {
      setChecked(next);
      setting.storeValue(next);
      setting.sendEvent(next);
    },
    [setting],
  );

  return (
    <div className="flex items-center justify-between gap-3">
      <SettingRowLabel name={setting.name} />
      <Switch checked={checked} onCheckedChange={handleChange} />
    </div>
  );
}

function SliderRow({ setting }: { setting: CSettingSlider }) {
  const { name, min, max, step } = setting;
  const [value, setValue] = useState<number>(() => setting.getVal());

  const handleSliderChange = useCallback(
    (next: number[]) => {
      const v = next[0];
      setValue(v);
      setting.storeValue(v);
      setting.sendEvent(v);
    },
    [setting],
  );

  const [text, setText] = useState<string>(() => String(setting.getVal()));

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value;
      setText(raw);
      if (raw === "") return;
      const parsed = Number(raw);
      if (Number.isNaN(parsed)) return;
      const clamped = Math.min(max, Math.max(min, parsed));
      setValue(clamped);
      setting.storeValue(clamped);
      setting.sendEvent(clamped);
    },
    [min, max, setting],
  );

  const handleInputBlur = useCallback(() => {
    setText(String(value));
  }, [value]);

  React.useEffect(() => {
    setText(String(value));
  }, [value]);

  return (
    <div className="flex items-center justify-between gap-3">
      <SettingRowLabel name={name} />
      <div className="flex w-3/5 items-center gap-3">
        <Slider
          value={[value]}
          onValueChange={handleSliderChange}
          min={min}
          max={max}
          step={step}
          className="flex-1"
        />
        <Input
          type="number"
          value={text}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          min={min}
          max={max}
          step={step}
          aria-label={name}
          className="w-20"
        />
      </div>
    </div>
  );
}

function AccountSection() {
  const { t } = useTranslation();
  const isConnected = useGStore((state) => state.isConnected);
  const username = useGStore((state) => state.username);
  const isStarknetID = useGStore((state) => state.isStarknetID);

  const onUseStarknetID = useCallback(async () => {
    const data = await getStarkName().catch(() => {
      CIAlertMng.dialogs.noStarknetID.emit();
      return undefined;
    });
    const starkname = data?.starkname;
    if (!starkname) return;
    SAG.setUsername(starkname);
    setStarkname(starkname);
    setNewUsernameToWS();
    SAG.setIsStarknetID(true);
  }, []);

  if (!isConnected) return null;

  return (
    <CategoryCard title={t("settings.account", "Account")}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-foreground" title={username}>
            {username || t("ui.placeholders.username")}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={onUseStarknetID}
          disabled={isStarknetID}
        >
          <Sparkles />
          {isStarknetID
            ? t("ui.buttons.starknetIdUsed")
            : t("ui.buttons.useStarknetId")}
        </Button>
      </div>
    </CategoryCard>
  );
}
