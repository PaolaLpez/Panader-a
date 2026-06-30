import React from 'react';

/**
 * Reusable SVG chart component.
 * Supports: 'bar' (bar chart) and 'line' (line chart).
 */
export const SVGChart = ({ type = 'bar', data = [], xKey = '', yKey = '', height = 200 }) => {
  if (!data || data.length === 0) {
    return (
      <div style={styles.emptyContainer}>
        <span>Sin datos para mostrar</span>
      </div>
    );
  }

  const values = data.map(item => parseFloat(item[yKey] || 0));
  const maxValue = Math.max(...values, 10); // evitar division por cero
  const padding = 40;
  const chartWidth = 500;
  const chartHeight = height;

  // Calculo de posiciones
  const points = data.map((item, idx) => {
    const x = padding + (idx * (chartWidth - padding * 2)) / Math.max(data.length - 1, 1);
    const y = chartHeight - padding - ((parseFloat(item[yKey] || 0) / maxValue) * (chartHeight - padding * 2));
    return { x, y, label: item[xKey], value: item[yKey] };
  });

  // Generar cadena de puntos para la linea
  const linePath = points.map(p => `${p.x},${p.y}`).join(' ');
  // Generar cadena para el area de relleno debajo de la linea
  const areaPath = points.length > 0 
    ? `${points[0].x},${chartHeight - padding} ${linePath} ${points[points.length - 1].x},${chartHeight - padding}` 
    : '';

  return (
    <div style={styles.wrapper}>
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={styles.svg}>
        {/* Lineas de cuadrícula horizontales (Y gridlines) */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const y = padding + ratio * (chartHeight - padding * 2);
          const gridVal = (maxValue * (1 - ratio)).toFixed(0);
          return (
            <g key={idx}>
              <line 
                x1={padding} 
                y1={y} 
                x2={chartWidth - padding} 
                y2={y} 
                stroke="var(--border)" 
                strokeWidth="1" 
                strokeDasharray="4 4"
              />
              <text 
                x={padding - 8} 
                y={y + 4} 
                fontSize="10" 
                fill="var(--text-muted)" 
                textAnchor="end"
                fontWeight="600"
              >
                ${gridVal}
              </text>
            </g>
          );
        })}

        {/* Renderizado de barras */}
        {type === 'bar' && points.map((p, idx) => {
          const barWidth = Math.min(30, (chartWidth - padding * 2) / (data.length * 1.5));
          const barHeight = chartHeight - padding - p.y;
          return (
            <g key={idx} className="chart-bar-group">
              <rect
                x={p.x - barWidth / 2}
                y={p.y}
                width={barWidth}
                height={Math.max(barHeight, 0)}
                fill="var(--primary)"
                rx="4"
                opacity="0.85"
                style={{ transition: 'all 0.3s ease' }}
              />
              {/* Valor sobre la barra */}
              <text
                x={p.x}
                y={p.y - 6}
                fontSize="10"
                fill="var(--text-main)"
                fontWeight="700"
                textAnchor="middle"
              >
                ${parseFloat(p.value).toFixed(0)}
              </text>
              {/* Etiqueta X */}
              <text
                x={p.x}
                y={chartHeight - padding + 18}
                fontSize="10"
                fill="var(--text-muted)"
                fontWeight="600"
                textAnchor="middle"
                transform={`rotate(-15, ${p.x}, ${chartHeight - padding + 18})`}
              >
                {p.label && p.label.length > 10 ? `${p.label.substring(0, 8)}..` : p.label}
              </text>
            </g>
          );
        })}

        {/* Renderizado de línea */}
        {type === 'line' && (
          <>
            {/* Relleno degradado bajo la línea */}
            {points.length > 1 && (
              <path
                d={`M ${areaPath}`}
                fill="url(#chart-gradient)"
                opacity="0.2"
              />
            )}
            {/* Línea principal */}
            {points.length > 1 && (
              <polyline
                fill="none"
                stroke="var(--primary)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={linePath}
              />
            )}
            {/* Puntos y etiquetas */}
            {points.map((p, idx) => (
              <g key={idx}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="5"
                  fill="var(--card-bg)"
                  stroke="var(--primary)"
                  strokeWidth="2.5"
                />
                <text
                  x={p.x}
                  y={p.y - 10}
                  fontSize="10"
                  fill="var(--text-main)"
                  fontWeight="700"
                  textAnchor="middle"
                >
                  ${parseFloat(p.value).toFixed(0)}
                </text>
                <text
                  x={p.x}
                  y={chartHeight - padding + 18}
                  fontSize="10"
                  fill="var(--text-muted)"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {p.label}
                </text>
              </g>
            ))}
          </>
        )}

        {/* Definición de degradado */}
        <defs>
          <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

const styles = {
  wrapper: {
    width: '100%',
    backgroundColor: 'var(--card-bg)',
    borderRadius: 'var(--radius-md)',
    padding: '16px',
    boxShadow: 'var(--shadow-sm)'
  },
  svg: {
    width: '100%',
    height: 'auto',
    display: 'block',
    overflow: 'visible'
  },
  emptyContainer: {
    height: '180px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-muted)',
    fontSize: '14px',
    fontWeight: '500',
    backgroundColor: 'var(--card-bg)',
    borderRadius: 'var(--radius-md)',
    border: '1px dashed var(--border)'
  }
};
