import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import {
  MuscleGroupScore,
  MUSCLE_GROUP_NAMES,
  getClassificationColor,
} from '../../types/strength';

interface RelativeStrengthsChartProps {
  muscleScores: MuscleGroupScore[];
  className?: string;
}

export const RelativeStrengthsChart: React.FC<RelativeStrengthsChartProps> = ({
  muscleScores,
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || muscleScores.length === 0) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    // Sort by deviation (strongest to weakest)
    const sortedScores = [...muscleScores].sort(
      (a, b) => b.percentDeviation - a.percentDeviation
    );

    // Dimensions
    const margin = { top: 20, right: 40, bottom: 20, left: 100 };
    const width = svgRef.current.clientWidth - margin.left - margin.right;
    const height = Math.max(sortedScores.length * 32, 200);
    const barHeight = 20;

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .attr('height', height + margin.top + margin.bottom);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const maxDeviation = Math.max(
      30,
      d3.max(sortedScores, (d) => Math.abs(d.percentDeviation)) || 30
    );

    const xScale = d3
      .scaleLinear()
      .domain([-maxDeviation, maxDeviation])
      .range([0, width]);

    const yScale = d3
      .scaleBand()
      .domain(sortedScores.map((d) => d.muscleGroup))
      .range([0, height])
      .padding(0.3);

    // Center line
    g.append('line')
      .attr('x1', xScale(0))
      .attr('x2', xScale(0))
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', '#4B5563')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4,4');

    // Zero label
    g.append('text')
      .attr('x', xScale(0))
      .attr('y', -8)
      .attr('text-anchor', 'middle')
      .attr('fill', '#9CA3AF')
      .attr('font-size', '10px')
      .text('Average');

    // Bars
    const bars = g
      .selectAll('.bar-group')
      .data(sortedScores)
      .enter()
      .append('g')
      .attr('class', 'bar-group');

    // Bar rectangles
    bars
      .append('rect')
      .attr('x', (d) => (d.percentDeviation >= 0 ? xScale(0) : xScale(d.percentDeviation)))
      .attr('y', (d) => yScale(d.muscleGroup) || 0)
      .attr('width', (d) => Math.abs(xScale(d.percentDeviation) - xScale(0)))
      .attr('height', barHeight)
      .attr('fill', (d) => getClassificationColor(d.classification))
      .attr('rx', 4)
      .attr('ry', 4)
      .style('opacity', 0.85)
      .on('mouseenter', function () {
        d3.select(this).style('opacity', 1);
      })
      .on('mouseleave', function () {
        d3.select(this).style('opacity', 0.85);
      });

    // Muscle group labels (left side)
    g.selectAll('.label')
      .data(sortedScores)
      .enter()
      .append('text')
      .attr('x', -8)
      .attr('y', (d) => (yScale(d.muscleGroup) || 0) + barHeight / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#D1D5DB')
      .attr('font-size', '12px')
      .text((d) => MUSCLE_GROUP_NAMES[d.muscleGroup]);

    // Deviation value labels
    bars
      .append('text')
      .attr('x', (d) =>
        d.percentDeviation >= 0
          ? xScale(d.percentDeviation) + 5
          : xScale(d.percentDeviation) - 5
      )
      .attr('y', (d) => (yScale(d.muscleGroup) || 0) + barHeight / 2)
      .attr('text-anchor', (d) => (d.percentDeviation >= 0 ? 'start' : 'end'))
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#9CA3AF')
      .attr('font-size', '11px')
      .text((d) => `${d.percentDeviation > 0 ? '+' : ''}${d.percentDeviation.toFixed(1)}%`);

    // Add axis labels
    g.append('text')
      .attr('x', xScale(-maxDeviation) + 20)
      .attr('y', -8)
      .attr('text-anchor', 'start')
      .attr('fill', '#EF4444')
      .attr('font-size', '10px')
      .text('Weaker');

    g.append('text')
      .attr('x', xScale(maxDeviation) - 20)
      .attr('y', -8)
      .attr('text-anchor', 'end')
      .attr('fill', '#22C55E')
      .attr('font-size', '10px')
      .text('Stronger');
  }, [muscleScores]);

  if (muscleScores.length === 0) {
    return (
      <div className={`${className} flex items-center justify-center h-48`}>
        <p className="text-gray-500">No muscle data available</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <h3 className="text-lg font-medium text-white mb-4">
        Relative Muscle Strengths
      </h3>
      <div className="overflow-x-auto">
        <svg
          ref={svgRef}
          className="w-full"
          style={{ minWidth: '400px' }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-2 text-center">
        Shows how each muscle group compares to your average strength
      </p>
    </div>
  );
};

export default RelativeStrengthsChart;
