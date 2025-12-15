import { useState } from "react";
import { AppNav } from "@/components/layout/AppNav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResponseLibraryList } from "@/components/responses/ResponseLibraryList";
import { ResponsePracticeMode } from "@/components/responses/ResponsePracticeMode";
import { ResponseGapAnalysis } from "@/components/responses/ResponseGapAnalysis";
import { ResponseExport } from "@/components/responses/ResponseExport";
import { ResponseSuggestions } from "@/components/responses/ResponseSuggestions";
import { BookOpen, Target, AlertTriangle, Download, Wand2 } from "lucide-react";

export default function ResponseLibrary() {
  const [activeTab, setActiveTab] = useState("library");

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <div className="container mx-auto p-4 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Interview Response Library</h1>
          <p className="text-muted-foreground">
            Build and refine your best interview responses over time
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="library" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Library
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="flex items-center gap-2">
              <Wand2 className="h-4 w-4" />
              Suggest
            </TabsTrigger>
            <TabsTrigger value="practice" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Practice
            </TabsTrigger>
            <TabsTrigger value="gaps" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Gaps
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="mt-6">
            <ResponseLibraryList />
          </TabsContent>

          <TabsContent value="suggestions" className="mt-6">
            <ResponseSuggestions />
          </TabsContent>

          <TabsContent value="practice" className="mt-6">
            <ResponsePracticeMode />
          </TabsContent>

          <TabsContent value="gaps" className="mt-6">
            <ResponseGapAnalysis />
          </TabsContent>

          <TabsContent value="export" className="mt-6">
            <ResponseExport />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
