import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';
import type { TriScoreData, SportScore } from '../../hooks/usePMCData';

interface TriScoreGaugeProps {
  data: TriScoreData | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  showSportBreakdown?: boolean;
  showBalance?: boolean;
  showRecommendations?: boolean;
  animated?: boolean;
}

// Color scales for different score ranges
const SCORE_COLORS = {
  excellent: '#10B981', // Emerald - 80+
  good: '#22C55E', // Green - 60-79
  moderate: '#F59E0B', // Amber - 40-59
  fair: '#F97316', // Orange - 20-39
  poor: '#EF4444', // Red - 0-19
};

const SPORT_COLORS = {
  swim: '#06B6D4', // Cyan
  bike: '#8B5CF6', // Purple
  run: '#F59E0B', // Amber
  strength: '#EC4899', // Pink
};

const getScoreColor = (score: number): string => {
  if (score >= 80) return SCORE_COLORS.excellent;
  if (score >= 60) return SCORE_COLORS.good;
  if (score >= 40) return SCORE_COLORS.moderate;
  if (score >= 20) return SCORE_COLORS.fair;
  return SCORE_COLORS.poor;
};

const getScoreLabel = (score: number): string => {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Moderate';
  if (score >= 20) return 'Fair';
  return 'Needs Work';
};

export function TriScoreGauge({
  data,
  size = 'md',
  showSportBreakdown = true,
  showBalance = true,
  showRecommendations = false,
  animated = true,
}: TriScoreGaugeProps) {
  const gaugeRef = useRef<SVGSVGElement>(null);

  // Size configurations
  const sizeConfig = {
    sm: { width: 120, height: 120, strokeWidth: 8, fontSize: 24, labelSize: 10 },
    md: { width: 180, height: 180, strokeWidth: 12, fontSize: 36, labelSize: 12 },
    lg: { width: 240, height: 240, strokeWidth: 16, fontSize: 48, labelSize: 14 },
  };

  const config = sizeConfig[size];
  const radius = (config.width - config.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Draw the gauge
  useEffect(() => {
    if (!gaugeRef.current) return;

    const svg = d3.select(gaugeRef.current);
    svg.selectAll('*').remove();

    const centerX = config.width / 2;
    const centerY = config.height / 2;

    // Create gradient for the score arc
    const defs = svg.append('defs');

    const gradient = defs
      .append('linearGradient')
      .attr('id', 'scoreGradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');

    gradient.append('stop').attr('offset', '0%').attr('stop-color', SCORE_COLORS.poor);
    gradient.append('stop').attr('offset', '25%').attr('stop-color', SCORE_COLORS.fair);
    gradient.append('stop').attr('offset', '50%').attr('stop-color', SCORE_COLORS.moderate);
    gradient.append('stop').attr('offset', '75%').attr('stop-color', SCORE_COLORS.good);
    gradient.append('stop').attr('offset', '100%').attr('stop-color', SCORE_COLORS.excellent);

    // Background arc (full circle)
    svg
      .append('circle')
      .attr('cx', centerX)
      .attr('cy', centerY)
      .attr('r', radius)
      .attr('fill', 'none')
      .attr('stroke', '#E5E7EB')
      .attr('stroke-width', config.strokeWidth)
      .attr('stroke-linecap', 'round');

    // Score arc
    const score = data?.overall ?? 0;
    const scorePercent = Math.min(100, Math.max(0, score)) / 100;
    const arcLength = circumference * scorePercent;

    const scoreArc = svg
      .append('circle')
      .attr('cx', centerX)
      .attr('cy', centerY)
      .attr('r', radius)
      .attr('fill', 'none')
      .attr('stroke', getScoreColor(score))
      .attr('stroke-width', config.strokeWidth)
      .attr('stroke-linecap', 'round')
      .attr('stroke-dasharray', `${arcLength} ${circumference}`)
      .attr('transform', `rotate(-90 ${centerX} ${centerY})`);

    // Animate the arc
    if (animated && data) {
      scoreArc
        .attr('stroke-dasharray', `0 ${circumference}`)
        .transition()
        .duration(1000)
        .ease(d3.easeQuadOut)
        .attr('stroke-dasharray', `${arcLength} ${circumference}`);
    }

    // Center text - Score
    const textGroup = svg.append('g').attr('transform', `translate(${centerX}, ${centerY})`);

    if (data) {
      // Score number
      const scoreText = textGroup
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('y', -5)
        .attr('fill', getScoreColor(score))
        .attr('font-size', config.fontSize)
        .attr('font-weight', 'bold');

      if (animated) {
        scoreText
          .text('0')
          .transition()
          .duration(1000)
          .tween('text', function () {
            const interpolator = d3.interpolateNumber(0, score);
            return function (t) {
              d3.select(this).text(Math.round(interpolator(t)));
            };
          });
      } else {
        scoreText.text(Math.round(score));
      }

      // Label
      textGroup
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('y', config.fontSize / 2 + 5)
        .attr('fill', '#6B7280')
        .attr('font-size', config.labelSize)
        .text(getScoreLabel(score));
    } else {
      // No data state
      textGroup
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#9CA3AF')
        .attr('font-size', config.fontSize)
        .attr('font-weight', 'bold')
        .text('--');
    }
  }, [data, config, radius, circumference, animated]);

  if (!data) {
    return (
      <div className="flex flex-col items-center">
        <svg ref={gaugeRef} width={config.width} height={config.height} />
        <p className="text-sm text-gray-500 mt-2 text-center">
          Complete activities to see your Tri-Score
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Main Gauge */}
      <div className="relative">
        <svg ref={gaugeRef} width={config.width} height={config.height} />

        {/* Trend indicator */}
        <div className="absolute -top-1 -right-1">
          <TrendIndicator trend={data.overallTrend} />
        </div>
      </div>

      {/* Sport Breakdown */}
      {showSportBreakdown && (
        <div className="w-full space-y-2">
          <SportBar label="Swim" score={data.swim} color={SPORT_COLORS.swim} />
          <SportBar label="Bike" score={data.bike} color={SPORT_COLORS.bike} />
          <SportBar label="Run" score={data.run} color={SPORT_COLORS.run} />
          <SportBar label="Strength" score={data.strength} color={SPORT_COLORS.strength} />
        </div>
      )}

      {/* Balance Indicator */}
      {showBalance && (
        <div className="w-full">
          <BalanceIndicator balance={data.balance} />
        </div>
      )}

      {/* Recommendations */}
      {showRecommendations && data.balance.recommendations.length > 0 && (
        <div className="w-full bg-blue-50 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              {data.balance.recommendations.slice(0, 2).map((rec, i) => (
                <p key={i} className="text-sm text-blue-700">
                  {rec}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Trend indicator component
function TrendIndicator({ trend }: { trend: number }) {
  if (trend > 0) {
    return (
      <div className="flex items-center gap-0.5 bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full text-xs font-medium">
        <TrendingUp className="w-3 h-3" />
        <span>+{trend}</span>
      </div>
    );
  }
  if (trend < 0) {
    return (
      <div className="flex items-center gap-0.5 bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full text-xs font-medium">
        <TrendingDown className="w-3 h-3" />
        <span>{trend}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-0.5 bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full text-xs font-medium">
      <Minus className="w-3 h-3" />
      <span>0</span>
    </div>
  );
}

// Sport progress bar component
function SportBar({
  label,
  score,
  color,
}: {
  label: string;
  score: SportScore;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-16 text-sm text-gray-600">{label}</div>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.min(100, score.score)}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <div className="w-8 text-sm font-medium text-right" style={{ color }}>
        {score.score}
      </div>
      {score.trend !== 0 && (
        <div
          className={`text-xs ${score.trend > 0 ? 'text-emerald-600' : 'text-red-600'}`}
        >
          {score.trend > 0 ? '+' : ''}
          {score.trend}
        </div>
      )}
    </div>
  );
}

// Balance indicator component
function BalanceIndicator({
  balance,
}: {
  balance: TriScoreData['balance'];
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            balance.balanced ? 'bg-emerald-500' : 'bg-amber-500'
          }`}
        />
        <span className="text-gray-600">Balance</span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`font-medium ${
            balance.balanced ? 'text-emerald-600' : 'text-amber-600'
          }`}
        >
          {balance.balanceScore}%
        </span>
        {!balance.balanced && (
          <span className="text-xs text-gray-500">
            Focus: {balance.weakest}
          </span>
        )}
      </div>
    </div>
  );
}

// Compact version for dashboard cards
export function TriScoreGaugeCompact({
  score,
  trend,
  size = 80,
}: {
  score: number | null | undefined;
  trend?: number;
  size?: number;
}) {
  const gaugeRef = useRef<SVGSVGElement>(null);
  const strokeWidth = size / 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    if (!gaugeRef.current) return;

    const svg = d3.select(gaugeRef.current);
    svg.selectAll('*').remove();

    const centerX = size / 2;
    const centerY = size / 2;

    // Background arc
    svg
      .append('circle')
      .attr('cx', centerX)
      .attr('cy', centerY)
      .attr('r', radius)
      .attr('fill', 'none')
      .attr('stroke', '#E5E7EB')
      .attr('stroke-width', strokeWidth);

    // Score arc
    const scoreValue = score ?? 0;
    const scorePercent = Math.min(100, Math.max(0, scoreValue)) / 100;
    const arcLength = circumference * scorePercent;

    svg
      .append('circle')
      .attr('cx', centerX)
      .attr('cy', centerY)
      .attr('r', radius)
      .attr('fill', 'none')
      .attr('stroke', getScoreColor(scoreValue))
      .attr('stroke-width', strokeWidth)
      .attr('stroke-linecap', 'round')
      .attr('stroke-dasharray', `${arcLength} ${circumference}`)
      .attr('transform', `rotate(-90 ${centerX} ${centerY})`);

    // Center text
    svg
      .append('text')
      .attr('x', centerX)
      .attr('y', centerY)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', score !== null && score !== undefined ? getScoreColor(scoreValue) : '#9CA3AF')
      .attr('font-size', size / 3.5)
      .attr('font-weight', 'bold')
      .text(score !== null && score !== undefined ? Math.round(scoreValue) : '--');
  }, [score, size, radius, circumference, strokeWidth]);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg ref={gaugeRef} width={size} height={size} />
      {trend !== undefined && trend !== 0 && (
        <div
          className={`absolute -bottom-1 -right-1 text-xs px-1 rounded ${
            trend > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {trend > 0 ? '+' : ''}
          {trend}
        </div>
      )}
    </div>
  );
}

// Mini gauge for individual sports
export function SportMiniGauge({
  sport,
  score,
  color,
  size = 60,
}: {
  sport: string;
  score: SportScore;
  color: string;
  size?: number;
}) {
  const gaugeRef = useRef<SVGSVGElement>(null);
  const strokeWidth = size / 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    if (!gaugeRef.current) return;

    const svg = d3.select(gaugeRef.current);
    svg.selectAll('*').remove();

    const centerX = size / 2;
    const centerY = size / 2;

    // Background arc
    svg
      .append('circle')
      .attr('cx', centerX)
      .attr('cy', centerY)
      .attr('r', radius)
      .attr('fill', 'none')
      .attr('stroke', '#E5E7EB')
      .attr('stroke-width', strokeWidth);

    // Score arc
    const scorePercent = Math.min(100, Math.max(0, score.score)) / 100;
    const arcLength = circumference * scorePercent;

    svg
      .append('circle')
      .attr('cx', centerX)
      .attr('cy', centerY)
      .attr('r', radius)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', strokeWidth)
      .attr('stroke-linecap', 'round')
      .attr('stroke-dasharray', `${arcLength} ${circumference}`)
      .attr('transform', `rotate(-90 ${centerX} ${centerY})`);

    // Center text
    svg
      .append('text')
      .attr('x', centerX)
      .attr('y', centerY)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', color)
      .attr('font-size', size / 4)
      .attr('font-weight', 'bold')
      .text(Math.round(score.score));
  }, [score, size, radius, circumference, strokeWidth, color]);

  return (
    <div className="flex flex-col items-center">
      <svg ref={gaugeRef} width={size} height={size} />
      <span className="text-xs text-gray-600 mt-1">{sport}</span>
      {score.trend !== 0 && (
        <span
          className={`text-xs ${score.trend > 0 ? 'text-emerald-600' : 'text-red-600'}`}
        >
          {score.trend > 0 ? '+' : ''}
          {score.trend}
        </span>
      )}
    </div>
  );
}

export default TriScoreGauge;
