import { useState } from "react";
import { Play, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface VideoBlockProps {
  content: string;
  onChange: (content: string) => void;
  isEditing: boolean;
}

interface VideoData {
  url: string;
  title?: string;
  thumbnail?: string;
}

function parseVideoContent(content: string): VideoData | null {
  if (!content.trim()) return null;
  
  try {
    return JSON.parse(content);
  } catch {
    // If it's just a URL string, convert it
    if (content.includes('youtube.com') || content.includes('youtu.be') || content.includes('vimeo.com')) {
      return { url: content };
    }
    return null;
  }
}

function getVideoThumbnail(url: string): string {
  // YouTube thumbnail extraction
  if (url.includes('youtube.com/watch?v=')) {
    const videoId = url.split('v=')[1]?.split('&')[0];
    if (videoId) return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  }
  
  if (url.includes('youtu.be/')) {
    const videoId = url.split('youtu.be/')[1]?.split('?')[0];
    if (videoId) return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  }
  
  // Vimeo thumbnail would require API call, so we'll use a placeholder
  if (url.includes('vimeo.com')) {
    return 'https://via.placeholder.com/320x180/6366f1/white?text=Vimeo+Video';
  }
  
  // Generic video placeholder
  return 'https://via.placeholder.com/320x180/6366f1/white?text=Video';
}

function getEmbedUrl(url: string): string {
  // YouTube embed URL
  if (url.includes('youtube.com/watch?v=')) {
    const videoId = url.split('v=')[1]?.split('&')[0];
    if (videoId) return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}`;
  }
  
  if (url.includes('youtu.be/')) {
    const videoId = url.split('youtu.be/')[1]?.split('?')[0];
    if (videoId) return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}`;
  }
  
  // Vimeo embed URL
  if (url.includes('vimeo.com/')) {
    const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
    if (videoId) return `https://player.vimeo.com/video/${videoId}?dnt=1`;
  }
  
  return url;
}

export function VideoBlock({ content, onChange, isEditing }: VideoBlockProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("");

  const videoData = parseVideoContent(content);

  const handleSave = () => {
    if (videoUrl.trim()) {
      const newVideoData: VideoData = {
        url: videoUrl.trim(),
        title: videoTitle.trim() || undefined,
        thumbnail: getVideoThumbnail(videoUrl.trim())
      };
      onChange(JSON.stringify(newVideoData));
    }
    setIsEditorOpen(false);
    setVideoUrl("");
    setVideoTitle("");
  };

  const handleEdit = () => {
    if (videoData) {
      setVideoUrl(videoData.url);
      setVideoTitle(videoData.title || "");
    }
    setIsEditorOpen(true);
  };

  if (isEditing && !videoData) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 p-2 border-2 border-dashed border-gray-300 rounded">
        <Play className="h-8 w-8 text-gray-400" />
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setIsEditorOpen(true)}
        >
          Add Video
        </Button>
        
        <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Video</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="video-url">Video URL</Label>
                <Input
                  id="video-url"
                  placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="video-title">Title (optional)</Label>
                <Input
                  id="video-title"
                  placeholder="Video title"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditorOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={!videoUrl.trim()}>
                  Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (!videoData) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 p-2 text-gray-500">
        <span className="text-sm">No video</span>
      </div>
    );
  }

  const thumbnail = videoData.thumbnail || getVideoThumbnail(videoData.url);

  return (
    <>
      <div 
        className="h-full relative group cursor-pointer bg-black rounded overflow-hidden"
        onClick={() => window.open(videoData.url, '_blank')}
      >
        <img 
          src={thumbnail}
          alt={videoData.title || "Video thumbnail"}
          className="w-full h-full object-cover"
        />
        
        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
          <div className="bg-white/90 rounded-full p-3">
            <Play className="h-8 w-8 text-black ml-0.5" />
          </div>
        </div>
        
        {/* Title overlay */}
        {videoData.title && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
            <p className="text-white text-xs font-medium truncate">
              {videoData.title}
            </p>
          </div>
        )}

        {/* Edit button for editing mode */}
        {isEditing && (
          <Button
            variant="secondary"
            size="sm"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit();
            }}
          >
            Edit
          </Button>
        )}
      </div>



      {/* Edit dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Video</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="video-url">Video URL</Label>
              <Input
                id="video-url"
                placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="video-title">Title (optional)</Label>
              <Input
                id="video-title"
                placeholder="Video title"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditorOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!videoUrl.trim()}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}