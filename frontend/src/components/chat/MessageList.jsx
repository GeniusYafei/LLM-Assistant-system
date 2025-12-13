import React, {useEffect, useRef} from 'react';
import {ScrollArea} from '../ui/scroll-area';
import {Avatar, AvatarFallback} from '../ui/avatar';
import {Badge} from '../ui/badge';
import {AlertCircle, Check, ChevronDown, ChevronUp, Copy} from 'lucide-react';
import {Button} from '../ui/button';
import {Skeleton} from '../ui/skeleton';

export function MessageList({
                                messages = [],
                                isGenerating = false,
                                user,
                                attachedDocuments = []
                            }) {
    const scrollAreaRef = useRef(null);
    const [copiedMessageId, setCopiedMessageId] = React.useState(null);
    const [collapsedReasoning, setCollapsedReasoning] = React.useState(new Set());
    const autoCollapsedRef = useRef(new Set());

    const getLatencyLabel = (metadata) => {
        if (!metadata) return null;
        const latencyValue = metadata.latency_ms ?? metadata.latency ?? metadata.latencyMs;
        if (typeof latencyValue !== 'number' || Number.isNaN(latencyValue)) return null;
        return `${Math.round(latencyValue)} ms`;
    };

    const getTokenLabel = (metadata) => {
        if (!metadata) return null;
        const usage = metadata.usage || {};
        const outputTokens = usage.output_tokens ?? usage.generated_tokens ?? usage.completion_tokens;
        const totalTokens = usage.total_tokens ?? usage.total ?? usage.tokens;
        if (typeof outputTokens === 'number' && typeof totalTokens === 'number' && !Number.isNaN(outputTokens) && !Number.isNaN(totalTokens)) {
            return `${outputTokens}/${totalTokens} tokens`;
        }
        const fallback = typeof outputTokens === 'number' ? outputTokens : typeof totalTokens === 'number' ? totalTokens : null;
        if (fallback == null || Number.isNaN(fallback)) return null;
        return `${fallback} tokens`;
    };

    useEffect(() => {
        // Auto-scroll to bottom when new messages arrive
        if (scrollAreaRef.current) {
            const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
        }
    }, [messages, isGenerating]);

    useEffect(() => {
        setCollapsedReasoning(prev => {
            const next = new Set(prev);
            let changed = false;
            messages.forEach(msg => {
                if (!msg.reasoning) return;
                if (msg.status === 'generating') {
                    if (next.has(msg.id)) {
                        next.delete(msg.id);
                        changed = true;
                    }
                    autoCollapsedRef.current.delete(msg.id);
                } else if (!next.has(msg.id)) {
                    if (!autoCollapsedRef.current.has(msg.id)) {
                        next.add(msg.id);
                        autoCollapsedRef.current.add(msg.id);
                        changed = true;
                    }
                }
            });
            return changed ? next : prev;
        });
    }, [messages]);

    const copyToClipboard = async (text, messageId) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedMessageId(messageId);
            setTimeout(() => setCopiedMessageId(null), 2000);
        } catch (err) {
            console.error('Failed to copy text:', err);
        }
    };

    const formatTimestamp = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getAttachedDocumentNames = (documentIds = []) => {
        return documentIds
            .map(id => attachedDocuments.find(doc => doc.id === id)?.name)
            .filter(Boolean);
    };

    const toggleReasoningVisibility = (messageId) => {
        setCollapsedReasoning(prev => {
            const next = new Set(prev);
            if (next.has(messageId)) {
                next.delete(messageId);
            } else {
                next.add(messageId);
            }
            return next;
        });
    };

    const hasActiveStreamingMessage = messages.some(
        (message) => message.role === 'assistant' && message.status === 'generating'
    );

    if (messages.length === 0 && !isGenerating) {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center space-y-4 max-w-md">
                    <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                        <Avatar className="h-12 w-12">
                            <AvatarFallback>AI</AvatarFallback>
                        </Avatar>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-lg font-medium">Welcome to AI Assistant</h3>
                        <p className="text-muted-foreground">
                            Start a conversation by typing a message below. You can upload documents
                            to provide context for more accurate responses.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <ScrollArea ref={scrollAreaRef} className="h-full px-3 md:px-6 py-2 md:py-3">
            <div className="space-y-4 md:space-y-6 max-w-4xl mx-auto w-full">
                {messages.map((message) => (
                    <div key={message.id} className="group">
                        {message.role === 'user' ? (
                            /* User Message - Right Side */
                            <div className="flex items-start gap-2 md:gap-4 justify-end w-full">
                                <div
                                    className="flex flex-col items-end flex-1 min-w-0 max-w-[85%] sm:max-w-[80%] md:max-w-[70%]">
                                    <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTimestamp(message.timestamp)}
                    </span>
                                        <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                      {user?.displayName || user?.name || 'You'}
                    </span>
                                    </div>

                                    {/* Attached Documents */}
                                    {message.attachedDocuments && message.attachedDocuments.length > 0 && (
                                        <div
                                            className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 w-full">
                                            <p className="text-xs font-medium text-blue-900 dark:text-blue-300 mb-1">Context
                                                documents:</p>
                                            <div className="flex flex-wrap gap-1">
                                                {getAttachedDocumentNames(message.attachedDocuments).map((name, index) => (
                                                    <Badge
                                                        key={index}
                                                        variant="secondary"
                                                        className="text-xs bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-300"
                                                    >
                                                        {name}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* User Message Bubble */}
                                    <div
                                        className="bg-gray-900 dark:bg-blue-600 text-white rounded-2xl rounded-tr-md px-3 md:px-4 py-2 md:py-3 shadow-sm max-w-full overflow-hidden break-words w-full">
                                        <div
                                            className="whitespace-pre-wrap break-words text-sm md:text-base leading-relaxed"
                                            style={{wordBreak: 'break-word', overflowWrap: 'anywhere'}}
                                        >
                                            {message.content}
                                        </div>
                                    </div>
                                </div>

                                {/* User Avatar */}
                                <div className="flex-shrink-0">
                                    <div
                                        className="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center bg-gray-900 dark:bg-blue-600 text-white">
                    <span className="text-xs md:text-sm font-medium">
                      {(user?.displayName || user?.name || '')
                          .split(' ')
                          .filter(Boolean)
                          .map(n => n[0])
                          .join('')
                          .toUpperCase() || 'U'}
                    </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Assistant Message - Left Side */
                            <div
                                className="flex items-start gap-2 md:gap-4 w-full max-w-full overflow-hidden break-words">
                                {/* AI Avatar */}
                                <div className="flex-shrink-0">
                                    <div
                                        className="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center bg-blue-600 dark:bg-blue-500 text-white">
                                        <span className="text-xs md:text-sm font-medium">L</span>
                                    </div>
                                </div>

                                {/* Message Content */}
                                <div className="flex-1 min-w-0 max-w-[90%] sm:max-w-[80%] md:max-w-[70%]">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span
                                            className="font-medium text-sm text-gray-900 dark:text-gray-100">JinKoSolar</span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTimestamp(message.timestamp)}
                    </span>
                                    </div>

                                    {message.reasoning && (
                                        <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl p-3 mb-2">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Thinking</span>
                                                    {message.status !== 'generating' && (
                                                        <span className="text-[10px] text-gray-400 dark:text-gray-500">Tap to view</span>
                                                    )}
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 px-2 text-xs text-gray-600 dark:text-gray-300"
                                                    onClick={() => toggleReasoningVisibility(message.id)}
                                                >
                                                    {collapsedReasoning.has(message.id) ? (
                                                        <span className="inline-flex items-center gap-1">Show<ChevronDown className="h-3 w-3"/></span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1">Hide<ChevronUp className="h-3 w-3"/></span>
                                                    )}
                                                </Button>
                                            </div>
                                            {collapsedReasoning.has(message.id) ? (
                                                <div
                                                    className="text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap"
                                                    style={{wordBreak: 'break-word', overflowWrap: 'anywhere', maxHeight: '3.5rem', overflow: 'hidden'}}
                                                >
                                                    {message.reasoning}
                                                </div>
                                            ) : (
                                                <div
                                                    className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap"
                                                    style={{wordBreak: 'break-word', overflowWrap: 'anywhere'}}
                                                >
                                                    {message.reasoning}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Assistant Message Bubble */}
                                    <div
                                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-md px-3 md:px-4 py-2 md:py-3 shadow-sm">
                                        <div
                                            className="prose prose-sm max-w-none text-gray-900 dark:text-gray-100 leading-relaxed">
                                            <div
                                                className="whitespace-pre-wrap break-words text-sm md:text-base"
                                                style={{wordBreak: 'break-word', overflowWrap: 'anywhere'}}
                                            >
                                                {message.content}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Generation Status */}
                                    {message.status === 'generating' && (
                                        <div
                                            className="flex items-center space-x-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                            <div
                                                className="w-2 h-2 bg-blue-600 dark:bg-blue-500 rounded-full animate-pulse"/>
                                            <span>Generating response...</span>
                                        </div>
                                    )}

                                    {message.status === 'cancelled' && (
                                        <div
                                            className="flex items-center space-x-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                            <AlertCircle className="h-3 w-3"/>
                                            <span>Response cancelled</span>
                                        </div>
                                    )}

                                    {message.status === 'error' && (
                                        <div
                                            className="flex items-center space-x-2 mt-2 text-xs text-red-600 dark:text-red-400">
                                            <AlertCircle className="h-3 w-3"/>
                                            <span>Error generating response</span>
                                        </div>
                                    )}

                                    {/* Message Actions */}
                                    {message.content && (
                                        <div
                                            className="flex items-center gap-2 mt-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 px-2 text-xs"
                                                onClick={() => copyToClipboard(message.content, message.id)}
                                            >
                                                {copiedMessageId === message.id ? (
                                                    <>
                                                        <Check className="h-3 w-3 mr-1"/>
                                                        Copied
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="h-3 w-3 mr-1"/>
                                                        Copy
                                                    </>
                                                )}
                                            </Button>

                                            {/* Metadata */}
                                            {(() => {
                                                const latencyLabel = getLatencyLabel(message.metadata);
                                                const tokenLabel = getTokenLabel(message.metadata);
                                                if (!latencyLabel && !tokenLabel) {
                                                    return null;
                                                }
                                                return (
                                                    <div
                                                        className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                                                        {latencyLabel && <span>{latencyLabel}</span>}
                                                        {tokenLabel && <span>{tokenLabel}</span>}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {/* Show loading when generating */}
                {isGenerating && !hasActiveStreamingMessage && (
                    <div className="group">
                        <div className="flex items-start space-x-2 md:space-x-4">
                            <div className="flex-shrink-0">
                                <div
                                    className="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center bg-blue-600 dark:bg-blue-500 text-white">
                                    <span className="text-xs md:text-sm font-medium">L</span>
                                </div>
                            </div>

                            <div className="flex-1 min-w-0 max-w-[85%] md:max-w-[80%]">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="font-medium text-sm text-gray-900 dark:text-gray-100">JinKosolar</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">now</span>
                                </div>

                                <div
                                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-md px-3 md:px-4 py-2 md:py-3 shadow-sm">
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-full bg-gray-200 dark:bg-gray-700"/>
                                        <Skeleton className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700"/>
                                        <Skeleton className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700"/>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ScrollArea>
    );
}
