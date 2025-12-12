import React from 'react';
import {Button} from '../ui/button';
import {Avatar, AvatarFallback} from '../ui/avatar';
import {Popover, PopoverContent, PopoverTrigger} from '../ui/popover';
import {Progress} from '../ui/progress';
import {useTheme} from '../../contexts/ThemeContext';
import {
    AlertCircle,
    AlertTriangle,
    BarChart3,
    FileText,
    HardDrive,
    LogOut,
    Menu,
    MessageSquare,
    Moon,
    Plus,
    Settings,
    Sun
} from 'lucide-react';
import {cn} from '../ui/utils';
import {formatBytes, getStoragePercentage, getStorageWarningLevel, isStorageFull} from '../../utils/storageConfig';

export function IconSidebar({
                                onNewConversation,
                                onToggleSidebar,
                                sidebarCollapsed,
                                telemetry,
                                onLoadTelemetry,
                                telemetryLoading,
                                currentPath,
                                onNavigate,
                                user,
                                onLogout,
                                isAdmin = false,
                                storageUsed,
                                storageQuota,
                                onShowStorageWarning
                            }) {
    const {theme, toggleTheme} = useTheme();
    const isDashboard = currentPath === '/dashboard';
    const storageLevel = getStorageWarningLevel(storageUsed, storageQuota);
    const storageFull = isStorageFull(storageUsed, storageQuota);
    const showStorageWarning = Boolean(storageLevel);
    const isCritical = storageLevel === 'critical' || storageLevel === 'full';

    const getDisplayName = () => user?.displayName || user?.name || user?.user_metadata?.name;

    const getUserInitials = () => {
        const name = getDisplayName();
        if (name) {
            return name
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);
        }
        if (user?.email) {
            return user.email.slice(0, 2).toUpperCase();
        }
        return 'U';
    };

    return (
        <div
            className="w-16 h-screen bg-gray-900 dark:bg-gray-950 flex flex-col items-center py-4 border-r border-gray-800 dark:border-gray-900">
            {/* Top Section - Logo and Main Actions */}
            <div className="flex flex-col items-center space-y-2">
                {/* Logo */}
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mb-2">
                    <MessageSquare className="h-5 w-5 text-white"/>
                </div>

                {/* New Chat Button */}
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-10 h-10 p-0 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                    onClick={() => {
                        onNavigate('/dashboard');
                        onNewConversation();
                    }}
                    disabled={storageFull}
                    title="New Chat"
                >
                    <Plus className="h-5 w-5"/>
                </Button>

                {/* Chat History Toggle */}
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                        "w-10 h-10 p-0 rounded-lg transition-colors",
                        isDashboard && !sidebarCollapsed
                            ? "text-white bg-gray-800"
                            : "text-gray-400 hover:text-white hover:bg-gray-800"
                    )}
                    onClick={onToggleSidebar}
                    title="Chat History"
                >
                    {/* <Menu className="h-5 w-5" /> */}
                    <Menu
                        className={cn("h-5 w-5 transition-transform duration-200", isDashboard && !sidebarCollapsed && "rotate-90")}
                    />
                </Button>

                {/* Documents View */}
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                        "w-10 h-10 p-0 rounded-lg transition-colors",
                        currentPath === '/documents'
                            ? "text-white bg-gray-800"
                            : "text-gray-400 hover:text-white hover:bg-gray-800"
                    )}
                    onClick={() => onNavigate('/documents')}
                    title="Documents"
                >
                    <FileText className="h-5 w-5"/>
                </Button>

                {/* Analytics View - Admin Only */}
                {isAdmin && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "w-10 h-10 p-0 rounded-lg transition-colors",
                            currentPath === '/analytics'
                                ? "text-white bg-gray-800"
                                : "text-gray-400 hover:text-white hover:bg-gray-800"
                        )}
                        onClick={() => onNavigate('/analytics')}
                        title="Analytics"
                    >
                        <BarChart3 className="h-5 w-5"/>
                    </Button>
                )}

                {/* Settings */}
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                        "w-10 h-10 p-0 rounded-lg transition-colors",
                        currentPath === '/settings'
                            ? "text-white bg-gray-800"
                            : "text-gray-400 hover:text-white hover:bg-gray-800"
                    )}
                    onClick={() => onNavigate('/settings')}
                    title="Settings"
                >
                    <Settings className="h-5 w-5"/>
                </Button>

                {/* Theme Toggle */}
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-10 h-10 p-0 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                    onClick={toggleTheme}
                    title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                >
                    {theme === 'light' ? (
                        <Moon className="h-5 w-5"/>
                    ) : (
                        <Sun className="h-5 w-5"/>
                    )}
                </Button>
            </div>

            {/* Spacer */}
            <div className="flex-1"/>

            {/* Bottom Section - User Menu */}
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-10 h-10 p-0 rounded-lg transition-colors hover:bg-gray-800"
                        title="User Menu"
                    >
                        <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-blue-600 text-white text-sm font-medium">
                                {getUserInitials()}
                            </AvatarFallback>
                        </Avatar>
                    </Button>
                </PopoverTrigger>
                <PopoverContent side="right" className="w-60 ml-4">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-blue-600 text-white font-medium">
                                    {getUserInitials()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">
                                    {getDisplayName() || 'User'}
                                </p>
                                <p className="text-sm text-gray-500 truncate">
                                    {user?.email}
                                </p>
                            </div>
                        </div>

                        {/* Storage Usage */}
                        {storageUsed !== undefined && storageQuota !== undefined && (
                            <>
                                <div className="border-t pt-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <HardDrive className="h-4 w-4 text-gray-500 dark:text-gray-400"/>
                                            <span
                                                className="text-sm font-medium text-gray-700 dark:text-gray-300">Storage</span>
                                        </div>
                                        {showStorageWarning && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-5 w-5 p-0"
                                                onClick={onShowStorageWarning}
                                            >
                                                {isCritical ? (
                                                    <AlertCircle className="h-4 w-4 text-red-500"/>
                                                ) : (
                                                    <AlertTriangle className="h-4 w-4 text-amber-500"/>
                                                )}
                                            </Button>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">
                        {formatBytes(storageUsed)} / {formatBytes(storageQuota)}
                      </span>
                                            <span className={cn(
                                                "font-medium",
                                                isCritical
                                                    ? "text-red-600 dark:text-red-400"
                                                    : showStorageWarning
                                                        ? "text-amber-600 dark:text-amber-400"
                                                        : "text-gray-600 dark:text-gray-400"
                                            )}>
                        {getStoragePercentage(storageUsed, storageQuota).toFixed(0)}%
                      </span>
                                        </div>

                                        <Progress
                                            value={getStoragePercentage(storageUsed, storageQuota)}
                                            className={cn(
                                                "h-1.5",
                                                isCritical
                                                    ? "[&>div]:bg-red-600"
                                                    : showStorageWarning
                                                        ? "[&>div]:bg-amber-600"
                                                        : "[&>div]:bg-blue-600"
                                            )}
                                        />

                                        {showStorageWarning && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {storageLevel === 'full'
                                                    ? "Storage quota reached. New chats and uploads blocked."
                                                    : storageLevel === 'critical'
                                                        ? "Storage almost full. Delete items soon."
                                                        : "Approaching storage limit"}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="border-t pt-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                                onClick={onLogout}
                            >
                                <LogOut className="mr-2 h-4 w-4"/>
                                Sign out
                            </Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
