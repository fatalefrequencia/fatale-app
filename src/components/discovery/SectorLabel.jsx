import React from 'react';
import { Handle, Position } from '@xyflow/react';

const SectorLabel = ({ data }) => {
    const { name, color, desc, zoom = 1 } = data;

    // Visible range when zoomed out
    const opacity = zoom < 0.5 ? 1 : zoom < 0.75 ? (0.75 - zoom) / 0.25 : 0;

    return (
        <div
            style={{
                pointerEvents: 'none',
                userSelect: 'none',
                opacity,
                transition: 'opacity 0.3s',
                textAlign: 'center',
                width: 600,
            }}
        >
            <Handle type="target" position={Position.Left} style={{ opacity: 0, pointerEvents: 'none' }} />
            <Handle type="source" position={Position.Right} style={{ opacity: 0, pointerEvents: 'none' }} />

            <div style={{
                fontSize: 72,
                fontWeight: 900,
                fontFamily: 'monospace',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: `${color}18`,
                textShadow: `0 0 80px ${color}40`,
                lineHeight: 1,
                whiteSpace: 'nowrap',
            }}>
                {name}
            </div>
            {desc && (
                <div style={{
                    fontSize: 12,
                    fontFamily: 'monospace',
                    color: `${color}66`,
                    letterSpacing: '0.3em',
                    textTransform: 'uppercase',
                    marginTop: 4,
                }}>
                    {desc}
                </div>
            )}
        </div>
    );
};

export default React.memo(SectorLabel);
