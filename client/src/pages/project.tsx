import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { CreateBlueprintDialog } from "@/components/create-blueprint-dialog";
import { useState } from "react";

export default function Project() {
  const { id } = useParams();
  const [createBlueprintOpen, setCreateBlueprintOpen] = useState(false);

  const { data: project } = useQuery({
    queryKey: ['/api/projects', id],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) throw new Error('Failed to fetch project');
      return res.json();
    }
  });

  const { data: boards = [] } = useQuery({
    queryKey: ['/api/boards'],
    queryFn: async () => {
      const res = await fetch('/api/boards');
      if (!res.ok) throw new Error('Failed to fetch boards');
      return res.json();
    }
  });

  // Filter boards that belong to this project
  const projectBoards = boards.filter((board: any) => board.projectId === Number(id));

  return (
    <div className="container px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">{project?.name}</h1>
          <p className="text-muted-foreground">{project?.description}</p>
        </div>
        <Button onClick={() => setCreateBlueprintOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create New Blueprint
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projectBoards.map((board: any) => (
          <Card key={board.id}>
            <CardHeader>
              <CardTitle>{board.name}</CardTitle>
              <CardDescription>{board.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild className="w-full">
                <Link href={`/board/${board.id}`}>View Blueprint</Link>
              </Button>
            </CardContent>
          </Card>
        ))}

        {projectBoards.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>No blueprints yet</CardTitle>
              <CardDescription>Create your first blueprint for this project</CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>

      <CreateBlueprintDialog 
        open={createBlueprintOpen}
        onOpenChange={setCreateBlueprintOpen}
      />
    </div>
  );
}
