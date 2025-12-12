import React, {useState} from 'react';
import {Bell, Circle, Search, Settings, Shield, User, Wifi, Zap} from 'lucide-react';
import {Button} from '../ui/button';
import {Input} from '../ui/input';
import {Badge} from '../ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '../ui/dropdown-menu';
import {Avatar, AvatarFallback} from '../ui/avatar';
import {cn} from '../ui/utils';

export function TopBar({
                           user,
                           onLogout,
                           rateLimit = {remaining: 50, total: 100},
                           policyStatus = 'safe',
                           connectionStatus = 'connected',
                           environment = 'sandbox'
                       }) {
    const [searchQuery, setSearchQuery] = useState('');

    const getUserInitials = () => {
        if (user?.user_metadata?.name) {
            return user.user_metadata.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);
        }
        if (user?.email) {
            return user.email.slice(0, 2).toUpperCase();
        }
        return 'U';
    };

    const getRateLimitColor = () => {
        const percentage = (rateLimit.remaining / rateLimit.total) * 100;
        if (percentage > 50) return 'text-green-500';
        if (percentage > 20) return 'text-amber-500';
        return 'text-red-500';
    };

    const getPolicyStatusColor = () => {
        switch (policyStatus) {
            case 'safe':
                return 'bg-green-500';
            case 'warning':
                return 'bg-amber-500';
            case 'violation':
                return 'bg-red-500';
            default:
                return 'bg-gray-400';
        }
    };

    const getConnectionStatusColor = () => {
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

    return (
        <header
            className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-16 items-center justify-between px-6">
                {/* Left: Brand and Environment */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                            <Zap className="h-4 w-4 text-primary-foreground"/>
                        </div>
                        <span className="font-semibold">AI Assistant</span>
                    </div>

                    <Badge
                        variant={environment === 'production' ? 'destructive' : 'secondary'}
                        className="capitalize"
                    >
                        {environment}
                    </Badge>
                </div>

                {/* Center: Search */}
                <div className="flex-1 max-w-md mx-8">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
                        <Input
                            placeholder="Search conversations and documents..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-muted/50 border-0 focus-visible:ring-1"
                        />
                    </div>
                </div>

                {/* Right: Status Indicators and User Menu */}
                <div className="flex items-center gap-3">
                    {/* Connection Status */}
                    <div className="flex items-center gap-1">
                        <Wifi className={cn("h-4 w-4", getConnectionStatusColor())}/>
                    </div>

                    {/* Policy Status */}
                    <div className="flex items-center gap-2">
                        <Circle className={cn("h-2 w-2 fill-current", getPolicyStatusColor())}/>
                        <Shield className="h-4 w-4 text-muted-foreground"/>
                    </div>

                    {/* Rate Limit Indicator */}
                    <div className="flex items-center gap-1 text-sm">
            <span className={cn("font-mono", getRateLimitColor())}>
              {rateLimit.remaining}/{rateLimit.total}
            </span>
                    </div>

                    {/* Notifications */}
                    <Button variant="ghost" size="icon">
                        <Bell className="h-4 w-4"/>
                    </Button>

                    {/* User Menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback className="text-xs">
                                        {getUserInitials()}
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end" forceMount>
                            <div className="flex items-center justify-start gap-2 p-2">
                                <div className="flex flex-col space-y-1 leading-none">
                                    <p className="font-medium">{user?.user_metadata?.name || 'User'}</p>
                                    <p className="w-[200px] truncate text-sm text-muted-foreground">
                                        {user?.email}
                                    </p>
                                </div>
                            </div>
                            <DropdownMenuSeparator/>
                            <DropdownMenuItem>
                                <Settings className="mr-2 h-4 w-4"/>
                                Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <User className="mr-2 h-4 w-4"/>
                                Profile
                            </DropdownMenuItem>
                            <DropdownMenuSeparator/>
                            <DropdownMenuItem onClick={onLogout}>
                                Sign out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
}
