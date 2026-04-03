import React, { useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Polyline, Line, Circle, Text as SvgText, Defs, LinearGradient, Stop, Path } from 'react-native-svg';

export interface EloDataPoint {
  date: string; // 'YYYY-MM-DD'
  elo: number;
}

export interface EloChartProps {
  data: EloDataPoint[];
}

const PADDING = { top: 20, right: 16, bottom: 36, left: 52 };
const CHART_HEIGHT = 200;
const DOT_RADIUS = 3;

const EloChart = React.memo(function EloChart({ data }: EloChartProps) {
  const { width } = useWindowDimensions();
  const chartWidth = width - 48; // 24px padding each side

  const { points, dotPoints, minElo, maxElo, yLabels, xLabels, areaPath } = useMemo(() => {
    if (!data || data.length < 2) return { points: '', dotPoints: [], minElo: 0, maxElo: 0, yLabels: [], xLabels: [], areaPath: '' };

    const eloValues = data.map(d => d.elo);
    const minElo = Math.min(...eloValues);
    const maxElo = Math.max(...eloValues);
    const eloRange = maxElo - minElo || 1;

    const innerW = chartWidth - PADDING.left - PADDING.right;
    const innerH = CHART_HEIGHT - PADDING.top - PADDING.bottom;

    const toX = (i: number) => PADDING.left + (i / (data.length - 1)) * innerW;
    const toY = (elo: number) => PADDING.top + innerH - ((elo - minElo) / eloRange) * innerH;

    const pts = data.map((d, i) => `${toX(i)},${toY(d.elo)}`).join(' ');

    // Area path (filled gradient under the line)
    const firstX = toX(0);
    const lastX = toX(data.length - 1);
    const baseline = PADDING.top + innerH;
    const linePts = data.map((d, i) => `${toX(i)},${toY(d.elo)}`).join(' L ');
    const area = `M ${firstX},${baseline} L ${linePts} L ${lastX},${baseline} Z`;

    const dotPoints = data.map((d, i) => ({ x: toX(i), y: toY(d.elo), elo: d.elo }));

    // Y axis labels (3 levels)
    const yLabels = [
      { y: toY(minElo), label: String(minElo) },
      { y: toY(minElo + eloRange / 2), label: String(Math.round(minElo + eloRange / 2)) },
      { y: toY(maxElo), label: String(maxElo) },
    ];

    // X axis labels — show first, middle, last
    const indices = [0, Math.floor((data.length - 1) / 2), data.length - 1];
    const xLabels = indices.map(i => ({
      x: toX(i),
      label: data[i].date.slice(5), // MM-DD
    }));

    return { points: pts, dotPoints, minElo, maxElo, yLabels, xLabels, areaPath: area };
  }, [data, chartWidth]);

  if (!data || data.length === 0) {
    return (
      <View style={[styles.placeholder, { height: CHART_HEIGHT }]}>
        <Text style={styles.placeholderText}>Sin historial de ELO</Text>
      </View>
    );
  }

  if (data.length < 2) {
    return (
      <View style={[styles.placeholder, { height: CHART_HEIGHT }]}>
        <Text style={styles.placeholderText}>Se necesitan al menos 2 partidas</Text>
      </View>
    );
  }

  const innerH = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const axisBottom = PADDING.top + innerH;
  const axisRight = chartWidth - PADDING.right;

  return (
    <View style={styles.container}>
      <Svg width={chartWidth} height={CHART_HEIGHT}>
        <Defs>
          <LinearGradient id="eloGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#4A90E2" stopOpacity="0.35" />
            <Stop offset="100%" stopColor="#4A90E2" stopOpacity="0.02" />
          </LinearGradient>
        </Defs>

        {/* Grid lines */}
        {yLabels.map((l, i) => (
          <Line
            key={i}
            x1={PADDING.left}
            y1={l.y}
            x2={axisRight}
            y2={l.y}
            stroke="#2a2a4a"
            strokeWidth="1"
            strokeDasharray="4,4"
          />
        ))}

        {/* Area fill */}
        <Path d={areaPath} fill="url(#eloGrad)" />

        {/* Line */}
        <Polyline
          points={points}
          fill="none"
          stroke="#4A90E2"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Axes */}
        <Line x1={PADDING.left} y1={PADDING.top} x2={PADDING.left} y2={axisBottom} stroke="#444" strokeWidth="1" />
        <Line x1={PADDING.left} y1={axisBottom} x2={axisRight} y2={axisBottom} stroke="#444" strokeWidth="1" />

        {/* Y labels */}
        {yLabels.map((l, i) => (
          <SvgText key={i} x={PADDING.left - 6} y={l.y + 4} fontSize="10" fill="#888" textAnchor="end">
            {l.label}
          </SvgText>
        ))}

        {/* X labels */}
        {xLabels.map((l, i) => (
          <SvgText key={i} x={l.x} y={axisBottom + 16} fontSize="10" fill="#888" textAnchor="middle">
            {l.label}
          </SvgText>
        ))}

        {/* Dots on data points */}
        {dotPoints.map((pt, i) => (
          <Circle key={i} cx={pt.x} cy={pt.y} r={DOT_RADIUS} fill="#4A90E2" stroke="#1a1a2e" strokeWidth="1.5" />
        ))}

        {/* Last value label */}
        {dotPoints.length > 0 && (
          <SvgText
            x={dotPoints[dotPoints.length - 1].x}
            y={dotPoints[dotPoints.length - 1].y - 8}
            fontSize="11"
            fill="#4A90E2"
            textAnchor="middle"
            fontWeight="bold"
          >
            {dotPoints[dotPoints.length - 1].elo}
          </SvgText>
        )}
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
  },
  placeholderText: {
    color: '#6b7280',
    fontSize: 14,
    fontStyle: 'italic',
  },
});

export default EloChart;
