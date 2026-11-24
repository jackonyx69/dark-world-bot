import React, { useState, useEffect, forwardRef } from "react";
import { mediaUrl, getProxiedMediaUrl } from "../lib/media";
import { useGetPublicSettings } from "@workspace/api-client-react";

export interface VideoPlayerProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src?: string;
  poster?: string;
  containerClassName?: string;
  watermarkText?: string;
  hideWatermark?: boolean;
}

export const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(function VideoPlayer(
  {
    src,
    poster,
    containerClassName = "",
    watermarkText: customWatermark,
    hideWatermark = false,
    className = "",
    onError,
    onContextMenu,
    ...props
  },
  ref
) {
  const [currentSrc, setCurrentSrc] = useState<string>(() => mediaUrl(src));
  const [hasFailedDirect, setHasFailedDirect] = useState(false);

  const { data: settings } = useGetPublicSettings();
  const activeWatermark = customWatermark || (settings as any)?.watermarkText || "@Dark_Would_Expose_bot";
  const shouldShowWatermark = !hideWatermark && ((settings as any)?.enableWatermark ?? true);

  useEffect(() => {
    setCurrentSrc(mediaUrl(src));
    setHasFailedDirect(false);
  }, [src]);

  const handleError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    if (src && !hasFailedDirect) {
      const proxied = getProxiedMediaUrl(src);
      if (proxied && currentSrc !== proxied) {
        console.warn("Direct video load failed, switching to media proxy stream:", src);
        setHasFailedDirect(true);
        setCurrentSrc(proxied);
        return;
      }
    }
    onError?.(e);
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLVideoElement>) => {
    e.preventDefault();
    onContextMenu?.(e);
  };

  return (
    <div className={`relative overflow-hidden rounded-xl bg-black ${containerClassName}`}>
      <video
        ref={ref}
        src={currentSrc}
        poster={poster ? mediaUrl(poster) : undefined}
        onError={handleError}
        onContextMenu={handleContextMenu}
        controlsList="nodownload"
        disablePictureInPicture
        className={className}
        {...({ referrerPolicy: "no-referrer" } as any)}
        {...props}
      />
      {shouldShowWatermark && activeWatermark && (
        <div className="pointer-events-none absolute right-2.5 top-2.5 z-20 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 backdrop-blur-md border border-white/10 shadow-lg select-none">
          <span className="h-1.5 w-1.5 rounded-full bg-pink-500 animate-pulse" />
          <span className="text-[10px] md:text-xs font-bold tracking-wider text-white/90 drop-shadow">
            {activeWatermark}
          </span>
        </div>
      )}
    </div>
  );
});
