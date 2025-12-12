import React, {useState} from 'react';
import {Button} from '../ui/button';
import {Input} from '../ui/input';
import {Label} from '../ui/label';
import {Alert, AlertDescription} from '../ui/alert';
import {Eye, EyeOff, Loader2, Lock, Mail, Shield} from 'lucide-react';

export function LoginForm({onLogin, onSwitchToSignup, onForgotPassword, loading = false, error}) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [validationError, setValidationError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setValidationError('');

        if (!email || !password) {
            setValidationError('Please fill in all fields');
            return;
        }

        if (!email.includes('@')) {
            setValidationError('Please enter a valid email address');
            return;
        }

        try {
            await onLogin(email, password);
        } catch (err) {
            // Error handled by parent component
        }
    };

    return (
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-8 pt-8 pb-6 text-center">
                {/* Lorgan Logo */}
                <div className="w-32 h-12 mx-auto mb-6 bg-gray-900 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg tracking-wider">LORGAN</span>
                </div>

                <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                    Welcome to Lorgan AI Assistant
                </h1>
                <p className="text-gray-600">Sign in to continue</p>
            </div>

            <div className="px-8 pb-8">
                {/* SSO Sign In Option */}
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

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    {(error || validationError) && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertDescription>{error || validationError}</AlertDescription>
                        </Alert>
                    )}

                    {/* Email Field */}
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

                    {/* Password Field */}
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
                                placeholder="••••••••"
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
                    </div>

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg mt-6"
                    >
                        {loading ? (
                            <Loader2 className="mr-2 h-5 w-5 animate-spin"/>
                        ) : null}
                        Sign in
                    </Button>
                </form>

                {/* Footer Links */}
                <div className="flex justify-between items-center mt-6 text-sm">
                    <button
                        type="button"
                        className="text-gray-600 hover:text-gray-800 hover:underline"
                        onClick={onForgotPassword}
                        disabled={loading}
                    >
                        Forgot password?
                    </button>
                    <button
                        type="button"
                        onClick={onSwitchToSignup}
                        className="text-gray-600 hover:text-gray-800 hover:underline"
                        disabled={loading}
                    >
                        Need an account? <span className="font-medium">Sign up</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
