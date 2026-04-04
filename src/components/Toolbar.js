import React from 'react';

const COLORS = [
  '#FFFF00', // yellow
  '#FF6B6B', // red
  '#6BCB77', // green
  '#4D96FF', // blue
  '#FF922B', // orange
  '#CC5DE8', // purple
  '#F06595', // pink
  '#74C0FC', // light blue
];

function Toolbar({ activeTool, setActiveTool, activeColor, setActiveColor, opacity, setOpacity }) {
  return (
    <div className="toolbar">
      <div className="tool-group">
        <button
          className={activeTool === 'highlight' ? 'tool-btn active' : 'tool-btn'}
          onClick={() => setActiveTool('highlight')}
          title="Highlight"
        >
          🖊 Highlight
        </button>
        <button
          className={activeTool === 'underline' ? 'tool-btn active' : 'tool-btn'}
          onClick={() => setActiveTool('underline')}
          title="Underline"
        >
          U̲ Underline
        </button>
        <button
          className={activeTool === 'draw' ? 'tool-btn active' : 'tool-btn'}
          onClick={() => setActiveTool('draw')}
          title="Draw"
        >
          ✏️ Draw
        </button>
        <button
          className={activeTool === 'text' ? 'tool-btn active' : 'tool-btn'}
          onClick={() => setActiveTool('text')}
          title="Text Note"
        >
          T Text
        </button>
      </div>

      <div className="color-group">
        {COLORS.map(color => (
          <button
            key={color}
            className={activeColor === color ? 'color-btn active' : 'color-btn'}
            style={{ backgroundColor: color }}
            onClick={() => setActiveColor(color)}
          />
        ))}
      </div>

      <div className="opacity-group">
        <label>Opacity</label>
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.1"
          value={opacity}
          onChange={e => setOpacity(parseFloat(e.target.value))}
        />
        <span>{Math.round(opacity * 100)}%</span>
      </div>
    </div>
  );
}

export default Toolbar;