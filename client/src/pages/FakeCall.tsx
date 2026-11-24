import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useListVideoCallGirls, useStartVideoCall, useEndVideoCall } from "@workspace/api-client-react";
import { PhoneOff, Mic, MicOff, Video, VideoOff, Volume2, VolumeX, Gem } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FakeCall() {
  const { girlId } = useParams<{ girlId: string }>();
  const [, setLocation] = useLocation();
  const { data: girls } = useListVideoCallGirls();
  const startCall = useStartVideoCall();
  const endCall = useEndVideoCall();

  const [showDiamondModal, setShowDiamondModal] = useState(false);

  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const callEnded = useRef(false);

  const girl = girls?.find(g => g.id === parseInt(girlId || "0", 10));

  useEffect(() => {
    const parsedGirlId = parseInt(girlId || "0", 10);
    if (parsedGirlId) {
      startCall.mutate({ data: { girlId: parsedGirlId, telegramId: localStorage.getItem("dwe_user_tg_id") || undefined } });
    }
    // Ring for exactly 4 seconds, then ask for diamonds
    const t1 = setTimeout(() => {
      setShowDiamondModal(true);
    }, 4000);

    return () => {
      if (parsedGirlId && !callEnded.current) {
        callEnded.current = true;
        endCall.mutate({ data: { girlId: parsedGirlId, telegramId: localStorage.getItem("dwe_user_tg_id") || undefined } });
      }
      clearTimeout(t1);
    };
  }, [girlId]);

  const handleEndCall = () => {
    const parsedGirlId = parseInt(girlId || "0", 10);
    if (parsedGirlId && !callEnded.current) {
      callEnded.current = true;
      endCall.mutate({ data: { girlId: parsedGirlId, telegramId: localStorage.getItem("dwe_user_tg_id") || undefined } });
    }
    setLocation("/video-call", { replace: true });
  };

  if (!girl) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-between text-white font-sans overflow-hidden">
      {/* Background with heavy blur */}
      <div
        className={`absolute inset-0 blur-xl scale-110 bg-cover bg-center transition-opacity duration-500 ${isCameraOn ? "opacity-40" : "opacity-10"}`}
        style={{ backgroundImage: `url(${girl.imageUrl || ""})` }}
      />

      {/* Animated pulse glow while ringing */}
      {!showDiamondModal && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full bg-primary/20 blur-3xl animate-pulse" />
      )}

      {/* Camera off placeholder */}
      {!isCameraOn && (
        <div className="absolute inset-0 z-0 flex items-center justify-center bg-black">
          <div className="text-center">
            <VideoOff className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/40 text-sm tracking-widest uppercase">Camera Off</p>
          </div>
        </div>
      )}

      {/* Caller Info */}
      <div className="relative z-10 pt-16 flex flex-col items-center">
        <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-white/20 mb-6 shadow-2xl relative">
          <img src={girl.imageUrl || ""} alt={girl.name} className="w-full h-full object-cover" />
          {!showDiamondModal && (
            <div className="absolute inset-0 rounded-full border-2 border-primary/50 animate-ping" />
          )}
        </div>
        <h1 className="text-3xl font-medium tracking-tight mb-2">{girl.name}</h1>
        <p className="text-white/70 tracking-widest uppercase text-sm font-semibold">
          {showDiamondModal ? "Call on hold" : "Ringing..."}
        </p>
      </div>

      {/* Controls */}
      <div className="relative z-10 pb-16 w-full max-w-sm px-8">
        <div className="grid grid-cols-3 gap-6 mb-12">
          {/* Mute toggle */}
          <div className="flex flex-col items-center gap-2">
            <button
              className={`w-14 h-14 rounded-full backdrop-blur-md flex items-center justify-center transition-colors ${
                isMuted ? "bg-red-500/80 hover:bg-red-500" : "bg-white/10 hover:bg-white/20"
              }`}
              onClick={() => setIsMuted(prev => !prev)}
            >
              {isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
            </button>
            <span className="text-xs text-white/60">{isMuted ? "Muted" : "Mute"}</span>
          </div>

          {/* Camera toggle */}
          <div className="flex flex-col items-center gap-2">
            <button
              className={`w-14 h-14 rounded-full backdrop-blur-md flex items-center justify-center transition-colors ${
                !isCameraOn ? "bg-red-500/80 hover:bg-red-500" : "bg-white/10 hover:bg-white/20"
              }`}
              onClick={() => setIsCameraOn(prev => !prev)}
            >
              {isCameraOn ? <Video className="w-6 h-6 text-white" /> : <VideoOff className="w-6 h-6 text-white" />}
            </button>
            <span className="text-xs text-white/60">{isCameraOn ? "Camera" : "Camera Off"}</span>
          </div>

          {/* Speaker toggle */}
          <div className="flex flex-col items-center gap-2">
            <button
              className={`w-14 h-14 rounded-full backdrop-blur-md flex items-center justify-center transition-colors ${
                isSpeakerOn ? "bg-white/10 hover:bg-white/20" : "bg-red-500/80 hover:bg-red-500"
              }`}
              onClick={() => setIsSpeakerOn(prev => !prev)}
            >
              {isSpeakerOn ? <Volume2 className="w-6 h-6 text-white" /> : <VolumeX className="w-6 h-6 text-white" />}
            </button>
            <span className="text-xs text-white/60">{isSpeakerOn ? "Speaker" : "Silent"}</span>
          </div>
        </div>

        <div className="flex justify-center">
          <Button
            size="icon"
            className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 border-none shadow-[0_0_30px_rgba(239,68,68,0.5)]"
            onClick={handleEndCall}
          >
            <PhoneOff className="w-8 h-8 text-white" />
          </Button>
        </div>
      </div>

      {/* Diamond purchase prompt — no close button, no click outside, no escape */}
      {showDiamondModal && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4">
          <div className="bg-card border border-primary/30 rounded-xl p-6 w-full max-w-md shadow-[0_0_60px_rgba(255,45,117,0.35)] text-center">
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-gradient-to-br from-primary to-secondary animate-pulse">
              <Gem className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-black mb-2">ডায়মন্ড কিনুন</h2>
            <p className="text-muted-foreground mb-6">
              {girl.name}-এর সাথে প্রাইভেট ভিডিও কল চালু রাখতে ডায়মন্ড কিনুন।
            </p>
            <div className="flex flex-col gap-3">
              <Button
                className="w-full font-bold tracking-widest bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white"
                onClick={() => setLocation("/packages", { replace: true })}
              >
                <Gem className="w-4 h-4 mr-2" />
                BUY DIAMONDS / ডায়মন্ড কিনুন
              </Button>
              <Button variant="ghost" onClick={handleEndCall}>
                End Call
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
