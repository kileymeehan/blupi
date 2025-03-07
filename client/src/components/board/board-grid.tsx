1:import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
2:import { Button } from "@/components/ui/button";
3:import { Plus, GripVertical, Home, LayoutGrid, UserCircle2, ArrowUpFromLine, Pencil, Trash2, MessageSquare, ChevronLeft, ChevronRight, FolderPlus, Info, Upload, Folder, User, FileDown } from "lucide-react";
4:import { useLocation, Link } from "wouter";
5:import { useState, useRef } from "react";
6:import { Textarea } from "@/components/ui/textarea";
7:import Block from "./block";
8:import BlockDrawer from "./block-drawer";
9:import { CommentDialog } from "./comment-dialog";
10:import type { Board, Block as BlockType, Phase } from "@shared/schema";
11:import { nanoid } from "nanoid";
12:import ImageUpload from './image-upload';
13:import { CommentsOverview } from "./comments-overview";
14:import { useQuery } from '@tanstack/react-query';
15:import AddToProjectDialog from "./add-to-project-dialog";
16:import { StatusSelector } from "@/components/status-selector";
17:import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
18:import { useToast } from "@/hooks/use-toast";
19://import { Notifications } from "@/components/notifications/notifications";
20://import { useNotifications } from "@/lib/notifications-provider";
21:import {
22:  DropdownMenu,
23:  DropdownMenuContent,
24:  DropdownMenuItem,
25:  DropdownMenuSeparator,
26:  DropdownMenuTrigger
27:} from "@/components/ui/dropdown-menu";
28:import { Input } from "@/components/ui/input";
29:import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
30:import { UserPlus, Link as LinkIcon } from "lucide-react";
31:import { jsPDF } from 'jspdf';
32:import html2canvas from 'html2canvas';
33:
34:interface BoardGridProps {
35:  id: string;
36:  onBlocksChange: (blocks: BlockType[]) => void;
37:  onPhasesChange: (phases: Phase[]) => void;
38:  onBoardChange: (board: Board) => void;
39:}
40:
41:export default function BoardGrid({ id, onBlocksChange, onPhasesChange, onBoardChange }: BoardGridProps) {
42:  const [_, setLocation] = useLocation();
43:  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
44:  const [isEditingName, setIsEditingName] = useState(false);
45:  const [selectedBlock, setSelectedBlock] = useState<BlockType | null>(null);
46:  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
47:  const [showComments, setShowComments] = useState(false);
48:  const [showBlocks, setShowBlocks] = useState(true);
49:  const [highlightedBlockId, setHighlightedBlockId] = useState<string | null>(null);
50:  const [addToProjectOpen, setAddToProjectOpen] = useState(false);
51:  const [showContext, setShowContext] = useState(false);
52:  const [blueprintDetails, setBlueprintDetails] = useState("");
53:  const [personaDetails, setPersonaDetails] = useState("");
54:  const [personaImage, setPersonaImage] = useState<string | null>(null);
55:  const [inviteOpen, setInviteOpen] = useState(false);
56:  const [shareLinkOpen, setShareLinkOpen] = useState(false);
57:  const [shareLink, setShareLink] = useState("");
58:  const boardRef = useRef<HTMLDivElement>(null);
59:  const { toast } = useToast();
60:
61:  const { data: board, isLoading: boardLoading, error } = useQuery({
62:    queryKey: ['/api/boards', id],
63:    queryFn: async () => {
64:      const res = await fetch(`/api/boards/${id}`);
65:      if (!res.ok) {
66:        if (res.status === 429) {
67:          throw new Error("Too many requests. Please wait a moment before trying again.");
68:        }
69:        throw new Error('Failed to fetch board');
70:      }
71:      return res.json();
72:    },
73:    refetchInterval: 5000,
74:    retry: (failureCount, error) => {
75:      if (error instanceof Error && error.message.includes("Too many requests")) {
76:        return false;
77:      }
78:      return failureCount < 3;
79:    },
80:    gcTime: 1000 * 60 * 5,
81:  });
82:
83:  const { data: project } = useQuery({
84:    queryKey: ['/api/projects', board?.projectId],
85:    queryFn: async () => {
86:      if (!board?.projectId) return null;
87:      const res = await fetch(`/api/projects/${board.projectId}`);
88:      if (!res.ok) throw new Error('Failed to fetch project');
89:      return res.json();
90:    },
91:    enabled: !!board?.projectId,
92:  });
93:
94:  if (boardLoading || !board) {
95:    return (
96:      <div className="flex items-center justify-center min-h-screen">
97:        <div className="text-lg">Loading project...</div>
98:      </div>
99:    );
100:  }
101:
102:  if (error) {
103:    return (
104:      <div className="flex items-center justify-center min-h-screen">
105:        <div className="text-center">
106:          <div className="text-lg text-red-600 mb-2">{error.message}</div>
107:          <div className="text-sm text-gray-600">Please wait a moment and try again</div>
108:        </div>
109:      </div>
110:    );
111:  }
112:
113:  const handleDragEnd = (result: DropResult) => {
114:    if (!result.destination) return;
115:
116:    const { source, destination, type } = result;
117:
118:    if (type === 'COLUMN') {
119:      const sourcePhaseIndex = Number(source.droppableId.split('-')[1]);
120:      const destPhaseIndex = Number(destination.droppableId.split('-')[1]);
121:
122:      const newPhases = Array.from(board.phases);
123:      const sourcePhase = newPhases[sourcePhaseIndex];
124:      const destPhase = newPhases[destPhaseIndex];
125:
126:      const [movedColumn] = sourcePhase.columns.splice(source.index, 1);
127:      destPhase.columns.splice(destination.index, 0, movedColumn);
128:
129:      const blocks = Array.from(board.blocks);
130:      blocks.forEach(block => {
131:        if (block.phaseIndex === sourcePhaseIndex && block.columnIndex === source.index) {
132:          block.phaseIndex = destPhaseIndex;
133:          block.columnIndex = destination.index;
134:        } else {
135:          if (block.phaseIndex === sourcePhaseIndex && block.columnIndex > source.index) {
136:            block.columnIndex--;
137:          }
138:          if (block.phaseIndex === destPhaseIndex && block.columnIndex >= destination.index) {
139:            block.columnIndex++;
140:          }
141:        }
142:      });
143:
144:      onPhasesChange(newPhases);
145:      onBlocksChange(blocks);
146:      return;
147:    }
148:
149:    if (!type || type === 'DEFAULT') {
150:      const blocks = Array.from(board.blocks);
151:
152:      if (destination.droppableId === 'drawer') {
153:        const updatedBlocks = blocks.filter(b => b.id !== result.draggableId);
154:        onBlocksChange(updatedBlocks);
155:        return;
156:      }
157:
158:      if (source.droppableId === 'drawer') {
159:        const blockType = result.draggableId.replace('drawer-', '');
160:        const [phaseIndex, columnIndex] = destination.droppableId.split('-').map(Number);
161:
162:        const newBlock: BlockType = {
163:          id: nanoid(),
164:          type: blockType as BlockType['type'],
165:          content: '',
166:          phaseIndex,
167:          columnIndex,
168:          comments: [],
169:          attachments: [],
170:          notes: "",
171:          emoji: ""
172:        };
173:
174:        blocks.splice(destination.index, 0, newBlock);
175:        onBlocksChange(blocks);
176:        return;
177:      }
178:
179:      const [movedBlock] = blocks.splice(source.index, 1);
180:      const [phaseIndex, columnIndex] = destination.droppableId.split('-').map(Number);
181:
182:      const updatedBlock = {
183:        ...movedBlock,
184:        phaseIndex,
185:        columnIndex
186:      };
187:
188:      blocks.splice(destination.index, 0, updatedBlock);
189:      onBlocksChange(blocks);
190:    }
191:  };
192:
193:  const handleBlockChange = (blockId: string, content: string) => {
194:    const blocks = board.blocks.map(block =>
195:      block.id === blockId ? { ...block, content: content } : block
196:    );
197:    onBlocksChange(blocks);
198:  };
199:
200:  const handleAttachmentChange = (blockId: string, attachments: Attachment[]) => {
201:    const blocks = board.blocks.map(block =>
202:      block.id === blockId ? { ...block, attachments } : block
203:    );
204:    onBlocksChange(blocks);
205:  };
206:
207:  const handleNotesChange = (blockId: string, notes: string) => {
208:    const blocks = board.blocks.map(block =>
209:      block.id === blockId ? { ...block, notes } : block
210:    );
211:    onBlocksChange(blocks);
212:  };
213:
214:  const handleEmojiChange = (blockId: string, emoji: string) => {
215:    const blocks = board.blocks.map(block =>
216:      block.id === blockId ? { ...block, emoji } : block
217:    );
218:    onBlocksChange(blocks);
219:  };
220:
221:  const handleAddColumn = (phaseIndex: number) => {
222:    const newPhases = [...board.phases];
223:    const newColumn: { id: string; name: string; image?: string | undefined } = {
224:      id: nanoid(),
225:      name: `Step ${newPhases[phaseIndex].columns.length + 1}`,
226:      image: undefined
227:    };
228:
229:    newPhases[phaseIndex].columns.push(newColumn);
230:    onPhasesChange(newPhases);
231:  };
232:
233:  const handleAddPhase = () => {
234:    const newPhases = [...board.phases];
235:    newPhases.push({
236:      id: nanoid(),
237:      name: `Phase ${newPhases.length + 1}`,
238:      columns: [{
239:        id: nanoid(),
240:        name: 'Step 1',
241:        image: undefined
242:      }]
243:    });
244:
245:    onPhasesChange(newPhases);
246:  };
247:
248:  const handlePhaseNameChange = (phaseIndex: number, name: string) => {
249:    const newPhases = [...board.phases];
250:    newPhases[phaseIndex].name = name;
251:    onPhasesChange(newPhases);
252:  };
253:
254:  const handleColumnNameChange = (phaseIndex: number, columnIndex: number, name: string) => {
255:    const newPhases = [...board.phases];
256:    newPhases[phaseIndex].columns[columnIndex].name = name;
257:    onPhasesChange(newPhases);
258:  };
259:
260:  const handleBoardNameChange = (name: string) => {
261:    onBoardChange({ ...board, name });
262:  };
263:
264:  const handleClose = () => {
265:    setLocation('/');
266:  };
267:
268:  const handleImageChange = (phaseIndex: number, columnIndex: number, image: string | null) => {
269:    const newPhases = [...board.phases];
270:    newPhases[phaseIndex].columns[columnIndex].image = image || undefined;
271:    onPhasesChange(newPhases);
272:  };
273:
274:  const handleDeleteColumn = (phaseIndex: number, columnIndex: number) => {
275:    const newPhases = [...board.phases];
276:    newPhases[phaseIndex].columns.splice(columnIndex, 1);
277:
278:    const newBlocks = board.blocks.filter(block =>
279:      !(block.phaseIndex === phaseIndex && block.columnIndex === columnIndex)
280:    ).map(block => {
281:      if (block.phaseIndex === phaseIndex && block.columnIndex > columnIndex) {
282:        return { ...block, columnIndex: block.columnIndex - 1 };
283:      }
284:      return block;
285:    });
286:
287:    onPhasesChange(newPhases);
288:    onBlocksChange(newBlocks);
289:  };
290:
291:  const handleCommentClick = (block: BlockType) => {
292:    setSelectedBlock(block);
293:    setCommentDialogOpen(true);
294:    setHighlightedBlockId(block.id);
295:    setTimeout(() => setHighlightedBlockId(null), 2000);
296:  };
297:
298:  const toggleContext = () => {
299:    if (showContext) {
300:      setShowContext(false);
301:    } else {
302:      setShowContext(true);
303:      setShowBlocks(false);
304:      setShowComments(false);
305:      if (!isDrawerOpen) {
306:        setIsDrawerOpen(true);
307:      }
308:    }
309:  };
310:
311:  const toggleBlocks = () => {
312:    if (showBlocks) {
313:      setShowBlocks(false);
314:    } else {
315:      setShowBlocks(true);
316:      setShowContext(false);
317:      setShowComments(false);
318:      if (!isDrawerOpen) {
319:        setIsDrawerOpen(true);
320:      }
321:    }
322:  };
323:
324:  const toggleComments = () => {
325:    if (showComments) {
326:      setShowComments(false);
327:    } else {
328:      setShowComments(true);
329:      setShowContext(false);
330:      setShowBlocks(false);
331:      if (!isDrawerOpen) {
332:        setIsDrawerOpen(true);
333:      }
334:    }
335:  };
336:
337:  const toggleSidebar = () => {
338:    setIsDrawerOpen(!isDrawerOpen);
339:    if (!isDrawerOpen) {
340:      setShowComments(false);
341:      setShowBlocks(false);
342:    }
343:  };
344:
345:  const handleDeleteBoard = async () => {
346:    try {
347:      const res = await fetch(`/api/boards/${id}`, {
348:        method: 'DELETE'
349:      });
350:      if (!res.ok) throw new Error('Failed to delete blueprint');
351:      setLocation('/');
352:    } catch (error) {
353:      toast({
354:        title: "Error",
355:        description: error instanceof Error ? error.message : 'Failed to delete blueprint',
356:        variant: "destructive"
357:      });
358:    }
359:  };
360:
361:  const handleExportPDF = async () => {
362:    if (!boardRef.current) return;
363:
364:    const uiElements = boardRef.current.querySelectorAll('.hide-in-pdf');
365:    uiElements.forEach(el => (el.classList.add('opacity-0')));
366:
367:
368:    try {
369:      await exportToPDF(boardRef.current, board.name);
370:    } finally {
371:      uiElements.forEach(el => el.classList.remove('opacity-0'));
372:    }
373:  };
374:
375:  const exportToPDF = async (boardRef: HTMLElement, boardName: string) => {
376:    const pdf = new jsPDF('landscape', 'pt', 'a4');
377:
378:    const canvas = await html2canvas(boardRef, {
379:      scale: 2,
380:      useCORS: true,
381:      logging: false,
382:      allowTaint: true,
383:      ignoreElements: (element) => {
384:        return element.classList.contains('hide-in-pdf');
385:      }
386:    });
387:
388:    const imgWidth = 842;
389:    const imgHeight = (canvas.height * imgWidth) / canvas.width;
390:
391:    pdf.addImage(
392:      canvas.toDataURL('image/png'),
393:      'PNG',
394:      0,
395:      0,
396:      imgWidth,
397:      imgHeight
398:    );
399:
400:    pdf.save(`${boardName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_blueprint.pdf`);
401:  };
402:
403:  const LAYER_TYPES = [
404:    { type: 'touchpoint', label: 'Touchpoint', color: 'bg-blue-600/20' },
405:    { type: 'email', label: 'Email Touchpoint', color: 'bg-indigo-500/20' },
406:    { type: 'pendo', label: 'Pendo Touchpoint', color: 'bg-cyan-600/20' },
407:    { type: 'role', label: 'Role', color: 'bg-green-200' },
408:    { type: 'process', label: 'Process', color: 'bg-pink-200' },
409:    { type: 'friction', label: 'Friction', color: 'bg-red-200' },
410:    { type: 'policy', label: 'Policy', color: 'bg-orange-200' },
411:    { type: 'technology', label: 'Technology', color: 'bg-purple-200' },
412:    { type: 'rationale', label: 'Rationale', color: 'bg-blue-200' },
413:    { type: 'question', label: 'Question', color: 'bg-violet-200' },
414:    { type: 'note', label: 'Note', color: 'bg-cyan-200' },
415:    { type: 'hidden', label: 'Hidden Step', color: 'bg-gray-400' }
416:  ] as const;
417:
418:  interface Attachment {
419:    type: 'link' | 'image' | 'video';
420:    url: string;
421:  }
422:
423:  const handleShareLinkCopy = (link: string) => {
424:    navigator.clipboard.writeText(link);
425:    toast({
426:      title: "Link copied",
427:      description: "Link has been copied to clipboard",
428:      type: "success"
429:    });
430:  }
431:
432:
433:  return (
434:    <div className="min-h-screen bg-background">
435:      <header className="h-20 border-b border-gray-300 px-8 flex justify-between items-center bg-gray-50 shadow-sm flex-shrink-0">
436:        <div className="flex items-center gap-4 pl-4">
437:          <Button
438:            variant="ghost"
439:            size="sm"
440:            onClick={handleClose}
441:            className="h-10 px-3 -ml-3"
442:          >
443:            <Home className="w-5 h-5 mr-2" />
444:            Home
445:          </Button>
446:
447:          {project && (
448:            <>
449:              <div className="w-px h-6 bg-gray-200 mx-2" />
450:              <Button
451:                variant="ghost"
452:                size="sm"
453:                asChild
454:                className="h-10 px-3"
455:              >
456:                <Link href={`/project/${project.id}`}>
457:                  <div className="flex items-center">
458:                    <Folder className="w-5 h-5 mr-2" />
459:                    {project.name}
460:                  </div>
461:                </Link>
462:              </Button>
463:            </>
464:          )}
465:
466:          <div className="w-px h-6 bg-gray-200 mx-2" />
467:
468:          <div className="group flex items-center gap-2">
469:            <div
470:              contentEditable
471:              onFocus={() => setIsEditingName(true)}
472:              onBlur={(e) => {
473:                setIsEditingName(false);
474:                handleBoardNameChange(e.currentTarget.textContent || '');
475:              }}
476:              className="text-2xl font-bold focus:outline-none focus:border-b border-primary"
477:              suppressContentEditableWarning={true}
478:            >
479:              {board.name}
480:            </div>
481:            <Pencil className={`w-4 h-4 text-gray-400 transition-opacity duration-200 ${isEditingName ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
482:          </div>
483:
484:          <div className="w-px h-6 bg-gray-200 mx-2" />
485:
486:          <StatusSelector
487:            type="board"
488:            value={board.status}
489:            onChange={(status) => onBoardChange({ ...board, status })}
490:          />
491:        </div>
492:
493:        <div className="flex items-center">
494:          <div className="w-px h-6 bg-gray-200 mx-3" />
495:          <div className="flex items-center gap-2">
496:            <Button
497:              variant="ghost"
498:              size="sm"
499:              onClick={() => setAddToProjectOpen(true)}
500:              className="h-9 w-9 p-0"
501:            >
502:              <FolderPlus className="w-4 h-4" />
503:            </Button>
504:
505:            <DropdownMenu>
506:              <DropdownMenuTrigger asChild>
507:                <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
508:                  <ArrowUpFromLine className="w-4 h-4" />
509:                </Button>
510:              </DropdownMenuTrigger>
511:              <DropdownMenuContent align="end" className="w-56">
512:                <DropdownMenuItem onSelect={() => setInviteOpen(true)}>
513:                  <UserPlus className="w-4 h-4 mr-2" />
514:                  Invite Team Members
515:                </DropdownMenuItem>
516:                <DropdownMenuItem onSelect={() => setShareLinkOpen(true)}>
517:                  <LinkIcon className="w-4 h-4 mr-2" />
518:                  Generate Share Link
519:                </DropdownMenuItem>
520:                <DropdownMenuSeparator />
521:                <DropdownMenuItem onSelect={handleExportPDF}>
522:                  <FileDown className="w-4 h-4 mr-2" />
523:                  Export as PDF
524:                </DropdownMenuItem>
525:              </DropdownMenuContent>
526:            </DropdownMenu>
527:
528:            <DropdownMenu>
529:              <DropdownMenuTrigger asChild>
530:                <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
531:                  <UserCircle2 className="w-4 h-4" />
532:                </Button>
533:              </DropdownMenuTrigger>
534:              <DropdownMenuContent align="end" className="w-56">
535:                <DropdownMenuItem asChild>
536:                  <Link href="/profile">
537:                    <User className="w-4 h-4 mr-2" />
538:                    Profile Settings
539:                  </Link>
540:                </DropdownMenuItem>
541:              </DropdownMenuContent>
542:            </DropdownMenu>
543:
544:            <AlertDialog>
545:              <AlertDialogTrigger asChild>
546:                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50">
547:                  <Trash2 className="w-4 h-4" />
548:                </Button>
549:              </AlertDialogTrigger>
550:              <AlertDialogContent>
551:                <AlertDialogHeader>
552:                  <AlertDialogTitle>Delete Blueprint</AlertDialogTitle>
553:                  <AlertDialogDescription>
554:                    Are you sure you want to delete this blueprint? This action cannot be undone.
555:                  </AlertDialogDescription>
556:                </AlertDialogHeader>
557:                <AlertDialogFooter>
558:                  <AlertDialogCancel>Cancel</AlertDialogCancel>
559:                  <AlertDialogAction onClick={handleDeleteBoard} className="bg-red-600 hover:bg-red-700">
560:                    Delete
561:                  </AlertDialogAction>
562:                </AlertDialogFooter>
563:              </AlertDialogContent>
564:            </AlertDialog>
565:          </div>
566:        </div>
567:      </header>
568:
569:      <div className="flex flex-1 overflow-hidden">
570:        <DragDropContext onDragEnd={handleDragEnd}>
571:          <div className={`${isDrawerOpen ? 'w-72' : 'w-16'} bg-white border-r border-gray-300 flex-shrink-0 shadow-md transition-all duration-300 ease-in-out relative min-h-[calc(100vh-5rem)] flex flex-col`}>
572:            <div className="flex flex-col flex-grow bg-slate-50">
573:              <div className="border-b border-gray-200 bg-white shadow-sm">
574:                <Button
575:                  variant="ghost"
576:                  size="sm"
577:                  onClick={toggleContext}
578:                  className={`
579:                    w-full h-12 px-4
580:                    flex items-center gap-2
581:                    group
582:                    ${!isDrawerOpen ? 'justify-center' : 'justify-start'}
583:                    ${showContext ? 'bg-gray-100 font-semibold' : 'hover:bg-gray-50'}
584:                  `}
585:                >
586:                  <Info className="w-5 h-5" />
587:                  {isDrawerOpen && <span className="text-sm">Context</span>}
588:                </Button>
589:
590:                <Button
591:                  variant="ghost"
592:                  size="sm"
593:                  onClick={toggleBlocks}
594:                  className={`
595:                    w-full h-12 px-4
596:                    flex items-center gap-2
597:                    group
598:                    ${!isDrawerOpen ? 'justify-center' : 'justify-start'}
599:                    ${showBlocks ? 'bg-gray-100 font-semibold' : 'hover:bg-gray-50'}
600:                  `}
601:                >
602:                  <LayoutGrid className="w-5 h-5" />
603:                  {isDrawerOpen && <span className="text-sm">Available Boxes</span>}
604:                </Button>
605:
606:                <Button<replit_final_file>
                  variant="ghost"
608:                  size="sm"
609:                  onClick={toggleComments}
610:                  className={`
611:                    w-full h-12 px-4
612:                    flex items-center gap-2
613:                    group
614:                    ${!isDrawerOpen ? 'justify-center' : 'justify-start'}
615:                    ${showComments ? 'bg-gray-100 font-semibold' : 'hover:bg-gray-50'}
616:                  `}
617:                >
618:                  <MessageSquare className="w-5 h-5" />
619:                  {isDrawerOpen && <span className="text-sm">All Comments</span>}
620:                </Button>
621:              </div>
622:
623:              <Button
624:                variant="ghost"
625:                size="sm"
626:                onClick={toggleSidebar}
627:                className="absolute top-2 -right-4 w-8 h-8 rounded-full bg-white shadow-md z-50 hover:bg-gray-100"
628:              >
629:                {isDrawerOpen ? (
630:                  <ChevronLeft className="w-4 h-4" />
631:                ) : (
632:                  <ChevronRight className="w-4 h-4" />
633:                )}
634:              </Button>
635:
636:              {isDrawerOpen && (
637:                <div className="flex-1 flex flex-col bg-slate-50">
638:                  <div className={`flex-1 ${showContext ? 'block' : 'hidden'}`}>
639:                    <div className="p-4 space-y-4">
640:                      <div>
641:                        <label className="text-sm font-medium mb-2 block">
642:                          Blueprint Details
643:                        </label>
644:                        <Textarea
645:                          placeholder="Add key details about this blueprint..."
646:                          value={blueprintDetails}
647:                          onChange={(e) => setBlueprintDetails(e.target.value)}
648:                          className="min-h-[150px] resize-none"
649:                        />
650:                      </div>
651:
652:                      <div className="space-y-2">
653:                        <label className="text-sm font-medium block">
654:                          Persona
655:                        </label>
656:                        <div
657:                          className="w-full h-40 bg-white rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-primary transition-colors"
658:                          onClick={() => document.getElementById('persona-image')?.click()}
659:                        >
660:                          {personaImage ? (
661:                            <img
662:                              src={personaImage}
663:                              alt="Persona"
664:                              className="w-full h-full object-cover rounded-lg"
665:                            />
666:                          ) : (
667:                            <div className="text-center">
668:                              <Upload className="w-8 h-8 mx-auto text-gray-400" />
669:                              <span className="text-sm text-gray-500 mt-2 block">
670:                                Upload persona image
671:                              </span>
672:                            </div>
673:                          )}
674:                          <input
675:                            id="persona-image"
676:                            type="file"
677:                            accept="image/*"
678:                            className="hidden"
679:                            onChange={(e) => {
680:                              const file = e.target.files?.[0];
681:                              if (file) {
682:                                const reader = new FileReader();
683:                                reader.onloadend = () => {
684:                                  setPersonaImage(reader.result as string);
685:                                };
686:                                reader.readAsDataURL(file);
687:                              }
688:                            }}
689:                          />
690:                        </div>
691:                        <Textarea
692:                          placeholder="Describe the persona..."
693:                          value={personaDetails}
694:                          onChange={(e) => setPersonaDetails(e.target.value)}
695:                          className="min-h-[100px] resize-none mt-2"
696:                        />
697:                      </div>
698:                    </div>
699:                  </div>
700:
701:                  <div className={`flex-1 ${showBlocks ? 'block' : 'hidden'}`}>
702:                    <Droppable droppableId="drawer">
703:                      {(provided) => (
704:                        <div
705:                          ref={provided.innerRef}
706:                          {...provided.droppableProps}
707:                          className="p-4"
708:                        >
709:                          <BlockDrawer />
710:                          {provided.placeholder}
711:                        </div>
712:                      )}
713:                    </Droppable>
714:                  </div>
715:
716:                  <div className={`flex-1 ${showComments ? 'block' : 'hidden'}`}>
717:                    <CommentsOverview
718:                      board={board}
719:                      onCommentClick={(block) => {
720:                        setSelectedBlock(block);
721:                        setCommentDialogOpen(true);
722:                        setHighlightedBlockId(block.id);
723:                        setTimeout(() => setHighlightedBlockId(null), 2000);
724:                      }}
725:                    />
726:                  </div>
727:                </div>
728:              )}
729:            </div>
730:          </div>
731:
732:          <div className="flex-1 overflow-x-auto">
733:            <div
734:              className="min-w-[800px] relative"
735:            >
736:              <div ref={boardRef} className="p-8">
737:                <div className="flex items-start gap-8">
738:                  {board.phases.map((phase, phaseIndex) => (
739:                    <div key={phase.id} className="flex-shrink-0 relative mr-8">
740:                      {phaseIndex > 0 && (
741:                        <div className="absolute -left-4 top-0 bottom-0 w-[1px] bg-gray-300" />
742:                      )}
743:                      <div className="px-4">
744:                        <div className="mb-4 border-[2px] border-gray-700 rounded-lg p-3">
745:                          <div className="flex items-center justify-between mb-1">
746:                            <div
747:                              contentEditable
748:                              onBlur={(e) => handlePhaseNameChange(phaseIndex, e.currentTarget.textContent || '')}
749:                              className="font-bold text-lg focus:outline-none focus:border-b border-primary"
750:                              suppressContentEditableWarning={true}
751:                            >
752:                              {phase.name}
753:                            </div>
754:                            <Button
755:                              variant="outline"
756:                              size="sm"
757:                              onClick={() => handleAddColumn(phaseIndex)}
758:                              className="h-7 px-2 border border-gray-300 hide-in-pdf"
759:                            >
760:                              <Plus className="w-4 h-4 mr-1" />
761:                              Step
762:                            </Button>
763:                          </div>
764:                        </div>
765:
766:                        <Droppable droppableId={`phase-${phaseIndex}`} type="COLUMN" direction="horizontal">
767:                          {(provided) => (
768:                            <div
769:                              ref={provided.innerRef}
770:                              {...provided.droppableProps}
771:                              className="flex gap-8"
772:                            >
773:                              {phase.columns.map((column, columnIndex) => (
774:                                <div
775:                                  key={column.id}
776:                                  className="flex-shrink-0 w-[225px]"
777:                                >
778:                                  <div className="flex items-center gap-2 mb-2">
779:                                    <div
780:                                      className="cursor-grab hover:text-gray-900 text-gray-600 p-1 -ml-1 rounded hover:bg-gray-100 active:cursor-grabbing"
781:                                    >
782:                                      <GripVertical className="w-4 h-4" />
783:                                    </div>
784:                                    <div
785:                                      contentEditable
786:                                      onBlur={(e) => handleColumnNameChange(phaseIndex, columnIndex, e.currentTarget.textContent || '')}
787:                                      className="font-medium text-sm focus:outline-none focus-visible:border-b focus-visible:border-primary flex-1"
788:                                      suppressContentEditableWarning={true}
789:                                    >
790:                                      {column.name}
791:                                    </div>
792:                                    <Button
793:                                      variant="ghost"
794:                                      size="sm"
795:                                      onClick={() => handleDeleteColumn(phaseIndex, columnIndex)}
796:                                      className="h-6 w-6 p-0 hover:text-red-500 hide-in-pdf"
797:                                    >
798:                                      <Trash2 className="w-4 h-4" />
799:                                    </Button>
800:                                  </div>
801:
802:                                  <ImageUpload
803:                                    currentImage={column.image}
804:                                    onImageChange={(image) => handleImageChange(phaseIndex, columnIndex, image)}
805:                                  />
806:
807:                                  <Droppable droppableId={`${phaseIndex}-${columnIndex}`}>
808:                                    {(provided, snapshot) => (
809:                                      <div
810:                                        ref={provided.innerRef}
811:                                        {...provided.droppableProps}
812:                                        className={`
813:                                          space-y-4 min-h-[100px] p-4 rounded-lg border-2 
814:                                          ${snapshot.isDraggingOver
815:                                            ? 'border-primary/50 bg-primary/5'
816:                                            : 'border-gray-200 hover:border-gray300'
817:                                          }
818:                                          transition-colors duration-200
819:                                        `}
820:                                      >
821:                                        {board.blocks
822:                                          .filter(b => b.phaseIndex === phaseIndex && b.columnIndex === columnIndex)
823:                                          .map((block, index) => (
824:                                            <Draggable
825:                                              key={block.id}
826:                                              draggableId={block.id}
827:                                              index={index}
828:                                            >
829:                                              {(provided, snapshot) => (
830:                                                <div
831:                                                  ref={provided.innerRef}
832:                                                  {...provided.draggableProps}
833:                                                  {...provided.dragHandleProps}
834:                                                  style={provided.draggableProps.style}
835:                                                  className={`
836:                                                    ${LAYER_TYPES.find(l => l.type === block.type)?.color}
837:                                                    group relative rounded-lg border mb-2 p-2
838:                                                    ${snapshot.isDragging ? 'shadow-lg' : 'border-gray-200'}
839:                                                    ${highlightedBlockId === block.id ? 'ring-2 ring-primary ring-offset-2' : ''}
840:                                                  `}
841:                                                >
842:                                                  <div
843:                                                    className="absolute top-0 left-0 right-0
844:                                                      flex items-center justify-center
845:                                                      h-6 px-2
846:                                                      rounded-sm opacity-0 group-hover:opacity-100
847:                                                      transition-opacity cursor-move bg-white/50 hover:bg-white/80"
848:                                                  >
849:                                                    <GripVertical className="w-4 h-4 text-gray-600" />
850:                                                  </div>
851:                                                  <Block
852:                                                    block={block}
853:                                                    onChange={(content) => handleBlockChange(block.id, content)}
854:                                                    onAttachmentChange={(attachments) => handleAttachmentChange(block.id, attachments)}
855:                                                    onNotesChange={(notes) => handleNotesChange(block.id, notes)}
856:                                                    onEmojiChange={(emoji) => handleEmojiChange(block.id, emoji)}
857:                                                    onCommentClick={() => handleCommentClick(block)}
858:                                                    projectId={board.projectId}
859:                                                    highlighted={block.id === highlightedBlockId}
860:                                                  />
861:                                                </div>
862:                                              )}
863:                                            </Draggable>
864:                                          ))}
865:                                          {provided.placeholder}
866:                                        </div>
867:                                      )}
868:                                    </Droppable>
869:                                  </div>
870:                                ))}
871:                              </div>
872:                            </div>
873:                          )}
874:                        </Droppable>
875:                      </div>
876:                    </div>
877:                  ))}
878:
879:                  <Button
880:                    variant="outline"
881:                    size="sm"
882:                    onClick={handleAddPhase}
883:                    className="mt-3 h-7 px-2 border border-gray-300 hide-in-pdf"
884:                  >
885:                    <Plus className="w-4 h-4 mr-1" />
886:                    Add Phase
887:                  </Button>
888:                </div>
889:              </div>
890:            </DragDropContext>
891:
892:            {selectedBlock && (
893:              <CommentDialog
894:                open={commentDialogOpen}
895:                onOpenChange={setCommentDialogOpen}
896:                block={selectedBlock}
897:                boardId={id}
898:                onCommentAdd={(comment) => {
899:                  const blocks = board.blocks.map(b =>
900:                    b.id === selectedBlock.id
901:                      ? { ...b, comments: [...(b.comments || []), comment] }
902:                      : b
903:                  );
904:                  onBlocksChange(blocks);
905:                }}
906:              />
907:            )}
908:
909:            <AddToProjectDialog
910:              open={addToProjectOpen}
911:              onOpenChange={setAddToProjectOpen}
912:              boardId={Number(id)}
913:            />
914:
915:            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
916:              <DialogContent>
917:                <DialogHeader>
918:                  <DialogTitle>Invite Team Members</DialogTitle>
919:                  <DialogDescription>
920:                    Add team members to collaborate on this blueprint.
921:                  </DialogDescription>
922:                </DialogHeader>
923:                <div className="mt-4">
924:                  <Input
925:                    type="email"
926:                    placeholder="Enter email addresses, separated by commas"
927:                    className="w-full"
928:                  />
929:                  <Button
930:                    onClick={() => {
931:                      setInviteOpen(false);
932:                      toast({
933:                        title: "Invitations sent",
934:                        description: "Team members will receive an email invitation"
935:                      });
936:                    }}
937:                    className="mt-4"
938:                  >
939:                    Send Invites
940:                  </Button>
941:                </div>
942:              </DialogContent>
943:            </Dialog>
944:
945:            <Dialog open={shareLinkOpen} onOpenChange={setShareLinkOpen}>
946:              <DialogContent>
947:                <DialogHeader>
948:                  <DialogTitle>Share Blueprint</DialogTitle>
949:                  <DialogDescription>
950:                    Share this blueprint with others using these links.
951:                  </DialogDescription>
952:                </DialogHeader>
953:                <div className="mt-4 space-y-4">
954:                  <div>
955:                    <h3 className="text-sm font-medium mb-2">Team Access Link</h3>
956:                    <div className="flex gap-2">
957:                      <Input
958:                        value={window.location.href}
959:                        readOnly
960:                        className="w-full"
961:                      />
962:                      <Button
963:                        onClick={() => handleShareLinkCopy(window.location.href)}
964:                      >
965:                        Copy
966:                      </Button>
967:                    </div>
968:                  </div>
969:                  <div>
970:                    <h3 className="text-sm font-medium mb-2">Public Access Link</h3>
971:                    <div className="flex gap-2">
972:                      <Input
973:                        value={`${window.location.origin}/public/board/${id}`}
974:                        readOnly
975:                        className="w-full"
976:                      />
977:                      <Button
978:                        onClick={() => handleShareLinkCopy(`${window.location.origin}/public/board/${id}`)}
979:                      >
980:                        Copy
981:                      </Button>
982:                    </div>
983:                  </div>
984:                </div>
985:              </DialogContent>
986:            </Dialog>
987:          </div>
988:        </div>
989:      </div>
990:    </div>
991:  );
992:}