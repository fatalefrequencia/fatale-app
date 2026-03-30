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
        {/* Main Skull Outline - Rescaled to fit [10, 95] without clipping */}
        <path d="M50,10 C30,10 15,25 15,48 C15,62 22,75 30,82 L28,88 L34,90 L36,96 H64 L66,90 L72,88 L70,82 C78,75 85,62 85,48 C85,25 70,10 50,10 Z" />

        {/* EYE SOCKETS - Bean/D-Shaped as per reference */}
        <path d="M40,40 C30,40 25,50 25,58 C25,66 33,69 40,62 C42,60 45,54 45,50 C45,44 43,40 40,40 Z" fill={color} fillOpacity="0.15" strokeWidth="2" />
        <path d="M60,40 C70,40 75,50 75,58 C75,66 67,69 60,62 C58,60 55,54 55,50 C55,44 57,40 60,40 Z" fill={color} fillOpacity="0.15" strokeWidth="2" />
        
        {/* NASAL CAVITY */}
        <path d="M50,65 L46,73 L50,76 L54,73 Z" fill={color} />
        
        {/* JAW/TEETH - Scalloped bottom edge */}
        <path d="M40,88 C40,91 43,93 46,91 C49,93 52,93 54,91 C57,93 60,91 60,88" strokeWidth="2.5" opacity="0.7" />
    </svg>
);

export default OrganicSkull;
