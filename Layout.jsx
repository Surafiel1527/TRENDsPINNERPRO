import React, { useState } from 'react';
import { useAuth } from '../services';
import { useTheme, useLegal } from '../App';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { BarChart3, BookOpen, Compass, Crown, Film, Flame, LifeBuoy, LogOut, Moon, Sun, User, Wand2, Lock, Users, Megaphone, Target, ShieldCheck, Calendar, Sparkles } from 'lucide-react';
import { DashboardContent } from './Dashboard';
import { VideoClipperPage, TrendAnalysisPage, ContentCreationPage, TutorialsPage } from './CoreTools';
import { VideoGeneratorPage } from './VideoGenerator';
import { ContentCalendarPage, CompetitorAnalysisPage, AudienceSentimentPage, TitleTesterPage, BrandSafetyPage, LockedFeature } from './ProTools';
import { BillingPage, ProfilePage, ContactSupportPage } from './Settings';

// --- Main Layout ---
export default function Layout() {
    const [activePage, setActivePage] = useState('Dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-gray-900 text-slate-900 dark:text-slate-100 font-['Poppins']">
            <Sidebar activePage={activePage} setActivePage={setActivePage} isSidebarOpen={isSidebarOpen} />
            <div className="flex flex-col flex-1 overflow-hidden">
                <Header setActivePage={setActivePage} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
                <main className="flex-1 p-4 overflow-y-auto md:p-6 lg:p-8">
                    <PageContent activePage={activePage} setActivePage={setActivePage} />
                </main>
                <Footer />
            </div>
        </div>
    );
}

function Sidebar({ activePage, setActivePage, isSidebarOpen }) {
    const { userData } = useAuth();
    const isPro = userData?.subscription === 'Professional' || userData?.subscription === 'Elite';
    const isElite = userData?.subscription === 'Elite';

    const navItems = [
        { name: 'Dashboard', icon: BarChart3, pro: false },
        { name: 'AI Video Generator', icon: Sparkles, pro: true, elite: false },
        { name: 'Video Clipper', icon: Film, pro: false },
        { name: 'Trend Analysis', icon: Compass, pro: false },
        { name: 'Content Creation', icon: Wand2, pro: false },
        { name: 'Content Calendar', icon: Calendar, pro: true, elite: false },
        { name: 'Competitor Analysis', icon: Users, pro: true, elite: false },
        { name: 'Audience Sentiment', icon: Megaphone, pro: true, elite: true },
        { name: 'A/B Title Tester', icon: Target, pro: true, elite: true },
        { name: 'Brand Safety', icon: ShieldCheck, pro: true, elite: true },
        { name: 'Tutorials', icon: BookOpen, pro: false },
        { name: 'Billing', icon: Crown, pro: false },
        { name: 'Profile', icon: User, pro: false },
        { name: 'Support', icon: LifeBuoy, pro: false }
    ];

    const canAccess = (item) => {
        if (!item.pro) return true;
        if (item.elite) return isElite;
        return isPro;
    };

    return (
        <aside className={`bg-white dark:bg-slate-900 transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'} h-full flex flex-col border-r border-slate-200 dark:border-slate-700 shrink-0`}>
            <div className="flex items-center h-16 px-6 shrink-0">
                <Flame className="w-8 h-8 text-indigo-500" />
                {isSidebarOpen && <h1 className={`ml-3 text-xl font-bold`}>TrendSpinner</h1>}
            </div>
            <nav className="flex-1 px-4 py-4 space-y-1">
                {navItems.map(item => {
                    const isActive = activePage === item.name;
                    return (
                        <a key={item.name} href="#" 
                           onClick={(e) => { e.preventDefault(); if (canAccess(item)) setActivePage(item.name); else setActivePage('Billing'); }} 
                           className={`flex items-center p-3 rounded-lg transition-colors ${
                                isActive 
                                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 font-semibold' 
                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                           }`}
                        >
                            <item.icon className={`w-6 h-6 shrink-0 ${isActive ? 'text-indigo-600' : ''}`} />
                            {isSidebarOpen && <span className="ml-4 font-medium flex-1">{item.name}</span>}
                            {isSidebarOpen && item.pro && !canAccess(item) && <Lock className="w-4 h-4 text-amber-500 shrink-0" />}
                        </a>
                    );
                })}
            </nav>
        </aside>
    );
}

function Header({ setActivePage, toggleSidebar }) {
    const { user, userData } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            window.location.reload(); 
        } catch (error) {
            console.error("Error signing out: ", error);
        }
    };

    return (
        <header className="flex items-center justify-between h-16 px-8 bg-white shrink-0 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center">
                <button onClick={toggleSidebar} className="p-2 -ml-2 text-slate-500 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                     <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
            </div>
            <div className="flex items-center space-x-4">
                <button onClick={toggleTheme} className="p-2 text-slate-500 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">{theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}</button>
                <div className="relative">
                    <button onClick={() => setDropdownOpen(!dropdownOpen)} onBlur={() => setTimeout(() => setDropdownOpen(false), 200)} className="flex items-center space-x-3">
                        <img src={user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.displayName || 'G')}&background=random`} alt="Avatar" className="w-9 h-9 rounded-full" />
                        <div className="hidden text-left md:block">
                            <p className="font-semibold text-sm">{userData?.displayName || "Guest"}</p>
                            <div className="flex items-center gap-1.5">
                                <p className="text-xs text-slate-500">{userData?.subscription} Plan</p>
                                {(userData?.subscription === 'Professional' || userData?.subscription === 'Elite') && (
                                    <span className="px-1.5 py-0.5 text-xs font-semibold text-amber-800 bg-amber-200 rounded-full">PRO</span>
                                )}
                            </div>
                        </div>
                    </button>
                    {dropdownOpen && (
                        <div className="absolute right-0 w-48 mt-2 origin-top-right bg-white rounded-md shadow-lg dark:bg-slate-800 ring-1 ring-black ring-opacity-5 z-20">
                            <div className="py-1">
                                <a href="#" onMouseDown={(e) => { e.preventDefault(); setActivePage('Profile'); }} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"><User className="w-4 h-4 mr-2" /> Profile</a>
                                <div className="border-t my-1 border-slate-200 dark:border-slate-700"></div>
                                <a href="#" onMouseDown={(e) => { e.preventDefault(); handleSignOut(); }} className="flex items-center w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"><LogOut className="w-4 h-4 mr-2" /> Sign Out</a>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

function PageContent({ activePage, setActivePage }) {
    const { userData } = useAuth();
    const isPro = userData?.subscription === 'Professional' || userData?.subscription === 'Elite';
    const isElite = userData?.subscription === 'Elite';

    const lockedPage = (title, message) => <LockedFeature title={title} message={message} onUpgrade={() => setActivePage('Billing')} />;

    switch (activePage) {
        case 'Dashboard': return <DashboardContent />;
        // FIX: Pass the setActivePage function down to the VideoGeneratorPage component
        case 'AI Video Generator': return isPro ? <VideoGeneratorPage setActivePage={setActivePage} /> : lockedPage('AI Video Generator is a Professional Feature', 'Automatically create videos from text.');
        case 'Video Clipper': return <VideoClipperPage setActivePage={setActivePage} />;
        case 'Trend Analysis': return <TrendAnalysisPage setActivePage={setActivePage} />;
        case 'Content Creation': return <ContentCreationPage />;
        case 'Tutorials': return <TutorialsPage />;
        case 'Content Calendar': return isPro ? <ContentCalendarPage /> : lockedPage('Content Calendar is a Professional Feature', 'Plan your content schedule.');
        case 'Competitor Analysis': return isPro ? <CompetitorAnalysisPage /> : lockedPage('Competitor Analysis is a Professional Feature', 'Get AI insights on competitors.');
        case 'Audience Sentiment': return isElite ? <AudienceSentimentPage /> : lockedPage('Audience Sentiment is an Elite Feature', 'Predict audience reactions.');
        case 'A/B Title Tester': return isElite ? <TitleTesterPage /> : lockedPage('A/B Title Tester is an Elite Feature', 'Simulate title performance.');
        case 'Brand Safety': return isElite ? <BrandSafetyPage /> : lockedPage('Brand Safety is an Elite Feature', 'Analyze scripts for brand safety.');
        case 'Billing': return <BillingPage />;
        case 'Profile': return <ProfilePage />;
        case 'Support': return <ContactSupportPage />;
        default: return <DashboardContent />;
    }
}

function Footer() {
    const { setShowTerms, setShowPrivacy } = useLegal();
    return (
        <footer className="p-4 text-xs text-center text-slate-500 bg-slate-50 dark:bg-gray-900 shrink-0">
            <button onClick={() => setShowTerms(true)} className="hover:underline">Terms of Service</button>
            <span className="mx-2">|</span>
            <button onClick={() => setShowPrivacy(true)} className="hover:underline">Privacy Policy</button>
        </footer>
    );
}
