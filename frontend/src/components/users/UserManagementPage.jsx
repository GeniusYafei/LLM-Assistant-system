import React, {useState} from 'react';
import {Building2, Check, Edit, Mail, MoreVertical, Search, Shield, Trash2, UserPlus, Users} from 'lucide-react';
import {Button} from '../ui/button';
import {Input} from '../ui/input';
import {Badge} from '../ui/badge';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from '../ui/table';
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,} from '../ui/dropdown-menu';
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,} from '../ui/dialog';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from '../ui/select';
import {Label} from '../ui/label';

export function UserManagementPage({
                                       users,
                                       organizations,
                                       currentUser,
                                       onCreateUser,
                                       onUpdateUser,
                                       onDeleteUser,
                                       loading = false,
                                   }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [newUser, setNewUser] = useState({
        email: '',
        name: '',
        role: 'user',
        organizationIds: [],
    });

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCreateUser = async () => {
        if (!onCreateUser) return;

        await onCreateUser(newUser);
        setShowCreateDialog(false);
        setNewUser({email: '', name: '', role: 'user', organizationIds: []});
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <div className="h-full flex flex-col bg-white">
            {/* Header */}
            <div className="border-b border-gray-200 px-8 py-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900 mb-1">User Management</h1>
                        <p className="text-gray-600">
                            Manage users and their organization access
                        </p>
                    </div>

                    <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                        <UserPlus className="h-4 w-4"/>
                        Add User
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 mt-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Users className="h-5 w-5 text-blue-600"/>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Total Users</p>
                                <p className="text-2xl font-semibold text-gray-900">{users.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <Check className="h-5 w-5 text-green-600"/>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Active</p>
                                <p className="text-2xl font-semibold text-gray-900">
                                    {users.filter(u => u.status === 'active').length}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                <Shield className="h-5 w-5 text-purple-600"/>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Admins</p>
                                <p className="text-2xl font-semibold text-gray-900">
                                    {users.filter(u => u.role === 'admin').length}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                <Building2 className="h-5 w-5 text-orange-600"/>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Organizations</p>
                                <p className="text-2xl font-semibold text-gray-900">{organizations.length}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="border-b border-gray-200 px-8 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"/>
                        <Input
                            placeholder="Search users by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className="flex-1 overflow-auto px-8 py-6">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Organizations</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Last Login</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredUsers.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell>
                                    <div>
                                        <div className="font-medium text-gray-900">{user.name}</div>
                                        <div className="text-sm text-gray-500 flex items-center gap-1">
                                            <Mail className="h-3 w-3"/>
                                            {user.email}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        variant={user.role === 'admin' ? 'default' : 'secondary'}
                                        className={user.role === 'admin' ? 'bg-purple-100 text-purple-700 border-0' : ''}
                                    >
                                        {user.role}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                        {user.organizations.slice(0, 2).map((org) => (
                                            <Badge key={org.id} variant="outline" className="text-xs">
                                                {org.name}
                                            </Badge>
                                        ))}
                                        {user.organizations.length > 2 && (
                                            <Badge variant="outline" className="text-xs">
                                                +{user.organizations.length - 2} more
                                            </Badge>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        variant={user.status === 'active' ? 'default' : 'secondary'}
                                        className={user.status === 'active' ? 'bg-green-100 text-green-700 border-0' : ''}
                                    >
                                        {user.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-gray-600">
                                    {formatDate(user.lastLogin)}
                                </TableCell>
                                <TableCell>
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
                                            <DropdownMenuItem className="text-red-600">
                                                <Trash2 className="h-4 w-4 mr-2"/>
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                {filteredUsers.length === 0 && (
                    <div className="text-center py-12">
                        <Users className="h-12 w-12 text-gray-300 mx-auto mb-4"/>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                        <p className="text-gray-500">
                            {searchQuery ? 'Try adjusting your search' : 'Get started by adding your first user'}
                        </p>
                    </div>
                )}
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
                                    {/* <SelectItem value="admin">Admin</SelectItem> */}
                                    <SelectItem value="user">User</SelectItem>
                                    {/* <SelectItem value="viewer">Viewer</SelectItem> */}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Organizations</Label>
                            <p className="text-sm text-gray-500">
                                Select which organizations this user can access
                            </p>
                            <div
                                className="border border-gray-200 rounded-md p-3 space-y-2 max-h-[200px] overflow-auto">
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
                                                        organizationIds: [...newUser.organizationIds, org.id]
                                                    });
                                                } else {
                                                    setNewUser({
                                                        ...newUser,
                                                        organizationIds: newUser.organizationIds.filter(id => id !== org.id)
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
        </div>
    );
}
