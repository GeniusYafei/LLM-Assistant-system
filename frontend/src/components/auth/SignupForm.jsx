import React, {useEffect, useState} from 'react';
import {Button} from '../ui/button';
import {Input} from '../ui/input';
import {Label} from '../ui/label';
import {Alert, AlertDescription} from '../ui/alert';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '../ui/select';
import {ArrowLeft, Building2, Check, Eye, EyeOff, Loader2, Lock, Mail, Shield, User} from 'lucide-react';
import {useApi} from '../../hooks/useApi';

export function SignupForm({onSignup, onSwitchToLogin, loading = false, error}) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [organization, setOrganization] = useState('');
    const [organizations, setOrganizations] = useState([]);
    const [orgLoading, setOrgLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [validationError, setValidationError] = useState('');

    const {fetchOrganizations} = useApi();

    useEffect(() => {
        const loadOrgs = async () => {
            setOrgLoading(true);
            try {
                const data = await fetchOrganizations();
                if (Array.isArray(data)) {
                    setOrganizations(data);
                } else {
                    console.error("Unexpected organization data:", data);
                }
            } catch (err) {
                console.error("❌ Failed to load organizations:", err);
            } finally {
                setOrgLoading(false);
            }
        };
        loadOrgs();
    }, []);

    const isPasswordLongEnough = password.length >= 8;
    const hasNumber = /\d/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasUpperAndLower = hasUppercase && hasLowercase;
    const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
    const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setValidationError('');

        if (!email || !password || !name || !confirmPassword || !organization) {
            setValidationError('Please fill in all fields');
            return;
        }

        if (!email.includes('@')) {
            setValidationError('Please enter a valid email address');
            return;
        }

        if (!isPasswordLongEnough || !hasNumber || !hasUpperAndLower || !hasSpecialChar) {
            setValidationError('Password does not meet complexity requirements');
            return;
        }

        if (password !== confirmPassword) {
            setValidationError('Passwords do not match');
            return;
        }

        try {
            await onSignup(email, password, name, organization);
        } catch (err) {
        }
    };

    return (
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-8 pt-8 pb-6">
                <button
                    type="button"
                    onClick={onSwitchToLogin}
                    className="flex items-center text-gray-600 hover:text-gray-800 mb-6 transition-colors"
                    disabled={loading}
                >
                    <ArrowLeft className="h-4 w-4 mr-2"/>
                    <span className="text-sm">Back to sign in</span>
                </button>
                <h1 className="text-2xl font-semibold text-gray-900 mb-2">Create your account</h1>
            </div>

            <div className="px-8 pb-8">
                {/* SSO */}
                <Button
                    type="button"
                    variant="outline"
                    className="w-full mb-6 h-12 border-gray-300 hover:bg-gray-50"
                    disabled={loading}
                >
                    <Shield className="w-5 h-5 mr-3 text-blue-600"/>
                    Continue with SSO
                </Button>

                {/* Divider */}
                <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-white text-gray-500">OR</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {(error || validationError) && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertDescription>{error || validationError}</AlertDescription>
                        </Alert>
                    )}

                    {/* Full Name */}
                    <div>
                        <Label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                            Full Name
                        </Label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-gray-400"/>
                            </div>
                            <Input
                                id="name"
                                type="text"
                                placeholder="Enter your full name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={loading}
                                required
                                className="pl-10 h-12 border-gray-200 focus:border-gray-400 focus:ring-0 rounded-lg"
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div>
                        <Label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                            Email
                        </Label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-gray-400"/>
                            </div>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                                required
                                className="pl-10 h-12 border-gray-200 focus:border-gray-400 focus:ring-0 rounded-lg"
                            />
                        </div>
                    </div>

                    {/* Organization */}
                    <div>
                        <Label htmlFor="organization" className="block text-sm font-medium text-gray-700 mb-2">
                            Organization
                        </Label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Building2 className="h-5 w-5 text-gray-400"/>
                            </div>
                            <Select
                                value={organization}
                                onValueChange={setOrganization}
                                disabled={loading || orgLoading}
                            >
                                <SelectTrigger
                                    id="organization"
                                    className="pl-10 h-12 border-gray-200 focus:border-gray-400 focus:ring-0 rounded-lg text-left"
                                >
                                    <SelectValue
                                        placeholder={orgLoading ? "Loading..." : "Select organization"}
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {orgLoading ? (
                                        <SelectItem disabled value="loading">Loading organizations...</SelectItem>
                                    ) : organizations.length === 0 ? (
                                        <SelectItem disabled value="none">No organizations found</SelectItem>
                                    ) : (
                                        organizations.map((option) => (
                                            <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <Label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                            Password
                        </Label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-gray-400"/>
                            </div>
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Min. 8 characters, mixed complexity"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                                required
                                className="pl-10 pr-10 h-12 border-gray-200 focus:border-gray-400 focus:ring-0 rounded-lg"
                            />
                            <button
                                type="button"
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? (
                                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600"/>
                                ) : (
                                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600"/>
                                )}
                            </button>
                        </div>

                        {password && (
                            <div className="mt-2 space-y-1">
                                <div
                                    className={`flex items-center text-xs ${isPasswordLongEnough ? 'text-green-600' : 'text-gray-500'}`}>
                                    <Check
                                        className={`h-3 w-3 mr-1 ${isPasswordLongEnough ? 'text-green-600' : 'text-gray-400'}`}/>
                                    At least 8 characters
                                </div>
                                <div
                                    className={`flex items-center text-xs ${hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
                                    <Check
                                        className={`h-3 w-3 mr-1 ${hasNumber ? 'text-green-600' : 'text-gray-400'}`}/>
                                    At least one number
                                </div>
                                <div
                                    className={`flex items-center text-xs ${hasUpperAndLower ? 'text-green-600' : 'text-gray-500'}`}>
                                    <Check
                                        className={`h-3 w-3 mr-1 ${hasUpperAndLower ? 'text-green-600' : 'text-gray-400'}`}/>
                                    At least one uppercase and one lowercase letter
                                </div>
                                <div
                                    className={`flex items-center text-xs ${hasSpecialChar ? 'text-green-600' : 'text-gray-500'}`}>
                                    <Check
                                        className={`h-3 w-3 mr-1 ${hasSpecialChar ? 'text-green-600' : 'text-gray-400'}`}/>
                                    At least one special character
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <Label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                            Confirm Password
                        </Label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-gray-400"/>
                            </div>
                            <Input
                                id="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Re-enter password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={loading}
                                required
                                className="pl-10 pr-10 h-12 border-gray-200 focus:border-gray-400 focus:ring-0 rounded-lg"
                            />
                            <button
                                type="button"
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                {showConfirmPassword ? (
                                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600"/>
                                ) : (
                                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600"/>
                                )}
                            </button>
                        </div>
                        {confirmPassword && (
                            <div className="mt-2">
                                <div
                                    className={`flex items-center text-xs ${passwordsMatch ? 'text-green-600' : 'text-red-500'}`}>
                                    <Check
                                        className={`h-3 w-3 mr-1 ${passwordsMatch ? 'text-green-600' : 'text-red-400'}`}/>
                                    {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Submit */}
                    <Button
                        type="submit"
                        disabled={
                            loading ||
                            !isPasswordLongEnough ||
                            !hasNumber ||
                            !hasUpperAndLower ||
                            !hasSpecialChar ||
                            !passwordsMatch ||
                            !organization
                        }
                        className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg mt-6 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : null}
                        Create account
                    </Button>
                </form>

                <p className="text-xs text-gray-500 text-center mt-4 leading-relaxed">
                    By creating an account, you agree to our{' '}
                    <button className="text-gray-700 hover:underline">Terms of Service</button>
                    {' '}
                    and{' '}
                    <button className="text-gray-700 hover:underline">Privacy Policy</button>
                </p>
            </div>
        </div>
    );
}
