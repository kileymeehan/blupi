import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { FileText, Upload, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface PdfWorkflowImportProps {
  boardId: number;
  onImportComplete: () => void;
}

interface ImportResult {
  success: boolean;
  blocksCreated: number;
  workflowSteps: Array<{
    stepNumber: number;
    title: string;
    description: string;
  }>;
}

export function PdfWorkflowImport({ boardId, onImportComplete }: PdfWorkflowImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        toast({
          title: "Invalid file type",
          description: "Please select a PDF file.",
          variant: "destructive",
        });
        return;
      }
      
      if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File too large",
          description: "Please select a PDF file smaller than 10MB.",
          variant: "destructive",
        });
        return;
      }
      
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('pdf', file);

      console.log(`[PDF Import] Starting upload for file: ${file.name}, size: ${file.size} bytes`);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch(`/api/boards/${boardId}/import-pdf-workflow`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      console.log(`[PDF Import] Response status: ${response.status}`);

      let data;
      try {
        data = await response.json();
        console.log(`[PDF Import] Response data:`, data);
      } catch (parseError) {
        console.error('[PDF Import] Failed to parse response as JSON:', parseError);
        const text = await response.text();
        console.error('[PDF Import] Response text:', text);
        throw new Error('Server returned invalid response format');
      }

      if (!response.ok) {
        throw new Error(data.message || 'Failed to process PDF');
      }

      setResult(data);
      
      // Invalidate board query to refresh the data
      queryClient.invalidateQueries({ queryKey: [`/api/boards/${boardId}`] });
      
      toast({
        title: "PDF workflow imported successfully!",
        description: `Created ${data.blocksCreated} workflow steps from your PDF.`,
      });

      onImportComplete();
    } catch (error) {
      console.error('PDF import error:', error);
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Failed to process PDF workflow",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const resetForm = () => {
    setFile(null);
    setResult(null);
    setUploadProgress(0);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Import PDF Workflow</h3>
        <p className="text-sm text-muted-foreground">
          Upload a PDF with numbered workflow steps and we'll automatically create blocks with attached screenshots.
        </p>
      </div>

      {!result && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="pdf-file">Select PDF File</Label>
            <Input
              id="pdf-file"
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              disabled={isUploading}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Maximum file size: 10MB. PDF should contain numbered steps (e.g., "Step 1", "2", etc.)
            </p>
          </div>

          {file && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="text-sm font-medium">{file.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({(file.size / 1024 / 1024).toFixed(1)} MB)
                </span>
              </div>
            </div>
          )}

          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Upload className="h-4 w-4 animate-pulse" />
                Processing PDF workflow...
              </div>
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-xs text-muted-foreground">
                Our AI is analyzing your PDF and extracting workflow steps...
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="flex-1"
            >
              {isUploading ? (
                <>
                  <Upload className="w-4 h-4 mr-2 animate-pulse" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Import Workflow
                </>
              )}
            </Button>
            
            {file && !isUploading && (
              <Button variant="outline" onClick={resetForm}>
                Clear
              </Button>
            )}
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h4 className="font-semibold text-green-800">Import Successful!</h4>
            </div>
            <p className="text-sm text-green-700 mb-3">
              Created {result.blocksCreated} workflow blocks from your PDF.
            </p>
            
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-green-800">Extracted Steps:</h5>
              <div className="space-y-1">
                {result.workflowSteps.map((step, index) => (
                  <div key={index} className="text-xs text-green-700 bg-green-100 rounded p-2">
                    <span className="font-medium">Step {step.stepNumber}:</span> {step.title}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Button onClick={resetForm} variant="outline" className="w-full">
            Import Another PDF
          </Button>
        </div>
      )}

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-700">
            <p className="font-medium mb-1">Tips for best results:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Use clear step numbering (1, 2, 3 or Step 1, Step 2, etc.)</li>
              <li>Include screenshots or images for each step</li>
              <li>Keep step descriptions concise and actionable</li>
              <li>Ensure good image quality for better cropping</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}