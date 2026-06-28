import { type ReactNode } from "react";
import { DialogContent } from "@/components/ui/dialog";

interface DialogWrapperProps {
  children: ReactNode;
  className?: string;
}

export function DialogWrapper({
  children,
  className = "",
}: DialogWrapperProps) {
  return (
    <DialogContent
      className={`max-w-[min(290px,95%)] sm:max-w-[min(425px,95%)] lg:max-w-[min(950px,95%)] p-0 overflow-hidden rounded-md ${className}`}
    >
      <div className="flex flex-col max-w-[290px] sm:max-w-[425px] lg:max-w-[950px] lg:flex-row h-max max-h-[90vh] lg:h-[605px]">
        {children}
      </div>
    </DialogContent>
  );
}
