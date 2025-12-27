import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { format, parseISO } from 'date-fns';
import { Info } from 'lucide-react';

// Types
interface PMCDataPoint {
  date: string;
  tss: number;
  ctl: number | null;
  atl: number | null;
  tsb: number | null;
  rampRate?: number | null;
}

interface PMCProjection {
  date: string;
  projectedTss: number;
  projectedCtl: number;
  projectedAtl: number;
  projectedTsb: number;
}

interface PMCChartProps {
  data: PMCDataPoint[];
  projections?: PMCProjection[];
  height?: number;
  showLegend?: boolean;
  showTooltip?: boolean;
  showProjections?: boolean;
  onDateRangeChange?: (days: number) => void;
}

interface TooltipData {
  x: number;
  y: number;
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
  tss: number;
  isProjection?: boolean;
}

const COLORS = {
  ctl: '#3B82F6', // Blue - Fitness
  atl: '#F59E0B', // Amber - Fatigue
  tsb: '#10B981', // Emerald - Form
  tsbNegative: '#EF4444', // Red - Negative form
  tss: '#8B5CF6', // Purple - TSS bars
  projection: '#94A3B8', // Gray for projections
  grid: '#E5E7EB',
  text: '#6B7280',
};

export function PMCChart({
  data,
  projections = [],
  height = 300,
  showLegend = true,
  showTooltip = true,
  showProjections = true,
}: PMCChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height });

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height,
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [height]);

  // Draw chart
  useEffect(() => {
    if (!svgRef.current || !data.length || dimensions.width === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 60, bottom: 40, left: 50 };
    const width = dimensions.width - margin.left - margin.right;
    const chartHeight = dimensions.height - margin.top - margin.bottom;

    // Parse and prepare data
    const parsedData = data
      .filter((d) => d.ctl !== null && d.atl !== null && d.tsb !== null)
      .map((d) => ({
        ...d,
        date: parseISO(d.date),
        ctl: d.ctl as number,
        atl: d.atl as number,
        tsb: d.tsb as number,
      }));

    const parsedProjections = showProjections
      ? projections.map((d) => ({
          ...d,
          date: parseISO(d.date),
          ctl: d.projectedCtl,
          atl: d.projectedAtl,
          tsb: d.projectedTsb,
          tss: d.projectedTss,
          isProjection: true,
        }))
      : [];

    const allData = [...parsedData, ...parsedProjections];

    if (allData.length === 0) return;

    // Scales
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(allData, (d) => d.date) as [Date, Date])
      .range([0, width]);

    // Y scale for CTL/ATL
    const maxLoad = Math.max(
      d3.max(allData, (d) => Math.max(d.ctl, d.atl)) || 100,
      50
    );
    const yScaleLoad = d3
      .scaleLinear()
      .domain([0, maxLoad * 1.1])
      .range([chartHeight, 0]);

    // Y scale for TSB (can be negative)
    const tsbExtent = d3.extent(allData, (d) => d.tsb) as [number, number];
    const tsbPadding = Math.max(Math.abs(tsbExtent[0]), Math.abs(tsbExtent[1])) * 0.2;
    const yScaleTsb = d3
      .scaleLinear()
      .domain([
        Math.min(tsbExtent[0] - tsbPadding, -30),
        Math.max(tsbExtent[1] + tsbPadding, 30),
      ])
      .range([chartHeight, 0]);

    // Main group
    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data(yScaleLoad.ticks(5))
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', (d) => yScaleLoad(d))
      .attr('y2', (d) => yScaleLoad(d))
      .attr('stroke', COLORS.grid)
      .attr('stroke-dasharray', '2,2');

    // Zero line for TSB
    g.append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', yScaleTsb(0))
      .attr('y2', yScaleTsb(0))
      .attr('stroke', COLORS.text)
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,4');

    // TSS bars (background)
    const barWidth = Math.max(1, width / parsedData.length - 1);
    g.selectAll('.tss-bar')
      .data(parsedData)
      .enter()
      .append('rect')
      .attr('class', 'tss-bar')
      .attr('x', (d) => xScale(d.date) - barWidth / 2)
      .attr('y', (d) => yScaleLoad(d.tss))
      .attr('width', barWidth)
      .attr('height', (d) => chartHeight - yScaleLoad(d.tss))
      .attr('fill', COLORS.tss)
      .attr('opacity', 0.2);

    // Line generators
    const lineGenerator = (yAccessor: (d: any) => number, yScale: d3.ScaleLinear<number, number>) =>
      d3
        .line<any>()
        .x((d) => xScale(d.date))
        .y((d) => yScale(yAccessor(d)))
        .curve(d3.curveMonotoneX);

    // CTL line (Fitness)
    g.append('path')
      .datum(parsedData)
      .attr('fill', 'none')
      .attr('stroke', COLORS.ctl)
      .attr('stroke-width', 2.5)
      .attr('d', lineGenerator((d) => d.ctl, yScaleLoad));

    // ATL line (Fatigue)
    g.append('path')
      .datum(parsedData)
      .attr('fill', 'none')
      .attr('stroke', COLORS.atl)
      .attr('stroke-width', 2.5)
      .attr('d', lineGenerator((d) => d.atl, yScaleLoad));

    // TSB area (Form) - split into positive and negative
    const tsbAreaPositive = d3
      .area<any>()
      .x((d) => xScale(d.date))
      .y0(yScaleTsb(0))
      .y1((d) => (d.tsb >= 0 ? yScaleTsb(d.tsb) : yScaleTsb(0)))
      .curve(d3.curveMonotoneX);

    const tsbAreaNegative = d3
      .area<any>()
      .x((d) => xScale(d.date))
      .y0(yScaleTsb(0))
      .y1((d) => (d.tsb < 0 ? yScaleTsb(d.tsb) : yScaleTsb(0)))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(parsedData)
      .attr('fill', COLORS.tsb)
      .attr('opacity', 0.15)
      .attr('d', tsbAreaPositive);

    g.append('path')
      .datum(parsedData)
      .attr('fill', COLORS.tsbNegative)
      .attr('opacity', 0.15)
      .attr('d', tsbAreaNegative);

    // TSB line
    g.append('path')
      .datum(parsedData)
      .attr('fill', 'none')
      .attr('stroke', COLORS.tsb)
      .attr('stroke-width', 2)
      .attr('d', lineGenerator((d) => d.tsb, yScaleTsb));

    // Projections (dashed lines)
    if (showProjections && parsedProjections.length > 0) {
      const projectionData = [parsedData[parsedData.length - 1], ...parsedProjections];

      g.append('path')
        .datum(projectionData)
        .attr('fill', 'none')
        .attr('stroke', COLORS.ctl)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5')
        .attr('opacity', 0.6)
        .attr('d', lineGenerator((d) => d.ctl, yScaleLoad));

      g.append('path')
        .datum(projectionData)
        .attr('fill', 'none')
        .attr('stroke', COLORS.atl)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5')
        .attr('opacity', 0.6)
        .attr('d', lineGenerator((d) => d.atl, yScaleLoad));

      g.append('path')
        .datum(projectionData)
        .attr('fill', 'none')
        .attr('stroke', COLORS.tsb)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5')
        .attr('opacity', 0.6)
        .attr('d', lineGenerator((d) => d.tsb, yScaleTsb));

      // Add "Projection" label
      const lastProjection = parsedProjections[parsedProjections.length - 1];
      if (lastProjection) {
        g.append('text')
          .attr('x', xScale(lastProjection.date))
          .attr('y', yScaleLoad(lastProjection.ctl) - 8)
          .attr('text-anchor', 'end')
          .attr('fill', COLORS.projection)
          .attr('font-size', '10px')
          .text('Projected');
      }
    }

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(
        d3
          .axisBottom(xScale)
          .ticks(width > 500 ? 8 : 4)
          .tickFormat((d) => format(d as Date, 'MMM d'))
      )
      .selectAll('text')
      .attr('fill', COLORS.text)
      .attr('font-size', '11px');

    // Left Y axis (CTL/ATL)
    g.append('g')
      .call(d3.axisLeft(yScaleLoad).ticks(5))
      .selectAll('text')
      .attr('fill', COLORS.text)
      .attr('font-size', '11px');

    // Right Y axis (TSB)
    g.append('g')
      .attr('transform', `translate(${width},0)`)
      .call(d3.axisRight(yScaleTsb).ticks(5))
      .selectAll('text')
      .attr('fill', COLORS.text)
      .attr('font-size', '11px');

    // Axis labels
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -chartHeight / 2)
      .attr('y', -40)
      .attr('text-anchor', 'middle')
      .attr('fill', COLORS.text)
      .attr('font-size', '11px')
      .text('CTL / ATL');

    g.append('text')
      .attr('transform', 'rotate(90)')
      .attr('x', chartHeight / 2)
      .attr('y', -width - 45)
      .attr('text-anchor', 'middle')
      .attr('fill', COLORS.text)
      .attr('font-size', '11px')
      .text('TSB');

    // Tooltip hover area
    if (showTooltip) {
      const bisect = d3.bisector<any, Date>((d) => d.date).left;

      g.append('rect')
        .attr('width', width)
        .attr('height', chartHeight)
        .attr('fill', 'transparent')
        .on('mousemove', (event) => {
          const [mx] = d3.pointer(event);
          const date = xScale.invert(mx);
          const index = bisect(allData, date, 1);
          const d0 = allData[index - 1];
          const d1 = allData[index];

          if (!d0) return;

          const d =
            d1 && date.getTime() - d0.date.getTime() > d1.date.getTime() - date.getTime()
              ? d1
              : d0;

          setTooltip({
            x: xScale(d.date) + margin.left,
            y: yScaleLoad(d.ctl) + margin.top,
            date: format(d.date, 'MMM d, yyyy'),
            ctl: Math.round(d.ctl),
            atl: Math.round(d.atl),
            tsb: Math.round(d.tsb),
            tss: Math.round(d.tss),
            isProjection: 'isProjection' in d && d.isProjection,
          });
        })
        .on('mouseleave', () => setTooltip(null));
    }
  }, [data, projections, dimensions, showProjections, showTooltip]);

  // Get current values for legend
  const currentData = data.filter((d) => d.ctl !== null).slice(-1)[0];

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Legend */}
      {showLegend && (
        <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.ctl }} />
            <span className="text-gray-600">
              Fitness (CTL):{' '}
              <span className="font-semibold text-gray-900">
                {currentData?.ctl?.toFixed(0) ?? '--'}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.atl }} />
            <span className="text-gray-600">
              Fatigue (ATL):{' '}
              <span className="font-semibold text-gray-900">
                {currentData?.atl?.toFixed(0) ?? '--'}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.tsb }} />
            <span className="text-gray-600">
              Form (TSB):{' '}
              <span
                className="font-semibold"
                style={{
                  color:
                    currentData?.tsb && currentData.tsb >= 0 ? COLORS.tsb : COLORS.tsbNegative,
                }}
              >
                {currentData?.tsb?.toFixed(0) ?? '--'}
              </span>
            </span>
          </div>
          <div className="ml-auto">
            <button
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="PMC Chart Info"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Chart */}
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} />

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute bg-white rounded-lg shadow-lg border border-gray-200 p-3 pointer-events-none z-10"
          style={{
            left: Math.min(tooltip.x, dimensions.width - 160),
            top: tooltip.y - 100,
          }}
        >
          <div className="text-sm font-medium text-gray-900 mb-2">
            {tooltip.date}
            {tooltip.isProjection && (
              <span className="ml-2 text-xs text-gray-500">(Projected)</span>
            )}
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span style={{ color: COLORS.ctl }}>CTL:</span>
              <span className="font-medium">{tooltip.ctl}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span style={{ color: COLORS.atl }}>ATL:</span>
              <span className="font-medium">{tooltip.atl}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span style={{ color: tooltip.tsb >= 0 ? COLORS.tsb : COLORS.tsbNegative }}>
                TSB:
              </span>
              <span className="font-medium">{tooltip.tsb}</span>
            </div>
            <div className="flex justify-between gap-4 border-t pt-1 mt-1">
              <span style={{ color: COLORS.tss }}>TSS:</span>
              <span className="font-medium">{tooltip.tss}</span>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {data.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg">
          <div className="text-center">
            <p className="text-gray-500 font-medium">No PMC data available</p>
            <p className="text-sm text-gray-400 mt-1">
              Sync your activities to see your performance chart
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default PMCChart;
