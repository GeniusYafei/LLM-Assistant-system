import React from 'react';
import {Building2, Check, ChevronDown} from 'lucide-react';
import {Button} from '../ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {Badge} from '../ui/badge';

export function OrganizationSelector({
                                         organizations,
                                         selectedOrganizationId,
                                         onSelectOrganization,
                                         className = '',
                                     }) {
    const selectedOrg = organizations.find(org => org.id === selectedOrganizationId);

    // Group organizations by parent for hierarchical display
    const rootOrgs = organizations.filter(org => !org.parentId);

    const getChildren = (parentId) => {
        return organizations.filter(org => org.parentId === parentId);
    };

    const renderOrgItem = (org, level = 0) => {
        const isSelected = org.id === selectedOrganizationId;
        const children = getChildren(org.id);

        return (
            <React.Fragment key={org.id}>
                <DropdownMenuItem
                    onClick={() => onSelectOrganization(org.id)}
                    className="cursor-pointer"
                >
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2" style={{paddingLeft: `${level * 16}px`}}>
                            {level > 0 && <span className="text-gray-400">└</span>}
                            <Building2 className="h-4 w-4 text-gray-500"/>
                            <span>{org.displayName}</span>
                            {org.type !== 'organization' && (
                                <Badge variant="secondary" className="text-xs ml-1">
                                    {org.type}
                                </Badge>
                            )}
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-blue-600"/>}
                    </div>
                </DropdownMenuItem>
                {children.map(child => renderOrgItem(child, level + 1))}
            </React.Fragment>
        );
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    className={`justify-between min-w-[120px] md:min-w-[200px] ${className}`}
                >
                    <div className="flex items-center gap-1 md:gap-2 min-w-0">
                        <Building2 className="h-4 w-4 text-gray-500 flex-shrink-0"/>
                        <span className="truncate text-sm md:text-base">
              {selectedOrg ? selectedOrg.displayName : 'Select Organization'}
            </span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-500 ml-1 md:ml-2 flex-shrink-0"/>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[280px]">
                <div className="px-2 py-1.5 text-sm text-gray-500">
                    Your Organizations
                </div>
                <DropdownMenuSeparator/>
                {rootOrgs.map(org => renderOrgItem(org))}
                {organizations.length === 0 && (
                    <div className="px-2 py-6 text-center text-sm text-gray-500">
                        No organizations available
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
