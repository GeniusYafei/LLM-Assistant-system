import React from 'react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '../ui/card';
import {Badge} from '../ui/badge';
import {Button} from '../ui/button';
import {Alert, AlertDescription} from '../ui/alert';
import {AlertTriangle, CheckCircle, Clock, ExternalLink, Shield} from 'lucide-react';
import {cn} from '../ui/utils';

export function SafetyPanel({
                                policyMode,
                                violations = [],
                                warnings = []
                            }) {
    const formatTimestamp = (timestamp) => {
        return new Date(timestamp).toLocaleString();
    };

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'high':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'medium':
                return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'low':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const recentItems = [...violations, ...warnings]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);

    return (
        <div className="space-y-6">
            {/* Policy Mode */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary"/>
                        <CardTitle className="text-lg">Content Policy</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Badge
                                    variant={policyMode === 'strict' ? 'destructive' : 'secondary'}
                                    className="capitalize"
                                >
                                    {policyMode} Mode
                                </Badge>
                                <CheckCircle className="h-4 w-4 text-green-500"/>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {policyMode === 'strict'
                                    ? 'Enforcing strict content guidelines with enhanced filtering'
                                    : 'Standard content guidelines with balanced filtering'
                                }
                            </p>
                        </div>
                    </div>

                    <Button variant="outline" size="sm" className="w-full">
                        <ExternalLink className="mr-2 h-4 w-4"/>
                        View Content Guidelines
                    </Button>
                </CardContent>
            </Card>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">{violations.length}</div>
                            <p className="text-xs text-muted-foreground">Policy Violations</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-amber-600">{warnings.length}</div>
                            <p className="text-xs text-muted-foreground">Warnings</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Recent Activity</CardTitle>
                    <CardDescription>
                        Latest policy warnings and violations
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {recentItems.length === 0 ? (
                        <div className="text-center py-8">
                            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4"/>
                            <h3 className="font-medium text-green-700 mb-2">All Clear</h3>
                            <p className="text-sm text-muted-foreground">
                                No recent policy violations or warnings
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentItems.map((item) => (
                                <Alert key={item.id} className="border-l-4 border-l-red-500">
                                    <AlertTriangle className="h-4 w-4"/>
                                    <AlertDescription>
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            "text-xs",
                                                            'severity' in item ? getSeverityColor(item.severity) : ''
                                                        )}
                                                    >
                                                        {item.type}
                                                    </Badge>
                                                    {'severity' in item && (
                                                        <Badge
                                                            variant="outline"
                                                            className={cn("text-xs", getSeverityColor(item.severity))}
                                                        >
                                                            {item.severity}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm mb-2">{item.message}</p>
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Clock className="h-3 w-3"/>
                                                    {formatTimestamp(item.timestamp)}
                                                </div>
                                            </div>
                                        </div>
                                    </AlertDescription>
                                </Alert>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Guidelines Link */}
            <Card>
                <CardContent className="pt-6">
                    <div className="text-center space-y-3">
                        <Shield className="h-8 w-8 text-muted-foreground mx-auto"/>
                        <div>
                            <h3 className="font-medium mb-1">Need Help?</h3>
                            <p className="text-sm text-muted-foreground mb-3">
                                Review our content guidelines and safety policies
                            </p>
                            <Button variant="outline" size="sm">
                                <ExternalLink className="mr-2 h-4 w-4"/>
                                Safety Documentation
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
