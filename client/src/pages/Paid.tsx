import { useEffect, useState } from "react";
import { useListPackages } from "@workspace/api-client-react";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Crown } from "lucide-react";
import { useLocation } from "wouter";

function packageIcon(name: string, index: number) {
  const value = name.toLowerCase();
  if (value.includes("diamond")) return "💎";
  if (value.includes("gold")) return "⭐";
  if (value.includes("silver")) return "👤";
  if (value.includes("baby") || value.includes("বাচ্চা")) return "👶";
  return ["👶", "👤", "⭐", "💎"][index % 4];
}

function durationLabel(duration: number, unit: string) {
  if (duration === 30 && unit.toLowerCase() === "days") return "/month";
  return `/${duration} ${unit}`;
}

export default function Paid() {
  const { data: packages, isLoading } = useListPackages();
  const [, setLocation] = useLocation();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (selectedId === null && packages?.[0]) {
      setSelectedId(packages[0].id);
    }
  }, [packages, selectedId]);

  const handleSelect = (id: number) => {
    setSelectedId(id);
    localStorage.setItem("dwe_checkout_pkg", String(id));
    setLocation(`/checkout?package=${id}`);
  };

  return (
    <>
      <main className="min-h-[100dvh] flex-1 bg-[#09090e] px-4 pb-24 text-white md:pb-10">
        <header className="mx-auto max-w-2xl pt-8 text-center sm:pt-12">
          <div className="border-b border-white/10 pb-5">
            <div className="flex items-center justify-center gap-1 text-2xl font-black italic sm:text-3xl">
              <span className="text-white">PREMIUM</span>
              <span className="text-fuchsia-400">PACKAGES</span>
            </div>
            <p className="mt-2 text-base text-zinc-400">Exclusive content — choose a plan below</p>
          </div>
        </header>

        <section className="mx-auto mt-6 grid max-w-3xl grid-cols-2 gap-3 sm:gap-5">
          {isLoading
            ? [1, 2, 3, 4].map((item) => (
                <div key={item} className="h-80 animate-pulse rounded-3xl border border-white/10 bg-[#191922]" />
              ))
            : packages?.map((pkg, index) => {
                const isSelected = selectedId === pkg.id;
                const features = pkg.features?.split("\n").map((feature) => feature.trim()).filter(Boolean) || [];
                const price = `৳${pkg.priceBdt}`;

                return (
                  <article
                    key={pkg.id}
                    onClick={() => handleSelect(pkg.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleSelect(pkg.id);
                      }
                    }}
                    aria-label={`Select ${pkg.name.trim()} package`}
                    className={`relative flex min-h-[390px] cursor-pointer flex-col overflow-hidden rounded-[26px] border p-4 transition-all duration-200 sm:min-h-[470px] sm:p-6 ${
                      isSelected
                        ? "border-purple-400/80 bg-[#1c1b27] shadow-[0_0_30px_rgba(168,85,247,0.2)]"
                        : "border-white/10 bg-[#191922] hover:border-white/25 hover:bg-[#1d1d27]"
                    }`}
                  >
                    <div className="flex flex-1 flex-col items-center text-center">
                      <div className="flex h-20 items-center justify-center text-[56px] leading-none sm:text-[68px]">{packageIcon(pkg.name, index)}</div>
                      <h2 className="mt-2 flex min-h-12 items-center justify-center line-clamp-2 text-[16px] font-black leading-6 text-white sm:text-xl">
                        {pkg.name.trim()}
                      </h2>
                      <div className="mt-2 text-[32px] font-black leading-none tracking-tight text-cyan-400 sm:text-4xl">{price}</div>
                      <div className="mt-2 text-sm font-medium text-zinc-500 sm:text-base">{durationLabel(pkg.duration, pkg.durationUnit)}</div>
                    </div>

                    <ul className="mt-6 min-h-[116px] space-y-3 text-left sm:min-h-[150px] sm:space-y-4">
                      {features.map((feature, featureIndex) => (
                        <li key={`${pkg.id}-${featureIndex}`} className="flex items-start gap-2.5 text-[13px] leading-5 text-zinc-300 sm:text-base sm:leading-6">
                          <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-400 sm:h-[18px] sm:w-[18px]" />
                          <span className="min-w-0 break-words">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {isSelected && (
                      <Button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleSelect(pkg.id);
                        }}
                        className="mt-5 h-12 w-full rounded-xl border border-purple-400/40 bg-purple-700/50 text-base font-black text-purple-100 shadow-[0_0_16px_rgba(168,85,247,0.2)] hover:bg-purple-600/60"
                      >
                        ✓ Selected
                      </Button>
                    )}
                  </article>
                );
              })}
        </section>

        {!isLoading && !packages?.length && (
          <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-white/10 bg-[#191922] p-8 text-center text-zinc-400">
            <Crown className="mx-auto mb-3 h-8 w-8 text-fuchsia-400" />
            No premium packages are available right now.
          </div>
        )}
      </main>
      <Navbar />
    </>
  );
}