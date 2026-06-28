import React, { useEffect, useState } from "react";
import type { TFunction } from "i18next";
import { getNextRandom } from "../../../helpers/computedRandom";
import { useTranslation } from "react-i18next";

const getMetacubeJokes = (t: TFunction): string[] => {
  return [
    t("ui.jokes.cube.message1"),
    t("ui.jokes.cube.message2"),
    t("ui.jokes.cube.message3"),
    t("ui.jokes.cube.message4"),
    t("ui.jokes.cube.message5"),
    t("ui.jokes.cube.message6"),
    t("ui.jokes.cube.message7"),
    t("ui.jokes.cube.message8"),
  ];
};

function onlyLettersAndNumbers(str: string) {
  return /^[a-zA-Z0-9_]*[a-zA-Z][a-zA-Z0-9_]*$/.test(str);
}

export function useGenerateInfoText(
  username: string,
  definedUsername: boolean,
  isStarknetID: boolean,
) {
  const { t } = useTranslation();
  const [infoText, setInfoText] = useState<string>("");
  const [isValid, setIsValidState] = useState<boolean>(false);

  useEffect(() => {
    const jokes = getMetacubeJokes(t);
    const currJoke = jokes[Math.floor(getNextRandom() * jokes.length)];
    const usernameLength = username.length;

    React.startTransition(() => {
      if (isStarknetID) {
        setIsValidState(true);
        setInfoText(currJoke);
        return;
      }
      if (usernameLength < 5) {
        setInfoText(t("validation.username.tooShort"));
        setIsValidState(false);
      } else if (usernameLength > 15) {
        setInfoText(t("validation.username.tooLong"));
        setIsValidState(false);
      } else if (!onlyLettersAndNumbers(username)) {
        setInfoText(t("validation.username.invalidCharacters"));
        setIsValidState(false);
      } else {
        setIsValidState(true);
        setInfoText(currJoke);
      }
    });
  }, [username, definedUsername, isStarknetID, t]);

  return {
    infoText,
    isValid,
    setInfoText,
    setIsValidState,
  };
}
