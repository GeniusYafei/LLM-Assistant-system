import React, {useMemo} from "react";
import {Card, CardContent, CardDescription, CardHeader, CardTitle,} from "../../components/ui/card.jsx";
import {Button} from "../../components/ui/button.jsx";
import {Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,} from "recharts";
import {Activity, BarChart3, Clock, MessageSquare, RefreshCw, TrendingUp, Zap,} from "lucide-react";
import {cn} from "../../components/ui/utils.jsx";

const DEFAULT_TELEMETRY = {
    totalMessages: 0,
    totalTokensUsed: 0,
    averageLatency: 0,
    conversationCount: 0,
    documentCount: 0,
    dailyUsage: [],
    modelUsage: [],
    hourlyDistribution: [],
    conversationStats: [],
    previousPeriod: {
        totalMessages: 0,
        totalTokensUsed: 0,
        averageLatency: 0,
        successRate: 0,
    },
    performanceMetrics: {
        uptime: 0,
        successRate: 0,
        errorRate: 0,
        avgResponseTime: 0,
    },
};

const DEFAULT_CHANGE_STATE = {
    messages: null,
    tokens: null,
    latency: null,
    successRate: null,
};

export function AnalyticsPage({
                                  telemetry,
                                  loading,
                                  selectedRange = "7d",
                                  onRangeChange,
                                  onRefresh,
                              }) {
    const timeRangeOptions = [
        {value: "7d", label: "Last 7 days"},
        {value: "30d", label: "Last 30 days"},
        {value: "90d", label: "Last 90 days"},
    ];

    const formatNumber = (num) => {
        if (num === undefined || num === null || isNaN(num)) return "0";
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    const formatLatency = (ms) => {
        if (ms === undefined || ms === null || isNaN(ms)) return "0ms";
        return `${ms}ms`;
    };

    const showInitialLoading = loading && !telemetry;
    const hasTelemetryData = Boolean(telemetry);

    const safeTelemetry = useMemo(() => {
        if (!telemetry) {
            return DEFAULT_TELEMETRY;
        }

        return {
            ...DEFAULT_TELEMETRY,
            ...telemetry,
            dailyUsage: Array.isArray(telemetry.dailyUsage)
                ? telemetry.dailyUsage
                : [],
            modelUsage: Array.isArray(telemetry.modelUsage)
                ? telemetry.modelUsage
                : [],
            hourlyDistribution: Array.isArray(telemetry.hourlyDistribution)
                ? telemetry.hourlyDistribution
                : [],
            conversationStats: Array.isArray(telemetry.conversationStats)
                ? telemetry.conversationStats
                : [],
            previousPeriod: {
                ...DEFAULT_TELEMETRY.previousPeriod,
                ...(telemetry.previousPeriod || {}),
            },
            performanceMetrics: {
                ...DEFAULT_TELEMETRY.performanceMetrics,
                ...(telemetry.performanceMetrics || {}),
            },
        };
    }, [telemetry]);

    const isRefreshing = loading && hasTelemetryData;

    const getPercentChange = (current, previousValue) => {
        if (previousValue === undefined || previousValue === null) return null;
        if (previousValue === 0) {
            return current === 0
                ? {value: 0, formatted: "+0.0%"}
                : null;
        }
        const raw = ((current - previousValue) / previousValue) * 100;
        return {
            value: raw,
            formatted: `${raw >= 0 ? "+" : ""}${raw.toFixed(1)}%`,
        };
    };

    const getNumberChange = (current, previousValue, unit = "", decimals = 0) => {
        if (previousValue === undefined || previousValue === null) return null;
        const raw = current - previousValue;
        return {
            value: raw,
            formatted: `${raw >= 0 ? "+" : ""}${raw.toFixed(decimals)}${unit}`,
        };
    };

    const metricChanges = useMemo(() => {
        if (!hasTelemetryData) {
            return DEFAULT_CHANGE_STATE;
        }

        const previous = safeTelemetry.previousPeriod || DEFAULT_TELEMETRY.previousPeriod;

        return {
            messages: getPercentChange(safeTelemetry.totalMessages, previous.totalMessages),
            tokens: getPercentChange(safeTelemetry.totalTokensUsed, previous.totalTokensUsed),
            latency: getNumberChange(
                safeTelemetry.averageLatency,
                previous.averageLatency,
                "ms",
                0,
            ),
            successRate: getNumberChange(
                safeTelemetry.performanceMetrics.successRate,
                previous.successRate,
                "%",
                1,
            ),
        };
    }, [hasTelemetryData, safeTelemetry]);

    if (showInitialLoading) {
        return (
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"/>
                        <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"/>
                    </div>
                    <div className="h-10 w-24 bg-gray-200 rounded animate-pulse"/>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {Array.from({length: 4}).map((_, i) => (
                        <Card key={i}>
                            <CardHeader className="pb-2">
                                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"/>
                            </CardHeader>
                            <CardContent>
                                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"/>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {Array.from({length: 2}).map((_, i) => (
                        <Card key={i}>
                            <CardHeader>
                                <div className="h-6 w-40 bg-gray-200 rounded animate-pulse"/>
                            </CardHeader>
                            <CardContent>
                                <div className="h-64 bg-gray-200 rounded animate-pulse"/>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    const renderChangeText = (change, {invertTrend = false, fallback = "+0"} = {}) => {
        if (!change) {
            return (
                <>
                    <span className="text-gray-500">{fallback}</span> from last period
                </>
            );
        }
        const isPositive = change.value >= 0;
        const showPositive = invertTrend ? !isPositive : isPositive;
        const colorClass = showPositive ? "text-green-600" : "text-red-600";
        return (
            <>
                <span className={colorClass}>{change.formatted}</span> from last period
            </>
        );
    };

    return (
        <div className="p-4 md:p-6 space-y-4 md:space-y-6 bg-gray-50 dark:bg-gray-900 overflow-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                        Analytics & Insights
                    </h1>
                    <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">
                        Track your conversation patterns, token usage, and system performance
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 md:p-1 overflow-x-auto">
                        {timeRangeOptions.map((option) => (
                            <Button
                                key={option.value}
                                variant={selectedRange === option.value ? "default" : "ghost"}
                                size="sm"
                                className={cn(
                                    "text-xs md:text-sm whitespace-nowrap",
                                    selectedRange === option.value
                                        ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white"
                                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100",
                                )}
                                onClick={() => {
                                    if (option.value !== selectedRange) {
                                        onRangeChange?.(option.value);
                                    }
                                }}
                            >
                                {option.label}
                            </Button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button onClick={onRefresh} variant="outline" size="sm" disabled={isRefreshing}>
                            <RefreshCw className="h-4 w-4 mr-2"/>
                            Refresh
                        </Button>
                        {/* {isRefreshing && (
              <span className="flex items-center text-xs text-blue-600 dark:text-blue-300">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Updating
              </span>
            )} */}
                    </div>
                </div>
            </div>

            {!hasTelemetryData ? (
                <Card className="border-dashed">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4"/>
                            No analytics yet
                        </CardTitle>
                        <CardDescription>
                            Start a conversation or refresh to load analytics data for this workspace.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            We’ll populate these charts once telemetry is available.
                        </p>
                        <Button onClick={onRefresh} variant="outline" className="w-full sm:w-auto">
                            <RefreshCw className="h-4 w-4 mr-2"/>
                            Refresh data
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
                                <MessageSquare className="h-4 w-4 text-muted-foreground"/>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatNumber(safeTelemetry.totalMessages)}</div>
                                <p className="text-xs text-muted-foreground">
                                    {renderChangeText(metricChanges.messages, {fallback: "+0.0%"})}
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Tokens Used</CardTitle>
                                <Zap className="h-4 w-4 text-muted-foreground"/>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatNumber(safeTelemetry.totalTokensUsed)}</div>
                                <p className="text-xs text-muted-foreground">
                                    {renderChangeText(metricChanges.tokens, {fallback: "+0.0%"})}
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
                                <Clock className="h-4 w-4 text-muted-foreground"/>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatLatency(safeTelemetry.averageLatency)}</div>
                                <p className="text-xs text-muted-foreground">
                                    {renderChangeText(metricChanges.latency, {invertTrend: true, fallback: "+0ms"})}
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground"/>
                            </CardHeader>
                            <CardContent>
                                <div
                                    className="text-2xl font-bold">{safeTelemetry.performanceMetrics.successRate.toFixed(1)}%
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {renderChangeText(metricChanges.successRate, {fallback: "+0.0%"})}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5"/>
                                    Usage Trends
                                </CardTitle>
                                <CardDescription>Token usage over time</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <AreaChart data={safeTelemetry.dailyUsage}>
                                        <CartesianGrid strokeDasharray="3 3"/>
                                        <XAxis dataKey="date"/>
                                        <YAxis/>
                                        <Tooltip/>
                                        <Area dataKey="tokens" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2}/>
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Activity className="h-5 w-5"/>
                                    Activity Patterns
                                </CardTitle>
                                <CardDescription>Token usage by hour of day</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={safeTelemetry.hourlyDistribution}>
                                        <CartesianGrid strokeDasharray="3 3"/>
                                        <XAxis dataKey="hour"/>
                                        <YAxis/>
                                        <Tooltip/>
                                        <Bar dataKey="tokens" fill="#3b82f6"/>
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}
