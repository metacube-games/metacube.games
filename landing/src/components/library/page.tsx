import * as React from "react";
import { Container, type ContainerWidth } from "./container";
import { cn } from "@/lib/utils";

export function Page({
  hasFooter = true,
  width,
  className,
  children,
  ...props
}: {
  hasFooter?: boolean;
  width?: ContainerWidth;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Container
      width={width}
      className={cn("pt-18", hasFooter ? "pb-18" : "pb-8", className)}
      {...props}
    >
      {children}
    </Container>
  );
}
