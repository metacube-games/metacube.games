import { useCallback } from "react";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { SAG } from "@/store/authStore";
import {
  postConnectGoogle,
  setAccessToken,
  type ConnectResponse,
} from "@/services/backendAPI";
import { reportError } from "@/lib/reportError";

export function LoginButton() {
  const handleGoogleLogin = useCallback(
    (credentialResponse: CredentialResponse) => {
      if (!credentialResponse.credential) return;
      postConnectGoogle(credentialResponse.credential)
        .then((data) => {
          if (data) {
            setInitialStates(data);
          }
        })
        .catch((err) => reportError("LoginButton:postConnectGoogle", err));
    },
    [],
  );

  return (
    <div className="bg-background min-content">
      <GoogleLogin
        onSuccess={handleGoogleLogin}
        onError={() => reportError("LoginButton:GoogleLogin", "onError")}
        text="signin_with"
        useOneTap={false}
        auto_select={false}
      />
    </div>
  );
}

export function setInitialStates(data: ConnectResponse) {
  if (data.accessToken) setAccessToken(data.accessToken);

  const pb = data.playerData?.publicKey;
  if (!pb) return;
  const username = data.playerData?.username;
  if (!username) return;
  if (pb.startsWith("google")) {
    SAG.setGoogleUsername(username);
    SAG.setGoogleId(pb);
  } else {
    SAG.setGuestUsername(username);
  }
}
