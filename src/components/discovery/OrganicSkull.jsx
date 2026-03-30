import React from 'react';

const OrganicSkull = ({ size = 24, color = 'currentColor', ...props }) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 512 512" 
        fill="none" 
        stroke={color} 
        strokeWidth="24" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        {...props}
    >
        {/* Main Skull Outline - Based on provided reference */}
        <path d="M256,48C150.13,48,64,134.13,64,240c0,41.22,12.91,79.37,34.89,110.74L96,384l32,16,16,48h64l16-32h64l16,32h64l16-48,32-16-2.89-33.26C435.09,319.37,448,281.22,448,240,448,134.13,361.87,48,256,48Z" />
        
        {/* Eye Sockets */}
        <path d="M192,224c-26.51,0-48,21.49-48,48s21.49,48,48,48,48-21.49,48-48S218.51,224,192,224Z" fill={color} fillOpacity="0.1" />
        <path d="M320,224c-26.51,0-48,21.49-48,48s21.49,48,48,48,48-21.49,48-48S346.51,224,320,224Z" fill={color} fillOpacity="0.1" />
        
        {/* Nasal Cavity */}
        <path d="M256,336l-16,32h32Z" fill={color} />
        
        {/* Teeth Lines */}
        <path d="M192,416v16M224,416v16M256,416v16M288,416v16M320,416v16" strokeWidth="12" opacity="0.6" />
    </svg>
);

export default OrganicSkull;
