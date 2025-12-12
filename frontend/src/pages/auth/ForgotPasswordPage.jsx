import React, {useEffect, useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Button} from '../../components/ui/button';
import {Input} from '../../components/ui/input';
import {Label} from '../../components/ui/label';
import {Alert, AlertDescription} from '../../components/ui/alert';
import {useApi} from '../../hooks/useApi.jsx';
import {toast} from 'sonner';
import {ArrowLeft, Check, Loader2, Lock, Mail, Shield, User} from 'lucide-react';

export function ForgotPasswordPage() {
    const navigate = useNavigate();
    const passwordForgotApi = useApi();
    const passwordResetApi = useApi();

    const [email, setEmail] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [codeRequestedAt, setCodeRequestedAt] = useState(null);
    const [serverCode, setServerCode] = useState('');
    const [copiedCode, setCopiedCode] = useState(false);
    const [submittingReset, setSubmittingReset] = useState(false);

    const fallbackDevCode = useMemo(
        () => (import.meta.env.VITE_PASSWORD_RESET_DEV_CODE || '').trim(),
        []
    );

    const availableCode = serverCode || fallbackDevCode;
    const hasRequestedCode = Boolean(codeRequestedAt || serverCode || fallbackDevCode);

    const normalizedEmail = email.trim();
    const normalizedName = displayName.trim();

    const canSendCode =
        !!normalizedEmail &&
        normalizedEmail.includes('@') &&
        !!normalizedName &&
        !passwordForgotApi.loading;

    const isPasswordLongEnough = newPassword.length >= 8;
    const hasNumber = /\d/.test(newPassword);
    const hasUpperAndLower = /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(newPassword);
    const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;

    const canSubmitReset =
        hasRequestedCode &&
        verificationCode.trim().length > 0 &&
        isPasswordLongEnough &&
        hasNumber &&
        hasUpperAndLower &&
        hasSpecialChar &&
        passwordsMatch &&
        !submittingReset;

    useEffect(() => {
        setCodeRequestedAt(null);
        setServerCode('');
        setVerificationCode('');
    }, [email, displayName]);

    const handleSendCode = async (event) => {
        event.preventDefault();

        if (!normalizedEmail || !normalizedEmail.includes('@')) {
            toast.error('Please enter a valid email address');
            return;
        }
        if (!normalizedName) {
            toast.error('Display name is required');
            return;
        }
        if (!canSendCode) return;

        try {
            const response = await passwordForgotApi.request('/api/v1/auth/password/forgot', {
                method: 'POST',
                body: {
                    email: normalizedEmail,
                    display_name: normalizedName,
                },
                requireAuth: false,
            });

            // backend response { code: "xxxxxx" }，204 No Content or no code
            const code = response?.code ?? '';

            if (!code) {
                toast.error('Email or display name is incorrect');
                return;
            }

            setServerCode(code);
            setVerificationCode(code); // Dev
            setCodeRequestedAt(new Date());
            setCopiedCode(false);
            toast.success(`Verification code sent to ${normalizedEmail}`);
        } catch (error) {
            const status = error?.status || error?.response?.status;
            if (status === 204) {
                toast.error('Email or display name is incorrect');
            } else {
                toast.error(error instanceof Error ? error.message : 'Failed to send verification code');
            }
        }
    };

    const handleCopyCode = async () => {
        if (!availableCode) return;
        try {
            await navigator.clipboard.writeText(availableCode);
            setCopiedCode(true);
            setTimeout(() => setCopiedCode(false), 2000);
            toast.success('Verification code copied');
        } catch {
            toast.error('Unable to copy verification code');
        }
    };

    const handleSubmitReset = async (event) => {
        event.preventDefault();
        if (!canSubmitReset) return;

        try {
            setSubmittingReset(true);
            await passwordResetApi.request('/api/v1/auth/password/reset', {
                method: 'POST',
                body: {
                    email: normalizedEmail,
                    code: verificationCode.trim(),
                    new_password: newPassword,
                    confirm_password: confirmPassword,
                },
                requireAuth: false,
            });
            toast.success('Password updated. You can now sign in.');
            navigate('/login');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to reset password');
        } finally {
            setSubmittingReset(false);
        }
    };

    return (
        <div
            className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div
                    className="w-full bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
                    {/* Header */}
                    <div className="px-8 pt-8 pb-6">
                        <button
                            type="button"
                            onClick={() => navigate('/login')}
                            className="flex items-center text-gray-600 hover:text-gray-800 mb-6 transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2"/>
                            <span>Back to sign in</span>
                        </button>
                        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                            Reset your password
                        </h1>
                    </div>

                    {/* Content */}
                    <div className="px-8 pb-8 space-y-6">
                        {/* Step 1：Email + Name + Send Code */}
                        <form
                            onSubmit={handleSendCode}
                            className="rounded-2xl border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/60 p-5 sm:p-6 space-y-4"
                        >
                            <div
                                className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                                <Shield className="h-4 w-4"/>
                                Step 1 · Verify email & send code
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                                Enter the email and display name you used when creating your account. If they match,
                                we&apos;ll send a verification code to your inbox.
                            </p>

                            {/* Email */}
                            <div>
                                <Label
                                    htmlFor="fp-email"
                                    className="block text-sm font-medium text-gray-700 mb-2"
                                >
                                    Email
                                </Label>
                                <div className="relative">
                                    <div
                                        className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-gray-400"/>
                                    </div>
                                    <Input
                                        id="fp-email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        placeholder="you@example.com"
                                        className="pl-10 h-12 border-gray-200 focus:border-gray-400 focus:ring-0 rounded-lg"
                                    />
                                </div>
                            </div>

                            {/* Display name */}
                            <div>
                                <Label
                                    htmlFor="fp-name"
                                    className="block text-sm font-medium text-gray-700 mb-2"
                                >
                                    Display name
                                </Label>
                                <div className="relative">
                                    <div
                                        className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <User className="h-5 w-5 text-gray-400"/>
                                    </div>
                                    <Input
                                        id="fp-name"
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        required
                                        placeholder="e.g. Jane Doe"
                                        className="pl-10 h-12 border-gray-200 focus:border-gray-400 focus:ring-0 rounded-lg"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-3 items-center justify-between">
                                <Button
                                    type="submit"
                                    disabled={!canSendCode}
                                    className="min-w-[160px] h-11 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
                                >
                                    {passwordForgotApi.loading && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                    )}
                                    {codeRequestedAt ? 'Resend verification code' : 'Send verification code'}
                                </Button>
                                {codeRequestedAt && (
                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                        Last sent at{' '}
                                        {codeRequestedAt.toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </p>
                                )}
                            </div>


                        </form>

                        {/* Step 2：Code + New Password */}
                        <form
                            onSubmit={handleSubmitReset}
                            className={`rounded-2xl p-5 sm:p-6 space-y-4 transition ${
                                hasRequestedCode
                                    ? 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'
                                    : 'border-dashed border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/50 opacity-70'
                            }`}
                        >
                            <div
                                className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                                <Lock className="h-4 w-4"/>
                                Step 2 · Enter code and new password
                            </div>

                            {hasRequestedCode ? (
                                <>
                                    {/* Code */}
                                    <div>
                                        <Label
                                            htmlFor="fp-code"
                                            className="block text-sm font-medium text-gray-700 mb-2"
                                        >
                                            Verification code
                                        </Label>
                                        <Input
                                            id="fp-code"
                                            type="text"
                                            inputMode="numeric"
                                            value={verificationCode}
                                            onChange={(e) => setVerificationCode(e.target.value)}
                                            placeholder="Enter the 6-digit code"
                                            className="h-11 border-gray-200 focus:border-gray-400 focus:ring-0 rounded-lg"
                                        />
                                    </div>

                                    {/* New password */}
                                    <div>
                                        <Label
                                            htmlFor="fp-new-password"
                                            className="block text-sm font-medium text-gray-700 mb-2"
                                        >
                                            New password
                                        </Label>
                                        <Input
                                            id="fp-new-password"
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Min. 8 characters, mixed complexity"
                                            className="h-11 border-gray-200 focus:border-gray-400 focus:ring-0 rounded-lg"
                                        />
                                        {newPassword && (
                                            <div className="mt-3 space-y-1">
                                                <div
                                                    className={`flex items-center text-xs ${
                                                        isPasswordLongEnough ? 'text-green-600' : 'text-gray-500'
                                                    }`}
                                                >
                                                    <Check
                                                        className={`h-3 w-3 mr-1 ${
                                                            isPasswordLongEnough ? 'text-green-600' : 'text-gray-400'
                                                        }`}
                                                    />
                                                    At least 8 characters
                                                </div>
                                                <div
                                                    className={`flex items-center text-xs ${
                                                        hasNumber ? 'text-green-600' : 'text-gray-500'
                                                    }`}
                                                >
                                                    <Check
                                                        className={`h-3 w-3 mr-1 ${
                                                            hasNumber ? 'text-green-600' : 'text-gray-400'
                                                        }`}
                                                    />
                                                    At least one number
                                                </div>
                                                <div
                                                    className={`flex items-center text-xs ${
                                                        hasUpperAndLower ? 'text-green-600' : 'text-gray-500'
                                                    }`}
                                                >
                                                    <Check
                                                        className={`h-3 w-3 mr-1 ${
                                                            hasUpperAndLower ? 'text-green-600' : 'text-gray-400'
                                                        }`}
                                                    />
                                                    At least one uppercase and one lowercase letter
                                                </div>
                                                <div
                                                    className={`flex items-center text-xs ${
                                                        hasSpecialChar ? 'text-green-600' : 'text-gray-500'
                                                    }`}
                                                >
                                                    <Check
                                                        className={`h-3 w-3 mr-1 ${
                                                            hasSpecialChar ? 'text-green-600' : 'text-gray-400'
                                                        }`}
                                                    />
                                                    At least one special character
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Confirm password */}
                                    <div>
                                        <Label
                                            htmlFor="fp-confirm-password"
                                            className="block text-sm font-medium text-gray-700 mb-2"
                                        >
                                            Confirm password
                                        </Label>
                                        <Input
                                            id="fp-confirm-password"
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Re-enter new password"
                                            className="h-11 border-gray-200 focus:border-gray-400 focus:ring-0 rounded-lg"
                                        />
                                        {confirmPassword && (
                                            <p
                                                className={`text-xs mt-2 ${
                                                    passwordsMatch ? 'text-green-600' : 'text-red-500'
                                                }`}
                                            >
                                                {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Strong passwords keep your workspace secure.
                                        </p>
                                        <Button
                                            type="submit"
                                            disabled={!canSubmitReset}
                                            className="min-w-[160px] h-11 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
                                        >
                                            {submittingReset && (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                            )}
                                            Reset password
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <Alert
                                    className="bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                                    <AlertDescription>
                                        First send a verification code using your email and display name.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
