import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

// Type for simplified JSON view
interface SimplifiedBlock {
  id: string;
  type: string;
  content: string;
  [key: string]: any;
}

export function TestBlueprintPage() {
  const [_, params] = useRoute<{ id: string }>("/test-blueprint/:id");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blueprint, setBlueprint] = useState<any>(null);

  useEffect(() => {
    async function fetchBlueprint() {
      if (!params?.id) return;
      
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/test-blueprint/${params.id}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to load blueprint');
        }
        
        const data = await response.json();
        setBlueprint(data);
        console.log("Blueprint loaded:", data);
      } catch (err) {
        console.error("Error loading blueprint:", err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    }
    
    fetchBlueprint();
  }, [params?.id]);

  function renderValue(value: any): React.ReactNode {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground">null</span>;
    }
    
    if (typeof value === 'object' && !Array.isArray(value)) {
      return (
        <div className="pl-4 border-l-2 border-gray-200">
          {Object.entries(value).map(([k, v]) => (
            <div key={k} className="mb-1">
              <span className="font-semibold text-blue-600">{k}:</span>{' '}
              {renderValue(v)}
            </div>
          ))}
        </div>
      );
    }
    
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-muted-foreground">[]</span>;
      }
      
      return (
        <div className="pl-4 border-l-2 border-gray-200">
          {value.map((item, i) => (
            <div key={i} className="mb-2">
              <span className="font-semibold text-green-600">[{i}]</span>{' '}
              {renderValue(item)}
            </div>
          ))}
        </div>
      );
    }
    
    if (typeof value === 'string' && value.length > 100) {
      return <span className="text-gray-700">{value.substring(0, 100)}...</span>;
    }
    
    return <span className="text-gray-700">{String(value)}</span>;
  }

  if (loading) {
    return (
      <div className="container py-8">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64 mb-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-16 w-full mb-4" />
            <Skeleton className="h-16 w-full mb-4" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-8">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Error Loading Blueprint</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!blueprint) {
    return (
      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle>No Blueprint Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Could not load blueprint data. Please check the ID and try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Create a simplified view of blocks
  const simplifiedBlocks: SimplifiedBlock[] = (blueprint.blocks || []).map((block: any) => ({
    id: block.id,
    type: block.type,
    content: block.content,
    department: block.department,
    comments: (block.comments || []).length,
    attachments: (block.attachments || []).length
  }));

  return (
    <div className="container py-8">
      <Card>
        <CardHeader>
          <CardTitle>{blueprint.name || 'Untitled Blueprint'}</CardTitle>
          <p className="text-muted-foreground">ID: {blueprint.id}</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Blueprint Details</h3>
              <div className="space-y-2">
                <div><span className="font-medium">Project ID:</span> {blueprint.projectId}</div>
                <div><span className="font-medium">Created:</span> {new Date(blueprint.createdAt).toLocaleString()}</div>
                <div><span className="font-medium">Status:</span> {blueprint.status}</div>
                <div><span className="font-medium">Block Count:</span> {simplifiedBlocks.length}</div>
                <div><span className="font-medium">Description:</span> {blueprint.description || 'No description'}</div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">Blocks Summary</h3>
              {simplifiedBlocks.length === 0 ? (
                <p className="text-muted-foreground">No blocks found in this blueprint.</p>
              ) : (
                <div className="max-h-[300px] overflow-y-auto pr-2">
                  {simplifiedBlocks.map(block => (
                    <div key={block.id} className="mb-3 p-2 border rounded-md">
                      <div className="font-medium">{block.type}</div>
                      <div className="text-sm text-muted-foreground truncate">{block.content}</div>
                      <div className="text-xs mt-1">
                        {block.department && <span className="inline-block bg-blue-100 text-blue-800 rounded-full px-2 py-0.5 mr-2">{block.department}</span>}
                        {block.comments > 0 && <span className="text-gray-500 mr-2">💬 {block.comments}</span>}
                        {block.attachments > 0 && <span className="text-gray-500">📎 {block.attachments}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Separator className="my-6" />
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Raw Blueprint Data</h3>
            <div className="bg-gray-50 p-4 rounded-md overflow-x-auto max-h-[400px] overflow-y-auto">
              {renderValue(blueprint)}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default TestBlueprintPage;