import React from 'react';
import {BarChart3, Clock, FileText, MessageSquare, Settings} from 'lucide-react';
import {cn} from '../ui/utils';
import {Badge} from '../ui/badge';
import {Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger} from '../ui/sheet';
import {ChatSidebar} from '../chat/ChatSidebar';

export function MobileBottomNav({
                                    currentPath,
                                    onNavigate,
                                    conversations,
                                    activeConversationId,
                                    onSelectConversation,
                                    onNewConversation,
                                    onDeleteConversation,
                                    conversationsLoading = false,
                                    hasUnreadMessages = false,
                                    isAdmin = false,
                                    timeRange = 'all',
                                    onTimeRangeChange,
                                }) {
    // Only show Analytics for admin users
    const navItems = [
        {path: '/dashboard', icon: MessageSquare, label: 'Dashboard', badge: hasUnreadMessages},
        ...(isAdmin ? [{path: '/analytics', icon: BarChart3, label: 'Analytics'}] : []),
        {path: '/documents', icon: FileText, label: 'Documents'},
        {path: '/settings', icon: Settings, label: 'Settings'},
    ];

    return (
        <div
            className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 safe-area-inset-bottom z-50">
            <div className="flex items-center justify-around h-16">
                {/* Chat History Menu (always visible) */}
                <Sheet>
                    <SheetTrigger asChild>
                        <button
                            className="flex flex-col items-center justify-center flex-1 h-full text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
                            <Clock className="h-5 w-5"/>
                            <span className="text-xs mt-1">History</span>
                        </button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-80 p-0" hideClose>
                        <SheetHeader className="sr-only">
                            <SheetTitle>Chat History</SheetTitle>
                            <SheetDescription>View and manage your conversation history</SheetDescription>
                        </SheetHeader>
                        <ChatSidebar
                            conversations={conversations}
                            activeConversationId={activeConversationId}
                            onSelectConversation={onSelectConversation}
                            onNewConversation={onNewConversation}
                            onDeleteConversation={onDeleteConversation}
                            loading={conversationsLoading}
                            timeRange={timeRange}
                            onTimeRangeChange={onTimeRangeChange}
                        />
                    </SheetContent>
                </Sheet>

                {/* Main Navigation Items */}
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPath === item.path;

                    return (
                        <button
                            key={item.path}
                            onClick={() => onNavigate(item.path)}
                            className={cn(
                                "flex flex-col items-center justify-center flex-1 h-full transition-colors relative",
                                isActive
                                    ? "text-blue-600 dark:text-blue-400"
                                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                            )}
                        >
                            <Icon className="h-5 w-5"/>
                            <span className="text-xs mt-1">{item.label}</span>
                            {item.badge && (
                                <Badge className="absolute top-2 right-4 h-2 w-2 p-0 bg-red-500"/>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
