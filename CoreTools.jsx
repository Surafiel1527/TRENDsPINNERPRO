import React, { useState, useEffect, useRef } from 'react';
import { useAuth, callGeminiAPI, updateUserStats } from '../services';
import { db } from '../firebase';
import { getStorage, ref, uploadBytesResumable } from "firebase/storage";
import { collection, addDoc, onSnapshot, serverTimestamp, query, orderBy, Timestamp } from 'firebase/firestore';
import { Loader2, Sparkles, Wand2, Compass, Rocket, Target, Trophy, Flame, Film, Download, Trash2, Youtube, Instagram, BookOpen, Clock, CheckCircle, XCircle, UploadCloud, Link, Bot } from 'lucide-react';

// --- Generic UI Components ---
const Card = ({ children, className = '' }) => (<div className={`p-6 bg-white rounded-xl border border-slate-200 dark:bg-slate-900 dark:border-slate-700 ${className}`}>{children}</div>);
const LoadingIndicator = ({ title, subtitle }) => (<div className="flex flex-col items-center justify-center p-8 text-center"><Loader2 className="w-12 h-12 animate-spin text-indigo-500" /><h2 className="mt-6 text-2xl font-bold">{title}</h2><p className="max-w-md mt-2 text-slate-600 dark:text-slate-400">{subtitle}</p></div>);

// --- Video Clipper Page ---
export function VideoClipperPage({setActivePage}) {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('manual');
    const [localFile, setLocalFile] = useState(null);
    const [videoUrl, setVideoUrl] = useState('');
    const [trimClips, setTrimClips] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const videoRef = useRef(null);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [selection, setSelection] = useState([0, 0]);
    const [localFileUrl, setLocalFileUrl] = useState('');

    useEffect(() => {
        if (!user) return;
        const jobsColRef = collection(db, 'users', user.uid, 'videoJobs');
        const q = query(jobsColRef, orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setJobs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [user]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLocalFile(file);
            setLocalFileUrl(URL.createObjectURL(file));
            setTrimClips([]);
        }
    };

    const handleVideoLoad = () => {
        if (videoRef.current) {
            const videoDuration = videoRef.current.duration;
            setDuration(videoDuration);
            setSelection([0, videoDuration > 10 ? 10 : videoDuration]);
        }
    };

    const addVisualClip = () => {
        const newClip = { start: selection[0], end: selection[1] };
        setTrimClips([...trimClips, newClip].sort((a,b) => a.start - b.start));
    };
    
    const removeQueuedClip = (indexToRemove) => {
        setTrimClips(trimClips.filter((_, index) => index !== indexToRemove));
    };

    const handleCreateJob = async (jobType) => {
        if (!user) return;
        if (jobType === 'manual' && (!localFile || trimClips.length === 0)) {
            alert("Please upload a file and define at least one clip."); return;
        }
        if (jobType === 'url' && (!videoUrl || trimClips.length === 0)) {
            alert("Please provide a URL and define at least one clip."); return;
        }
        if (jobType === 'ai_smart_clip' && !videoUrl) {
            alert("Please provide a URL for the AI to analyze."); return;
        }
        
        setIsUploading(true);
        let jobData = {
            userId: user.uid,
            createdAt: serverTimestamp(),
            jobType,
        };

        const jobsCollectionRef = collection(db, 'users', user.uid, 'videoJobs');

        if (jobType === 'url' || jobType === 'ai_smart_clip') {
            jobData = { ...jobData, status: 'pending_download', urlToProcess: videoUrl, clips: jobType === 'url' ? trimClips : [] };
            await addDoc(jobsCollectionRef, jobData);
            setIsUploading(false);
            setVideoUrl('');
        } else {
            const storage = getStorage();
            const filePath = `uploads/${user.uid}/${Date.now()}_${localFile.name}`;
            const storageRef = ref(storage, filePath);
            const uploadTask = uploadBytesResumable(storageRef, localFile);

            uploadTask.on('state_changed', 
                (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
                (error) => { console.error("Upload failed:", error); setIsUploading(false); }, 
                async () => {
                    jobData = { ...jobData, status: 'uploaded', rawFilePath: filePath, clips: trimClips, originalFileName: localFile.name };
                    await addDoc(jobsCollectionRef, jobData);
                    setIsUploading(false);
                    setLocalFile(null);
                    setLocalFileUrl('');
                    if(document.getElementById('file-upload')) document.getElementById('file-upload').value = '';
                }
            );
        }
        setTrimClips([]);
    };
    
    const getStatusBadge = (status) => {
        switch (status) {
            case 'processing': return <span className="flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-100 dark:bg-amber-900/50 dark:text-amber-300 px-2 py-1 rounded-full"><Clock className="w-3 h-3"/>Processing</span>;
            case 'complete': return <span className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-100 dark:bg-green-900/50 dark:text-green-300 px-2 py-1 rounded-full"><CheckCircle className="w-3 h-3"/>Complete</span>;
            case 'failed': return <span className="flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-100 dark:bg-red-900/50 dark:text-red-300 px-2 py-1 rounded-full"><XCircle className="w-3 h-3"/>Failed</span>;
            default: return <span className="flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-100 dark:bg-slate-900/50 dark:text-slate-300 px-2 py-1 rounded-full"><UploadCloud className="w-3 h-3"/>Pending</span>;
        }
    }
    
    const formatTime = (timeInSeconds) => new Date(timeInSeconds * 1000).toISOString().substr(11, 8);
    
    return (
        <div className="space-y-8">
            <div className="text-center">
                <Film className="w-12 h-12 mx-auto text-indigo-500" />
                <h1 className="text-4xl font-bold mt-4">Premium Video Clipper</h1>
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">Visually trim, process from links, or let AI create highlight reels for you.</p>
            </div>

            <div className="flex justify-center border-b border-slate-200 dark:border-slate-700">
                <TabButton id="manual" activeTab={activeTab} setActiveTab={setActiveTab} icon={UploadCloud}>Manual Clipper</TabButton>
                <TabButton id="url" activeTab={activeTab} setActiveTab={setActiveTab} icon={Link}>URL Clipper</TabButton>
                <TabButton id="ai" activeTab={activeTab} setActiveTab={setActiveTab} icon={Bot}>AI Smart Clipper</TabButton>
            </div>

            <Card>
                {activeTab === 'manual' && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold">1. Upload & Define Clips</h2>
                        <input id="file-upload" type="file" onChange={handleFileChange} accept="video/*" className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                        {localFileUrl && (
                            <div className="space-y-4 pt-4">
                                <video ref={videoRef} src={localFileUrl} controls onLoadedMetadata={handleVideoLoad} onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)} className="w-full rounded-lg bg-black"></video>
                                <div>
                                    <input type="range" min={0} max={duration} value={currentTime} onChange={(e) => videoRef.current.currentTime = e.target.value} className="w-full"/>
                                    <div className="flex justify-between text-xs font-mono"><p>{formatTime(selection[0])}</p><p>{formatTime(currentTime)}</p><p>{formatTime(selection[1])}</p></div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <button onClick={() => setSelection([currentTime, selection[1]])} className="px-4 py-2 text-sm font-semibold bg-slate-200 dark:bg-slate-700 rounded-lg">Set Start Time</button>
                                    <button onClick={() => setSelection([selection[0], currentTime])} className="px-4 py-2 text-sm font-semibold bg-slate-200 dark:bg-slate-700 rounded-lg">Set End Time</button>
                                </div>
                                <button onClick={addVisualClip} className="w-full px-4 py-2 font-semibold text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg">Add Clip to Queue</button>
                            </div>
                        )}
                    </div>
                )}
                {activeTab === 'url' && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold">1. Paste Video URL</h2>
                        <input type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." className="w-full px-4 py-2 bg-slate-100 rounded-lg dark:bg-slate-800"/>
                        <h2 className="text-xl font-bold pt-4">2. Define Clips to Combine</h2>
                         <p className="text-sm text-slate-500">Note: URL clipping requires manual time entry as we cannot preview the video here.</p>
                         <button onClick={() => alert("Please define clips manually for URL clipper")} className="w-full px-4 py-2 font-semibold text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg">Submit URL & Clips</button>
                    </div>
                )}
                {activeTab === 'ai' && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold">Paste Video URL for AI Analysis</h2>
                        <p className="text-sm text-slate-500">Our AI will watch the video, find the most interesting parts, and create a highlight reel for you.</p>
                        <input type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." className="w-full px-4 py-2 bg-slate-100 rounded-lg dark:bg-slate-800"/>
                    </div>
                )}

                <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
                    <h3 className="font-semibold">Clip Queue ({trimClips.length})</h3>
                    {trimClips.length > 0 ? (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {trimClips.map((clip, index) => (
                                <div key={index} className="flex justify-between items-center bg-slate-100 dark:bg-slate-800 p-2 rounded-lg">
                                    <p className="text-sm font-mono">Clip {index + 1}: {formatTime(clip.start)} - {formatTime(clip.end)}</p>
                                    <button onClick={() => removeQueuedClip(index)}><Trash2 className="w-4 h-4 text-red-500"/></button>
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-sm text-slate-500">No clips added yet.</p>}
                </div>
                
                {isUploading && <div className="w-full bg-slate-200 rounded-full h-2.5 dark:bg-slate-700 mt-4"><div className="bg-indigo-600 h-2.5 rounded-full" style={{width: `${uploadProgress}%`}}></div><p className="text-xs text-center mt-1">Uploading... {Math.round(uploadProgress)}%</p></div>}
                
                <button onClick={() => handleCreateJob(activeTab === 'manual' ? 'manual' : activeTab === 'url' ? 'url' : 'ai_smart_clip')} disabled={isUploading} className="w-full mt-4 flex justify-center items-center px-4 py-3 font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-green-400">
                    {isUploading ? 'Processing...' : `Create Final Video`}
                </button>
            </Card>

             <div className="space-y-4">
                <h2 className="text-2xl font-bold">Your Video Jobs</h2>
                {jobs.length > 0 ? (
                    <Card className="divide-y divide-slate-200 dark:divide-slate-700 p-0">
                        {jobs.map(job => (
                            <div key={job.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold truncate">{job.originalFileName || job.urlToProcess}</p>
                                    <p className="text-xs text-slate-500">{job.createdAt?.toDate().toLocaleString()}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    {getStatusBadge(job.status)}
                                    {job.status === 'complete' && (<a href={job.processedFileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 font-semibold text-white bg-green-600 rounded-lg text-sm hover:bg-green-700"><Download className="w-4 h-4"/> Download</a>)}
                                </div>
                            </div>
                        ))}
                    </Card>
                ) : (<p className="text-slate-500 text-center py-4">You haven't created any videos yet.</p>)}
            </div>
        </div>
    );
}

const TabButton = ({ id, activeTab, setActiveTab, icon: Icon, children }) => (
    <button onClick={() => setActiveTab(id)} className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm transition ${activeTab === id ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 border-b-2 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
        <Icon className="w-5 h-5"/> {children}
    </button>
)

// --- Other Core Tools ---
export function TrendAnalysisPage({ setActivePage }) {
    const { user, userData } = useAuth();
    const [trends, setTrends] = useState({});
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState(7);
    const niche = userData?.niche || 'General';
    const subscription = userData?.subscription || 'Basic';

    useEffect(() => {
        const fetchTrends = async () => {
            if (!user) return;
            setLoading(true);
            const platformMetricSchema = { type: "OBJECT", properties: { demand: { type: "STRING", enum: ["High", "Medium", "Low"] }, competition: { type: "STRING", enum: ["High", "Medium", "Low"] }, }, required: ["demand", "competition"] };
            const trendItemBaseProps = { topic: { type: "STRING" }, title_suggestion: { type: "STRING" } };
            const trendItemProProps = { ...trendItemBaseProps, platform_metrics: { type: "OBJECT", properties: { youtube: platformMetricSchema, tiktok: platformMetricSchema, instagram: platformMetricSchema }, required: ["youtube", "tiktok", "instagram"] } };
            const trendItemEliteProps = { ...trendItemProProps, elite_insight: { type: "STRING" } };
            const createTrendListSchema = (props, required) => ({ type: "ARRAY", items: { type: "OBJECT", properties: props, required: required } });
            
            let prompt, schema;
            const timeClause = `from the last ${timeframe} days`;

            if (subscription === 'Elite') {
                prompt = `For a creator in the "${niche}" niche, generate topics ${timeClause}, categorized: 5 for "High Demand, Low Competition", 5 for "High Demand, Medium Competition", 5 for "High Demand, High Competition", and 5 "General Hot Topics". For EACH topic, provide: a viral title, an "Elite Insight", and platform metrics (demand/competition) for YouTube, TikTok, and Instagram.`;
                const listSchema = createTrendListSchema(trendItemEliteProps, ["topic", "title_suggestion", "platform_metrics", "elite_insight"]);
                schema = { type: "OBJECT", properties: { high_demand_low_comp: listSchema, high_demand_med_comp: listSchema, high_demand_high_comp: listSchema, general_hot: listSchema } };
            } else if (subscription === 'Professional') {
                prompt = `For a creator in the "${niche}" niche, generate topics ${timeClause}, categorized: 5 for "High Demand, Low Competition", 5 for "High Demand, Medium Competition", and 5 for "High Demand, High Competition". For EACH topic, provide: a viral title and platform metrics (demand/competition) for YouTube, TikTok, and Instagram.`;
                const listSchema = createTrendListSchema(trendItemProProps, ["topic", "title_suggestion", "platform_metrics"]);
                schema = { type: "OBJECT", properties: { high_demand_low_comp: listSchema, high_demand_med_comp: listSchema, high_demand_high_comp: listSchema } };
            } else {
                prompt = `For a creator in the "${niche}" niche, generate 10 topics ${timeClause}. For EACH topic, provide: a viral title and platform metrics (demand/competition) for YouTube, TikTok, and Instagram.`;
                schema = { type: "OBJECT", properties: { general_hot: createTrendListSchema(trendItemProProps, ["topic", "title_suggestion", "platform_metrics"]) } };
            }
            
            try {
                const generatedTrends = await callGeminiAPI(prompt, schema);
                setTrends(generatedTrends || {});
                await updateUserStats(user.uid, 'trendsAnalyzed');
            } catch (err) {
                console.error("Failed to fetch trends:", err);
                setTrends({});
            } finally {
                setLoading(false);
            }
        };
        fetchTrends();
    }, [niche, user, subscription, timeframe]);

    if (loading) return <LoadingIndicator title="Brewing Fresh Trends..." subtitle={`Scanning the last ${timeframe} days for you.`} />;

    const categories = [
        { key: 'high_demand_low_comp', title: "High Demand, Low Competition", icon: Rocket, description: "Golden opportunities. Your best chance to break through!", color: "green" },
        { key: 'high_demand_med_comp', title: "High Demand, Medium Competition", icon: Target, description: "Great topics to tackle with a unique angle.", color: "yellow" },
        { key: 'high_demand_high_comp', title: "High Demand, High Competition", icon: Trophy, description: "Requires top-tier execution to stand out.", color: "red" },
        { key: 'general_hot', title: "Bonus: Hot Topics", icon: Flame, description: "Popular and relevant topics to consider.", color: "blue" },
    ];
    
    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold">Trend Analysis for: <span className="text-indigo-500">{niche}</span></h1>
            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/50 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2"><span>Trending in last:</span><div className="flex items-center bg-white dark:bg-slate-800 rounded-lg p-1 shadow-sm">{[7, 15, 30].map(day => <button key={day} onClick={() => setTimeframe(day)} className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${timeframe === day ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>{day} Days</button>)}</div></div>
                {subscription !== 'Elite' && <button onClick={() => setActivePage('Billing')} className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow-md hover:bg-indigo-700 whitespace-nowrap">Upgrade for More Insights</button>}
            </div>
            <div className="space-y-8">{categories.map(cat => trends[cat.key] && (<TrendCategory key={cat.key} {...cat} data={trends[cat.key]} isElite={subscription === 'Elite'} />))}</div>
        </div>
    );
}

const PlatformIcon = ({ platform, className = "w-5 h-5" }) => {
    switch(platform.toLowerCase()) {
        case 'instagram': return <Instagram className={`${className} text-pink-500`} />;
        case 'youtube': return <Youtube className={`${className} text-red-500`} />;
        case 'tiktok': return <svg className={className} fill="currentColor" viewBox="0 0 16 16"><path d="M9 0h1.98c.144.715.54 1.617 1.235 2.512C12.895 3.389 13.797 4 15 4v2.19c-1.7-.045-3.248-.96-4.122-2.438C10.07 2.71 9.5 1.67 9 0zm7 4h-2v12H9V9.157c.522-1.265 1.671-3.197 4.05-4.577C14.707 3.51 16 2.51 16 0h-2c-.16 1.033-.66 2.11-1.336 2.961C12.014 3.85 11.08 4 10 4v5.157c0 1.988 1.59 3.596 3.596 3.596H16V4z"/></svg>;
        default: return null;
    }
};

const TrendCategory = ({ title, icon, data, description, color, isElite }) => {
    const Icon = icon;
    const getLevelBadge = (level) => { const styles = { High: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300', Medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300', Low: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' }; return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[level] || 'bg-slate-100 text-slate-700'}`}>{level}</span>; };
    const colorStyles = {
        green: { border: 'border-green-500', bg: 'bg-green-50 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-200' },
        yellow: { border: 'border-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-200' },
        red: { border: 'border-red-500', bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-200' },
        blue: { border: 'border-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-200' },
    }
    const styles = colorStyles[color] || colorStyles.blue;

    return (
        <Card>
            <div className={`-m-6 mb-0 p-4 border-l-4 rounded-t-lg ${styles.border} ${styles.bg}`}><h3 className={`font-bold text-xl flex items-center gap-2 ${styles.text}`}><Icon className="w-6 h-6"/>{title}</h3><p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{description}</p></div>
            <div className="divide-y divide-slate-200 dark:divide-slate-700">{data.map((trend, i) => (<div key={i} className="py-4 space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div><h4 className="font-semibold text-base">Trending Topic</h4><p>{trend.topic}</p></div><div><h4 className="font-semibold text-base">AI Title Suggestion</h4><p className="text-indigo-600 dark:text-indigo-400">"{trend.title_suggestion}"</p></div></div><div><h4 className="font-semibold text-base">Platform Analysis</h4><div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-4">{trend.platform_metrics && Object.entries(trend.platform_metrics).map(([platform, metrics]) => (<div key={platform} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg"><div className="flex items-center gap-2 mb-2"><PlatformIcon platform={platform} /><span className="font-bold capitalize">{platform}</span></div><div className="flex justify-between items-center text-xs"><span className="font-semibold text-slate-600 dark:text-slate-400">Demand:</span>{getLevelBadge(metrics.demand)}</div><div className="flex justify-between items-center text-xs mt-1"><span className="font-semibold text-slate-600 dark:text-slate-400">Competition:</span>{getLevelBadge(metrics.competition)}</div></div>))}</div></div>{isElite && trend.elite_insight && (<div className="p-3 bg-amber-50/50 dark:bg-amber-900/20 rounded-lg border-l-4 border-amber-400"><h4 className="font-semibold flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300"><Sparkles className="w-5 h-5" /> ELITE INSIGHT</h4><p className="mt-1 text-sm text-amber-800 dark:text-amber-200 pl-7">{trend.elite_insight}</p></div>)}</div>))}</div>
        </Card>
    );
};

// --- Content Creation Page & Components ---
export function ContentCreationPage() { 
    return (
        <div className="space-y-8">
            <div className="flex items-center gap-3"><Wand2 className="w-8 h-8 text-indigo-500" /><h1 className="text-3xl font-bold">Content Creation Suite</h1></div>
            <p className="text-slate-600 dark:text-slate-400">Generate keywords, titles, and full video scripts for your next viral hit.</p>
            <KeywordGenerator />
            <ScriptGenerator />
        </div>
    ); 
}

function KeywordGenerator() {
    const [topic, setTopic] = useState('');
    const [keywords, setKeywords] = useState(null);
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();

    const generateKeywords = async (e) => {
        e.preventDefault();
        if (!topic || !user) return;
        setLoading(true);
        setKeywords(null);

        try {
            const prompt = `Generate SEO keywords and hashtags for a video about "${topic}". Provide a list of keywords for YouTube, and lists of hashtags for TikTok and Instagram.`;
            const schema = {type: "OBJECT", properties: { youtube: {type: "ARRAY", items: {type: "STRING"}}, tiktok: {type: "ARRAY", items: {type: "STRING"}}, instagram: {type: "ARRAY", items: {type: "STRING"}} }, required: ["youtube", "tiktok", "instagram"]};
            const result = await callGeminiAPI(prompt, schema);
            setKeywords(result);
            await updateUserStats(user.uid, 'keywordsGenerated');
            const historyRef = collection(db, 'users', user.uid, 'keywordHistory');
            await addDoc(historyRef, { topic, keywords: result, createdAt: Timestamp.now() });
        } catch (err) {
            console.error('Failed to generate keywords or save history:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <h2 className="text-xl font-semibold mb-4">Keyword & Hashtag Generator</h2>
            <form onSubmit={generateKeywords} className="flex flex-col sm:flex-row gap-4">
                <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Enter a content topic (e.g., 'morning productivity hacks')" className="flex-grow px-4 py-2 bg-slate-100 rounded-lg dark:bg-slate-800 border-transparent focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                <button type="submit" disabled={loading || !topic} className="px-6 py-2 flex items-center justify-center font-semibold text-white bg-indigo-600 rounded-lg disabled:bg-indigo-400 transition-colors">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Sparkles className="w-5 h-5 mr-2" />Generate</>}
                </button>
            </form>
            {loading && <LoadingIndicator title="Digging for Viral Keywords..." subtitle="Our AI is mining the web for the best terms to get you noticed." />}
            {keywords && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div><h3 className="font-semibold mb-2">YouTube Keywords</h3><div className="flex flex-wrap gap-2">{keywords.youtube.map(k => <span key={k} className="px-2 py-1 text-sm bg-slate-100 dark:bg-slate-800 rounded">{k}</span>)}</div></div>
                    <div><h3 className="font-semibold mb-2">TikTok Hashtags</h3><div className="flex flex-wrap gap-2">{keywords.tiktok.map(k => <span key={k} className="px-2 py-1 text-sm bg-slate-100 dark:bg-slate-800 rounded">{k}</span>)}</div></div>
                    <div><h3 className="font-semibold mb-2">Instagram Hashtags</h3><div className="flex flex-wrap gap-2">{keywords.instagram.map(k => <span key={k} className="px-2 py-1 text-sm bg-slate-100 dark:bg-slate-800 rounded">{k}</span>)}</div></div>
                </div>
            )}
        </Card>
    );
}

function ScriptGenerator() {
    const [topic, setTopic] = useState('');
    const [scriptLength, setScriptLength] = useState('1 min (Short)');
    const [scriptStyle, setScriptStyle] = useState('Educational');
    const [script, setScript] = useState('');
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();

    const generateScript = async (e) => {
        e.preventDefault();
        if (!topic || !user) return;
        setLoading(true);
        setScript('');

        try {
            const prompt = `Create a complete, ready-to-read video script about "${topic}". The video's target length is ${scriptLength}, and the tone should be ${scriptStyle}. **CRITICAL INSTRUCTION:** The script must be specific and actionable. Mention specific, real-world examples of tools or techniques. The output must be formatted with a Title Suggestion, and a Full Script with VISUAL and HOST sections. Write out the *entire* dialogue.`;
            const result = await callGeminiAPI(prompt);
            setScript(result);
            await updateUserStats(user.uid, 'scriptsGenerated');
            const historyRef = collection(db, 'users', user.uid, 'scriptHistory');
            await addDoc(historyRef, { topic, script: result, scriptLength, scriptStyle, createdAt: Timestamp.now() });
        } catch (err) {
            console.error('Failed to generate script or save history:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <h2 className="text-xl font-semibold mb-4">AI Scriptwriter</h2>
            <form onSubmit={generateScript} className="space-y-4">
                <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="Enter a script topic" className="w-full px-4 py-2 bg-slate-100 rounded-lg dark:bg-slate-800" required />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Script Length</label>
                        <select value={scriptLength} onChange={e => setScriptLength(e.target.value)} className="w-full px-4 py-2 bg-slate-100 rounded-lg dark:bg-slate-800">
                            <option>1 min (Short)</option> <option>5 mins (Standard)</option> <option>10 mins (Deep Dive)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Content Style</label>
                        <select value={scriptStyle} onChange={e => setScriptStyle(e.target.value)} className="w-full px-4 py-2 bg-slate-100 rounded-lg dark:bg-slate-800">
                            <option>Educational</option> <option>Energetic & Fast-Paced</option> <option>Storytelling</option> <option>Humorous / Comedy</option> <option>Cinematic / Aspirational</option>
                        </select>
                    </div>
                </div>
                <button type="submit" disabled={loading || !topic} className="w-full px-6 py-3 flex items-center justify-center font-semibold text-white bg-green-600 rounded-lg disabled:bg-green-400 transition-colors">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Write Full Script'}</button>
            </form>
            {loading && <LoadingIndicator title="Writing Your Next Viral Script..." subtitle="Our AI storyteller is crafting a detailed narrative with visuals." />}
            {script && (
                <div className="mt-6 p-4 border rounded-lg bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700">
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: script.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>') }}></pre>
                </div>
            )}
        </Card>
    );
}

// --- Tutorials Page ---
export function TutorialsPage() {
    const tutorials = [
        { title: "Getting Started with TrendSpinner", description: "An overview of the dashboard and main features to get you up and running in minutes.", youtubeLink: "#", color: "blue" },
        { title: "Mastering Trend Analysis", description: "Learn how to use the Trend Analysis tool to find high-demand, low-competition content ideas.", youtubeLink: "#", color: "pink" },
        { title: "From Idea to Script in 60 Seconds", description: "A deep dive into the Content Creation suite, showing how to generate keywords, titles, and full scripts.", youtubeLink: "#", color: "green" },
        { title: "Using Elite Tools to Go Viral", description: "Unlock the power of Elite features like Audience Sentiment and A/B Title Tester to maximize your reach.", youtubeLink: "#", color: "purple" }
    ];
    const colorClasses = { blue: 'bg-blue-500', pink: 'bg-pink-500', green: 'bg-green-500', purple: 'bg-purple-500' };

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-3"><BookOpen className="w-8 h-8 text-indigo-500" /><h1 className="text-3xl font-bold">Tutorials & Guides</h1></div>
            <p className="text-slate-600 dark:text-slate-400">Watch these short videos to learn how to make the most out of TrendSpinner.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {tutorials.map((tutorial, index) => (
                    <Card key={index} className="!p-0 overflow-hidden flex flex-col">
                        <div className={`h-3 ${colorClasses[tutorial.color]}`}></div>
                        <div className="p-6 flex flex-col flex-grow">
                            <h3 className="text-xl font-bold mb-2">{tutorial.title}</h3>
                            <p className="text-slate-600 dark:text-slate-400 flex-grow mb-6">{tutorial.description}</p>
                            <div className="mt-auto">
                                <a href={tutorial.youtubeLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-4 py-3 font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">
                                    <Youtube className="w-5 h-5" /> <span>Watch on YouTube</span>
                                </a>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
