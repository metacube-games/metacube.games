const isMobile = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
};

const isWalletBrowser = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  return (
    userAgent.includes("braavos") ||
    userAgent.includes("argent") ||
    userAgent.includes("wallet") ||
    (isMobile() &&
      (userAgent.includes("wv") || // Android WebView
        (!userAgent.includes("chrome") && userAgent.includes("safari")))) // iOS WebView
  );
};

// In wallet browsers (Braavos, Argent) window.open() is unreliable — fall back
// to same-tab navigation so links don't silently fail.
export const openInSameBrowser = (
  url: string,
  useNewTab = true,
): Promise<void> => {
  return new Promise((resolve) => {
    const inWalletBrowser = isWalletBrowser();

    if (useNewTab && !inWalletBrowser) {
      const newTab = window.open();
      if (newTab) {
        newTab.opener = null; // Prevent cross-origin opener access.
        newTab.location.href = url;
        resolve();
      } else {
        // Popup blocked; fall back to current tab.
        window.location.href = url;
        resolve();
      }
    } else {
      window.location.href = url;
      resolve();
    }
  });
};
