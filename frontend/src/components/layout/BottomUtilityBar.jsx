import React from 'react';
import {Activity, Clock, Copy, Settings, Wifi, Zap} from 'lucide-react';
import {Button} from '../ui/button';
import {Badge} from '../ui/badge';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '../ui/tooltip';
import {cn} from '../ui/utils';
import {toast} from 'sonner';

export function BottomUtilityBar({
                                     connectionStatus = 'connected',
                                     connectionUptime = '2h 34m',
                                     queueDepth = 0,
                                     lastRequestId,
                                     tokenStats = {input: 0, output: 0, total: 0},
                                     latencyStats = [],
                                     operatorMode = false,
                                     onToggleOperatorMode,
                                     onToggleRawTokens,
                                     onToggleDebug,
                                     showRawTokens = false,
                                     showDebug = false
                                 }) {

    const getConnectionColor = () => {
        switch (connectionStatus) {
            case 'connected':
                return 'text-green-500';
            case 'connecting':
                return 'text-amber-500';
            case 'disconnected':
                return 'text-red-500';
            default:
                return 'text-gray-400';
        }
    };

    const getConnectionLabel = () => {
        switch (connectionStatus) {
            case 'connected':
                return `Connected • ${connectionUptime}`;
            case 'connecting':
                return 'Connecting...';
            case 'disconnected':
                return 'Disconnected';
            default:
                return 'Unknown';
        }
    };

    const copyRequestId = () => {
        if (lastRequestId) {
            navigator.clipboard.writeText(lastRequestId);
            toast.success('Request ID copied to clipboard');
        }
    };

    const averageLatency = latencyStats.length > 0
        ? latencyStats.reduce((a, b) => a + b, 0) / latencyStats.length
        : 0;

    return (
        <TooltipProvider>
            <div
                className="sticky bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex h-12 items-center justify-between px-4 text-sm">
                    {/* Left: Connection and Queue Status */}
                    <div className="flex items-center gap-4">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex items-center gap-2">
                                    <Wifi className={cn("h-3 w-3", getConnectionColor())}/>
                                    <span className="text-muted-foreground">{getConnectionLabel()}</span>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Connection Status</p>
                            </TooltipContent>
                        </Tooltip>

                        {queueDepth > 0 && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Badge variant="outline" className="text-xs">
                                        <Activity className="mr-1 h-3 w-3"/>
                                        Queue: {queueDepth}
                                    </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Pending requests in queue</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </div>

                    {/* Center: Token Stats and Performance */}
                    <div className="flex items-center gap-4">
                        {lastRequestId && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={copyRequestId}
                                        className="h-8 px-2 font-mono text-xs text-muted-foreground hover:text-foreground"
                                    >
                                        <Copy className="mr-1 h-3 w-3"/>
                                        {lastRequestId.slice(0, 8)}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Copy Request ID</p>
                                </TooltipContent>
                            </Tooltip>
                        )}

                        <div className="flex items-center gap-3 font-mono text-xs text-muted-foreground">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1">
                                        <Zap className="h-3 w-3"/>
                                        <span>{tokenStats.input}↑ {tokenStats.output}↓ {tokenStats.total}Σ</span>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <div className="text-center">
                                        <p>Input: {tokenStats.input} tokens</p>
                                        <p>Output: {tokenStats.output} tokens</p>
                                        <p>Total: {tokenStats.total} tokens</p>
                                    </div>
                                </TooltipContent>
                            </Tooltip>

                            {averageLatency > 0 && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-3 w-3"/>
                                            <span>{averageLatency.toFixed(0)}ms</span>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Average response latency</p>
                                    </TooltipContent>
                                </Tooltip>
                            )}
                        </div>
                    </div>

                    {/* Right: Operator Controls */}
                    <div className="flex items-center gap-2">
                        {operatorMode && (
                            <>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant={showRawTokens ? "default" : "ghost"}
                                            size="sm"
                                            onClick={onToggleRawTokens}
                                            className="h-8 px-3 text-xs"
                                        >
                                            Raw Tokens
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Show raw token data in messages</p>
                                    </TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant={showDebug ? "default" : "ghost"}
                                            size="sm"
                                            onClick={onToggleDebug}
                                            className="h-8 px-3 text-xs"
                                        >
                                            Debug
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Enable debug mode</p>
                                    </TooltipContent>
                                </Tooltip>
                            </>
                        )}

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onToggleOperatorMode}
                                    className="h-8 px-2"
                                >
                                    <Settings className="h-3 w-3"/>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Toggle operator mode</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
}
