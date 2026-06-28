import { useEffect } from "react";
import { SAG } from "../menu/useGeneralStore";

export function useReferralCode() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const referral = params.get("referral");
    if (referral) SAG.setReferral(referral);
  }, []);
}
