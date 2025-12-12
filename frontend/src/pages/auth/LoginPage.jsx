import React from 'react';
import {useNavigate} from 'react-router-dom';
import {LoginForm} from '../../components/auth/LoginForm.jsx';

export function LoginPage({onLogin, loading = false, error}) {
    const navigate = useNavigate();

    return (
        <div
            className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <LoginForm
                    onLogin={onLogin}
                    onSwitchToSignup={() => navigate('/signup')}
                    onForgotPassword={() => navigate('/forgot-password')}
                    loading={loading}
                    error={error}
                />
            </div>
        </div>
    );
}
