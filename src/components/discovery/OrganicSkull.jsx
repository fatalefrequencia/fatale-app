import React from 'react';

const OrganicSkull = ({ size = 24, color = 'currentColor', ...props }) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 100 100" 
        fill="none" 
        stroke={color} 
        strokeWidth="4" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        {...props}
    >
        {/* Main Skull Outline - Anatomically inspired broad cranium */}
        <path d="M50,12 C25,12 12,32 12,58 C12,70 16,82 22,90 L20,98 L28,102 L32,112 H68 L72,102 L80,98 L78,90 C84,82 88,70 88,58 C88,32 75,12 50,12 Z" />
        
        {/* Re-scaled for 100x100 coord system update */}
        <path d="M50,8 C28,8 10,25 10,50 C10,65 18,78 28,86 L25,93 L32,96 L35,103 H65 L68,96 L75,93 L72,86 C82,78 90,65 90,50 C90,25 72,8 50,8 Z" />

        {/* EYE SOCKETS - Bean/D-Shaped as per reference */}
        <path d="M38,45 C28,45 22,55 22,65 C22,75 32,78 40,70 C42,68 45,60 45,55 C45,48 42,45 38,45 Z" fill={color} fillOpacity="0.15" strokeWidth="2.5" />
        <path d="M62,45 C72,45 78,55 78,65 C78,75 68,78 60,70 C58,68 55,60 55,55 C55,48 58,45 62,45 Z" fill={color} fillOpacity="0.15" strokeWidth="2.5" />
        
        {/* NASAL CAVITY - More organic tri-lobe/triangle */}
        <path d="M50,72 L44,82 L50,86 L56,82 Z" fill={color} />
        
        {/* JAW/TEETH - Scalloped bottom edge */}
        <path d="M38,95 C38,98 42,101 45,98 C48,101 52,101 55,98 C58,101 62,98 62,95" strokeWidth="3" opacity="0.7" />
    </svg>
);

export default OrganicSkull;
