import React, { useState, useEffect, createContext, useContext } from 'react';
import { AuthProvider, useAuth } from './services';
import Layout from './components/Layout';
import { AuthPage } from './components/Auth';
import { Loader2, XCircle } from 'lucide-react';

// --- Legal Context & Provider ---
const LegalContext = createContext();
export const useLegal = () => useContext(LegalContext);

const LegalProvider = ({ children }) => {
    const [showTerms, setShowTerms] = useState(false);
    const [showPrivacy, setShowPrivacy] = useState(false);

    return (
        <LegalContext.Provider value={{ showTerms, setShowTerms, showPrivacy, setShowPrivacy }}>
            {children}
            {showTerms && <LegalDocumentViewer title="Terms of Service" onClose={() => setShowTerms(false)} />}
            {showPrivacy && <LegalDocumentViewer title="Privacy Policy" onClose={() => setShowPrivacy(false)} />}
        </LegalContext.Provider>
    );
};

// --- Legal Document Viewer & Content ---
const LegalDocumentViewer = ({ title, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl max-w-3xl w-full h-[90vh] flex flex-col">
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center shrink-0">
                    <h2 className="text-xl font-bold">{title}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><XCircle className="w-6 h-6" /></button>
                </div>
                <div className="p-6 overflow-y-auto prose dark:prose-invert max-w-none">
                    {title === "Terms of Service" ? <TermsOfServiceContent /> : <PrivacyPolicyContent />}
                </div>
                <div className="p-4 border-t dark:border-gray-700 text-right shrink-0">
                    <button onClick={onClose} className="px-6 py-2 font-semibold text-white bg-indigo-600 rounded-lg">Close</button>
                </div>
            </div>
        </div>
    );
};
const TermsOfServiceContent = () => (
    <>
        <h2>Terms of Service for TrendSpinner</h2>
        <p><strong>Effective Date:</strong> August 2, 2025</p>
        <h3>1. Introduction</h3>
        <p>Welcome to TrendSpinner ("we," "us," or "our"). These Terms of Service ("Terms") govern your access to and use of our website, services, and application (collectively, the "Service"). By accessing or using the Service, you agree to be bound by these Terms and our Privacy Policy.</p>
        <h3>2. Age Requirement</h3>
        <p>You must be at least 18 years old to use the Service. By creating an account and using the Service, you represent and warrant that you are 18 years of age or older and have the legal capacity to enter into this agreement.</p>
        <h3>3. User Accounts</h3>
        <p>To access most features of the Service, you must register for an account. You are responsible for maintaining the confidentiality of your account information, including your password, and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.</p>
        <h3>4. Use of the Service</h3>
        <p>You agree to use the Service only for lawful purposes and in accordance with these Terms. You are responsible for any content you generate, including scripts, keywords, and analysis reports ("User Content"). You agree not to:
        - Use the Service in any way that violates any applicable federal, state, local, or international law.
        - Generate content that is unlawful, defamatory, obscene, or infringing on the rights of others.
        - Attempt to gain unauthorized access to, interfere with, or damage any part of the Service.</p>
        <h3>5. AI-Generated Content</h3>
        <p>The Service uses artificial intelligence (AI) to generate content and analysis. While we strive for accuracy and utility, we do not guarantee the correctness, reliability, or suitability of any AI-generated content. You are solely responsible for reviewing and validating all content before use. We are not liable for any decisions made or actions taken based on the information provided by the Service.</p>
        <h3>6. Subscriptions and Billing</h3>
        <p>- <strong>Plans:</strong> The Service is offered under various subscription plans (e.g., Basic, Professional, Elite). Features and limitations are determined by your chosen plan.
        - <strong>Payment:</strong> For paid plans, you agree to pay all applicable fees. Payments are handled through a third-party processor.
        - <strong>Cancellation:</strong> You may cancel your subscription at any time through your account settings.</p>
        <h3>7. Intellectual Property</h3>
        <p>The Service and its original content, features, and functionality are and will remain the exclusive property of TrendSpinner and its licensors. User Content remains your intellectual property; however, by using the Service, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, and display the User Content solely for the purpose of operating and improving the Service.</p>
        <h3>8. Termination</h3>
        <p>We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason, including if you breach these Terms.</p>
        <h3>9. Disclaimers and Limitation of Liability</h3>
        <p>The Service is provided "AS IS" and "AS AVAILABLE" without warranties of any kind. In no event shall TrendSpinner, nor its directors, employees, or partners, be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of the Service.</p>
        <h3>10. Changes to Terms</h3>
        <p>We reserve the right to modify these Terms at any time. We will provide notice of significant changes. Your continued use of the Service after such changes constitutes your acceptance of the new Terms.</p>
        <h3>11. Governing Law</h3>
        <p>These Terms shall be governed by the laws of the United States, without regard to its conflict of law provisions.</p>
        <h3>12. Contact Us</h3>
        <p>If you have any questions about these Terms, please contact us through the support page within the application.</p>
    </>
);
const PrivacyPolicyContent = () => (
    <>
        <h2>Privacy Policy for TrendSpinner</h2>
        <p><strong>Effective Date:</strong> August 2, 2025</p>
        <h3>1. Introduction</h3>
        <p>TrendSpinner ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service. By using the Service, you consent to the data practices described in this policy.</p>
        <h3>2. Information We Collect</h3>
        <p>We may collect information about you in a variety of ways:
        - <strong>Personal Data:</strong> Personally identifiable information, such as your name, email address, and payment information, that you voluntarily give to us when you register for an account or purchase a subscription.
        - <strong>Derivative Data:</strong> Information our servers automatically collect, such as your IP address, browser type, and the dates and times you access the Service.
        - <strong>User-Generated Data:</strong> All inputs you provide to the AI tools, such as topics for scripts, competitor handles, and calendar events, are processed to provide the service. We store this data securely in connection with your account.
        - <strong>Financial Data:</strong> We do not store or collect any payment card details. That information is provided directly to our third-party payment processors.</p>
        <h3>3. Use of Your Information</h3>
        <p>We use the information we collect to:
        - Create and manage your account.
        - Provide, operate, and improve the Service.
        - Process payments and subscriptions.
        - Respond to your support tickets and inquiries.
        - Monitor usage and analyze trends to improve the user experience.
        - Comply with legal obligations.</p>
        <h3>4. Disclosure of Your Information</h3>
        <p>We do not sell your personal information. We may share information we have collected about you in certain situations:
        - <strong>With Service Providers:</strong> We may share your information with third-party vendors who perform services for us, such as payment processing and data storage (Firebase/Google Cloud).
        - <strong>By Law or to Protect Rights:</strong> We may disclose your information if required to do so by law or in the good faith belief that such action is necessary to comply with a legal obligation or protect the rights and safety of our users or the public.</p>
        <h3>5. Security of Your Information</h3>
        <p>We use administrative, technical, and physical security measures to help protect your personal information. We leverage Google Cloud's Firebase platform, which provides robust security for data storage and authentication. However, please be aware that no security measures are perfect or impenetrable.</p>
        <h3>6. Data Retention</h3>
        <p>We will retain your personal information only for as long as is necessary for the purposes set out in this Privacy Policy, or as long as your account is active.</p>
        <h3>7. Your Data Protection Rights</h3>
        <p>Depending on your location, you may have the following rights regarding your personal information: The right to access, update, or delete the information we have on you. You can exercise these rights through your account profile page or by contacting support.</p>
        <h3>8. Policy for Children</h3>
        <p>We do not knowingly collect information from children under the age of 18. If you become aware that a child under 18 has provided us with personal information, please contact us immediately.</p>
    </>
);


// --- Theme Context & Provider ---
const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);

const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        localStorage.setItem('theme', theme);
    }, [theme]);
    const toggleTheme = () => setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
};


// --- Main App & Routing ---
export default function App() {
    useEffect(() => {
        const loadScript = (id, url) => {
            if (document.getElementById(id)) return;
            const script = document.createElement('script');
            script.id = id; script.src = url; script.async = true;
            document.head.appendChild(script);
        };
        loadScript('ffmpeg-util-script', 'https://unpkg.com/@ffmpeg/util@0.12.1/dist/umd/index.js');
        loadScript('ffmpeg-script', 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js');
    }, []);

    return (
        <ThemeProvider>
            <AuthProvider>
                <LegalProvider>
                    <Main />
                </LegalProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}

function Main() {
    const { user, loading } = useAuth();
    if (loading) return <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900"><Loader2 className="w-12 h-12 animate-spin text-indigo-500" /></div>;
    return user ? <Layout /> : <AuthPage />;
}