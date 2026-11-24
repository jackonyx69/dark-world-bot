import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  useListPaymentMethods,
  useSubmitPayment,
  useListPackages,
  useRegisterUser,
  useGetPublicSettings,
} from "@workspace/api-client-react";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, CheckCircle2, Check, Copy, ShieldCheck, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [packageId, setPackageId] = useState<number | null>(null);
  const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null);
  const [senderNumber, setSenderNumber] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const registerUser = useRegisterUser();
  const { data: packages } = useListPackages();
  const { data: paymentMethods } = useListPaymentMethods();
  const { data: settings } = useGetPublicSettings();
  const currentUser = registerUser.data;

  const submitPayment = useSubmitPayment();

  useEffect(() => {
    let id = localStorage.getItem("dwe_user_tg_id");
    if (!id) {
      id = `web_${crypto.randomUUID()}`;
      localStorage.setItem("dwe_user_tg_id", id);
    }
    registerUser.mutate({
      data: {
        telegramId: id,
        username: localStorage.getItem("dwe_user_username") || undefined,
        firstName: localStorage.getItem("dwe_user_first_name") || undefined,
        referralCode: localStorage.getItem("dwe_referral_code") || undefined,
      },
    });
  }, []);

  const activeMethods = paymentMethods?.filter((method) => method.isActive) || [];

  useEffect(() => {
    if (selectedMethodId === null && activeMethods[0]) {
      setSelectedMethodId(activeMethods[0].id);
    }
  }, [selectedMethodId, activeMethods]);

  useEffect(() => {
    const pkgId =
      new URLSearchParams(window.location.search).get("package") ||
      localStorage.getItem("dwe_checkout_pkg");
    if (pkgId) {
      setPackageId(parseInt(pkgId, 10));
    } else {
      setLocation("/packages");
    }
  }, [setLocation]);

  const selectedPackage = packages?.find((p) => p.id === packageId);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !packageId) {
      toast({
        title: "Please wait",
        description: "Your account is still loading.",
        variant: "destructive",
      });
      return;
    }

    const method = paymentMethods?.find((m) => m.id === selectedMethodId);
    if (!method) {
      toast({ title: "Error", description: "Please select a payment method", variant: "destructive" });
      return;
    }

    const amount = selectedPackage?.priceBdt;
    if (!amount) {
      toast({
        title: "Package unavailable",
        description: "Please return and select a package again.",
        variant: "destructive",
      });
      return;
    }

    submitPayment.mutate(
      {
        data: {
          userId: currentUser.id,
          packageId,
          amount: String(amount),
          transactionId: transactionId.trim().toUpperCase(),
          userName: currentUser.firstName || currentUser.username || "",
          senderNumber: senderNumber.trim(),
        },
      },
      {
        onSuccess: () => {
          setIsSuccess(true);
        },
        onError: (error: any) => {
          toast({
            title: "Payment submission failed",
            description: error?.data?.error || error?.message || "Please check the details and try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  if (isSuccess) {
    return (
      <>
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center min-h-[80vh]">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-black mb-2">PAYMENT SUBMITTED</h1>
          <p className="text-muted-foreground mb-8 max-w-sm">
            আপনার পেমেন্ট সফলভাবে জমা হয়েছে। এডমিন ভেরিফাই করে দ্রুত প্রিমিয়াম এক্সেস চালু করে দিবে।
          </p>
          <Button onClick={() => setLocation("/")} className="font-bold">
            RETURN TO HOME
          </Button>
        </main>
        <Navbar />
      </>
    );
  }

  return (
    <>
      <main className="w-full max-w-lg mx-auto flex-1 pb-24 px-4 pt-6">
        <div className="flex items-center gap-3 mb-5">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setLocation("/packages", { replace: true })}
            aria-label="Go back"
            className="border-white/15 bg-white/5 text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-black text-white">Payment & Checkout</h1>
            <p className="text-xs text-zinc-400">সহজ উপায়ে পেমেন্ট সম্পন্ন করুন</p>
          </div>
        </div>

        {selectedPackage && (
          <div className="mb-5 overflow-hidden rounded-2xl border border-primary/40 bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Selected Package</span>
                <div className="text-lg font-black text-white">{selectedPackage.name.trim()}</div>
                <div className="text-xs text-zinc-400">{selectedPackage.duration} {selectedPackage.durationUnit} Premium</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-primary">৳{selectedPackage.priceBdt}</div>
                <div className="text-[10px] uppercase text-zinc-400">Total Price</div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4 mb-5">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
            Select Payment Method (নম্বর কপি করুন):
          </label>
          <div className="space-y-2">
            {activeMethods.map((method) => {
              const isSelected = selectedMethodId === method.id;
              return (
                <Card
                  key={method.id}
                  className={`cursor-pointer transition-all border ${
                    isSelected ? "border-primary bg-primary/10 shadow-sm" : "border-border bg-card hover:border-primary/40"
                  }`}
                  onClick={() => setSelectedMethodId(method.id)}
                >
                  <CardContent className="flex items-center gap-3 p-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-xl">
                      {method.emoji || "৳"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white text-sm">{method.name}</div>
                      <div className="font-mono text-xs text-zinc-300 font-semibold">{method.phoneNumber}</div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-emerald-400 shrink-0" />}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0 h-8 px-2.5 text-xs gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(method.phoneNumber || "");
                      }}
                    >
                      <Copy className="w-3.5 h-3.5" /> কপি
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="mb-5 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3.5 text-xs text-amber-200">
          <p className="font-bold mb-1">📌 পেমেন্ট নির্দেশিকা:</p>
          <p className="leading-relaxed opacity-90">
            {settings?.paymentInstructions?.trim() ||
              "উপরের যেকোনো নম্বরে Send Money করুন। এরপর নিচে আপনার প্রেরক নম্বর (Sender Number) এবং ট্রানজেকশন আইডি (TrxID) দিয়ে সাবমিট বাটনে ক্লিক করুন।"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <div className="space-y-1.5">
              <Label className="text-xs">আপনার প্রেরক নম্বর (Sender Number) *</Label>
              <Input
                required
                value={senderNumber}
                onChange={(e) => setSenderNumber(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="bg-background text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">ট্রানজেকশন আইডি (TrxID) *</Label>
              <Input
                required
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="যেমন: TRXB123456"
                className="bg-background font-mono uppercase text-sm"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 rounded-xl font-bold text-base"
            disabled={
              !selectedMethodId ||
              !selectedPackage ||
              !currentUser ||
              !transactionId.trim() ||
              !senderNumber.trim() ||
              submitPayment.isPending
            }
          >
            <span>{submitPayment.isPending ? "সাবমিট হচ্ছে..." : "পেমেন্ট সাবমিট করুন"}</span>
            {!submitPayment.isPending && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>

          {settings?.telegramUsername && (
            <a
              href={`https://t.me/${settings.telegramUsername.replace(/^@/, "")}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 text-xs text-primary hover:underline pt-2"
            >
              <Send className="h-3.5 w-3.5" />
              <span>পেমেন্টে সমস্যা হলে সরাসরি এডমিনের সাথে যোগাযোগ করুন</span>
            </a>
          )}

          <p className="flex items-center justify-center gap-1 text-[11px] text-zinc-500 pt-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> নিরাপদ ও বিশ্বস্ত ম্যানুয়াল ভেরিফিকেশন
          </p>
        </form>
      </main>
      <Navbar />
    </>
  );
}
