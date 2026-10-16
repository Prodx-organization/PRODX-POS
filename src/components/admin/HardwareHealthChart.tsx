import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface HardwareHealthChartProps {
  data: { idle: number; active: number; error: number };
}

export const HardwareHealthChart: React.FC<HardwareHealthChartProps & { theme?: 'light' | 'dark' }> = ({ data, theme = 'dark' }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 200;
    const height = 200;
    const radius = Math.min(width, height) / 2;

    const chartData = [
      { name: 'Idle', value: data.idle, color: '#10B981' },
      { name: 'Active', value: data.active, color: '#6366F1' },
      { name: 'Error', value: data.error, color: '#F43F5E' },
    ].filter(d => d.value > 0);

    const pie = d3.pie<{ name: string, value: number, color: string }>().value(d => d.value);
    const arc = d3.arc<d3.PieArcDatum<{ name: string, value: number, color: string }>>()
      .innerRadius(radius * 0.5)
      .outerRadius(radius * 0.8);

    const g = svg.append('g').attr('transform', `translate(${width / 2}, ${height / 2})`);

    g.selectAll('path')
      .data(pie(chartData))
      .enter()
      .append('path')
      .attr('d', arc)
      .attr('fill', d => d.data.color)
      .attr('stroke', theme === 'dark' ? '#0F172A' : '#FFFFFF')
      .attr('stroke-width', 2);
  }, [data, theme]);

  return <svg ref={svgRef} width={200} height={200} />;
};
