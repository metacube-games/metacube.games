import React from "react";

interface ResponsiveHeaderProps {
  children: React.ReactNode;
}

export default function ResponsiveHeader({
  children,
}: ResponsiveHeaderProps) {
  return (
    <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold mb-4 sm:mb-6 md:mb-8">
      {children}
    </h1>
  );
}
