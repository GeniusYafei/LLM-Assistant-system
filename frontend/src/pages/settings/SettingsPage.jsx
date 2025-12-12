import React, {useEffect, useMemo, useState} from 'react';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '../../components/ui/tabs.jsx';
import {Button} from '../../components/ui/button.jsx';
import {Input} from '../../components/ui/input.jsx';
import {Label} from '../../components/ui/label.jsx';
import {Badge} from '../../components/ui/badge.jsx';
import {Avatar, AvatarFallback} from '../../components/ui/avatar.jsx';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../../components/ui/dialog.jsx';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu.jsx';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from '../../components/ui/select.jsx';
import {
    AlertCircle,
    Building2,
    Check,
    Copy,
    Edit,
    Loader2,
    Lock,
    LogOut,
    Mail,
    Moon,
    MoreVertical,
    Search,
    Settings as SettingsIcon,
    Shield,
    Sun,
    Trash2,
    User as UserIcon,
    UserPlus,
} from 'lucide-react';
import {Alert, AlertDescription} from '../../components/ui/alert.jsx';
import {useTheme} from '../../contexts/ThemeContext.jsx';
import {useAuth} from '../../contexts/AuthContext.jsx';
import {toast} from 'sonner';

function parseBackendDate(str) {
    if (!str) return null;

    const s = String(str).trim();

    //  ISO8601：2025-11-09T12:34:56Z / +11:00）
    const ts = Date.parse(s);
    if (!Number.isNaN(ts)) return new Date(ts);

    // "YYYY-MM-DD HH:mm[:ss] [AEDT|AEST]" backend formate
    const sNorm = s.replace(/\s+/g, ' ');
    const m = sNorm.match(
        /^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\s+(AEDT|AEST))?$/i
    );
    if (m) {
        const [, d, hh, mm, ssMaybe, abbrMaybe] = m;
        const ss = ssMaybe ?? '00';
        const abbr = abbrMaybe ? abbrMaybe.toUpperCase() : null;
        // AEDT=+11, AEST=+10
        const offset = abbr === 'AEDT' ? '+11:00' : abbr === 'AEST' ? '+10:00' : '';
        const iso = offset ? `${d}T${hh}:${mm}:${ss}${offset}` : `${d}T${hh}:${mm}:${ss}`;
        const dt = new Date(iso);
        if (!Number.isNaN(dt.getTime())) return dt;
    }

    // "YYYY-MM-DD HH:mm[:ss]"
    const m2 = sNorm.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (m2) {
        const [, d, hh, mm, ssMaybe] = m2;
        const ss = ssMaybe ?? '00';
        const dt = new Date(`${d}T${hh}:${mm}:${ss}`);
        if (!Number.isNaN(dt.getTime())) return dt;
    }

    console.warn('[parseBackendDate] Unmatched:', s);
    return null;
}

function RoleBadge({role}) {
    const isAdmin = String(role || '').toLowerCase() === 'admin';
    // Admin: purple；Member: grey
    const cls = isAdmin
        ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 border-0'
        : 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100 border-0';

    return (
        <Badge variant="secondary" className={cls}>
            {isAdmin ? (
                <>
                    <Shield className="h-3 w-3 mr-1"/>
                    Admin
                </>
            ) : (
                'Member'
            )}
        </Badge>
    );
}

function StatusBadge({status}) {
    const s = String(status || '').toLowerCase();
    const isActive = s === 'active';
    // Active: green ；Inactive: red
    const cls = isActive
        ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border-0'
        : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border-0';

    return (
        <Badge variant="secondary" className={cls}>
            {isActive ? 'Active' : 'Inactive'}
        </Badge>
    );
}


export function SettingsPage({
                                 currentUser,
                                 users,
                                 organizations,
                                 onCreateUser,
                                 onActivateUser,
                                 onDeactivateUser,
                                 onUpdateProfile,
                                 onRequestAccess,
                                 onResetPassword,
                                 onRequestPasswordCode,
                                 loading = false,
                                 resetPasswordLoading = false,
                                 requestPasswordCodeLoading = false,
                             }) {
    const isAdmin = currentUser?.role === 'admin';
    const [activeTab, setActiveTab] = useState(isAdmin ? 'account' : 'account');

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-6">
                <div className="flex items-center gap-3">
                    <div
                        className="hidden md:flex w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg items-center justify-center">
                        <SettingsIcon className="h-5 w-5 text-blue-600 dark:text-blue-400"/>
                    </div>
                    <div>
                        <h1 className="font-semibold text-xl text-gray-900 dark:text-white">Settings</h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Manage your account, organization
                            access, and preferences</p>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                    <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                        <TabsList className="w-full justify-start h-auto p-0 bg-transparent">
                            <TabsTrigger
                                value="account"
                                className="rounded-none border-b-2 border-transparent data-[state=active]:bg-gray-900 dark:data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-gray-900 dark:data-[state=active]:border-blue-600 data-[state=active]:shadow-none hover:bg-gray-100 dark:hover:bg-gray-700 px-6 py-3 transition-all"
                            >
                                Account
                            </TabsTrigger>
                            {isAdmin && (
                                <TabsTrigger
                                    value="users"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:bg-gray-900 dark:data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-gray-900 dark:data-[state=active]:border-blue-600 data-[state=active]:shadow-none hover:bg-gray-100 dark:hover:bg-gray-700 px-6 py-3 transition-all"
                                >
                                    User Management
                                </TabsTrigger>
                            )}
                            <TabsTrigger
                                value="preferences"
                                className="rounded-none border-b-2 border-transparent data-[state=active]:bg-gray-900 dark:data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-gray-900 dark:data-[state=active]:border-blue-600 data-[state=active]:shadow-none hover:bg-gray-100 dark:hover:bg-gray-700 px-6 py-3 transition-all"
                            >
                                Preferences
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
                        <div className="max-w-5xl mx-auto">
                            <TabsContent value="account" className="m-0 p-6">
                                <AccountTab
                                    currentUser={currentUser}
                                    organizations={organizations}
                                    onRequestAccess={onRequestAccess}
                                    onUpdateProfile={onUpdateProfile}
                                />
                            </TabsContent>

                            {isAdmin && (
                                <TabsContent value="users" className="m-0 p-6">
                                    <UserManagementTab
                                        users={users}
                                        organizations={organizations}
                                        currentUser={currentUser}
                                        onCreateUser={onCreateUser}
                                        onActivateUser={onActivateUser}
                                        onDeactivateUser={onDeactivateUser}
                                        loading={loading}
                                    />
                                </TabsContent>
                            )}

                            <TabsContent value="preferences" className="m-0 p-6">
                                <PreferencesTab
                                    onResetPassword={onResetPassword}
                                    onRequestPasswordCode={onRequestPasswordCode}
                                    currentUser={currentUser}
                                    resetPasswordLoading={resetPasswordLoading}
                                    requestPasswordCodeLoading={requestPasswordCodeLoading}
                                />
                            </TabsContent>
                        </div>
                    </div>
                </Tabs>
            </div>
        </div>
    );
}

// Account Tab Component
function AccountTab({
                        currentUser,
                        organizations,
                        onRequestAccess,
                        onUpdateProfile,
                    }) {
    const createdAtRaw = currentUser?.createdAt;
    const lastLoginRaw = currentUser?.lastLogin;

    const createdAtDate = parseBackendDate(createdAtRaw);
    const lastLoginDate = parseBackendDate(lastLoginRaw);
    const [showRequestDialog, setShowRequestDialog] = useState(false);
    const [selectedOrg, setSelectedOrg] = useState('');
    const [editMode, setEditMode] = useState(false);
    const [nameValue, setNameValue] = useState(currentUser?.displayName || currentUser?.name || '');
    const [isSavingName, setIsSavingName] = useState(false);

    const isAdmin = currentUser?.role === 'admin';
    const userOrganizations = currentUser?.organizations || [];

    useEffect(() => {
        setNameValue(currentUser?.displayName || currentUser?.name || '');
    }, [currentUser?.displayName, currentUser?.name]);

    const displayOrganizations = useMemo(() => {
        if (userOrganizations.length > 0) {
            return userOrganizations.map(org => ({
                ...org,
                name: org.name || org.displayName || 'Unknown organization',
                role: org.role || (isAdmin ? 'admin' : 'member'),
            }));
        }

        return (organizations || []).map(org => ({
            id: org.id,
            name: org.displayName || org.name,
            role: isAdmin ? 'admin' : 'member',
        }));
    }, [userOrganizations, organizations, isAdmin]);

    const handleRequestAccess = async () => {
        if (onRequestAccess && selectedOrg) {
            await onRequestAccess(selectedOrg);
            setShowRequestDialog(false);
            setSelectedOrg('');
        }
    };

    const handleSaveProfile = async () => {
        const trimmed = nameValue.trim();
        const originalName = (currentUser?.displayName || currentUser?.name || '').trim();

        if (!trimmed) {
            toast.error('Name cannot be empty');
            return;
        }

        if (trimmed === originalName) {
            setEditMode(false);
            return;
        }

        if (!onUpdateProfile) {
            setEditMode(false);
            return;
        }

        try {
            setIsSavingName(true);
            await onUpdateProfile(trimmed);
            setEditMode(false);
        } catch (error) {
            // Error toast handled by parent callback
        } finally {
            setIsSavingName(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Profile Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Profile Information</h3>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-4">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                            <AvatarFallback className="bg-blue-600 text-white text-xl">
                                {(currentUser?.displayName || currentUser?.name || '')
                                    .split(' ')
                                    .filter(Boolean)
                                    .map(n => n[0])
                                    .join('')
                                    .toUpperCase() || 'U'}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-gray-900 dark:text-white">
                                    {currentUser?.displayName || currentUser?.name || currentUser?.email}
                                </h4>
                                {/* <Badge variant={isAdmin ? 'default' : 'secondary'} className={isAdmin ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 border-0' : 'dark:border-gray-600 dark:text-gray-300'}>
                  {isAdmin ? (
                    <>
                      <Shield className="h-3 w-3 mr-1" />
                      Admin
                    </>
                  ) : (
                    'Member'
                  )}
                </Badge> */}
                                <RoleBadge role={currentUser?.role}/>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                <Mail className="h-3 w-3"/>
                                {currentUser?.email}
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                if (editMode) {
                                    setEditMode(false);
                                    setNameValue(currentUser?.displayName || currentUser?.name || '');
                                } else {
                                    setEditMode(true);
                                }
                            }}
                            className="dark:border-gray-600"
                        >
                            <Edit className="h-4 w-4 mr-2"/>
                            {editMode ? 'Cancel' : 'Edit'}
                        </Button>
                    </div>

                    {editMode && (
                        <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                            <div className="space-y-2">
                                <Label htmlFor="edit-name" className="text-gray-900 dark:text-gray-100">Name</Label>
                                <Input
                                    id="edit-name"
                                    value={nameValue}
                                    onChange={(e) => setNameValue(e.target.value)}
                                    disabled={isSavingName}
                                    className="dark:bg-gray-800 dark:border-gray-700"
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    className="flex-1"
                                    onClick={handleSaveProfile}
                                    disabled={isSavingName}
                                >
                                    {isSavingName ? 'Saving...' : 'Save Changes'}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        setEditMode(false);
                                        setNameValue(currentUser?.displayName || currentUser?.name || '');
                                    }}
                                    disabled={isSavingName}
                                    className="dark:border-gray-600"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Organization Access Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Organization Access</h3>
                    {!isAdmin && (
                        <Button variant="outline" size="sm" onClick={() => setShowRequestDialog(true)}>
                            Request Access
                        </Button>
                    )}
                </div>

                <div className="space-y-2">
                    {!currentUser ? (
                        <div
                            className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400 dark:text-gray-500 mb-2"/>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Loading organizations...</p>
                        </div>
                    ) : displayOrganizations.length === 0 ? (
                        <Alert key="no-orgs-alert">
                            <AlertCircle className="h-4 w-4"/>
                            <AlertDescription>
                                {isAdmin ? 'As an administrator, you have access to all organizations in the system.' : 'You don\'t have access to any organizations yet.'}
                            </AlertDescription>
                        </Alert>
                    ) : (
                        displayOrganizations.map((org) => (
                            <div key={org.id}
                                 className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                                        <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400"/>
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-gray-900 dark:text-white">{org.name}</h4>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {org.role === 'admin' ? 'Organization Admin' : 'Member'}
                                        </p>
                                    </div>
                                </div>
                                <Badge variant="outline"
                                       className={org.role === 'admin' ? 'border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300' : 'dark:border-gray-600 dark:text-gray-300'}>
                                    {org.role === 'admin' ? 'Admin' : 'Member'}
                                </Badge>
                            </div>
                        ))
                    )}
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                    {isAdmin
                        ? 'As an administrator, you have access to all organizations in the system.'
                        : 'Need access to a different organization? Contact your administrator or request access above.'}
                </p>
            </div>

            {/* Account Details */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Account Details</h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Member since</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {/* {new Date(currentUser?.createdAt || '').toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })} */}
                            {createdAtDate ? new Intl.DateTimeFormat('en-AU', {
                                year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Australia/Sydney',
                            }).format(createdAtDate) : '-'}
            </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Last login</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {/* {currentUser?.lastLogin
                ? new Date(currentUser.lastLogin).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : 'Never'} */}
                            {lastLoginDate ? new Intl.DateTimeFormat('en-AU', {
                                dateStyle: 'medium', timeStyle: 'short', timeZone: 'Australia/Sydney',
                            }).format(lastLoginDate) : 'Never'}
            </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Account status</span>
                        {/* <Badge variant={currentUser?.status === 'active' ? 'default' : 'secondary'} className={currentUser?.status === 'active' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border-0' : ''}>
              {currentUser?.status}
            </Badge> */}
                        <StatusBadge status={currentUser?.status}/>
                    </div>
                </div>
            </div>

            {/* Sign Out Section */}
            <LogoutSection/>

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
        </div>
    );
}

// User Management Tab Component (for Admins only)
function UserManagementTab({
                               users = [],
                               organizations = [],
                               currentUser,
                               onCreateUser,
                               onActivateUser,
                               onDeactivateUser,
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
    const [isCreatingUser, setIsCreatingUser] = useState(false);
    const [confirmUser, setConfirmUser] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null);
    const [isProcessingAction, setIsProcessingAction] = useState(false);
    const [tempPasswordInfo, setTempPasswordInfo] = useState(null);
    const [copiedTempPassword, setCopiedTempPassword] = useState(false);

    const safeUsers = Array.isArray(users) ? users : [];
    const filteredUsers = safeUsers.filter((user) => {
        const name = (user.name || '').toLowerCase();
        const email = (user.email || '').toLowerCase();
        const query = searchQuery.toLowerCase();
        return name.includes(query) || email.includes(query);
    });

    const handleCreateUser = async () => {
        if (!onCreateUser || isCreatingUser) return;

        if (newUser.organizationIds.length === 0) {
            toast.error('Select an organization for the new user');
            return;
        }

        try {
            setIsCreatingUser(true);
            const response = await onCreateUser(newUser);
            if (response?.temporary_password) {
                setTempPasswordInfo({
                    password: response.temporary_password,
                    email: response.user?.email,
                    name: response.user?.display_name || response.user?.email,
                });
                setCopiedTempPassword(false);
            }
            setShowCreateDialog(false);
            setNewUser({email: '', name: '', role: 'user', organizationIds: []});
        } catch (error) {
            // toast handled by parent callback
        } finally {
            setIsCreatingUser(false);
        }
    };

    const openActionDialog = (user, action) => {
        setConfirmUser(user);
        setConfirmAction(action);
    };

    const handleConfirmAction = async () => {
        if (!confirmUser || !confirmAction) return;

        try {
            setIsProcessingAction(true);
            if (confirmAction === 'deactivate' && onDeactivateUser) {
                await onDeactivateUser(confirmUser.id);
            } else if (confirmAction === 'activate' && onActivateUser) {
                await onActivateUser(confirmUser.id);
            }
            setConfirmUser(null);
            setConfirmAction(null);
        } catch (error) {
            // toast handled in parent callback
        } finally {
            setIsProcessingAction(false);
        }
    };

    const handleCopyTempPassword = async () => {
        if (!tempPasswordInfo?.password) return;
        try {
            await navigator.clipboard.writeText(tempPasswordInfo.password);
            setCopiedTempPassword(true);
            toast.success('Temporary password copied');
            setTimeout(() => setCopiedTempPassword(false), 2000);
        } catch (error) {
            toast.error('Failed to copy password');
        }
    };

    return (
        <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="text-2xl font-semibold text-blue-900 dark:text-blue-400">{users.length}</div>
                    <div className="text-sm text-blue-700 dark:text-blue-500">Total Users</div>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="text-2xl font-semibold text-green-900 dark:text-green-400">
                        {users.filter((u) => u.status === 'active').length}
                    </div>
                    <div className="text-sm text-green-700 dark:text-green-500">Active</div>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="text-2xl font-semibold text-purple-900 dark:text-purple-400">
                        {users.filter((u) => u.role === 'admin').length}
                    </div>
                    <div className="text-sm text-purple-700 dark:text-purple-500">Admins</div>
                </div>
            </div>

            {/* Search and Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                        <Search
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500"/>
                        <Input
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 dark:bg-gray-900 dark:border-gray-700"
                        />
                    </div>
                    <Button
                        onClick={() => setShowCreateDialog(true)}
                        className="dark:bg-blue-600 dark:hover:bg-blue-700"
                        disabled={loading}
                    >
                        <UserPlus className="h-4 w-4 mr-2"/>
                        Add User
                    </Button>
                </div>
            </div>

            {/* Users List */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="p-4 space-y-2">
                    {loading ? (
                        <div key="loading-users" className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <Loader2 className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3 animate-spin"/>
                            <p className="text-gray-600 dark:text-gray-400">Loading users...</p>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div key="no-users" className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <UserIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3"/>
                            <p className="text-gray-600 dark:text-gray-400">{searchQuery ? 'No users found matching your search' : 'No users found'}</p>
                        </div>
                    ) : (
                        <>
                            {filteredUsers.map((user) => (
                                <div
                                    key={user.id}
                                    className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3">
                                            <Avatar className="h-10 w-10">
                                                <AvatarFallback
                                                    className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                                    {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-medium text-gray-900 dark:text-white">{user.name}</h4>
                                                    {/* <Badge
                            variant={user.role === 'admin' ? 'default' : 'secondary'}
                            className={user.role === 'admin' ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 border-0' : 'dark:bg-gray-800 dark:text-gray-300'}
                          >
                            {user.role === 'admin' ? 'Admin' : 'Member'}
                          </Badge> */}
                                                    <RoleBadge role={user.role}/>
                                                    {/* <Badge
                            variant={user.status === 'active' ? 'default' : 'secondary'}
                            className={user.status === 'active' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border-0' : 'dark:bg-gray-800 dark:text-gray-300'}
                          >
                            {user.status}
                          </Badge> */}
                                                    <StatusBadge status={user.status}/>
                                                </div>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 mb-2">
                                                    <Mail className="h-3 w-3"/>
                                                    {user.email}
                                                </p>
                                                <div className="flex flex-wrap gap-1">
                                                    {user.organizations.slice(0, 2).map((org) => (
                                                        <Badge key={org.id} variant="outline"
                                                               className="text-xs dark:border-gray-600 dark:text-gray-300">
                                                            {org.name}
                                                        </Badge>
                                                    ))}
                                                    {user.organizations.length > 2 && (
                                                        <Badge key="more-orgs" variant="outline"
                                                               className="text-xs dark:border-gray-600 dark:text-gray-300">
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
                                                {/* <DropdownMenuItem disabled>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit (coming soon)
                        </DropdownMenuItem> */}
                                                {user.status !== 'active' && (
                                                    <DropdownMenuItem
                                                        onClick={() => openActionDialog(user, 'activate')}
                                                        disabled={isProcessingAction}
                                                    >
                                                        <Check className="h-4 w-4 mr-2"/>
                                                        Activate
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem
                                                    className="text-red-600"
                                                    disabled={user.id === currentUser?.id || isProcessingAction}
                                                    onClick={() => openActionDialog(user, 'deactivate')}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2"/>
                                                    Deactivate
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
                                className="border-gray-200"
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
                                className="border-gray-200"
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
                                <SelectTrigger id="role" className="border-gray-200">
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
                            <div
                                className="border border-gray-200 rounded-md p-3 space-y-2 max-h-[150px] overflow-auto bg-[rgba(0,0,0,0)]">
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
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={isCreatingUser}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateUser}
                                disabled={isCreatingUser || !newUser.email || !newUser.name || newUser.organizationIds.length === 0}>
                            {isCreatingUser ? 'Creating...' : 'Create User'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Activate / Deactivate dialog */}
            <Dialog open={!!confirmUser} onOpenChange={(open) => {
                if (!open && !isProcessingAction) {
                    setConfirmUser(null);
                    setConfirmAction(null);
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {confirmAction === 'deactivate' ? 'Deactivate user' : 'Activate user'}
                        </DialogTitle>
                        <DialogDescription>
                            {confirmAction === 'deactivate'
                                ? 'This user will not be able to sign in until reactivated.'
                                : 'This user will regain access to Lorgan.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            {confirmUser?.name} ({confirmUser?.email})
                        </p>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                if (!isProcessingAction) {
                                    setConfirmUser(null);
                                    setConfirmAction(null);
                                }
                            }}
                            disabled={isProcessingAction}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmAction}
                            disabled={isProcessingAction}
                            variant={confirmAction === 'deactivate' ? 'destructive' : 'default'}
                        >
                            {isProcessingAction ? 'Processing...' : confirmAction === 'deactivate' ? 'Deactivate User' : 'Activate User'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Temporary password dialog */}
            <Dialog open={!!tempPasswordInfo} onOpenChange={(open) => {
                if (!open) setTempPasswordInfo(null);
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>User invited successfully</DialogTitle>
                        <DialogDescription>
                            Share the temporary password with the invited user. They will be asked to update it on first
                            sign-in.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-300">User</p>
                            <p className="font-medium text-gray-900 dark:text-white">{tempPasswordInfo?.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{tempPasswordInfo?.email}</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Temporary password</Label>
                            <div className="flex items-center gap-2">
                                <Input value={tempPasswordInfo?.password || ''} readOnly className="font-mono"/>
                                <Button variant="outline" size="sm" onClick={handleCopyTempPassword}>
                                    <Copy className="h-4 w-4 mr-2"/>
                                    {copiedTempPassword ? 'Copied' : 'Copy'}
                                </Button>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setTempPasswordInfo(null)}>Done</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Preferences Tab Component
function PreferencesTab({
                            onResetPassword,
                            onRequestPasswordCode,
                            currentUser,
                            resetPasswordLoading = false,
                            requestPasswordCodeLoading = false,
                        }) {
    const {theme, setTheme} = useTheme();
    const [showPasswordDialog, setShowPasswordDialog] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [codeValue, setCodeValue] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [copiedResetCode, setCopiedResetCode] = useState(false);
    const [codeRequestedAt, setCodeRequestedAt] = useState(null);
    const [isRequestingCode, setIsRequestingCode] = useState(false);

    const fallbackResetCode = useMemo(
        () => (import.meta.env.VITE_PASSWORD_RESET_DEV_CODE || '').trim(),
        []
    );
    const [serverVerificationCode, setServerVerificationCode] = useState('');
    const availableVerificationCode = serverVerificationCode || fallbackResetCode;
    const isDevCodeAvailable = Boolean(availableVerificationCode);
    const isSendingCode = isRequestingCode || requestPasswordCodeLoading;
    const trimmedCodeValue = codeValue.trim();

    const isPasswordLongEnough = newPassword.length >= 8;
    const hasNumber = /\d/.test(newPassword);
    const hasUpperAndLower = /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(newPassword);
    const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;

    useEffect(() => {
        if (showPasswordDialog) {
            resetPasswordFields();
        }
    }, [showPasswordDialog]);

    const resetPasswordFields = () => {
        setNewPassword('');
        setConfirmPassword('');
        setCodeValue('');
        setCopiedResetCode(false);
        setCodeRequestedAt(null);
        setServerVerificationCode('');
    };

    const handleCopyResetCode = async () => {
        if (!isDevCodeAvailable) return;
        const valueToCopy = availableVerificationCode;
        try {
            await navigator.clipboard.writeText(valueToCopy);
            setCopiedResetCode(true);
            toast.success('Verification code copied');
            setTimeout(() => setCopiedResetCode(false), 2000);
        } catch {
            toast.error('Unable to copy verification code');
        }
    };

    const handleApplyDevCode = () => {
        if (!isDevCodeAvailable) return;
        setCodeValue(availableVerificationCode);
        toast.success('Verification code applied');
    };

    const handleRequestVerificationCode = async () => {
        if (!onRequestPasswordCode || !currentUser?.email) return;

        try {
            setIsRequestingCode(true);
            const result = await onRequestPasswordCode({
                email: currentUser.email,
                displayName: currentUser.displayName || currentUser.name || '',
            });
            setCodeRequestedAt(new Date());
            setCopiedResetCode(false);
            const nextCode = result?.code ?? '';
            if (nextCode) {
                setServerVerificationCode(nextCode);
                setCodeValue(nextCode);
            }
        } catch (error) {
            console.error('Failed to request verification code', error);
        } finally {
            setIsRequestingCode(false);
        }
    };

    const handlePasswordSubmit = async () => {
        if (!onResetPassword || !currentUser?.email) return;

        try {
            setIsSubmitting(true);
            await onResetPassword({
                newPassword,
                confirmPassword,
                code: trimmedCodeValue,
            });
            setShowPasswordDialog(false);
            resetPasswordFields();
        } catch (error) {
            // toast handled by parent callback
        } finally {
            setIsSubmitting(false);
        }
    };

    const canSubmit =
        isPasswordLongEnough &&
        hasNumber &&
        hasUpperAndLower &&
        hasSpecialChar &&
        passwordsMatch &&
        Boolean(trimmedCodeValue) &&
        !isSubmitting &&
        !resetPasswordLoading;

    const closePasswordDialog = () => {
        if (isSubmitting || resetPasswordLoading) return;
        setShowPasswordDialog(false);
        resetPasswordFields();
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Appearance</h3>
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="theme" className="text-gray-900 dark:text-gray-100">Theme</Label>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            Choose how Lorgan looks to you. Select a single theme, or sync with your system.
                        </p>
                        <Select value={theme} onValueChange={(value) => setTheme(value)}>
                            <SelectTrigger id="theme" className="mt-2 border-gray-200">
                                <SelectValue/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="light">
                                    <div className="flex items-center gap-2">
                                        <Sun className="h-4 w-4 border-gray-200"/>
                                        <span>Light</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="dark">
                                    <div className="flex items-center gap-2">
                                        <Moon className="h-4 w-4"/>
                                        <span>Dark</span>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Notifications</h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <p className="font-medium text-gray-900 dark:text-white">Email notifications</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Receive email updates about your
                                account</p>
                        </div>
                        <input type="checkbox" className="rounded dark:bg-gray-700 dark:border-gray-600"
                               defaultChecked/>
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <p className="font-medium text-gray-900 dark:text-white">Activity alerts</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Get notified about important
                                activities</p>
                        </div>
                        <input type="checkbox" className="rounded dark:bg-gray-700 dark:border-gray-600"/>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Security</h3>
                <div className="space-y-2">
                    <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => setShowPasswordDialog(true)}
                        disabled={!currentUser?.email}
                    >
                        <Lock className="h-4 w-4 mr-2"/>
                        Change Password
                    </Button>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Reset your password using a verification code that will be emailed
                        to {currentUser?.email || 'your account address'}.
                    </p>
                </div>
            </div>

            <Dialog open={showPasswordDialog}
                    onOpenChange={(open) => (open ? setShowPasswordDialog(true) : closePasswordDialog())}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Change password</DialogTitle>
                        <DialogDescription>
                            Request a verification code and enter it below before updating your password.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <Alert
                            className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100">
                            <AlertCircle className="h-4 w-4 mt-0.5"/>

                            <div className="space-y-3 text-sm w-full">
                                <AlertDescription className="text-blue-900 dark:text-blue-100">
                                    <p>
                                        Send a verification code to{" "}
                                        <span className="font-semibold">
                      {currentUser?.email || "your email"}
                    </span>
                                        . You'll need to enter it before updating your password.
                                    </p>
                                </AlertDescription>

                                {codeRequestedAt && (
                                    <p className="text-xs text-blue-800 dark:text-blue-200">
                                        Last sent at{" "}
                                        {codeRequestedAt.toLocaleTimeString([], {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </p>
                                )}


                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8"
                                        onClick={handleRequestVerificationCode}
                                        disabled={
                                            !onRequestPasswordCode || isSendingCode || !currentUser?.email
                                        }
                                    >
                                        {isSendingCode
                                            ? "Sending…"
                                            : codeRequestedAt
                                                ? "Resend verification code"
                                                : "Send verification code"}
                                    </Button>
                                </div>

                                {isDevCodeAvailable && !serverVerificationCode && fallbackResetCode && (
                                    <p className="text-xs text-blue-800 dark:text-blue-200">
                                        Developer shortcut:{" "}
                                        <span className="font-mono font-semibold">
                      {fallbackResetCode}
                    </span>
                                    </p>
                                )}
                            </div>
                        </Alert>

                        <div className="space-y-2">
                            <Label htmlFor="verification-code">Verification code</Label>
                            <Input
                                id="verification-code"
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                value={codeValue}
                                className="border-gray-200"
                                onChange={(e) => setCodeValue(e.target.value)}
                                placeholder="Enter the 6-digit code"
                                disabled={isSubmitting || resetPasswordLoading}
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {codeRequestedAt ? 'Enter the most recent code from your email.' : 'Request a code first, then paste it here.'}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="new-password">New password</Label>
                            <Input
                                id="new-password"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter a strong password"
                                className="border-gray-200"
                                disabled={isSubmitting || resetPasswordLoading}
                            />
                            {newPassword && (
                                <div className="mt-2 space-y-1 text-xs">
                                    <div
                                        className={`flex items-center ${isPasswordLongEnough ? 'text-green-600' : 'text-gray-500'}`}>
                                        <Check
                                            className={`h-3 w-3 mr-1 ${isPasswordLongEnough ? 'text-green-600' : 'text-gray-400'}`}/>
                                        At least 8 characters
                                    </div>
                                    <div
                                        className={`flex items-center ${hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
                                        <Check
                                            className={`h-3 w-3 mr-1 ${hasNumber ? 'text-green-600' : 'text-gray-400'}`}/>
                                        Contains a number
                                    </div>
                                    <div
                                        className={`flex items-center ${hasUpperAndLower ? 'text-green-600' : 'text-gray-500'}`}>
                                        <Check
                                            className={`h-3 w-3 mr-1 ${hasUpperAndLower ? 'text-green-600' : 'text-gray-400'}`}/>
                                        Uppercase and lowercase letters
                                    </div>
                                    <div
                                        className={`flex items-center ${hasSpecialChar ? 'text-green-600' : 'text-gray-500'}`}>
                                        <Check
                                            className={`h-3 w-3 mr-1 ${hasSpecialChar ? 'text-green-600' : 'text-gray-400'}`}/>
                                        At least one special character
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirm-password">Confirm password</Label>
                            <Input
                                id="confirm-password"
                                type="password"
                                value={confirmPassword}
                                className="border-gray-200"
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Re-enter new password"
                                disabled={isSubmitting || resetPasswordLoading}
                            />
                            {confirmPassword && (
                                <div className={`text-xs mt-1 ${passwordsMatch ? 'text-green-600' : 'text-red-500'}`}>
                                    {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={closePasswordDialog}
                                disabled={isSubmitting || resetPasswordLoading}>
                            Cancel
                        </Button>
                        <Button onClick={handlePasswordSubmit} disabled={!canSubmit}>
                            {isSubmitting || resetPasswordLoading ? 'Updating...' : 'Update password'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Logout Section Component
function LogoutSection() {
    const {signOut} = useAuth();
    const [isSigningOut, setIsSigningOut] = React.useState(false);

    const handleSignOut = async () => {
        try {
            setIsSigningOut(true);
            await signOut();
            toast.success('Signed out successfully');
        } catch (error) {
            console.error('Error signing out:', error);
            // Even if there's an error, signOut will clear local state
            toast.success('Signed out successfully');
        } finally {
            setIsSigningOut(false);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Sign Out</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Sign out of your Lorgan account on this device.
            </p>
            <Button
                variant="outline"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800"
                onClick={handleSignOut}
                disabled={isSigningOut}
            >
                {isSigningOut ? (
                    <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin"/>
                        Signing out...
                    </>
                ) : (
                    <>
                        <LogOut className="h-4 w-4 mr-2"/>
                        Sign Out
                    </>
                )}
            </Button>
        </div>
    );
}
