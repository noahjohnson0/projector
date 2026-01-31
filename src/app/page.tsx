import { ProjectGrid } from "@/components/project-grid";
import { Dashboard } from "@/components/dashboard";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, LayoutDashboard, Projector } from "lucide-react";

export default function Home() {
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center gap-2 px-4">
            <Projector className="h-6 w-6 shrink-0" />
            <h1 className="text-xl font-bold tracking-tight">projector</h1>
          </div>
        </header>
        <main className="container px-4 py-8">
          <Tabs defaultValue="projects" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="projects" className="gap-2">
                <LayoutGrid className="h-4 w-4" />
                Projects
              </TabsTrigger>
              <TabsTrigger value="dashboard" className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </TabsTrigger>
            </TabsList>
            <TabsContent value="projects" forceMount className="data-[state=inactive]:hidden">
              <ProjectGrid />
            </TabsContent>
            <TabsContent value="dashboard" forceMount className="data-[state=inactive]:hidden">
              <Dashboard />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </TooltipProvider>
  );
}
