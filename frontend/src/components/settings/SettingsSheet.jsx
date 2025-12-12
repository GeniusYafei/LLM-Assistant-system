import React, {useState} from 'react';
import {Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,} from '../ui/sheet';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '../ui/tabs';
import {Button} from '../ui/button';
import {Input} from '../ui/input';
import {Label} from '../ui/label';
import {Badge} from '../ui/badge';
import {Separator} from '../ui/separator';
import {Avatar, AvatarFallback} from '../ui/avatar';
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,} from '../ui/dialog';
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,} from '../ui/dropdown-menu';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from '../ui/select';
import {
    AlertCircle,
    Building2,
    Edit,
    Lock,
    Mail,
    MoreVertical,
    Search,
    Shield,
    Trash2,
    User as UserIcon,
    UserPlus,
} from 'lucide-react';
import {ScrollArea} from '../ui/scroll-area';
import {Alert, AlertDescription} from '../ui/alert';

// Robust parse for backend date strings like "YYYY-MM-DD HH:mm:ss AEDT/AEST"
export function parseBackendDate(str) {
    if (!str) return null;
    if (typeof str === 'number') return new Date(str);        // epoch support
    if (str.includes('T')) {                                  // ISO
        const d = new Date(str);
        return isNaN(d) ? null : d;
    }
    //  "YYYY-MM-DD HH:mm:ss AEDT/AEST"
    const m = String(str).match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\s+(AEDT|AEST))?$/);
    if (m) {
        const [, d, t, abbr] = m;
        const offset = abbr === 'AEDT' ? '+11:00' : abbr === 'AEST' ? '+10:00' : '';
        const iso = offset ? `${d}T${t}${offset}` : `${d}T${t}`;
        const parsed = new Date(iso);
        return isNaN(parsed) ? null : parsed;
    }
    const d = new Date(str);
    return isNaN(d) ? null : d;
}


export function SettingsSheet({
                                  open,
                                  onOpenChange,
                                  currentUser,
                                  users,
                                  organizations,
                                  onCreateUser,
                                  onUpdateUser,
                                  onDeleteUser,
                                  onRequestAccess,
                                  loading = false,
                              }) {
    const isAdmin = currentUser?.role === 'admin';
    const [activeTab, setActiveTab] = useState(isAdmin ? 'account' : 'account');

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-2xl p-0">
                <div className="flex flex-col h-full">
                    <SheetHeader className="px-6 py-4 border-b">
                        <SheetTitle>Settings</SheetTitle>
                        <SheetDescription>
                            Manage your account, organization access, and preferences
                        </SheetDescription>
                    </SheetHeader>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                        <div className="border-b px-6">
                            <TabsList className="w-full justify-start h-auto p-0 bg-transparent">
                                <TabsTrigger value="account"
                                             className="rounded-none border-b-2 border-transparent data-[state=active]:bg-gray-900 data-[state=active]:text-white data-[state=active]:border-gray-900 data-[state=active]:shadow-none hover:bg-gray-100 transition-all">
                                    Account
                                </TabsTrigger>
                                {isAdmin && (
                                    <TabsTrigger value="users"
                                                 className="rounded-none border-b-2 border-transparent data-[state=active]:bg-gray-900 data-[state=active]:text-white data-[state=active]:border-gray-900 data-[state=active]:shadow-none hover:bg-gray-100 transition-all">
                                        User Management
                                    </TabsTrigger>
                                )}
                                <TabsTrigger value="preferences"
                                             className="rounded-none border-b-2 border-transparent data-[state=active]:bg-gray-900 data-[state=active]:text-white data-[state=active]:border-gray-900 data-[state=active]:shadow-none hover:bg-gray-100 transition-all">
                                    Preferences
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="flex-1 overflow-hidden">
                            <TabsContent value="account" className="h-full m-0">
                                <AccountTab currentUser={currentUser} organizations={organizations}
                                            onRequestAccess={onRequestAccess}/>
                            </TabsContent>

                            {isAdmin && (
                                <TabsContent value="users" className="h-full m-0">
                                    <UserManagementTab
                                        users={users}
                                        organizations={organizations}
                                        currentUser={currentUser}
                                        onCreateUser={onCreateUser}
                                        onUpdateUser={onUpdateUser}
                                        onDeleteUser={onDeleteUser}
                                        loading={loading}
                                    />
                                </TabsContent>
                            )}

                            <TabsContent value="preferences" className="h-full m-0">
                                <PreferencesTab/>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </SheetContent>
        </Sheet>
    );
}

// Account Tab Component
function AccountTab({
                        currentUser,
                        organizations,
                        onRequestAccess,
                    }) {
    const createdAtDate = parseBackendDate(currentUser?.createdAt);
    const lastLoginDate = parseBackendDate(currentUser?.lastLogin);
    const [showRequestDialog, setShowRequestDialog] = useState(false);
    const [selectedOrg, setSelectedOrg] = useState('');
    const [editMode, setEditMode] = useState(false);

    const isAdmin = currentUser?.role === 'admin';
    const userOrganizations = currentUser?.organizations || [];

    const handleRequestAccess = async () => {
        if (onRequestAccess && selectedOrg) {
            await onRequestAccess(selectedOrg);
            setShowRequestDialog(false);
            setSelectedOrg('');
        }
    };

    return (
        <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
                {/* Profile Section */}
                <div>
                    <h3 className="font-semibold text-gray-900 mb-4">Profile Information</h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                        <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16">
                                <AvatarFallback className="bg-blue-600 text-white text-xl">
                                    {currentUser?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-semibold text-gray-900">{currentUser?.name}</h4>
                                    <Badge variant={isAdmin ? 'default' : 'secondary'}
                                           className={isAdmin ? 'bg-purple-100 text-purple-700 border-0' : ''}>
                                        {isAdmin ? (
                                            <>
                                                <Shield className="h-3 w-3 mr-1"/>
                                                Admin
                                            </>
                                        ) : (
                                            'Member'
                                        )}
                                    </Badge>
                                </div>
                                <p className="text-sm text-gray-600 flex items-center gap-1">
                                    <Mail className="h-3 w-3"/>
                                    {currentUser?.email}
                                </p>
                            </div>
                            {!isAdmin && (
                                <Button variant="outline" size="sm" onClick={() => setEditMode(!editMode)}>
                                    <Edit className="h-4 w-4 mr-2"/>
                                    Edit
                                </Button>
                            )}
                        </div>

                        {editMode && !isAdmin && (
                            <div className="space-y-3 pt-2 border-t">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-name">Name</Label>
                                    <Input id="edit-name" defaultValue={currentUser?.name}/>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" className="flex-1">Save Changes</Button>
                                    <Button size="sm" variant="outline"
                                            onClick={() => setEditMode(false)}>Cancel</Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Organization Access Section */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900">Organization Access</h3>
                        {!isAdmin && (
                            <Button variant="outline" size="sm" onClick={() => setShowRequestDialog(true)}>
                                Request Access
                            </Button>
                        )}
                    </div>

                    <div className="space-y-2">
                        {userOrganizations.length === 0 ? (
                            <Alert key="no-orgs-alert">
                                <AlertCircle className="h-4 w-4"/>
                                <AlertDescription>
                                    You don't have access to any organizations yet.
                                </AlertDescription>
                            </Alert>
                        ) : (
                            userOrganizations.map((org) => (
                                <div key={org.id}
                                     className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <Building2 className="h-5 w-5 text-blue-600"/>
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-gray-900">{org.name}</h4>
                                            <p className="text-sm text-gray-500">
                                                {org.role === 'admin' ? 'Organization Admin' : 'Member'}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant="outline"
                                           className={org.role === 'admin' ? 'border-purple-200 text-purple-700' : ''}>
                                        {org.role}
                                    </Badge>
                                </div>
                            ))
                        )}
                    </div>

                    {!isAdmin && (
                        <p className="text-sm text-gray-500 mt-3">
                            Need access to a different organization? Contact your administrator or request access above.
                        </p>
                    )}
                </div>

                {/* Account Details */}
                <div>
                    <h3 className="font-semibold text-gray-900 mb-4">Account Details</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between py-2">
                            <span className="text-sm text-gray-600">Member since</span>
                            <span className="text-sm font-medium text-gray-900">
                {/* {new Date(currentUser?.createdAt || '').toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })} */}
                                {createdAtDate ? createdAtDate.toDateString('en-Au', {
                                    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Australia/Sydney'
                                }) : '-'}
              </span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                            <span className="text-sm text-gray-600">Last login</span>
                            <span className="text-sm font-medium text-gray-900">
                {/* {currentUser?.lastLogin
                  ? new Date(currentUser.lastLogin).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'Never'} */}
                                {lastLoginDate ? new Intl.DateTimeFormat('en-Au', {
                                    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Australia/Sydney',
                                }).format(lastLoginDate) : 'Never'}
              </span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                            <span className="text-sm text-gray-600">Account status</span>
                            <Badge variant={currentUser?.status === 'active' ? 'default' : 'secondary'}
                                   className={currentUser?.status === 'active' ? 'bg-green-100 text-green-700 border-0' : ''}>
                                {currentUser?.status}
                            </Badge>
                        </div>
                    </div>
                </div>
            </div>

            {/* Request Access Dialog */}
            <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Request Organization Access</DialogTitle>
                        <DialogDescription>
                            Submit a request to access an organization. An administrator will review your request.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="org-select">Select Organization</Label>
                            <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                                <SelectTrigger id="org-select">
                                    <SelectValue placeholder="Choose an organization"/>
                                </SelectTrigger>
                                <SelectContent>
                                    {organizations
                                        .filter((org) => !userOrganizations.find((uo) => uo.id === org.id))
                                        .map((org) => (
                                            <SelectItem key={org.id} value={org.id}>
                                                {org.displayName}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleRequestAccess} disabled={!selectedOrg}>
                            Submit Request
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </ScrollArea>
    );
}

// User Management Tab Component (for Admins only)
function UserManagementTab({
                               users,
                               organizations,
                               currentUser,
                               onCreateUser,
                               onUpdateUser,
                               onDeleteUser,
                               loading,
                           }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [newUser, setNewUser] = useState({
        email: '',
        name: '',
        role: 'user',
        organizationIds: [],
    });

    const filteredUsers = users.filter(
        (user) =>
            user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCreateUser = async () => {
        if (!onCreateUser) return;

        await onCreateUser(newUser);
        setShowCreateDialog(false);
        setNewUser({email: '', name: '', role: 'user', organizationIds: []});
    };

    return (
        <ScrollArea className="h-full">
            <div className="p-6 space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                        <div className="text-2xl font-semibold text-blue-900">{users.length}</div>
                        <div className="text-sm text-blue-700">Total Users</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                        <div className="text-2xl font-semibold text-green-900">
                            {users.filter((u) => u.status === 'active').length}
                        </div>
                        <div className="text-sm text-green-700">Active</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                        <div className="text-2xl font-semibold text-purple-900">
                            {users.filter((u) => u.role === 'admin').length}
                        </div>
                        <div className="text-sm text-purple-700">Admins</div>
                    </div>
                </div>

                {/* Search and Actions */}
                <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"/>
                        <Input
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Button onClick={() => setShowCreateDialog(true)}>
                        <UserPlus className="h-4 w-4 mr-2"/>
                        Add User
                    </Button>
                </div>

                {/* Users List */}
                <div className="space-y-2">
                    {filteredUsers.length === 0 ? (
                        <div key="no-users" className="text-center py-12 bg-gray-50 rounded-lg">
                            <UserIcon className="h-12 w-12 text-gray-300 mx-auto mb-3"/>
                            <p className="text-gray-600">No users found</p>
                        </div>
                    ) : (
                        <>
                            {filteredUsers.map((user) => (
                                <div
                                    key={user.id}
                                    className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3">
                                            <Avatar className="h-10 w-10">
                                                <AvatarFallback className="bg-gray-200 text-gray-700">
                                                    {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-medium text-gray-900">{user.name}</h4>
                                                    <Badge
                                                        variant={user.role === 'admin' ? 'default' : 'secondary'}
                                                        className={user.role === 'admin' ? 'bg-purple-100 text-purple-700 border-0' : ''}
                                                    >
                                                        {user.role}
                                                    </Badge>
                                                    <Badge
                                                        variant={user.status === 'active' ? 'default' : 'secondary'}
                                                        className={user.status === 'active' ? 'bg-green-100 text-green-700 border-0' : ''}
                                                    >
                                                        {user.status}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-gray-600 flex items-center gap-1 mb-2">
                                                    <Mail className="h-3 w-3"/>
                                                    {user.email}
                                                </p>
                                                <div className="flex flex-wrap gap-1">
                                                    {user.organizations.slice(0, 2).map((org) => (
                                                        <Badge key={org.id} variant="outline" className="text-xs">
                                                            {org.name}
                                                        </Badge>
                                                    ))}
                                                    {user.organizations.length > 2 && (
                                                        <Badge key="more-orgs" variant="outline" className="text-xs">
                                                            +{user.organizations.length - 2} more
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                    <MoreVertical className="h-4 w-4"/>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem>
                                                    <Edit className="h-4 w-4 mr-2"/>
                                                    Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-red-600"
                                                                  disabled={user.id === currentUser?.id}>
                                                    <Trash2 className="h-4 w-4 mr-2"/>
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>

            {/* Create User Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New User</DialogTitle>
                        <DialogDescription>
                            Create a new user and assign them to organizations
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                placeholder="John Doe"
                                value={newUser.name}
                                onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="john@example.com"
                                value={newUser.email}
                                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="role">Role</Label>
                            <Select
                                value={newUser.role}
                                onValueChange={(value) => setNewUser({...newUser, role: value})}
                            >
                                <SelectTrigger id="role">
                                    <SelectValue/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="user">User</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Organizations</Label>
                            <div
                                className="border border-gray-200 rounded-md p-3 space-y-2 max-h-[150px] overflow-auto">
                                {organizations.map((org) => (
                                    <label
                                        key={org.id}
                                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={newUser.organizationIds.includes(org.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setNewUser({
                                                        ...newUser,
                                                        organizationIds: [...newUser.organizationIds, org.id],
                                                    });
                                                } else {
                                                    setNewUser({
                                                        ...newUser,
                                                        organizationIds: newUser.organizationIds.filter((id) => id !== org.id),
                                                    });
                                                }
                                            }}
                                            className="rounded border-gray-300"
                                        />
                                        <span className="text-sm">{org.displayName}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateUser} disabled={!newUser.email || !newUser.name}>
                            Create User
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </ScrollArea>
    );
}

// Preferences Tab Component
function PreferencesTab() {
    return (
        <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
                <div>
                    <h3 className="font-semibold text-gray-900 mb-4">Notifications</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between py-2">
                            <div>
                                <p className="font-medium text-gray-900">Email notifications</p>
                                <p className="text-sm text-gray-500">Receive email updates about your account</p>
                            </div>
                            <input type="checkbox" className="rounded" defaultChecked/>
                        </div>
                        <div className="flex items-center justify-between py-2">
                            <div>
                                <p className="font-medium text-gray-900">Activity alerts</p>
                                <p className="text-sm text-gray-500">Get notified about important activities</p>
                            </div>
                            <input type="checkbox" className="rounded"/>
                        </div>
                    </div>
                </div>

                <Separator/>

                <div>
                    <h3 className="font-semibold text-gray-900 mb-4">Appearance</h3>
                    <div className="space-y-3">
                        <div>
                            <Label htmlFor="theme">Theme</Label>
                            <Select defaultValue="light">
                                <SelectTrigger id="theme" className="mt-2">
                                    <SelectValue/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="light">Light</SelectItem>
                                    <SelectItem value="dark">Dark</SelectItem>
                                    <SelectItem value="system">System</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <Separator/>

                <div>
                    <h3 className="font-semibold text-gray-900 mb-4">Security</h3>
                    <div className="space-y-2">
                        <Button variant="outline" className="w-full justify-start">
                            <Lock className="h-4 w-4 mr-2"/>
                            Change Password
                        </Button>
                        {/* <Button variant="outline" className="w-full justify-start">
              <Shield className="h-4 w-4 mr-2" />
              Two-Factor Authentication
            </Button> */}
                    </div>
                </div>
            </div>
        </ScrollArea>
    );
}
