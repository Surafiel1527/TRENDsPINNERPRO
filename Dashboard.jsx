import React, { useState, useEffect } from 'react';
import { useAuth } from '../services';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileText, Sparkles, Target, Users, Loader2, Megaphone, ShieldCheck, ThumbsUp, ThumbsDown, Lightbulb, XCircle } from 'lucide-react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';


const Card = ({ children, className = '' }) => (<div className={`p-6 bg-white rounded-xl border border-slate-200 dark:bg-slate-900 dark:border-slate-700 ${className}`}>{children}</div>);

const StatCard = ({ icon, title, value, iconBgColor }) => {
    const Icon = icon;
    return (
        <Card>
            <div className="flex items-center gap-4">
                <div className={`flex items-center justify-center w-12 h-12 rounded-full ${iconBgColor}`}>
                    <Icon className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</h3>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
                </div>
            </div>
        </Card>
    );
};

export function DashboardContent() {
    const { userData } = useAuth();
    const stats = userData?.stats || {};
    const sampleChartData = [
        { name: 'Jan', Views: 4000, Likes: 2400 }, { name: 'Feb', Views: 3000, Likes: 1398 },
        { name: 'Mar', Views: 5000, Likes: 4800 }, { name: 'Apr', Views: 2780, Likes: 3908 },
        { name: 'May', Views: 1890, Likes: 2800 }, { name: 'Jun', Views: 2390, Likes: 3800 }
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Welcome back, {userData?.displayName || 'Creator'}!</h1>
            
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={FileText} title="Scripts Generated" value={stats.scriptsGenerated || 0} iconBgColor="bg-indigo-100 dark:bg-indigo-900/50" />
                <StatCard icon={Sparkles} title="Keywords Found" value={stats.keywordsGenerated || 0} iconBgColor="bg-sky-100 dark:bg-sky-900/50" />
                <StatCard icon={Target} title="Titles Tested" value={stats.titlesTested || 0} iconBgColor="bg-amber-100 dark:bg-amber-900/50" />
                <StatCard icon={Users} title="Competitors Analyzed" value={stats.competitorsAnalyzed || 0} iconBgColor="bg-rose-100 dark:bg-rose-900/50" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Card>
                        <h3 className="mb-4 text-base font-semibold">Performance Overview (Sample Data)</h3>
                        <p className="text-sm text-slate-500 mb-4">This chart shows sample data. Future versions will integrate with your social platforms.</p>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={sampleChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.1)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} fontSize={12} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} fontSize={12} />
                                <Tooltip contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.9)', border: 'none', borderRadius: '0.5rem' }} />
                                <Legend />
                                <Line type="monotone" dataKey="Views" stroke="#8884d8" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="Likes" stroke="#82ca9d" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </Card>
                </div>
                <div className="lg:col-span-1">
                    <RecentActivityFeed />
                </div>
            </div>
        </div>
    );
}

function RecentActivityFeed() {
    const { user } = useAuth();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);

    useEffect(() => {
        if (!user) return;

        const fetchHistory = async () => {
            setLoading(true);
            const historyTypes = [
                { name: 'keywordHistory', type: 'Keywords' }, { name: 'scriptHistory', type: 'Script' },
                { name: 'titleHistory', type: 'Title Test' }, { name: 'sentimentHistory', type: 'Sentiment Analysis' },
                { name: 'competitorHistory', type: 'Competitor Analysis' }, { name: 'brandSafetyHistory', type: 'Brand Safety Scan' },
            ];

            const promises = historyTypes.map(async (hist) => {
                // FIX: Simplified database path
                const collRef = collection(db, 'users', user.uid, hist.name);
                const q = query(collRef, orderBy('createdAt', 'desc'), limit(5));
                const snapshot = await getDocs(q);
                return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, type: hist.type }));
            });

            try {
                const allHistory = (await Promise.all(promises)).flat();
                allHistory.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
                setHistory(allHistory.slice(0, 10));
            } catch (error) {
                console.error("Error fetching history:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [user]);

    const ICONS = {
        'Keywords': <Sparkles className="w-5 h-5 text-yellow-500" />,
        'Script': <FileText className="w-5 h-5 text-blue-500" />,
        'Title Test': <Target className="w-5 h-5 text-green-500" />,
        'Sentiment Analysis': <Megaphone className="w-5 h-5 text-purple-500" />,
        'Competitor Analysis': <Users className="w-5 h-5 text-red-500" />,
        'Brand Safety Scan': <ShieldCheck className="w-5 h-5 text-teal-500" />,
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return 'some time ago';
        const diff = new Date() - timestamp.toDate();
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return 'just now';
    };

    return (
        <Card className="h-full">
            <h3 className="mb-4 text-base font-semibold">Recent Activity</h3>
            {loading ? (
                <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
            ) : history.length === 0 ? (
                <div className="text-center py-10">
                    <p className="text-sm text-slate-500">No recent activity.</p>
                    <p className="text-sm text-slate-500">Try generating some content!</p>
                </div>
            ) : (
                <ul className="space-y-4">
                    {history.map(item => (
                        <li key={item.id} onClick={() => setSelectedItem(item)} className="flex items-center gap-4 p-2 -mx-2 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full">{ICONS[item.type]}</div>
                            <div className="flex-1">
                                <p className="font-semibold text-sm">{item.type}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                    {item.topic || item.handle || item.titles?.[0] || item.scriptSnippet || 'Analysis'} • {formatTime(item.createdAt)}
                                </p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
            {selectedItem && <HistoryDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />}
        </Card>
    );
}

function HistoryDetailModal({ item, onClose }) {
    const renderContent = () => {
        switch (item.type) {
            case 'Keywords': return <KeywordHistoryDetail item={item} />;
            case 'Script': return <ScriptHistoryDetail item={item} />;
            case 'Title Test': return <TitleTestHistoryDetail item={item} />;
            case 'Sentiment Analysis': return <SentimentHistoryDetail item={item} />;
            case 'Competitor Analysis': return <CompetitorHistoryDetail item={item} />;
            case 'Brand Safety Scan': return <BrandSafetyHistoryDetail item={item} />;
            default: return <p>No details to show.</p>;
        }
    };
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl max-w-2xl w-full h-[80vh] flex flex-col">
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center shrink-0">
                    <h2 className="text-xl font-bold">{item.type} Details</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><XCircle className="w-6 h-6" /></button>
                </div>
                <div className="p-6 overflow-y-auto">{renderContent()}</div>
            </div>
        </div>
    );
}

const KeywordHistoryDetail = ({ item }) => (
    <div>
        <h3 className="font-bold text-lg mb-4">Keywords for: <span className="text-indigo-500">{item.topic}</span></h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div><h4 className="font-semibold mb-2">YouTube</h4><div className="flex flex-wrap gap-2">{item.keywords.youtube.map(k => <span key={k} className="px-2 py-1 text-sm bg-gray-100 dark:bg-gray-800 rounded">{k}</span>)}</div></div>
            <div><h4 className="font-semibold mb-2">TikTok</h4><div className="flex flex-wrap gap-2">{item.keywords.tiktok.map(k => <span key={k} className="px-2 py-1 text-sm bg-gray-100 dark:bg-gray-800 rounded">{k}</span>)}</div></div>
            <div><h4 className="font-semibold mb-2">Instagram</h4><div className="flex flex-wrap gap-2">{item.keywords.instagram.map(k => <span key={k} className="px-2 py-1 text-sm bg-gray-100 dark:bg-gray-800 rounded">{k}</span>)}</div></div>
        </div>
    </div>
);
const ScriptHistoryDetail = ({ item }) => (
    <div>
        <h3 className="font-bold text-lg mb-4">Script for: <span className="text-indigo-500">{item.topic}</span></h3>
        <p className="text-sm text-gray-500 mb-2">Length: {item.scriptLength} | Style: {item.scriptStyle}</p>
        <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: item.script.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>') }}></pre>
        </div>
    </div>
);
const TitleTestHistoryDetail = ({ item }) => (
    <Card>
        <h3 className="font-bold text-lg mb-2">Title Test for: <span className="text-indigo-500">{item.topic}</span></h3>
        <h4 className="text-xl font-bold text-center mb-4">Winner: <span className="text-green-500">{item.result.winner === 'Title A' ? `"${item.titles[0]}"` : `"${item.titles[1]}"`}</span></h4>
        <div className="grid grid-cols-2 gap-4 text-center">
            <div><p className="text-sm font-medium">{item.titles[0]}</p><p className="text-3xl font-bold">{item.result.title_A_score}%</p><p className="text-xs text-gray-500">Predicted CTR</p></div>
            <div><p className="text-sm font-medium">{item.titles[1]}</p><p className="text-3xl font-bold">{item.result.title_B_score}%</p><p className="text-xs text-gray-500">Predicted CTR</p></div>
        </div>
        <div className="mt-4 pt-4 border-t dark:border-gray-700"><h4 className="font-semibold">Justification:</h4><p className="text-sm mt-1">{item.result.justification}</p></div>
    </Card>
);
const SentimentHistoryDetail = ({ item }) => {
    const sentimentData = [{ name: 'Positive', value: item.result.sentiment.positive }, { name: 'Neutral', value: item.result.sentiment.neutral }, { name: 'Negative', value: item.result.sentiment.negative }];
    const COLORS = ['#10B981', '#6B7280', '#EF4444'];
    return (
        <Card>
            <h3 className="font-bold text-lg mb-4">Sentiment for: <span className="text-indigo-500">{item.topic}</span></h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div><h4 className="text-xl font-semibold mb-4 text-center">Predicted Sentiment</h4><ResponsiveContainer width="100%" height={250}><PieChart><Pie data={sentimentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>{sentimentData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
                <div className="space-y-4">
                    <div><h4 className="font-semibold flex items-center gap-2 text-green-500"><ThumbsUp /> Positive Drivers</h4><ul className="list-disc list-inside text-sm mt-1">{item.result.positiveDrivers.map(d => <li key={d}>{d}</li>)}</ul></div>
                    <div><h4 className="font-semibold flex items-center gap-2 text-red-500"><ThumbsDown /> Negative Risks</h4><ul className="list-disc list-inside text-sm mt-1">{item.result.negativeRisks.map(r => <li key={r}>{r}</li>)}</ul></div>
                    <div><h4 className="font-semibold flex items-center gap-2 text-blue-500"><Lightbulb /> AI Suggestion</h4><p className="text-sm mt-1">{item.result.suggestion}</p></div>
                </div>
            </div>
        </Card>
    );
};
const CompetitorHistoryDetail = ({ item }) => (
    <div className="space-y-6">
        <h3 className="font-bold text-lg">Analysis for: <span className="text-indigo-500">{item.handle}</span></h3>
        <Card><h2 className="text-xl font-bold mb-4">SWOT Analysis</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="p-4 bg-green-50 dark:bg-green-900/50 rounded-lg"><h3 className="font-semibold text-green-700 dark:text-green-300">Strengths</h3><ul className="list-disc list-inside mt-2 text-sm space-y-1">{item.result.swot.strengths.map((i, idx) => <li key={idx}>{i}</li>)}</ul></div><div className="p-4 bg-red-50 dark:bg-red-900/50 rounded-lg"><h3 className="font-semibold text-red-700 dark:text-red-300">Weaknesses</h3><ul className="list-disc list-inside mt-2 text-sm space-y-1">{item.result.swot.weaknesses.map((i, idx) => <li key={idx}>{i}</li>)}</ul></div><div className="p-4 bg-blue-50 dark:bg-blue-900/50 rounded-lg"><h3 className="font-semibold text-blue-700 dark:text-blue-300">Opportunities</h3><ul className="list-disc list-inside mt-2 text-sm space-y-1">{item.result.swot.opportunities.map((i, idx) => <li key={idx}>{i}</li>)}</ul></div><div className="p-4 bg-yellow-50 dark:bg-yellow-900/50 rounded-lg"><h3 className="font-semibold text-yellow-700 dark:text-yellow-300">Threats</h3><ul className="list-disc list-inside mt-2 text-sm space-y-1">{item.result.swot.threats.map((i, idx) => <li key={idx}>{i}</li>)}</ul></div></div></Card>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><Card className="lg:col-span-1"><h3 className="font-semibold text-lg mb-3">Top Themes</h3><ul className="list-disc list-inside space-y-2">{item.result.top_themes.map((i, idx) => <li key={idx}>{i}</li>)}</ul></Card><Card className="lg:col-span-2"><h3 className="font-semibold text-lg mb-3">Actionable Insights</h3><div className="space-y-4"><div><h4 className="font-medium text-indigo-600 dark:text-indigo-400">Content Gaps to Exploit</h4><ul className="list-disc list-inside text-sm mt-1 space-y-1">{item.result.content_gaps.map((i, idx) => <li key={idx}>{i}</li>)}</ul></div><div><h4 className="font-medium text-green-600 dark:text-green-400">Strategic Suggestions</h4><ul className="list-disc list-inside text-sm mt-1 space-y-1">{item.result.suggestions.map((i, idx) => <li key={idx}>{i}</li>)}</ul></div></div></Card></div>
    </div>
);
const BrandSafetyHistoryDetail = ({ item }) => (
    <Card>
        <h3 className="font-bold text-lg mb-4">Brand Safety for: <span className="text-indigo-500 truncate">{item.scriptSnippet}...</span></h3>
        <div className="text-center">
            <h3 className="font-semibold">Brand Safety Score</h3>
            <p className={`text-6xl font-bold ${item.result.score > 80 ? 'text-green-500' : item.result.score > 50 ? 'text-yellow-500' : 'text-red-500'}`}>{item.result.score}</p>
            <p className={`mt-2 font-bold text-xl ${item.result.verdict.includes('Safe') ? 'text-green-500' : item.result.verdict.includes('caution') ? 'text-yellow-500' : 'text-red-500'}`}>{item.result.verdict}</p>
        </div>
        {item.result.sensitive_topics.length > 0 && <div className="mt-4 pt-4 border-t dark:border-gray-700"><h4 className="font-semibold">Potentially Sensitive Topics:</h4><div className="flex flex-wrap gap-2 mt-2">{(item.result.sensitive_topics ?? []).map(t => <span key={t} className="px-2 py-1 text-sm bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 rounded">{t}</span>)}</div></div>}
    </Card>
);