import { useLocation } from "wouter";
import { useListVideoCallGirls } from "@workspace/api-client-react";
import { Navbar } from "@/components/layout/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Clock } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function VideoCall() {
  const [, setLocation] = useLocation();
  const { data: girls, isLoading } = useListVideoCallGirls();
  
  const handleCall = (girlId: number) => {
    setLocation(`/fake-call/${girlId}`);
  };

  return (
    <>
      <main className="flex-1 pb-24 md:pb-8">
        <header className="px-4 pt-8 pb-6 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="icon" onClick={() => setLocation("/", { replace: true })} aria-label="Go back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
            <Video className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-black tracking-tight text-foreground uppercase">VIP Live Calls</h1>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Exclusive 1-on-1 private sessions</p>
        </header>

        <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
          {isLoading ? (
            [1, 2, 3, 4].map(i => <Skeleton key={i} className="aspect-[3/4] rounded-xl" />)
          ) : (
            girls?.sort((a, b) => a.sortOrder - b.sortOrder).map((girl) => {
              const statusColors = {
                online: "bg-green-500 text-white",
                busy: "bg-yellow-500 text-black",
                offline: "bg-neutral-600 text-white"
              };
              
              return (
                <Card key={girl.id} className="overflow-hidden border-border bg-card group relative">
                  <div className="aspect-[3/4] relative bg-muted">
                    <img src={girl.imageUrl || ""} alt={girl.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                    
                    <div className="absolute top-2 right-2 flex gap-1">
                      <Badge className={`${statusColors[girl.status as keyof typeof statusColors]} uppercase text-[9px] font-bold border-0`}>
                        {girl.status}
                      </Badge>
                    </div>
                    
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <h3 className="font-bold text-lg leading-tight mb-1">{girl.name}, {girl.age}</h3>
                      <div className="flex items-center text-[10px] text-muted-foreground font-mono mb-3">
                        <Clock className="w-3 h-3 mr-1" />
                        {girl.serviceStart} - {girl.serviceEnd}
                      </div>
                      
                      <Button
                        size="sm"
                        className="w-full font-bold text-xs h-8"
                        onClick={() => handleCall(girl.id)}
                      >
                        CALL NOW
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </main>

      <Navbar />
    </>
  );
}
