import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Search, ExternalLink, Palette, Component, Wand2, Copy, Download } from "lucide-react";

interface FigmaIntegrationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComponentSelected?: (component: any) => void;
}

interface DesignSystemComponent {
  key: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  componentSetId?: string;
}

interface DesignSystem {
  components: DesignSystemComponent[];
  tokens: {
    colors: any[];
    typography: any[];
    effects: any[];
  };
}

export function FigmaIntegration({ open, onOpenChange, onComponentSelected }: FigmaIntegrationProps) {
  const [fileKey, setFileKey] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("connect");
  const { toast } = useToast();

  // Extract file key from Figma URL
  const extractFileKey = (url: string): string => {
    const match = url.match(/figma\.com\/file\/([a-zA-Z0-9]+)/);
    return match ? match[1] : url;
  };

  // Fetch Figma file and design system data
  const { data: designSystemData, isLoading: isLoadingFile, error: fileError } = useQuery({
    queryKey: ["figma-file", fileKey],
    queryFn: () => fetch(`/api/figma/files/${extractFileKey(fileKey)}`).then(res => res.json()),
    enabled: !!fileKey && fileKey.length > 10,
    staleTime: 300000, // 5 minutes
  });

  // Search components mutation
  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await fetch(`/api/figma/files/${extractFileKey(fileKey)}/search`, {
        method: 'POST',
        body: JSON.stringify({ query }),
        headers: { 'Content-Type': 'application/json' }
      });
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Search results:', data);
    },
    onError: (error) => {
      toast({
        title: "Search failed",
        description: "Could not search components. Please check your Figma file access.",
        variant: "destructive"
      });
    }
  });

  const handleConnect = () => {
    if (!fileKey) {
      toast({
        title: "File required",
        description: "Please enter a Figma file URL or key",
        variant: "destructive"
      });
      return;
    }
    
    setSelectedTab("browse");
    toast({
      title: "Connected to Figma",
      description: "Successfully loaded your design system components"
    });
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    searchMutation.mutate(searchQuery);
  };

  const handleComponentSelect = (component: DesignSystemComponent) => {
    onComponentSelected?.(component);
    toast({
      title: "Component selected",
      description: `Added ${component.name} to your blueprint`
    });
  };

  const categorizeComponents = (components: DesignSystemComponent[]) => {
    const categories: Record<string, DesignSystemComponent[]> = {};
    components.forEach(component => {
      const category = component.category || 'misc';
      if (!categories[category]) categories[category] = [];
      categories[category].push(component);
    });
    return categories;
  };

  const generatePrototype = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Prompt required",
        description: "Please enter a description of what you want to create",
        variant: "destructive"
      });
      return;
    }

    try {
      const results = await searchMutation.mutateAsync(searchQuery);
      
      if (results.results && results.results.length > 0) {
        toast({
          title: "Prototype suggestions ready",
          description: `Found ${results.results.length} relevant components for your prompt`
        });
        setSelectedTab("browse");
      } else {
        toast({
          title: "No matches found",
          description: "Try refining your prompt or adding more specific terms",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Prototype generation error:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Component className="h-5 w-5" />
            Figma Design System Integration
          </DialogTitle>
          <DialogDescription>
            Connect your Figma file to access components and generate prototypes with AI
          </DialogDescription>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="connect">Connect</TabsTrigger>
            <TabsTrigger value="generate">AI Generate</TabsTrigger>
            <TabsTrigger value="browse">Browse Components</TabsTrigger>
          </TabsList>

          <TabsContent value="connect" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="figma-url">Figma File URL or Key</Label>
              <Input
                id="figma-url"
                placeholder="https://www.figma.com/file/your-file-key/File-Name or just the file key"
                value={fileKey}
                onChange={(e) => setFileKey(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                You can find the file key in your Figma URL or use the full URL
              </p>
            </div>
            
            <Button onClick={handleConnect} disabled={!fileKey || isLoadingFile}>
              {isLoadingFile ? "Connecting..." : "Connect to Figma"}
            </Button>

            {fileError && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                Failed to connect. Please check your file URL and ensure the file is accessible.
              </div>
            )}

            {designSystemData && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{designSystemData.file.name}</CardTitle>
                  <CardDescription>
                    Found {designSystemData.designSystem.components.length} components and {designSystemData.designSystem.tokens.colors.length} color tokens
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="generate" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prompt">Describe what you want to create</Label>
              <Textarea
                id="prompt"
                placeholder="Create a billing settings page with company info and payment method..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            
            <Button onClick={generatePrototype} disabled={searchMutation.isPending} className="w-full">
              <Wand2 className="h-4 w-4 mr-2" />
              {searchMutation.isPending ? "Generating..." : "Generate Prototype"}
            </Button>

            {searchMutation.data && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Component Suggestions</CardTitle>
                  <CardDescription>
                    Found {searchMutation.data.total} components that match your prompt
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2">
                    {searchMutation.data.results.slice(0, 5).map((component: DesignSystemComponent) => (
                      <div key={component.key} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="font-medium">{component.name}</p>
                          <p className="text-sm text-muted-foreground">{component.description}</p>
                        </div>
                        <Button size="sm" onClick={() => handleComponentSelect(component)}>
                          Use Component
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="browse" className="space-y-4">
            {designSystemData && (
              <>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Search components..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleSearch} disabled={searchMutation.isPending}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>

                <ScrollArea className="h-[400px]">
                  {searchMutation.data ? (
                    <div className="space-y-4">
                      <h3 className="font-semibold">Search Results ({searchMutation.data.total})</h3>
                      <div className="grid gap-2">
                        {searchMutation.data.results.map((component: DesignSystemComponent) => (
                          <Card key={component.key} className="p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium">{component.name}</h4>
                                {component.description && (
                                  <p className="text-sm text-muted-foreground mt-1">{component.description}</p>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="secondary" className="text-xs">
                                    {component.category}
                                  </Badge>
                                  {component.tags.map(tag => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              <Button size="sm" onClick={() => handleComponentSelect(component)}>
                                Select
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(categorizeComponents(designSystemData.designSystem.components)).map(([category, components]) => (
                        <div key={category}>
                          <h3 className="font-semibold capitalize mb-2">{category} ({components.length})</h3>
                          <div className="grid gap-2">
                            {components.map((component) => (
                              <Card key={component.key} className="p-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h4 className="font-medium">{component.name}</h4>
                                    {component.description && (
                                      <p className="text-sm text-muted-foreground mt-1">{component.description}</p>
                                    )}
                                    {component.tags.length > 0 && (
                                      <div className="flex gap-1 mt-2">
                                        {component.tags.map(tag => (
                                          <Badge key={tag} variant="outline" className="text-xs">
                                            {tag}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <Button size="sm" onClick={() => handleComponentSelect(component)}>
                                    Select
                                  </Button>
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}