/* global __initial_auth_token */
import { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, Timestamp, increment } from 'firebase/firestore';
import { auth, db } from './firebase';

// --- Gemini API Helper (with better error handling) ---
export const callGeminiAPI = async (prompt, jsonSchema = null) => {
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001/api/gemini';
    try {
        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, jsonSchema })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Backend API Error:", errorData);
            throw new Error(errorData.error || `Request failed with status ${response.status}`);
        }

        const result = await response.json();
        if (!result.candidates || !result.candidates.length) {
            throw new Error("Invalid response structure from Gemini API");
        }
        const text = result.candidates[0].content.parts[0].text;
        return jsonSchema ? JSON.parse(text) : text;

    } catch (error) {
        console.error('Error calling backend API:', error);
        throw error;
    }
};


// --- Firestore Helpers ---
export const updateUserStats = async (userId, stat, value = 1) => {
    if (!userId) return;
    const userDocRef = doc(db, 'users', userId);
    try {
        await setDoc(userDocRef, { stats: { [stat]: increment(value) } }, { merge: true });
    }
    catch (error) {
        console.error(`Error updating stat '${stat}':`, error);
    }
};

// --- Authentication Context & Provider ---
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState(null);

    useEffect(() => {
        let unsubDoc = () => { };

        const unsubscribeAuth = onAuthStateChanged(auth, async (authUser) => {
            unsubDoc();

            if (authUser) {
                setUser(authUser);
                const userDocRef = doc(db, 'users', authUser.uid);

                try {
                    const docSnap = await getDoc(userDocRef);
                    if (!docSnap.exists()) {
                        const emailName = authUser.email ? authUser.email.split('@')[0] : `User-${authUser.uid.substring(0, 5)}`;
                        const newUserProfile = {
                            email: authUser.email,
                            displayName: authUser.displayName || emailName,
                            photoURL: authUser.photoURL,
                            niche: "General",
                            createdAt: Timestamp.now(),
                            subscription: "Basic",
                            // FIX: Changed default credits to 20
                            videoCredits: 20, 
                            stats: { scriptsGenerated: 0, keywordsGenerated: 0, trendsAnalyzed: 0, competitorsAnalyzed: 0, sentimentAnalyzed: 0, titlesTested: 0, brandSafetyScans: 0 },
                            legal: { termsAccepted: false, privacyAccepted: false }
                        };
                        await setDoc(userDocRef, newUserProfile);
                    }
                } catch (error) {
                    console.error("Error during user document check/creation:", error);
                }

                unsubDoc = onSnapshot(userDocRef, (doc) => {
                    if (doc.exists()) {
                        setUserData(doc.data());
                    } else {
                        setUserData(null);
                    }
                    setLoading(false);
                }, (error) => {
                    console.error("Firestore onSnapshot error:", error);
                    setLoading(false);
                });

            } else {
                setUser(null);
                setUserData(null);
                setLoading(false);
            }
        });

        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token && !auth.currentUser) {
            signInWithCustomToken(auth, __initial_auth_token).catch(error => {
                console.error("Custom token sign-in failed:", error);
                setLoading(false);
            });
        } else if (!auth.currentUser) {
            setLoading(false);
        }

        return () => {
            unsubscribeAuth();
            unsubDoc();
        };
    }, []);

    const value = { user, loading, userData };
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
