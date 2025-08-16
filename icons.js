import React from 'react';

// It's often better to use a library like lucide-react, but if you have custom SVGs,
// you can define them here as components.

export const TikTokIcon = ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 16 16">
        <path d="M9 0h1.98c.144.715.54 1.617 1.235 2.512C12.895 3.389 13.797 4 15 4v2.19c-1.7-.045-3.248-.96-4.122-2.438C10.07 2.71 9.5 1.67 9 0zm7 4h-2v12H9V9.157c.522-1.265 1.671-3.197 4.05-4.577C14.707 3.51 16 2.51 16 0h-2c-.16 1.033-.66 2.11-1.336 2.961C12.014 3.85 11.08 4 10 4v5.157c0 1.988 1.59 3.596 3.596 3.596H16V4z" />
    </svg>
);

// Add other custom icons here...
