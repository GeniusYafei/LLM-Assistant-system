import React from 'react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '../ui/card';
import {Badge} from '../ui/badge';
import {ScrollArea} from '../ui/scroll-area';
import {Separator} from '../ui/separator';
import {Activity, BarChart3, Clock, MessageSquare, Server, TrendingUp, Zap} from 'lucide-react';

export function TelemetryPanel({telemetry, loading = false, error}) {
    const formatLatency = (ms) => {
        if (ms < 1000) return `${Math.round(ms)}ms`;
        return `${(ms / 1000).toFixed(1)}s`;
    };

    const formatTimestamp = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const getLatencyColor = (latency) => {
        if (latency < 1000) return 'text-green-600';
        if (latency < 3000) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'error':
                return 'bg-red-100 text-red-800';
            case 'cancelled':
                return 'bg-yellow-100 text-yellow-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5"/>
                        Session Telemetry
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8">
                        <Activity className="h-8 w-8 mx-auto mb-4 animate-pulse"/>
                        <p>Loading telemetry data...</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5"/>
                        Session Telemetry
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-red-600">
                        <Activity className="h-8 w-8 mx-auto mb-4"/>
                        <p>Failed to load telemetry: {error}</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!telemetry) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5"/>
                        Session Telemetry
                    </CardTitle>
                    <CardDescription>
                        Performance metrics and usage statistics for your session
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                        <MessageSquare className="h-8 w-8 mx-auto mb-4 opacity-50"/>
                        <p>No data available yet</p>
                        <p className="text-sm">Start a conversation to see metrics</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Overview Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center space-x-2">
                            <MessageSquare className="h-5 w-5 text-blue-600"/>
                            <div>
                                <p className="text-2xl font-bold">{telemetry.totalRequests}</p>
                                <p className="text-xs text-muted-foreground">Total Requests</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center space-x-2">
                            <Clock className="h-5 w-5 text-green-600"/>
                            <div>
                                <p className={`text-2xl font-bold ${getLatencyColor(telemetry.averageLatency)}`}>
                                    {formatLatency(telemetry.averageLatency)}
                                </p>
                                <p className="text-xs text-muted-foreground">Avg Response Time</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center space-x-2">
                            <Zap className="h-5 w-5 text-purple-600"/>
                            <div>
                                <p className="text-2xl font-bold">{telemetry.totalTokens.toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">Total Tokens</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Requests */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5"/>
                        Recent Requests
                    </CardTitle>
                    <CardDescription>
                        Latest {telemetry.recentRequests.length} requests with performance details
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {telemetry.recentRequests.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Activity className="h-8 w-8 mx-auto mb-4 opacity-50"/>
                            <p>No recent requests</p>
                        </div>
                    ) : (
                        <ScrollArea className="h-[300px]">
                            <div className="space-y-3">
                                {telemetry.recentRequests.map((request, index) => (
                                    <div key={request.requestId} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <Badge variant="outline" className="text-xs">
                                                    #{telemetry.recentRequests.length - index}
                                                </Badge>
                                                <span className="text-sm font-medium">
                          {formatTimestamp(request.timestamp)}
                        </span>
                                                <Badge
                                                    variant="secondary"
                                                    className={`text-xs ${getStatusColor(request.status)}`}
                                                >
                                                    {request.status}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Server className="h-3 w-3 text-muted-foreground"/>
                                                <span className="text-xs text-muted-foreground">
                          {request.metadata.model}
                        </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-4 text-sm pl-6">
                                            <div>
                                                <span className="text-muted-foreground">Latency: </span>
                                                <span className={getLatencyColor(request.metadata.latency)}>
                          {formatLatency(request.metadata.latency)}
                        </span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">Input: </span>
                                                <span>{request.metadata.inputTokens} tokens</span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">Output: </span>
                                                <span>{request.metadata.outputTokens} tokens</span>
                                            </div>
                                        </div>

                                        {index < telemetry.recentRequests.length - 1 && (
                                            <Separator className="mt-3"/>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>

            {/* Performance Insights */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5"/>
                        Performance Insights
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3 text-sm">
                        {telemetry.averageLatency < 1000 ? (
                            <div className="flex items-center space-x-2 text-green-600">
                                <div className="h-2 w-2 bg-green-600 rounded-full"/>
                                <span>Excellent response times ({'< 1s average'})</span>
                            </div>
                        ) : telemetry.averageLatency < 3000 ? (
                            <div className="flex items-center space-x-2 text-yellow-600">
                                <div className="h-2 w-2 bg-yellow-600 rounded-full"/>
                                <span>Good response times (1-3s average)</span>
                            </div>
                        ) : (
                            <div className="flex items-center space-x-2 text-red-600">
                                <div className="h-2 w-2 bg-red-600 rounded-full"/>
                                <span>Slow response times ({'> 3s average'})</span>
                            </div>
                        )}

                        <div className="flex items-center space-x-2 text-muted-foreground">
                            <div className="h-2 w-2 bg-muted-foreground rounded-full"/>
                            <span>
                Average tokens per request: {Math.round(telemetry.totalTokens / Math.max(telemetry.totalRequests, 1))}
              </span>
                        </div>

                        {telemetry.totalRequests > 10 && (
                            <div className="flex items-center space-x-2 text-blue-600">
                                <div className="h-2 w-2 bg-blue-600 rounded-full"/>
                                <span>Active user - {telemetry.totalRequests} requests completed</span>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
