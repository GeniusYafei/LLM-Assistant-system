import React, {useState} from 'react';
import {Archive, Code, FileText, SlidersHorizontal} from 'lucide-react';
import {Button} from '../ui/button';
import {Popover, PopoverContent, PopoverTrigger,} from '../ui/popover';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from '../ui/select';
import {Badge} from '../ui/badge';
import {Separator} from '../ui/separator';
import {Label} from '../ui/label';

const TIME_RANGE_LABELS = {
    'all': 'All Time',
    '1h': 'Last Hour',
    '24h': 'Last 24 Hours',
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    '6m': 'Last 6 Months',
    '1y': 'Last Year',
    'custom': 'Custom Range'
};

export function FilterPanel({
                                filters,
                                onFiltersChange,
                                organizationName,
                                className = '',
                            }) {
    const [isOpen, setIsOpen] = useState(false);

    // Count active filters (excluding default values)
    let activeFiltersCount = 0;
    if (filters.conversationStatus && filters.conversationStatus !== 'all') activeFiltersCount++;
    if (filters.contentType && filters.contentType !== 'all') activeFiltersCount++;

    const handleFilterChange = (key, value) => {
        onFiltersChange({
            ...filters,
            [key]: value,
        });
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className={`gap-1 md:gap-2 ${className}`}
                >
                    <SlidersHorizontal className="h-4 w-4"/>
                    <span className="hidden md:inline">Filters</span>
                    {activeFiltersCount > 0 && (
                        <Badge variant="secondary"
                               className="ml-1 h-5 px-1.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                            {activeFiltersCount}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[340px]">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="font-medium">Advanced Filters</h4>
                        {activeFiltersCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                onClick={() => {
                                    onFiltersChange({
                                        ...filters,
                                        conversationStatus: 'all',
                                        contentType: 'all',
                                    });
                                }}
                            >
                                Clear all
                            </Button>
                        )}
                    </div>

                    {/* Organization Context Display */}
                    {organizationName && (
                        <>
                            <div className="space-y-2">
                                <Label className="text-sm text-gray-600 dark:text-gray-400">Organization Context</Label>
                                <div
                                    className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2">
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-gray-700 dark:text-gray-300">{organizationName}</span>
                                        <Badge variant="secondary"
                                               className="text-xs dark:bg-gray-800 dark:text-gray-300">
                                            Active
                                        </Badge>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    All content is scoped to this organization
                                </p>
                            </div>
                            <Separator/>
                        </>
                    )}

                    {/* Conversation Status Filter */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Conversation Status</Label>
                        <Select
                            value={filters.conversationStatus || 'all'}
                            onValueChange={(value) => handleFilterChange('conversationStatus', value)}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    <div className="flex items-center gap-2">
                                        <span>All Conversations</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="active">
                                    <div className="flex items-center gap-2">
                                        <span>Active Only</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="archived">
                                    <div className="flex items-center gap-2">
                                        <Archive className="h-4 w-4"/>
                                        <span>Archived</span>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Content Type Filter */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Content Type</Label>
                        <Select
                            value={filters.contentType || 'all'}
                            onValueChange={(value) => handleFilterChange('contentType', value)}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    <div className="flex items-center gap-2">
                                        <span>All Content</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="with-documents">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4"/>
                                        <span>With Documents</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="with-code">
                                    <div className="flex items-center gap-2">
                                        <Code className="h-4 w-4"/>
                                        <span>With Code</span>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
