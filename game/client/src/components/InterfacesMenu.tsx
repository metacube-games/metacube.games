import React from "react";
import { InterfacePresenter } from "../menu/InterfacePresenter";
import { Chatroom } from "../menu/Chat";
import { TutorialTip } from "../menu/notifications/TutorialTip";
import { Footer } from "./Footer";

export const InterfacesMenu = React.memo(() => {
  return (
    <>
      <InterfacePresenter />
      <Footer />
      <Chatroom />
      <TutorialTip />
    </>
  );
});

InterfacesMenu.displayName = "InterfacesMenu";
