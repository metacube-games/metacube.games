"use client";

import { useState, useRef, useEffect } from "react";
import { YouTubeEmbed } from "@next/third-parties/google";
import { useTranslations } from "next-intl";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CommunityVideo {
  id: string;
  title: string;
  creator: string;
  platform: string;
  videoId: string;
  thumbnail?: string;
  language?: string;
  featured?: boolean;
}

const communityVideos: CommunityVideo[] = [
  {
    id: "1",
    title: "",
    creator: "Light12A",
    platform: "youtube",
    videoId: "O-nuRD0XJP4",
    language: "English",
  },
  {
    id: "2",
    title: "",
    creator: "Gedis",
    platform: "youtube",
    videoId: "UZ_4Wkr3M3Y",
  },
  {
    id: "3",
    title: "",
    creator: "Franlis",
    platform: "youtube",
    videoId: "gr1oi_UdIB0",
    language: "Spanish",
  },
  {
    id: "4",
    title: "",
    creator: "elnato07",
    platform: "youtube",
    videoId: "Q5Rc41krauc",
    language: "Spanish",
  },
  {
    id: "5",
    title: "",
    creator: "Light12A",
    platform: "youtube",
    videoId: "wMaT0wMe9Ug",
    language: "English",
  },
  {
    id: "6",
    title: "",
    creator: "Thecno | T5",
    platform: "youtube",
    videoId: "WlqXb7-GZzI",
    language: "Spanish",
  },
];

const LazyVideoEmbed = ({ video }: { video: CommunityVideo }) => {
  const [isVisible, setIsVisible] = useState(false);
  const videoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: "100px" },
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={videoRef} className="aspect-video w-full relative">
      {isVisible ? (
        video.platform === "youtube" ? (
          <YouTubeEmbed
            videoid={video.videoId}
            params="rel=0"
            playlabel={video.title}
          />
        ) : (
          <div className="w-full h-full bg-card flex items-center justify-center">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center ${
                video.platform === "twitch"
                  ? "bg-purple-600"
                  : video.platform === "kick"
                    ? "bg-primary"
                    : "bg-muted"
              }`}
            >
              {video.platform === "twitch" && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12"
                  viewBox="0 0 24 24"
                  fill="white"
                >
                  <path
                    d="M2.149 0l-1.612 4.119v16.836h5.731v3.045h3.224l3.045-3.045h4.657l6.269-6.269v-14.686h-21.314zm19.164 13.612l-3.582 3.582h-5.731l-3.045 3.045v-3.045h-4.836v-15.045h17.194v11.463zm-3.582-7.343v6.262h-2.149v-6.262h2.149zm-5.731 0v6.262h-2.149v-6.262h2.149z"
                    fillRule="evenodd"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {video.platform === "kick" && (
                <svg className="h-12 w-12" viewBox="0 0 24 24" fill="white">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 14.652h-4.02L12 12.5l1.548-2.152h4.02L14.1 12.5l3.468 2.152zm-7.035 0H6.357L9.6 10.348H7.5L4.432 14.5V7.348h2.1v3.304L9.8 7.348h2.1l-3.367 4.304 2 3z" />
                </svg>
              )}
            </div>
          </div>
        )
      ) : (
        <div className="w-full h-full bg-card flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      )}
    </div>
  );
};

export default function CommunityVideoGrid() {
  const t = useTranslations("communityStreams.videoGrid");

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "youtube":
        return (
          <div className="bg-red-600 rounded-full p-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3"
              viewBox="0 0 24 24"
              fill="white"
            >
              <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
            </svg>
          </div>
        );
      case "twitch":
        return (
          <div className="bg-purple-600 rounded-full p-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3"
              viewBox="0 0 24 24"
              fill="white"
            >
              <path
                d="M2.149 0l-1.612 4.119v16.836h5.731v3.045h3.224l3.045-3.045h4.657l6.269-6.269v-14.686h-21.314zm19.164 13.612l-3.582 3.582h-5.731l-3.045 3.045v-3.045h-4.836v-15.045h17.194v11.463zm-3.582-7.343v6.262h-2.149v-6.262h2.149zm-5.731 0v6.262h-2.149v-6.262h2.149z"
                fillRule="evenodd"
                clipRule="evenodd"
              />
            </svg>
          </div>
        );
      case "kick":
        return (
          <div className="bg-primary rounded-full p-1">
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="white">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 14.652h-4.02L12 12.5l1.548-2.152h4.02L14.1 12.5l3.468 2.152zm-7.035 0H6.357L9.6 10.348H7.5L4.432 14.5V7.348h2.1v3.304L9.8 7.348h2.1l-3.367 4.304 2 3z" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {communityVideos.map((video) => (
          <Card
            key={video.id}
            className="group relative overflow-hidden border-2 transition-colors hover:border-primary"
          >
            <LazyVideoEmbed video={video} />

            <div className="bg-card/60 backdrop-blur-sm p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="line-clamp-1 text-base font-semibold text-foreground">
                  {video.creator}
                </h3>
                {video.language && (
                  <Badge variant="secondary" size="sm">
                    {video.language}
                  </Badge>
                )}
              </div>
            </div>

            {video.featured && (
              <Badge
                variant="default"
                size="sm"
                className="absolute left-2 top-2 z-10"
              >
                {t("featured")}
              </Badge>
            )}

            {video.platform === "youtube" && (
              <div className="absolute right-2 top-2 z-10">
                {getPlatformIcon(video.platform)}
              </div>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
