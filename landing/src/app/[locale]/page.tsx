import dynamic from "next/dynamic";

import { CubeAnimation } from "@/components/cube-animation";
import { Page } from "@/components/library/page";

const Features = dynamic(() => import("@/components/features"));
const Team = dynamic(() => import("@/components/team"));

export default function Home() {
  return (
    <main id="main-content" className="relative overflow-hidden">
      <CubeAnimation />

      <Page hasFooter className="relative">
        <div className="relative max-w-5xl mx-auto">
          <Features />
          <Team />
        </div>
      </Page>
    </main>
  );
}
