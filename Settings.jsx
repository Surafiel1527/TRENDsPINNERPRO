import React, { useState, useEffect } from 'react';
import { useAuth } from '../services';
import { db, auth } from '../firebase';
import { doc, setDoc, increment, addDoc, Timestamp, collection } from 'firebase/firestore';
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { Loader2, CheckCircle, ShoppingCart, Edit, KeyRound, Award, LifeBuoy, Send } from 'lucide-react';

// --- Generic UI Component (Used in Settings) ---
const Card = ({ children, className = '' }) => (<div className={`p-6 bg-white rounded-lg shadow-md dark:bg-gray-900 ${className}`}>{children}</div>);

// --- Billing Page ---
export function BillingPage() {
    const { userData } = useAuth();
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [purchaseItem, setPurchaseItem] = useState(null);
    const [customAmount, setCustomAmount] = useState('');

    const CREDIT_PRICE = 0.25;

    const subscriptionPlans = [
        { type: 'subscription', name: "Basic", price: "Free", features: ["Limited AI generations", "Basic Tools", "20 Free Video Credits upon signup"] },
        { type: 'subscription', name: "Professional", price: 49.99, features: ["All Basic Features", "1,000 AI generations/mo", "Pro Tools (Calendar, Competitor)"] },
        { type: 'subscription', name: "Elite", price: 99.99, features: ["All Pro Features", "Unlimited AI generations", "Elite AI Tools (Sentiment, etc.)"] }
    ];
    const creditPacks = [
        { type: 'credits', name: '50 Credits', credits: 50, price: 12.50 },
        { type: 'credits', name: '100 Credits', credits: 100, price: 22.50, bestValue: true },
        { type: 'credits', name: '500 Credits', credits: 500, price: 100.00 },
    ];

    const handlePurchaseClick = (item) => {
        setPurchaseItem(item);
        setShowPurchaseModal(true);
    };

    const creditsFromCustomAmount = customAmount ? Math.floor(parseFloat(customAmount) / CREDIT_PRICE) : 0;

    return (
        <div className="space-y-12">
            <div><h1 className="text-3xl font-bold mb-2">Subscriptions & Billing</h1><p className="text-gray-600 dark:text-gray-400">Upgrade your plan or purchase video credits.</p></div>
            <Card>
                <div className="flex justify-between items-center">
                    <div><h2 className="text-xl font-semibold">Current Plan: <span className="text-indigo-500">{userData?.subscription}</span></h2></div>
                    <div className="text-right"><h2 className="text-xl font-semibold">Video Credits</h2><p className="text-3xl font-bold text-indigo-500">{userData?.videoCredits || 0}</p></div>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
                {subscriptionPlans.map(plan => (
                    <div key={plan.name} className={`p-8 bg-white dark:bg-gray-900 border rounded-lg shadow-lg flex flex-col ${userData?.subscription === plan.name ? 'border-indigo-500 ring-2 ring-indigo-500' : 'dark:border-gray-700'}`}>
                        <h3 className="text-2xl font-bold">{plan.name}</h3>
                        <p className="text-4xl font-bold my-4">{typeof plan.price === 'string' ? plan.price : `$${plan.price}`}{typeof plan.price === 'number' && <span className="text-base font-normal text-gray-500">/mo</span>}</p>
                        <ul className="space-y-3 text-gray-600 dark:text-gray-400 flex-1 mb-8">{plan.features.map(feat => <li key={feat} className="flex items-start"><CheckCircle className="w-5 h-5 mr-2 text-green-500 shrink-0 mt-1"/><span>{feat}</span></li>)}</ul>
                        {userData?.subscription === plan.name ? <button disabled className="w-full mt-auto py-3 font-semibold bg-gray-300 dark:bg-gray-700 rounded-lg cursor-not-allowed text-center">Current Plan</button> : <button onClick={() => handlePurchaseClick(plan)} className="w-full mt-auto py-3 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">{userData?.subscription === "Basic" ? "Upgrade" : "Change Plan"}</button>}
                    </div>
                ))}
            </div>

            <div><h2 className="text-3xl font-bold mb-2 pt-8">Buy Video Credits</h2><p className="text-gray-600 dark:text-gray-400">Purchase credits for the AI Video Generator. 10 credits are used per video generated.</p></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch">
                {creditPacks.map(pack => (
                    <div key={pack.name} className={`p-8 text-center bg-white dark:bg-gray-900 border rounded-lg shadow-lg flex flex-col relative ${pack.bestValue ? 'border-yellow-400 ring-2 ring-yellow-400' : 'dark:border-gray-700'}`}>
                        {pack.bestValue && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full">BEST VALUE</div>}
                        <h3 className="text-2xl font-bold">{pack.name}</h3><p className="text-4xl font-bold my-4 text-indigo-500">{pack.credits}</p><p className="text-gray-500 dark:text-gray-400 mb-6">for ${pack.price.toFixed(2)}</p>
                        <button onClick={() => handlePurchaseClick(pack)} className="w-full mt-auto py-3 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"><ShoppingCart className="w-4 h-4 mr-2 inline"/>Buy Now</button>
                    </div>
                ))}
                <div className="p-8 text-center bg-white dark:bg-gray-900 border rounded-lg shadow-lg flex flex-col dark:border-gray-700">
                    <h3 className="text-2xl font-bold">Custom Top-Up</h3>
                    <div className="my-4"><input type="number" value={customAmount} onChange={e => setCustomAmount(e.target.value)} placeholder="$" className="w-24 text-center text-4xl font-bold bg-gray-100 dark:bg-gray-800 rounded-lg"/></div>
                    <p className="text-gray-500 dark:text-gray-400 mb-2">You will receive:</p><p className="text-2xl font-bold text-indigo-500 mb-6">{creditsFromCustomAmount} Credits</p>
                    <button onClick={() => handlePurchaseClick({ type: 'credits', credits: creditsFromCustomAmount, price: parseFloat(customAmount) })} disabled={!customAmount || customAmount < 5} className="w-full mt-auto py-3 font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"><ShoppingCart className="w-4 h-4 mr-2 inline"/> Buy for ${customAmount || '0'}</button>
                    <p className="text-xs text-gray-400 mt-2">(Minimum $5 purchase)</p>
                </div>
            </div>

            {showPurchaseModal && <PurchaseModal item={purchaseItem} onClose={() => setShowPurchaseModal(false)} />}
        </div>
    );
}

function PurchaseModal({ item, onClose }) {
    const { user } = useAuth();
    const [coupon, setCoupon] = useState('');
    const [discount, setDiscount] = useState(0);
    const [couponStatus, setCouponStatus] = useState({ message: '', type: '' });
    const [processing, setProcessing] = useState(false);

    const handleApplyCoupon = async () => {
        if (!coupon) return;
        setCouponStatus({ message: 'Validating...', type: 'loading' });
        await new Promise(res => setTimeout(res, 500));
        if (coupon.toUpperCase() === 'SAVE20') {
            setDiscount(20);
            setCouponStatus({ message: `Success! 20% discount applied.`, type: 'success' });
        } else {
            setDiscount(0);
            setCouponStatus({ message: 'Invalid coupon code.', type: 'error' });
        }
    };

    const handleConfirm = async () => {
        setProcessing(true);
        const userDocRef = doc(db, 'users', user.uid);
        try {
            if (item.type === 'subscription') {
                await setDoc(userDocRef, { subscription: item.name }, { merge: true });
            } else if (item.type === 'credits' && item.credits > 0) {
                await setDoc(userDocRef, { videoCredits: increment(item.credits) }, { merge: true });
            }
            await new Promise(res => setTimeout(res, 750));
            onClose();
        } catch (error) {
            console.error("Failed to complete purchase:", error);
        } finally {
            setProcessing(false);
        }
    };

    const finalPrice = typeof item.price === 'number' ? item.price * (1 - discount / 100) : 0;
    const hasValidCoupon = discount > 0;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-2xl max-w-md w-full">
                <h2 className="text-2xl font-bold mb-2">Confirm Purchase</h2><p className="mb-6 text-gray-600 dark:text-gray-400">This will update your account balance.</p>
                <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <div className="flex justify-between font-semibold"><span>Item:</span><span>{item.name} {item.type === 'credits' ? `(${item.credits} credits)` : ''}</span></div>
                    {hasValidCoupon && (<div className="flex justify-between text-sm text-gray-500"><span>Original Price:</span><span>${item.price.toFixed(2)}</span></div>)}
                    <div className="flex justify-between font-bold text-xl border-t pt-2 mt-2 border-gray-300 dark:border-gray-600"><span>Total:</span><span className="text-indigo-500">${finalPrice.toFixed(2)}</span></div>
                </div>

                {item.type === 'subscription' && (
                    <>
                        <div className="flex gap-2 mb-4">
                            <input type="text" value={coupon} onChange={e => setCoupon(e.target.value)} placeholder="Coupon Code (e.g., SAVE20)" className="flex-grow px-4 py-2 bg-gray-100 rounded-lg dark:bg-gray-800" />
                            <button onClick={handleApplyCoupon} className="px-4 py-2 font-semibold text-sm text-indigo-600 bg-indigo-100 rounded-lg dark:text-indigo-300 dark:bg-indigo-900/50">Apply</button>
                        </div>
                        {couponStatus.message && <p className={`text-sm mb-4 ${couponStatus.type === 'error' ? 'text-red-500' : couponStatus.type === 'success' ? 'text-green-500' : 'text-gray-500'}`}>{couponStatus.message}</p>}
                    </>
                )}
                
                <div className="flex flex-col gap-4 mt-6">
                    <button onClick={handleConfirm} disabled={processing} className="w-full py-3 font-semibold text-white bg-green-600 rounded-lg disabled:bg-green-400 flex items-center justify-center">{processing ? <Loader2 className="w-5 h-5 mx-auto animate-spin" /> : `Confirm Purchase`}</button>
                    <button onClick={onClose} className="w-full py-2 font-semibold bg-gray-200 rounded-lg dark:bg-gray-700">Cancel</button>
                </div>
            </div>
        </div>
    );
}

export function ProfilePage() {
    const { user, userData } = useAuth();
    const [displayName, setDisplayName] = useState('');
    const [niche, setNiche] = useState('General');
    const [profileStatus, setProfileStatus] = useState({type: '', msg: ''});
    const [passwordStatus, setPasswordStatus] = useState({type: '', msg: ''});
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [profileLoading, setProfileLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);

    useEffect(() => {
        if (userData) {
            setDisplayName(userData.displayName || '');
            setNiche(userData.niche || 'General');
        }
    }, [userData]);

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setProfileLoading(true); setProfileStatus({type: '', msg: ''});
        try {
            if(user.displayName !== displayName) {
                await updateProfile(user, { displayName });
            }
            const userDocRef = doc(db, 'users', user.uid);
            await setDoc(userDocRef, { displayName, niche }, { merge: true });
            setProfileStatus({type: 'success', msg: 'Profile updated successfully!'});
        } catch (error) {
            setProfileStatus({type: 'error', msg: 'Failed to update profile.'});
        } finally {
            setProfileLoading(false);
            setTimeout(() => setProfileStatus({type: '', msg: ''}), 4000);
        }
    };
    
    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPasswordLoading(true); setPasswordStatus({type: '', msg: ''});
        if (newPassword !== confirmPassword) {
            setPasswordStatus({type: 'error', msg: "New passwords don't match."});
            setPasswordLoading(false); return;
        }
        try {
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPassword);
            setPasswordStatus({type: 'success', msg: 'Password changed successfully!'});
            setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
        } catch (error) {
            setPasswordStatus({type: 'error', msg: "Failed to change password. Check your current password."});
        } finally {
            setPasswordLoading(false);
            setTimeout(() => setPasswordStatus({type: '', msg: ''}), 4000);
        }
    }

    const allBadges = [
        { id: 'pioneer', title: 'TrendSpinner Pioneer', unlocked: !!user, description: 'Create an account.' },
        { id: 'navigator', title: 'Niche Navigator', unlocked: userData?.niche && userData.niche !== 'General', description: 'Set your primary niche.' },
        { id: 'scribe', title: 'Budding Scribe', unlocked: (userData?.stats?.scriptsGenerated || 0) > 0, description: 'Generate your first script.' },
        { id: 'strategist', title: 'Competitor Strategist', unlocked: (userData?.stats?.competitorsAnalyzed || 0) > 0, description: 'Analyze a competitor.' },
        { id: 'visionary', title: 'Elite Visionary', unlocked: (userData?.stats?.sentimentAnalyzed || 0) > 0, description: 'Use an Elite AI tool.' }
    ];
    
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold">Account Settings</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-8">
                    <Card>
                        <form onSubmit={handleProfileUpdate} className="space-y-6">
                            <div className="flex items-center space-x-6">
                                <img src={user?.photoURL || `https://ui-avatars.com/api/?name=${displayName || 'G'}&background=random&size=128`} alt="Avatar" className="w-24 h-24 rounded-full" />
                                <div><h2 className="text-2xl font-bold">{userData?.displayName}</h2><p className="text-gray-500 dark:text-gray-400">{userData?.email}</p></div>
                            </div>
                            <div className="grid sm:grid-cols-2 gap-6">
                                <div><label htmlFor="displayName" className="block mb-2 font-medium text-sm">Username</label><input id="displayName" type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full px-4 py-2 bg-gray-100 rounded-lg dark:bg-gray-800"/></div>
                                <div><label htmlFor="niche" className="block mb-2 font-medium text-sm">Primary Content Niche</label><select id="niche" value={niche} onChange={(e) => setNiche(e.target.value)} className="w-full px-4 py-2 bg-gray-100 rounded-lg dark:bg-gray-800"><option>Gaming</option><option>Tech</option><option>Fitness</option><option>Finance</option><option>General</option></select></div>
                            </div>
                            <div className="flex items-center justify-between pt-2"><button type="submit" disabled={profileLoading} className="px-6 py-2 flex items-center font-semibold text-white bg-indigo-600 rounded-lg disabled:bg-indigo-400">{profileLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : <><Edit className="w-4 h-4 mr-2"/>Save Profile</>}</button>{profileStatus.msg && <p className={`text-sm ${profileStatus.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>{profileStatus.msg}</p>}</div>
                        </form>
                    </Card>
                    <Card>
                        <form onSubmit={handleChangePassword} className="space-y-6">
                            <h3 className="text-xl font-bold flex items-center gap-2"><KeyRound/> Change Password</h3>
                            <div><label className="block mb-2 font-medium text-sm">Current Password</label><input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full px-4 py-2 bg-gray-100 rounded-lg dark:bg-gray-800" required /></div>
                            <div className="grid sm:grid-cols-2 gap-6">
                                <div><label className="block mb-2 font-medium text-sm">New Password</label><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-4 py-2 bg-gray-100 rounded-lg dark:bg-gray-800" required /></div>
                                <div><label className="block mb-2 font-medium text-sm">Confirm New Password</label><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-4 py-2 bg-gray-100 rounded-lg dark:bg-gray-800" required /></div>
                            </div>
                            <div className="flex items-center justify-between pt-2"><button type="submit" disabled={passwordLoading} className="px-6 py-2 flex items-center font-semibold text-white bg-gray-700 hover:bg-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 rounded-lg disabled:bg-gray-400">{passwordLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Update Password'}</button>{passwordStatus.msg && <p className={`text-sm ${passwordStatus.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>{passwordStatus.msg}</p>}</div>
                        </form>
                    </Card>
                </div>
                <Card>
                    <h3 className="text-xl font-bold mb-4 flex items-center"><Award className="mr-2 text-yellow-500"/> Achievements</h3>
                    <div className="space-y-4">{allBadges.map(badge => (<div key={badge.id} className={`flex items-start gap-4 p-3 rounded-lg ${badge.unlocked ? 'bg-green-50 dark:bg-green-900/50' : 'bg-gray-100 dark:bg-gray-800 opacity-60'}`}><div className={`p-2 rounded-full ${badge.unlocked ? 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-300' : 'bg-gray-200 text-gray-500 dark:bg-gray-700'}`}><Award className="w-6 h-6"/></div><div><h4 className="font-semibold">{badge.title}</h4><p className="text-xs text-gray-600 dark:text-gray-400">{badge.unlocked ? 'Unlocked!' : badge.description}</p></div></div>))}</div>
                </Card>
            </div>
        </div>
    );
}

export function ContactSupportPage() {
    const { user, userData } = useAuth();
    const [subject, setSubject] = useState('General Question');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!message) { setStatus({ type: 'error', message: 'Please enter a message.' }); return; }
        setLoading(true); setStatus({ type: '', message: '' });
        const ticketData = { userId: user.uid, userName: userData.displayName, userEmail: userData.email, subject, message, status: 'New', createdAt: Timestamp.now() };
        try {
            const supportTicketsRef = collection(db, 'supportTickets');
            await addDoc(supportTicketsRef, ticketData);
            setStatus({ type: 'success', message: 'Your support ticket has been sent! We will get back to you shortly.' });
            setMessage(''); setSubject('General Question');
        } catch (error) {
            console.error("Error submitting support ticket:", error);
            setStatus({ type: 'error', message: 'Failed to send ticket. Please try again later.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center gap-3"><LifeBuoy className="w-8 h-8 text-indigo-500" /><h1 className="text-3xl font-bold">Contact Support</h1></div>
            <Card>
                <p className="mb-6 text-gray-600 dark:text-gray-400">Have a question or facing an issue? Fill out the form below, and our team will get back to you.</p>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div><label className="block text-sm font-medium mb-1">Your Name</label><input type="text" value={userData?.displayName || ''} disabled className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-not-allowed"/></div>
                        <div><label className="block text-sm font-medium mb-1">Your Email</label><input type="text" value={userData?.email || ''} disabled className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-not-allowed"/></div>
                    </div>
                    <div><label htmlFor="subject" className="block text-sm font-medium mb-1">Subject</label><select id="subject" value={subject} onChange={e => setSubject(e.target.value)} className="w-full px-4 py-2 bg-gray-100 rounded-lg dark:bg-gray-800"><option>General Question</option><option>Billing Issue</option><option>Technical Problem</option><option>Feature Request</option><option>Feedback</option></select></div>
                    <div><label htmlFor="message" className="block text-sm font-medium mb-1">Message</label><textarea id="message" value={message} onChange={e => setMessage(e.target.value)} rows="8" placeholder="Please describe your issue or question in detail..." className="w-full px-4 py-2 bg-gray-100 rounded-lg dark:bg-gray-800" required></textarea></div>
                    <div className="flex items-center justify-between"><button type="submit" disabled={loading} className="px-8 py-3 flex items-center justify-center font-semibold text-white bg-indigo-600 rounded-lg disabled:bg-indigo-400 transition-colors">{loading ? <Loader2 className="w-5 h-5 animate-spin"/> : <><Send className="w-5 h-5 mr-2"/>Submit Ticket</>}</button>{status.message && (<p className={`text-sm font-semibold ${status.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{status.message}</p>)}</div>
                </form>
            </Card>
        </div>
    );
}
