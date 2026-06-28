import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      richColors
      closeButton
      theme="dark"
      position="bottom-left"
      toastOptions={{
        className:
          "border border-border bg-card text-card-foreground shadow-lg rounded-md",
      }}
    />
  );
}
