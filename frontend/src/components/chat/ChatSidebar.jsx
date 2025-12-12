import React, {useState} from 'react';
import {Button} from '../ui/button';
import {ScrollArea} from '../ui/scroll-area';
import {Input} from '../ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '../ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '../ui/alert-dialog';
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '../ui/dialog';
import {Label} from '../ui/label';
import {
    BarChart3,
    BookOpen,
    Calendar,
    Database,
    Edit2,
    MessageSquare,
    MoreHorizontal,
    Plus,
    Search,
    Trash2
} from 'lucide-react';
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from '../ui/dropdown-menu';
import {cn} from '../ui/utils';
import {formatBytes} from '../../utils/storageConfig';

const TIME_RANGE_LABELS = {
    'all': 'All Time',
    '1h': 'Last Hour',
    '24h': 'Last 24 Hours',
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    '6m': 'Last 6 Months',
    '1y': 'Last Year',
};

export function ChatSidebar({
                                conversations,
                                activeConversationId,
                                onSelectConversation,
                                onNewConversation,
                                onDeleteConversation,
                                onRenameConversation,
                                loading = false,
                                timeRange = 'all',
                                onTimeRangeChange,
                                newChatDisabled = false,
                                // documents
                            }) {
    const [searchQuery, setSearchQuery] = useState('');

    const formatTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

        if (diffInHours < 1) return 'now';
        if (diffInHours < 24) return `${diffInHours}h`;
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays}d`;
        return date.toLocaleDateString();
    };

    // const filteredConversations = conversations.filter(conv =>
    //   searchQuery === '' ||
    //   conv.title.toLowerCase().includes(searchQuery.toLowerCase())
    // );
    const filteredConversations = React.useMemo(() => {
        const now = new Date();
        let rangeStart = null;

        switch (timeRange) {
            case '1h':
                rangeStart = new Date(now.getTime() - 60 * 60 * 1000);
                break
            case '24h':
                rangeStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case '7d':
                rangeStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                rangeStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '6m': {
                const start = new Date(now);
                start.setMonth(start.getMonth() - 6);
                rangeStart = start;
                break;
            }
            case '1y': {
                const start = new Date(now);
                start.setFullYear(start.getFullYear() - 1);
                rangeStart = start;
                break;
            }
            default:
                rangeStart = null;
        }

        return conversations.filter(conv => {
            const matchesSearch = searchQuery === '' || (conv.title || '').toLowerCase().includes(searchQuery.toLowerCase());

            if (!matchesSearch) {
                return false;
            }

            if (!rangeStart) {
                return true;
            }

            const updatedAt = conv.updatedAt || conv.updated_at;
            if (!updatedAt) {
                return false;
            }

            const updatedDate = new Date(updatedAt);
            if (Number.isNaN(updatedDate.getTime())) {
                return false;
            }

            return updatedDate >= rangeStart;
        });
    }, [conversations, searchQuery, timeRange]);


    const groupedConversations = React.useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

        return {
            starred: [], // We can add starred functionality later
            today: filteredConversations.filter(conv => new Date(conv.updatedAt) >= today),
            yesterday: filteredConversations.filter(conv =>
                new Date(conv.updatedAt) >= yesterday && new Date(conv.updatedAt) < today
            ),
            thisWeek: filteredConversations.filter(conv =>
                new Date(conv.updatedAt) >= weekAgo && new Date(conv.updatedAt) < yesterday
            ),
            older: filteredConversations.filter(conv => new Date(conv.updatedAt) < weekAgo)
        };
    }, [filteredConversations]);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Fixed Header Section */}
            <div className="flex-shrink-0">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-4">
                        <h2 className="font-semibold text-gray-900 dark:text-white">Chat History</h2>
                        <div className="flex-1"/>
                        {/* <Button
              variant="ghost"
              size="sm"
              className="p-1 h-7 w-7 rounded-md"
            >
              <Search className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </Button> */}
                    </div>

                    {/* New Chat Button */}
                    <Button
                        onClick={onNewConversation}
                        className="w-full bg-gray-900 dark:bg-blue-600 hover:bg-gray-800 dark:hover:bg-blue-700 text-white rounded-lg flex-shrink-0"
                        disabled={loading || newChatDisabled}
                    >
                        <Plus className="mr-2 h-4 w-4 flex-shrink-0"/>
                        <span className="truncate">New Chat</span>
                    </Button>
                </div>

                {/* Search */}
                <div className="px-4 py-2">
                    <div className="relative">
                        <Search
                            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500"/>
                        <Input
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500/20"
                        />
                    </div>
                </div>

                {/* Time Range Filter */}
                {onTimeRangeChange && (
                    <div className="px-4 py-2">
                        <Select value={timeRange} onValueChange={onTimeRangeChange}>
                            <SelectTrigger
                                className="w-full bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400"/>
                                    <SelectValue/>
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(TIME_RANGE_LABELS).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {/* Quick Access */}
                {/* <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
              <Star className="h-4 w-4" />
              <span>Saved</span>
            </div>
          </div>
        </div> */}
            </div>

            {/* Scrollable Conversations List */}
            <div className="flex-1 min-h-0 overflow-hidden">
                <ScrollArea className="h-full">
                    {conversations.length === 0 ? (
                        <div className="p-6 text-center">
                            <div
                                className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                <MessageSquare className="h-6 w-6 text-gray-400 dark:text-gray-500"/>
                            </div>
                            <h3 className="font-medium mb-1 text-gray-900 dark:text-gray-100">No conversations yet</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Start your first conversation with AI assistant
                            </p>
                        </div>
                    ) : (
                        <div className="px-2 pb-4 pt-2">
                            {/* Starred Conversations */}
                            {groupedConversations.starred.length > 0 && (
                                <div className="mb-4">
                                    <div className="px-2 py-1 mb-2">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Starred
                    </span>
                                    </div>
                                    {groupedConversations.starred.map((conversation) => (
                                        <ConversationItem
                                            key={conversation.id}
                                            conversation={conversation}
                                            isActive={activeConversationId === conversation.id}
                                            onSelect={onSelectConversation}
                                            disabled={loading}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Today */}
                            {groupedConversations.today.length > 0 && (
                                <div className="mb-4">
                                    <div className="px-2 py-1 mb-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Today
                    </span>
                                    </div>
                                    {groupedConversations.today.map((conversation) => (
                                        <ConversationItem
                                            key={conversation.id}
                                            conversation={conversation}
                                            isActive={activeConversationId === conversation.id}
                                            onSelect={onSelectConversation}
                                            onDelete={onDeleteConversation}
                                            onRename={onRenameConversation}
                                            // documents={documents}
                                            disabled={loading}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Yesterday */}
                            {groupedConversations.yesterday.length > 0 && (
                                <div className="mb-4">
                                    <div className="px-2 py-1 mb-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Yesterday
                    </span>
                                    </div>
                                    {groupedConversations.yesterday.map((conversation) => (
                                        <ConversationItem
                                            key={conversation.id}
                                            conversation={conversation}
                                            isActive={activeConversationId === conversation.id}
                                            onSelect={onSelectConversation}
                                            onDelete={onDeleteConversation}
                                            onRename={onRenameConversation}
                                            // documents={documents}
                                            disabled={loading}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* This Week */}
                            {groupedConversations.thisWeek.length > 0 && (
                                <div className="mb-4">
                                    <div className="px-2 py-1 mb-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Previous 7 days
                    </span>
                                    </div>
                                    {groupedConversations.thisWeek.map((conversation) => (
                                        <ConversationItem
                                            key={conversation.id}
                                            conversation={conversation}
                                            isActive={activeConversationId === conversation.id}
                                            onSelect={onSelectConversation}
                                            onDelete={onDeleteConversation}
                                            onRename={onRenameConversation}
                                            // documents={documents}
                                            disabled={loading}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Older */}
                            {groupedConversations.older.length > 0 && (
                                <div className="mb-4">
                                    <div className="px-2 py-1 mb-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Previous 30 days
                    </span>
                                    </div>
                                    {groupedConversations.older.map((conversation) => (
                                        <ConversationItem
                                            key={conversation.id}
                                            conversation={conversation}
                                            isActive={activeConversationId === conversation.id}
                                            onSelect={onSelectConversation}
                                            onDelete={onDeleteConversation}
                                            onRename={onRenameConversation}
                                            // documents={documents}
                                            disabled={loading}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </ScrollArea>
            </div>
        </div>
    );
}

function ConversationItem({
                              conversation,
                              isActive,
                              onSelect,
                              onDelete,
                              onRename,
                              // documents,
                              disabled
                          }) {
    const [isRenaming, setIsRenaming] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [newTitle, setNewTitle] = useState(conversation.title);

    const getConversationIcon = () => {
        if (conversation.attachedDocuments && conversation.attachedDocuments.length > 0) {
            return BookOpen;
        }
        if (conversation.title.toLowerCase().includes('analysis') || conversation.title.toLowerCase().includes('data')) {
            return BarChart3;
        }
        return MessageSquare;
    };

    // Calculate storage usage for this conversation
    // const conversationStorage = React.useMemo(() => {
    //   let bytes = 0;

    //   // Calculate message content size
    //   conversation.messages.forEach(msg => {
    //     bytes += (msg.content || '').length * 2; // UTF-16 approximation
    //   });

    //   // Calculate attached documents size
    //   if (conversation.attachedDocuments && documents) {
    //     conversation.attachedDocuments.forEach(docId => {
    //       const doc = documents.find(d => d.id === docId);
    //       if (doc) {
    //         bytes += doc.size;
    //       }
    //     });
    //   }

    //   return bytes;
    // }, [conversation, documents]);
    const conversationStorage = conversation.storageSize ?? 0;

    const Icon = getConversationIcon();

    const handleRename = () => {
        if (onRename && newTitle.trim() && newTitle !== conversation.title) {
            onRename(conversation.id, newTitle.trim());
        }
        setIsRenaming(false);
    };

    const handleDelete = () => {
        if (onDelete) {
            onDelete(conversation.id);
        }
        setShowDeleteDialog(false);
    };

    return (
        <div className="group relative">
            <Button
                variant="ghost"
                className={cn(
                    "w-full justify-start h-auto p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 mb-1 rounded-lg transition-colors",
                    isActive && "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                )}
                onClick={() => onSelect(conversation.id)}
                disabled={disabled}
            >
                <div className="flex items-start gap-3 w-full min-w-0">
                    <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0",
                        isActive ? "bg-blue-100 dark:bg-blue-900/40" : "bg-gray-100 dark:bg-gray-800"
                    )}>
                        <Icon className={cn(
                            "h-3 w-3",
                            isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"
                        )}/>
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
              <span className={cn(
                  "font-medium truncate text-sm",
                  isActive ? "text-blue-900 dark:text-blue-300" : "text-gray-900 dark:text-gray-100"
              )}>
                {conversation.title}
              </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                            <MessageSquare className="h-3 w-3"/>
                            <span>{conversation.messages.length}</span>

                            {conversation.attachedDocuments && conversation.attachedDocuments.length > 0 && (
                                <>
                                    <span>•</span>
                                    <BookOpen className="h-3 w-3"/>
                                    <span>{conversation.attachedDocuments.length}</span>
                                </>
                            )}

                            <span>•</span>
                            <Database className="h-3 w-3"/>
                            <span>{formatBytes(conversationStorage)}</span>
                        </div>
                    </div>
                </div>
            </Button>

            {/* Actions Dropdown */}
            {(onDelete || onRename) && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <MoreHorizontal className="h-3 w-3"/>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {onRename && (
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsRenaming(true);
                                    }}
                                >
                                    <Edit2 className="h-3 w-3 mr-2"/>
                                    Rename
                                </DropdownMenuItem>
                            )}
                            {onDelete && (
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowDeleteDialog(true);
                                    }}
                                    className="text-red-600 dark:text-red-400"
                                >
                                    <Trash2 className="h-3 w-3 mr-2"/>
                                    Delete
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )}

            {/* Rename Dialog */}
            <Dialog open={isRenaming} onOpenChange={setIsRenaming}>
                <DialogContent onClick={(e) => e.stopPropagation()}>
                    <DialogHeader>
                        <DialogTitle>Rename Conversation</DialogTitle>
                        <DialogDescription>
                            Enter a new name for this conversation
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="title" className="mb-2">
                            Conversation Title
                        </Label>
                        <Input
                            id="title"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleRename();
                                }
                            }}
                            placeholder="Enter conversation title"
                            className="mt-2"
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRenaming(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleRename}>
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{conversation.title}"? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDelete();
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
