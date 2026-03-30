import React from 'react';

const OrganicSkull = ({ size = 24, color = 'currentColor', ...props }) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke={color} 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        style={{ filter: `drop-shadow(0 0 2px ${color}66)` }}
        {...props}
    >
        {/* Skull Main Form */}
        <path d="M12 3c-4.5 0-8 3.5-8 8 0 3 1.5 5 2.5 7.5.5 1 0 2.5 0 3.5h11c0-1-.5-2.5 0-3.5 1-2.5 2.5-4.5 2.5-7.5 0-4.5-3.5-8-8-8z" />
        
        {/* Eyes - More organic socket shapes */}
        <path d="M9 11.5c.5-1 2-1 2.5 0 .2.5 0 1.5-.5 2-1 1-2.5 0-2-2z" fill={color} fillOpacity="0.2" />
        <path d="M15 11.5c-.5-1-2-1-2.5 0-.2.5 0 1.5.5 2 1 1 2.5 0 2-2z" fill={color} fillOpacity="0.2" />
        
        {/* Nose - Triangular void */}
        <path d="M11.5 15.5l.5-1 .5 1h-1z" fill={color} />
        
        {/* Teeth/Jaw detail */}
        <path d="M10 20v2M12 20v2M14 20v2" opacity="0.5" />

        {/* Crossbones - Atmospheric/Subtle */}
        <path d="M3 21l3-3M21 21l-3-3M3 3l3 3M21 3l-3 3" opacity="0.4" />
    </svg>
);

export default OrganicSkull;
