import React, { useState } from 'react';
import { useAuth } from '../services';
import { getFunctions, httpsCallable } from "firebase/functions";
import { Loader2, Sparkles, Download, ShoppingCart } from 'lucide-react';

// Reusable UI Components
const Card = ({ children, className = '' }) => (<div className={`p-6 bg-white rounded-xl border border-slate-200 dark:bg-slate-900 dark:border-slate-700 ${className}`}>{children}</div>);
const LoadingIndicator = ({ title, subtitle }) => (<div className="flex flex-col items-center justify-center p-8 text-center"><Loader2 className="w-12 h-12 animate-spin text-indigo-500" /><h2 className="mt-6 text-2xl font-bold">{title}</h2><p className="max-w-md mt-2 text-slate-600 dark:text-slate-400">{subtitle}</p></div>);

export function VideoGeneratorPage({ setActivePage }) { // Accept setActivePage prop
    const { user, userData } = useAuth();
    const [script, setScript] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState(null);
    const [generationError, setGenerationError] = useState('');
    const requiredCredits = 10;

    const handleGenerateVideo = async () => {
        if (!script || !user) return;
        setIsGenerating(true);
        setGeneratedVideoUrl(null);
        setGenerationError('');
        
        const functions = getFunctions();
        const generateVideoCallable = httpsCallable(functions, 'generateVideoFromText');
        try {
            const result = await generateVideoCallable({ script, userId: user.uid });
            setGeneratedVideoUrl(result.data.downloadUrl);
        } catch (error) {
            console.error("Error generating video:", error);
            setGenerationError(error.message || "An unknown error occurred. Check the function logs.");
        } finally {
            setIsGenerating(false);
        }
    };

    const hasEnoughCredits = (userData?.videoCredits || 0) >= requiredCredits;

    return (
        <div className="space-y-8">
            <div className="text-center">
                <Sparkles className="w-12 h-12 mx-auto text-indigo-500" />
                <h1 className="text-4xl font-bold mt-4">AI Video Generator (Premium)</h1>
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">Turn your scripts into engaging videos with AI-selected B-roll.</p>
            </div>

            <Card>
                <h2 className="text-xl font-bold">1. Paste Your Script</h2>
                <p className="text-sm text-slate-500 mb-4">Our AI will read your script, find relevant stock videos, and edit them together for you. Costs {requiredCredits} credits.</p>
                <textarea 
                    value={script} 
                    onChange={e => setScript(e.target.value)} 
                    placeholder="Paste your generated script here..." 
                    rows="12" 
                    className="w-full p-4 bg-slate-100 rounded-lg dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 transition"
                ></textarea>
                <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
                    <p className="text-sm font-semibold">Your Credits: <span className="text-indigo-500 text-lg">{userData?.videoCredits || 0}</span></p>
                    <button 
                        onClick={handleGenerateVideo} 
                        disabled={isGenerating || !script || !hasEnoughCredits} 
                        className="w-full sm:w-auto px-8 py-3 flex items-center justify-center font-semibold text-white bg-green-600 rounded-lg disabled:bg-green-400 disabled:cursor-not-allowed transition-colors shadow-md hover:bg-green-700"
                    >
                        {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : `Generate Video (${requiredCredits} Credits)`}
                    </button>
                </div>

                {/* FIX: Add a prompt to buy more credits */}
                {!isGenerating && !hasEnoughCredits && script && (
                    <div className="mt-4 p-4 text-center bg-amber-50 dark:bg-amber-900/50 rounded-lg">
                        <p className="font-semibold text-amber-800 dark:text-amber-200">You don't have enough credits for this action.</p>
                        <button onClick={() => setActivePage('Billing')} className="mt-2 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-amber-500 rounded-lg hover:bg-amber-600">
                            <ShoppingCart className="w-4 h-4" /> Buy More Credits
                        </button>
                    </div>
                )}

                {isGenerating && <LoadingIndicator title="Generating Your Video..." subtitle="This may take a few minutes. Our AI is downloading clips and editing them together." />}
                {generationError && <p className="text-red-500 text-center mt-4 font-semibold">{generationError}</p>}
                {generatedVideoUrl && (
                    <div className="mt-8 text-center p-6 bg-green-50 dark:bg-green-900/50 rounded-lg">
                        <h3 className="text-2xl font-bold mb-4 text-green-800 dark:text-green-200">Your video is ready!</h3>
                        <a 
                            href={generatedVideoUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-2 px-8 py-3 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-lg transition-transform hover:scale-105"
                        >
                            <Download className="w-5 h-5"/> Download Video
                        </a>
                    </div>
                )}
            </Card>
        </div>
    );
}
