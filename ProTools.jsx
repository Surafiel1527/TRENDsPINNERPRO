import React, { useState, useEffect, useMemo } from 'react';
import { useAuth, callGeminiAPI, updateUserStats } from '../services';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, setDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Loader2, Lock, Calendar, ChevronLeft, ChevronRight, Trash2, Users, Megaphone, ThumbsUp, ThumbsDown, Lightbulb, Target, ShieldCheck, AlertTriangle } from 'lucide-react';

// --- Generic UI Components (Used in Pro Tools) ---
const Card = ({ children, className = '' }) => (<div className={`p-6 bg-white rounded-xl border border-slate-200 dark:bg-slate-900 dark:border-slate-700 ${className}`}>{children}</div>);
const LoadingIndicator = ({ title, subtitle }) => (<div className="flex flex-col items-center justify-center p-8 text-center"><Loader2 className="w-12 h-12 animate-spin text-indigo-500" /><h2 className="mt-6 text-2xl font-bold">{title}</h2><p className="max-w-md mt-2 text-slate-600 dark:text-slate-400">{subtitle}</p></div>);
const ErrorAlert = ({ message }) => (<div className="mt-4 p-3 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-900/50 dark:text-red-300 flex items-center gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /><span>{message}</span></div>);


// --- Locked Feature Component ---
export function LockedFeature({ title, message, onUpgrade }) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-white dark:bg-slate-900 rounded-lg shadow-lg">
            <div className="p-4 bg-amber-100 rounded-full dark:bg-amber-900/50"><Lock className="w-10 h-10 text-amber-500 dark:text-amber-400" /></div>
            <h2 className="mt-6 text-2xl font-bold">{title}</h2>
            <p className="max-w-md mt-2 text-slate-600 dark:text-slate-400">{message}</p>
            <button onClick={onUpgrade} className="mt-6 px-8 py-3 font-semibold text-white bg-indigo-600 rounded-lg shadow-md hover:bg-indigo-700 transition-colors">Upgrade Plan</button>
        </div>
    );
}

// --- Content Calendar Page (Pro) ---
export function ContentCalendarPage() {
    const { user } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        // FIX: Simplified database path
        const eventsColRef = collection(db, 'users', user.uid, 'calendarEvents');
        const unsubscribe = onSnapshot(eventsColRef, (snapshot) => {
            setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), date: doc.data().date.toDate() })));
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    const handleDateClick = (date) => {
        setSelectedDate(date);
        setSelectedEvent(null);
        setIsModalOpen(true);
    };
    const handleEventClick = (event) => {
        setSelectedEvent(event);
        setSelectedDate(event.date);
        setIsModalOpen(true);
    };
    const handleSaveEvent = async (eventData) => {
        if (!user || !selectedDate) return;
        const dataToSave = { ...eventData, date: Timestamp.fromDate(selectedDate) };
        if (selectedEvent) {
            // FIX: Simplified database path
            await setDoc(doc(db, 'users', user.uid, 'calendarEvents', selectedEvent.id), dataToSave, { merge: true });
        } else {
            // FIX: Simplified database path
            await addDoc(collection(db, 'users', user.uid, 'calendarEvents'), dataToSave);
        }
        setIsModalOpen(false);
    };
    const handleDeleteEvent = async () => {
        if (!user || !selectedEvent) return;
        // FIX: Simplified database path
        await deleteDoc(doc(db, 'users', user.uid, 'calendarEvents', selectedEvent.id));
        setIsModalOpen(false);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold flex items-center gap-2"><Calendar /> Content Calendar</h1>
            <Card>
                {loading ? <LoadingIndicator title="Loading Your Calendar..." subtitle="Organizing your content schedule." /> :
                    <>
                        <CalendarHeader currentDate={currentDate} setCurrentDate={setCurrentDate} />
                        <CalendarGrid currentDate={currentDate} events={events} onDateClick={handleDateClick} onEventClick={handleEventClick} />
                    </>
                }
            </Card>
            {isModalOpen && <EventModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} date={selectedDate} event={selectedEvent} onSave={handleSaveEvent} onDelete={handleDeleteEvent} />}
        </div>
    );
}

// Calendar Sub-components
const isSameDay = (d1, d2) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
const CalendarHeader = ({ currentDate, setCurrentDate }) => {
    const changeMonth = (offset) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setCurrentDate(newDate);
    };
    return (
        <div className="flex items-center justify-between mb-4">
            <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"><ChevronLeft /></button>
            <h2 className="text-xl font-bold">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
            <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"><ChevronRight /></button>
        </div>
    );
};
const CalendarGrid = ({ currentDate, events, onDateClick, onEventClick }) => {
    const days = useMemo(() => {
        const daysInMonth = [];
        const year = currentDate.getFullYear(); const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1); const lastDayOfMonth = new Date(year, month + 1, 0);
        const startDayOfWeek = firstDayOfMonth.getDay();
        for (let i = 0; i < startDayOfWeek; i++) { daysInMonth.push({ key: `blank-${i}`, isBlank: true }); }
        for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
            const date = new Date(year, month, day); daysInMonth.push({ key: date.toISOString(), date, isToday: isSameDay(date, new Date()) });
        }
        return daysInMonth;
    }, [currentDate]);
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const getStatusColor = (status) => ({ Idea: 'bg-blue-500', Scripting: 'bg-yellow-500', Filming: 'bg-purple-500', Editing: 'bg-orange-500', Published: 'bg-green-500' }[status] || 'bg-gray-500');

    return (
        <div>
            <div className="grid grid-cols-7 text-center font-semibold text-sm">{weekdays.map(day => <div key={day} className="py-2">{day}</div>)}</div>
            <div className="grid grid-cols-7 border-t border-l dark:border-slate-700">{days.map(day => (day.isBlank ? (<div key={day.key} className="h-32 border-r border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"></div>) : (<div key={day.key} className="h-32 border-r border-b dark:border-slate-700 p-1 relative flex flex-col cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => onDateClick(day.date)}><span className={`font-semibold ${day.isToday ? 'bg-indigo-500 text-white rounded-full w-6 h-6 flex items-center justify-center' : ''}`}>{day.date.getDate()}</span><div className="flex-grow overflow-y-auto mt-1 space-y-1">{events.filter(e => isSameDay(e.date, day.date)).map(event => (<div key={event.id} onClick={(e) => { e.stopPropagation(); onEventClick(event); }} className={`p-1 rounded text-white text-xs flex items-center ${getStatusColor(event.status)}`}><div className={`w-2 h-2 rounded-full mr-1.5 ${getStatusColor(event.status)} shrink-0`}></div><p className="truncate">{event.title}</p></div>))}</div></div>)))}</div>
        </div>
    );
};
const EventModal = ({ isOpen, onClose, date, event, onSave, onDelete }) => {
    const [title, setTitle] = useState(''); const [notes, setNotes] = useState(''); const [status, setStatus] = useState('Idea');
    useEffect(() => { if (event) { setTitle(event.title || ''); setNotes(event.notes || ''); setStatus(event.status || 'Idea'); } else { setTitle(''); setNotes(''); setStatus('Idea'); } }, [event]);
    if (!isOpen) return null;
    const handleSave = (e) => { e.preventDefault(); onSave({ title, notes, status }); };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"><div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-2xl max-w-md w-full"><h2 className="text-xl font-bold mb-4">{event ? 'Edit' : 'Add'} Idea for {date.toLocaleDateString()}</h2><form onSubmit={handleSave} className="space-y-4"><div><label className="block text-sm font-medium mb-1">Title</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Your video title idea" className="w-full px-4 py-2 bg-slate-100 rounded-lg dark:bg-slate-800" required /></div><div><label className="block text-sm font-medium mb-1">Status</label><select value={status} onChange={e => setStatus(e.target.value)} className="w-full px-4 py-2 bg-slate-100 rounded-lg dark:bg-slate-800"><option>Idea</option><option>Scripting</option><option>Filming</option><option>Editing</option><option>Published</option></select></div><div><label className="block text-sm font-medium mb-1">Notes</label><textarea value={notes} onChange={e => setNotes(e.target.value)} rows="4" placeholder="Add some notes, links, or script snippets..." className="w-full px-4 py-2 bg-slate-100 rounded-lg dark:bg-slate-800"></textarea></div><div className="flex justify-between items-center pt-2"><div>{event && <button type="button" onClick={onDelete} className="px-4 py-2 font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700"><Trash2 className="w-4 h-4" /></button>}</div><div className="flex gap-2"><button type="button" onClick={onClose} className="px-6 py-2 font-semibold bg-slate-200 rounded-lg dark:bg-slate-700">Cancel</button><button type="submit" className="px-6 py-2 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">Save</button></div></div></form></div></div>
    );
};

// --- Competitor Analysis Page (Pro) ---
export function CompetitorAnalysisPage() {
    const [handle, setHandle] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { user } = useAuth();

    const analyzeCompetitor = async (e) => {
        e.preventDefault();
        if (!handle || !user) return;
        setLoading(true);
        setResult(null);
        setError('');
        try {
            const prompt = `Perform a detailed content analysis for a competitor with the social media handle/channel name "${handle}". Provide: 1. SWOT Analysis (Strengths, Weaknesses, Opportunities, Threats). 2. Top Performing Content Themes (3-5 key themes). 3. Content Gaps (what are they NOT covering). 4. Actionable Suggestions (3 concrete suggestions for me to compete).`;
            const schema = { type: "OBJECT", properties: { swot: { type: "OBJECT", properties: { strengths: { type: "ARRAY", items: { type: "STRING" } }, weaknesses: { type: "ARRAY", items: { type: "STRING" } }, opportunities: { type: "ARRAY", items: { type: "STRING" } }, threats: { type: "ARRAY", items: { type: "STRING" } }, } }, top_themes: { type: "ARRAY", items: { type: "STRING" } }, content_gaps: { type: "ARRAY", items: { type: "STRING" } }, suggestions: { type: "ARRAY", items: { type: "STRING" } }, } };
            const apiResult = await callGeminiAPI(prompt, schema);
            setResult(apiResult);
            await updateUserStats(user.uid, 'competitorsAnalyzed');
            // FIX: Simplified database path
            await addDoc(collection(db, 'users', user.uid, 'competitorHistory'), { handle, result: apiResult, createdAt: Timestamp.now() });
        } catch (err) {
            console.error('Failed to analyze competitor:', err);
            setError(err.message || 'Failed to get analysis. The AI may be busy or an error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (<div className="space-y-6"><h1 className="text-3xl font-bold flex items-center gap-2"><Users />Competitor Analysis</h1><Card><p className="text-slate-600 dark:text-slate-400 mb-4">Enter a competitor's handle for an AI-powered strategic analysis.</p><form onSubmit={analyzeCompetitor} className="flex flex-col sm:flex-row gap-4"><input type="text" value={handle} onChange={e => setHandle(e.target.value)} placeholder="e.g., 'Marques Brownlee' or '@mkbhd'" className="flex-grow px-4 py-2 bg-slate-100 rounded-lg dark:bg-slate-800" /><button type="submit" disabled={loading || !handle} className="px-6 py-2 flex items-center justify-center font-semibold text-white bg-indigo-600 rounded-lg disabled:bg-indigo-400">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Analyze"}</button></form>{error && <ErrorAlert message={error} />}</Card>{loading && <LoadingIndicator title="Spying on the Competition..." subtitle="Our AI is gathering intel on your rival's strategy." />}{result && (<div className="space-y-6"><Card><h2 className="text-xl font-bold mb-4">SWOT Analysis for {handle}</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="p-4 bg-green-50 dark:bg-green-900/50 rounded-lg"><h3 className="font-semibold text-green-700 dark:text-green-300">Strengths</h3><ul className="list-disc list-inside mt-2 text-sm space-y-1">{(result.swot?.strengths ?? []).map((item, i) => <li key={i}>{item}</li>)}</ul></div><div className="p-4 bg-red-50 dark:bg-red-900/50 rounded-lg"><h3 className="font-semibold text-red-700 dark:text-red-300">Weaknesses</h3><ul className="list-disc list-inside mt-2 text-sm space-y-1">{(result.swot?.weaknesses ?? []).map((item, i) => <li key={i}>{item}</li>)}</ul></div><div className="p-4 bg-blue-50 dark:bg-blue-900/50 rounded-lg"><h3 className="font-semibold text-blue-700 dark:text-blue-300">Opportunities</h3><ul className="list-disc list-inside mt-2 text-sm space-y-1">{(result.swot?.opportunities ?? []).map((item, i) => <li key={i}>{item}</li>)}</ul></div><div className="p-4 bg-amber-50 dark:bg-amber-900/50 rounded-lg"><h3 className="font-semibold text-amber-700 dark:text-amber-300">Threats</h3><ul className="list-disc list-inside mt-2 text-sm space-y-1">{(result.swot?.threats ?? []).map((item, i) => <li key={i}>{item}</li>)}</ul></div></div></Card><div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><Card className="lg:col-span-1"><h3 className="font-semibold text-lg mb-3">Top Themes</h3><ul className="list-disc list-inside space-y-2">{(result.top_themes ?? []).map((item, i) => <li key={i}>{item}</li>)}</ul></Card><Card className="lg:col-span-2"><h3 className="font-semibold text-lg mb-3">Actionable Insights</h3><div className="space-y-4"><div><h4 className="font-medium text-indigo-600 dark:text-indigo-400">Content Gaps to Exploit</h4><ul className="list-disc list-inside text-sm mt-1 space-y-1">{(result.content_gaps ?? []).map((item, i) => <li key={i}>{item}</li>)}</ul></div><div><h4 className="font-medium text-green-600 dark:text-green-400">Strategic Suggestions</h4><ul className="list-disc list-inside text-sm mt-1 space-y-1">{(result.suggestions ?? []).map((item, i) => <li key={i}>{item}</li>)}</ul></div></div></Card></div></div>)}</div>);
}

// --- Audience Sentiment Page (Elite) ---
export function AudienceSentimentPage() {
    const [topic, setTopic] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { user } = useAuth();

    const analyzeSentiment = async (e) => {
        e.preventDefault();
        if (!topic || !user) return;
        setLoading(true); setResult(null); setError('');
        try {
            const prompt = `Analyze the likely audience sentiment for a social media video about "${topic}". Predict the percentage of positive, neutral, and negative reactions. Identify key drivers for positive sentiment and main risks for negative sentiment. Provide one clear suggestion to improve the positive reaction.`;
            const schema = { type: "OBJECT", properties: { sentiment: { type: "OBJECT", properties: { positive: { type: "NUMBER" }, neutral: { type: "NUMBER" }, negative: { type: "NUMBER" } } }, positiveDrivers: { type: "ARRAY", items: { type: "STRING" } }, negativeRisks: { type: "ARRAY", items: { type: "STRING" } }, suggestion: { type: "STRING" } } };
            const apiResult = await callGeminiAPI(prompt, schema);
            setResult(apiResult);
            await updateUserStats(user.uid, 'sentimentAnalyzed');
            // FIX: Simplified database path
            await addDoc(collection(db, 'users', user.uid, 'sentimentHistory'), { topic, result: apiResult, createdAt: Timestamp.now() });
        } catch (err) {
            console.error('Failed to analyze sentiment:', err);
            setError(err.message || 'Failed to get sentiment analysis. Please try again.');
        } finally { setLoading(false); }
    };

    const sentimentData = result ? [{ name: 'Positive', value: result.sentiment.positive }, { name: 'Neutral', value: result.sentiment.neutral }, { name: 'Negative', value: result.sentiment.negative }] : []; const COLORS = ['#10B981', '#6B7280', '#EF4444'];
    return (<div className="space-y-6"><h1 className="text-3xl font-bold flex items-center gap-2"><Megaphone /> Audience Sentiment Analysis</h1><Card><form onSubmit={analyzeSentiment} className="flex gap-4"><input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="Enter video topic or idea" className="flex-grow px-4 py-2 bg-slate-100 rounded-lg dark:bg-slate-800" /><button type="submit" disabled={loading || !topic} className="px-6 py-2 flex items-center justify-center font-semibold text-white bg-indigo-600 rounded-lg disabled:bg-indigo-400">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Analyze"}</button></form>{error && <ErrorAlert message={error} />}</Card>{loading && <LoadingIndicator title="Gauging the Vibe..." subtitle="Predicting how your audience will react to the content." />}{result && <Card className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center"><div><h3 className="text-xl font-semibold mb-4 text-center">Predicted Sentiment</h3><ResponsiveContainer width="100%" height={250}><PieChart><Pie data={sentimentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>{sentimentData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div><div className="space-y-4"><div><h4 className="font-semibold flex items-center gap-2 text-green-500"><ThumbsUp /> Positive Drivers</h4><ul className="list-disc list-inside text-sm mt-1">{(result.positiveDrivers ?? []).map(d => <li key={d}>{d}</li>)}</ul></div><div><h4 className="font-semibold flex items-center gap-2 text-red-500"><ThumbsDown /> Negative Risks</h4><ul className="list-disc list-inside text-sm mt-1">{(result.negativeRisks ?? []).map(r => <li key={r}>{r}</li>)}</ul></div><div><h4 className="font-semibold flex items-center gap-2 text-blue-500"><Lightbulb /> AI Suggestion</h4><p className="text-sm mt-1">{result.suggestion}</p></div></div></Card>}</div>);
}

// --- A/B Title Tester Page (Elite) ---
export function TitleTesterPage() {
    const [titles, setTitles] = useState(['', '']);
    const [topic, setTopic] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { user } = useAuth();

    const handleTitleChange = (index, value) => { const newTitles = [...titles]; newTitles[index] = value; setTitles(newTitles); };
    const testTitles = async (e) => {
        e.preventDefault();
        if (titles.some(t => !t) || !topic || !user) return;
        setLoading(true); setResult(null); setError('');
        try {
            const prompt = `For a video about "${topic}", analyze these two potential titles: "Title A: ${titles[0]}" and "Title B: ${titles[1]}". Predict which title will have a higher Click-Through Rate (CTR). Provide a percentage score for each title (predicting the CTR) and a brief justification for your choice.`;
            const schema = { type: "OBJECT", properties: { winner: { type: "STRING", enum: ["Title A", "Title B"] }, title_A_score: { type: "NUMBER" }, title_B_score: { type: "NUMBER" }, justification: { type: "STRING" } } };
            const apiResult = await callGeminiAPI(prompt, schema);
            setResult(apiResult);
            await updateUserStats(user.uid, 'titlesTested');
            // FIX: Simplified database path
            await addDoc(collection(db, 'users', user.uid, 'titleHistory'), { topic, titles, result: apiResult, createdAt: Timestamp.now() });
        } catch (err) {
            console.error('Failed to test titles:', err);
            setError(err.message || 'Failed to test titles. Please try again.');
        } finally { setLoading(false); }
    };

    return (<div className="space-y-6"><h1 className="text-3xl font-bold flex items-center gap-2"><Target /> A/B Title Tester</h1><Card><form onSubmit={testTitles} className="space-y-4"><input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="Video Topic (e.g., 'My Morning Routine')" className="w-full px-4 py-2 bg-slate-100 rounded-lg dark:bg-slate-800" required /><input type="text" value={titles[0]} onChange={e => handleTitleChange(0, e.target.value)} placeholder="Title A" className="w-full px-4 py-2 bg-slate-100 rounded-lg dark:bg-slate-800" required /><input type="text" value={titles[1]} onChange={e => handleTitleChange(1, e.target.value)} placeholder="Title B" className="w-full px-4 py-2 bg-slate-100 rounded-lg dark:bg-slate-800" required /><button type="submit" disabled={loading || !topic || titles.some(t => !t)} className="w-full px-6 py-3 flex items-center justify-center font-semibold text-white bg-indigo-600 rounded-lg disabled:bg-indigo-400">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Test Titles"}</button></form>{error && <ErrorAlert message={error} />}</Card>{loading && <LoadingIndicator title="Running the Title Showdown..." subtitle="AI is simulating a click-off to see which title performs best." />}{result && <Card><h3 className="text-xl font-bold text-center mb-4">And the winner is... <span className="text-green-500">{result.winner === 'Title A' ? `"${titles[0]}"` : `"${titles[1]}"`}</span></h3><div className="grid grid-cols-2 gap-4 text-center"><div><h4>Title A Predicted CTR</h4><p className="text-3xl font-bold">{result.title_A_score}%</p></div><div><h4>Title B Predicted CTR</h4><p className="text-3xl font-bold">{result.title_B_score}%</p></div></div><div className="mt-4 pt-4 border-t dark:border-slate-700"><h4 className="font-semibold">Justification:</h4><p className="text-sm mt-1">{result.justification}</p></div></Card>}</div>);
}

// --- Brand Safety Page (Elite) ---
export function BrandSafetyPage() {
    const [script, setScript] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { user } = useAuth();

    const analyzeScript = async (e) => {
        e.preventDefault();
        if (!script || !user) return;
        setLoading(true); setResult(null); setError('');
        try {
            const prompt = `Analyze the following script for brand safety. Score it from 0 (very unsafe) to 100 (very safe). Identify any potentially sensitive topics or words. Conclude with a verdict: "Safe for most brands", "Use with caution", or "High-risk content". Script: "${script}"`;
            const schema = { type: "OBJECT", properties: { score: { type: "NUMBER" }, sensitive_topics: { type: "ARRAY", items: { type: "STRING" } }, verdict: { type: "STRING" } } };
            const apiResult = await callGeminiAPI(prompt, schema);
            setResult(apiResult);
            await updateUserStats(user.uid, 'brandSafetyScans');
            // FIX: Simplified database path
            await addDoc(collection(db, 'users', user.uid, 'brandSafetyHistory'), { scriptSnippet: script.substring(0, 100), result: apiResult, createdAt: Timestamp.now() });
        } catch (err) {
            console.error('Failed to analyze script:', err);
            setError(err.message || 'Failed to analyze the script.');
        } finally { setLoading(false); }
    };

    return (<div className="space-y-6"><h1 className="text-3xl font-bold flex items-center gap-2"><ShieldCheck /> Brand Safety & Tone Analyzer</h1><Card><form onSubmit={analyzeScript} className="flex flex-col gap-4"><textarea value={script} onChange={e => setScript(e.target.value)} placeholder="Paste your script here..." rows="8" className="w-full p-4 bg-slate-100 rounded-lg dark:bg-slate-800" /><button type="submit" disabled={loading || !script} className="px-6 py-3 flex items-center justify-center font-semibold text-white bg-indigo-600 rounded-lg disabled:bg-indigo-400">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Analyze Script"}</button></form>{error && <ErrorAlert message={error} />}</Card>{loading && <LoadingIndicator title="Scanning for Brand Safety..." subtitle="Our AI is reviewing your script for any sensitive content." />}{result && <Card><div className="text-center"><h3 className="font-semibold">Brand Safety Score</h3><p className={`text-6xl font-bold ${result.score > 80 ? 'text-green-500' : result.score > 50 ? 'text-amber-500' : 'text-red-500'}`}>{result.score}</p><p className={`mt-2 font-bold text-xl ${result.verdict.includes('Safe') ? 'text-green-500' : result.verdict.includes('caution') ? 'text-amber-500' : 'text-red-500'}`}>{result.verdict}</p></div>{result.sensitive_topics.length > 0 && <div className="mt-4 pt-4 border-t dark:border-slate-700"><h4 className="font-semibold">Potentially Sensitive Topics:</h4><div className="flex flex-wrap gap-2 mt-2">{(result.sensitive_topics ?? []).map(t => <span key={t} className="px-2 py-1 text-sm bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 rounded">{t}</span>)}</div></div>}</Card>}</div>);
}