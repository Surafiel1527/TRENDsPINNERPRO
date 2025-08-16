import React, { useState } from 'react';
import { useLegal } from '../App';
import { auth, db } from '../firebase';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { Flame, Loader2, AlertTriangle } from 'lucide-react';

// --- Generic UI Components (Used in Auth) ---
const ErrorAlert = ({ message }) => (
    <div className="p-3 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-900/50 dark:text-red-300 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>{message}</span>
    </div>
);


// --- Main Auth Page Component ---
export function AuthPage() {
    const [authMode, setAuthMode] = useState('login'); // 'login', 'signup', 'forgotPassword'

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-800">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-xl dark:bg-gray-900">
                <div className="text-center">
                    <Flame className="w-12 h-12 mx-auto text-indigo-500" />
                    <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Welcome to TrendSpinner</h1>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {authMode === 'login' ? 'Sign in to continue' : authMode === 'signup' ? 'Create a new account' : 'Reset your password'}
                    </p>
                </div>
                {authMode === 'login' && <LoginForm setAuthMode={setAuthMode} />}
                {authMode === 'signup' && <SignupForm setAuthMode={setAuthMode} />}
                {authMode === 'forgotPassword' && <ForgotPasswordForm setAuthMode={setAuthMode} />}
            </div>
        </div>
    );
}

// --- Auth Form Components ---
function LoginForm({ setAuthMode }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
            setError(err.message.replace('Firebase: ', '').replace('auth/', '').replace(/-/g, ' '));
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleLogin} className="space-y-4">
            {error && <ErrorAlert message={error} />}
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2 bg-gray-100 border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500" required />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-2 bg-gray-100 border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500" required />
            <div className="text-right">
                <button type="button" onClick={() => setAuthMode('forgotPassword')} className="text-sm font-medium text-indigo-600 hover:text-indigo-500">Forgot Password?</button>
            </div>
            <button type="submit" disabled={loading} className="w-full flex justify-center items-center px-4 py-3 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
            </button>
            <GoogleSignInButton />
            <p className="text-sm text-center text-gray-600 dark:text-gray-400">
                Don't have an account? <button type="button" onClick={() => setAuthMode('signup')} className="ml-1 font-medium text-indigo-600 hover:text-indigo-500">Sign up</button>
            </p>
        </form>
    );
}

function SignupForm({ setAuthMode }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const { setShowTerms, setShowPrivacy } = useLegal();

    const handleSignup = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        if (!agreed) {
            setError("You must agree to the Terms of Service and Privacy Policy.");
            setLoading(false);
            return;
        }
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            // FIX: Database path simplified
            const userDocRef = doc(db, 'users', user.uid);
            await setDoc(userDocRef, {
                legal: {
                    termsAccepted: true,
                    privacyAccepted: true,
                    acceptedAt: Timestamp.now()
                }
            }, { merge: true });
        } catch (err) {
            setError(err.message.replace('Firebase: ', '').replace('auth/', '').replace(/-/g, ' '));
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSignup} className="space-y-4">
            {error && <ErrorAlert message={error} />}
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2 bg-gray-100 border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500" required />
            <input type="password" placeholder="Password (min. 6 characters)" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-2 bg-gray-100 border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500" required />
            <div className="flex items-start space-x-3">
                <input id="terms" type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="h-4 w-4 mt-1 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                <label htmlFor="terms" className="text-sm text-gray-600 dark:text-gray-400">
                    I am over 18 and agree to the
                    <button type="button" onClick={(e) => { e.preventDefault(); setShowTerms(true) }} className="mx-1 font-medium text-indigo-600 hover:underline">Terms of Service</button>
                    and
                    <button type="button" onClick={(e) => { e.preventDefault(); setShowPrivacy(true) }} className="ml-1 font-medium text-indigo-600 hover:underline">Privacy Policy</button>.
                </label>
            </div>
            <button type="submit" disabled={loading || !agreed} className="w-full flex justify-center items-center px-4 py-3 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign Up'}
            </button>
            <GoogleSignInButton isSignup={true} />
            <p className="text-sm text-center text-gray-600 dark:text-gray-400">
                Already have an account? <button type="button" onClick={() => setAuthMode('login')} className="ml-1 font-medium text-indigo-600 hover:text-indigo-500">Sign in</button>
            </p>
        </form>
    );
}

function ForgotPasswordForm({ setAuthMode }) {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleReset = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');
        try {
            await sendPasswordResetEmail(auth, email);
            setMessage('Password reset email sent! Please check your inbox.');
        } catch (err) {
            setError(err.message.replace('Firebase: ', '').replace('auth/', '').replace(/-/g, ' '));
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleReset} className="space-y-4">
            {error && <ErrorAlert message={error} />}
            {message && <p className="text-sm text-green-600">{message}</p>}
            <input type="email" placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2 bg-gray-100 border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-600" required />
            <button type="submit" disabled={loading} className="w-full flex justify-center items-center px-4 py-3 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Link'}
            </button>
            <p className="text-sm text-center">
                <button type="button" onClick={() => setAuthMode('login')} className="font-medium text-indigo-600 hover:text-indigo-500">Back to Sign In</button>
            </p>
        </form>
    );
}

function GoogleSignInButton({ isSignup = false }) {
    const [showAgreement, setShowAgreement] = useState(false);
    const [error, setError] = useState('');
    const { setShowTerms, setShowPrivacy } = useLegal();

    const handleGoogleSignIn = async () => {
        const provider = new GoogleAuthProvider();
        try {
            const userCredential = await signInWithPopup(auth, provider);
            const user = userCredential.user;
            // FIX: Database path simplified
            const userDocRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(userDocRef);

            if (!docSnap.exists()) {
                await setDoc(userDocRef, {
                    legal: {
                        termsAccepted: true,
                        privacyAccepted: true,
                        acceptedAt: Timestamp.now()
                    }
                }, { merge: true });
            }
        } catch (error) {
            console.error("Google Sign-In Error:", error);
            setError("Failed to sign in with Google. Please try again.");
        }
    };

    const GoogleIcon = () => (
        <svg className="w-5 h-5 mr-2" viewBox="0 0 488 512" fill="currentColor">
            <path d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 23.4 172.9 61.9l-69.2 69.2c-29.6-27.8-68.9-44.9-114.7-44.9-97.1 0-175.8 78.6-175.8 175.8s78.6 175.8 175.8 175.8c112.3 0 151.7-87.5 156.6-128.4H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
        </svg>
    );

    const Divider = ({ text }) => (
        <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300 dark:border-gray-600" /></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">{text}</span></div>
        </div>
    );

    if (isSignup) {
        return (
            <div>
                <Divider text="Or sign up with" />
                <button type="button" onClick={() => setShowAgreement(true)} className="flex items-center justify-center w-full px-4 py-3 font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700">
                    <GoogleIcon /> Sign up with Google
                </button>
                {showAgreement && (
                    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-2xl max-w-md w-full text-center">
                            <h2 className="text-xl font-bold mb-4">Before you continue</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                By signing up with Google, you confirm you are over 18 and agree to our
                                <button type="button" onClick={(e) => { e.preventDefault(); setShowTerms(true) }} className="mx-1 font-medium text-indigo-600 hover:underline">Terms of Service</button>
                                and
                                <button type="button" onClick={(e) => { e.preventDefault(); setShowPrivacy(true) }} className="ml-1 font-medium text-indigo-600 hover:underline">Privacy Policy</button>.
                            </p>
                            <div className="flex gap-4">
                                <button onClick={() => setShowAgreement(false)} className="w-full py-2 font-semibold bg-gray-200 rounded-lg dark:bg-gray-700">Cancel</button>
                                <button onClick={handleGoogleSignIn} className="w-full py-2 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">Agree & Continue</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <>
            <Divider text="Or continue with" />
            <button onClick={handleGoogleSignIn} className="flex items-center justify-center w-full px-4 py-3 font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700">
                <GoogleIcon /> Sign in with Google
            </button>
            {error && <p className="text-sm text-red-500 mt-2 text-center">{error}</p>}
        </>
    );
}