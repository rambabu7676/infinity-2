import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { TrendingUp, BarChart3, Disc, Sparkles, Flame, Eye } from 'lucide-react';
import { playClickSound } from '../utils/audio';

export interface TrendingTopic {
  id: string;
  tag: string;
  name: string;
  category: 'Hashtag' | 'Category';
  views: number;
  formattedViews: string;
  growth: number; // percentage
  postsCount: number;
  color: string;
  glowColor: string;
}

export const TRENDING_TOPICS: TrendingTopic[] = [
  {
    id: '1',
    tag: '#Infinity',
    name: 'Infinity Lore',
    category: 'Hashtag',
    views: 2150000,
    formattedViews: '2.1M',
    growth: 112,
    postsCount: 78500,
    color: '#00FF88',
    glowColor: 'rgba(0, 255, 136, 0.4)',
  },
  {
    id: '2',
    tag: '#DesiMemes',
    name: 'Desi Comedy',
    category: 'Category',
    views: 1850000,
    formattedViews: '1.8M',
    growth: 95,
    postsCount: 65400,
    color: '#FF0055',
    glowColor: 'rgba(255, 0, 85, 0.4)',
  },
  {
    id: '3',
    tag: '#DanceTrend',
    name: 'Street Dance',
    category: 'Category',
    views: 1520000,
    formattedViews: '1.5M',
    growth: 88,
    postsCount: 51200,
    color: '#FFB800',
    glowColor: 'rgba(255, 184, 0, 0.4)',
  },
  {
    id: '4',
    tag: '#Cosmos',
    name: 'Cosmic Mystery',
    category: 'Hashtag',
    views: 1420000,
    formattedViews: '1.4M',
    growth: 84,
    postsCount: 42100,
    color: '#38BDF8',
    glowColor: 'rgba(56, 189, 248, 0.4)',
  },
  {
    id: '5',
    tag: '#StreetFood',
    name: 'Desi Flavors',
    category: 'Category',
    views: 1250000,
    formattedViews: '1.2M',
    growth: 78,
    postsCount: 34800,
    color: '#F97316',
    glowColor: 'rgba(249, 115, 22, 0.4)',
  },
  {
    id: '6',
    tag: '#MandlaArt',
    name: 'Folk Art',
    category: 'Hashtag',
    views: 980000,
    formattedViews: '980K',
    growth: 62,
    postsCount: 28300,
    color: '#A855F7',
    glowColor: 'rgba(168, 85, 247, 0.4)',
  },
  {
    id: '7',
    tag: '#Cyberpunk',
    name: 'Sci-Fi Visuals',
    category: 'Hashtag',
    views: 850000,
    formattedViews: '850K',
    growth: 53,
    postsCount: 19500,
    color: '#06B6D4',
    glowColor: 'rgba(6, 182, 212, 0.4)',
  },
  {
    id: '8',
    tag: '#LoFiBeats',
    name: 'Lo-Fi Chill',
    category: 'Category',
    views: 720000,
    formattedViews: '720K',
    growth: 44,
    postsCount: 16200,
    color: '#EC4899',
    glowColor: 'rgba(236, 72, 153, 0.4)',
  },
];

interface TrendingVisualizationProps {
  onSelectTopic: (tag: string) => void;
}

export const TrendingVisualization: React.FC<TrendingVisualizationProps> = ({ onSelectTopic }) => {
  const [viewMode, setViewMode] = useState<'bubbles' | 'bars'>('bubbles');
  const [filterType, setFilterType] = useState<'All' | 'Hashtag' | 'Category'>('All');
  const [hoveredTopic, setHoveredTopic] = useState<TrendingTopic | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const displayedTopics = React.useMemo(() => {
    if (filterType === 'All') return TRENDING_TOPICS;
    return TRENDING_TOPICS.filter((t) => t.category === filterType);
  }, [filterType]);

  // Render D3 chart whenever displayedTopics or viewMode changes
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 320;
    const height = viewMode === 'bubbles' ? 210 : Math.max(190, displayedTopics.length * 30 + 20);

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    if (viewMode === 'bubbles') {
      // ---------------- D3 PACK BUBBLE CLOUD ----------------
      const packLayout = d3
        .pack<TrendingTopic>()
        .size([width - 16, height - 16])
        .padding(6);

      interface HierarchyData {
        id: string;
        children?: TrendingTopic[];
        views?: number;
      }

      const rootData: HierarchyData = {
        id: 'root',
        children: displayedTopics,
      };

      const root = d3
        .hierarchy<HierarchyData>(rootData)
        .sum((d) => (d as TrendingTopic).views || 0);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const packedNodes = packLayout(root as any).leaves() as any[];

      const g = svg.append('g').attr('transform', 'translate(8, 8)');

      // Glow filter definition
      const defs = svg.append('defs');
      const filter = defs.append('filter').attr('id', 'bubble-glow').attr('x', '-30%').attr('y', '-30%').attr('width', '160%').attr('height', '160%');
      filter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'blur');
      filter.append('feComposite').attr('in', 'SourceGraphic').attr('in2', 'blur').attr('operator', 'over');

      // Gradients for each bubble
      displayedTopics.forEach((topic) => {
        const gradientId = `grad-${topic.id}`;
        const radialGrad = defs
          .append('radialGradient')
          .attr('id', gradientId)
          .attr('cx', '35%')
          .attr('cy', '35%')
          .attr('r', '65%');

        radialGrad.append('stop').attr('offset', '0%').attr('stop-color', topic.color).attr('stop-opacity', 0.95);
        radialGrad.append('stop').attr('offset', '70%').attr('stop-color', topic.color).attr('stop-opacity', 0.65);
        radialGrad.append('stop').attr('offset', '100%').attr('stop-color', '#090B0E').attr('stop-opacity', 0.9);
      });

      const node = g
        .selectAll('.bubble-node')
        .data(packedNodes)
        .enter()
        .append('g')
        .attr('class', 'bubble-node')
        .attr('transform', (d: any) => `translate(${d.x},${d.y})`)
        .style('cursor', 'pointer')
        .on('mouseenter', (_event, d: any) => {
          setHoveredTopic(d.data as TrendingTopic);
        })
        .on('mouseleave', () => {
          setHoveredTopic(null);
        })
        .on('click', (_event, d: any) => {
          playClickSound();
          const cleanTag = (d.data.tag as string).replace('#', '');
          onSelectTopic(cleanTag);
        });

      // Ambient outer ring
      node
        .append('circle')
        .attr('r', (d: any) => d.r)
        .attr('fill', (d: any) => `url(#grad-${d.data.id})`)
        .attr('stroke', (d: any) => d.data.color)
        .attr('stroke-width', 1.5)
        .attr('stroke-opacity', 0.7)
        .style('filter', 'url(#bubble-glow)')
        .attr('opacity', 0)
        .transition()
        .duration(600)
        .delay((_d, i) => i * 40)
        .attr('opacity', 1);

      // Inner pulse circle
      node
        .append('circle')
        .attr('r', (d: any) => Math.max(0, d.r - 3))
        .attr('fill', 'none')
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 0.8)
        .attr('stroke-opacity', 0.25);

      // Primary Tag Text
      node
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', (d: any) => (d.r > 26 ? '-0.2em' : '0.3em'))
        .text((d: any) => {
          const tag = d.data.tag as string;
          return d.r < 24 ? tag.slice(0, 5) + '..' : tag;
        })
        .attr('fill', '#ffffff')
        .attr('font-size', (d: any) => (d.r > 36 ? '11px' : d.r > 28 ? '10px' : '9px'))
        .attr('font-weight', '700')
        .style('pointer-events', 'none')
        .style('text-shadow', '0 2px 4px rgba(0,0,0,0.8)');

      // Views subtext for larger bubbles
      node
        .filter((d: any) => d.r > 26)
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '1.1em')
        .text((d: any) => `👁 ${d.data.formattedViews}`)
        .attr('fill', (d: any) => d.data.color)
        .attr('font-size', '8.5px')
        .attr('font-weight', '600')
        .style('pointer-events', 'none');
    } else {
      // ---------------- D3 HORIZONTAL ENGAGEMENT BARS ----------------
      const margin = { top: 10, right: 55, bottom: 10, left: 88 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const maxViews = d3.max(displayedTopics, (d) => d.views) || 2000000;

      const xScale = d3.scaleLinear().domain([0, maxViews]).range([0, innerWidth]);

      const yScale = d3
        .scaleBand()
        .domain(displayedTopics.map((d) => d.tag))
        .range([0, innerHeight])
        .padding(0.28);

      // Background track bars
      g.selectAll('.bar-track')
        .data(displayedTopics)
        .enter()
        .append('rect')
        .attr('class', 'bar-track')
        .attr('y', (d) => yScale(d.tag) || 0)
        .attr('x', 0)
        .attr('width', innerWidth)
        .attr('height', yScale.bandwidth())
        .attr('rx', 4)
        .attr('fill', '#1F242C')
        .attr('opacity', 0.5);

      // Active animated gradient bars
      const bars = g
        .selectAll('.bar-active')
        .data(displayedTopics)
        .enter()
        .append('rect')
        .attr('class', 'bar-active')
        .attr('y', (d) => yScale(d.tag) || 0)
        .attr('x', 0)
        .attr('height', yScale.bandwidth())
        .attr('rx', 4)
        .attr('fill', (d) => d.color)
        .attr('width', 0)
        .style('cursor', 'pointer')
        .on('mouseenter', (_event, d) => setHoveredTopic(d))
        .on('mouseleave', () => setHoveredTopic(null))
        .on('click', (_event, d) => {
          playClickSound();
          onSelectTopic(d.tag.replace('#', ''));
        });

      bars
        .transition()
        .duration(650)
        .delay((_d, i) => i * 35)
        .attr('width', (d) => xScale(d.views));

      // Labels on Y Axis (Hashtag name)
      g.selectAll('.bar-label')
        .data(displayedTopics)
        .enter()
        .append('text')
        .attr('class', 'bar-label')
        .attr('x', -8)
        .attr('y', (d) => (yScale(d.tag) || 0) + yScale.bandwidth() / 2 + 3.5)
        .attr('text-anchor', 'end')
        .attr('fill', '#E2E8F0')
        .attr('font-size', '10px')
        .attr('font-weight', '600')
        .style('cursor', 'pointer')
        .text((d) => d.tag)
        .on('click', (_event, d) => {
          playClickSound();
          onSelectTopic(d.tag.replace('#', ''));
        });

      // Views and Growth value label on the right
      g.selectAll('.bar-value')
        .data(displayedTopics)
        .enter()
        .append('text')
        .attr('class', 'bar-value')
        .attr('x', (d) => xScale(d.views) + 6)
        .attr('y', (d) => (yScale(d.tag) || 0) + yScale.bandwidth() / 2 + 3.5)
        .attr('fill', (d) => d.color)
        .attr('font-size', '9.5px')
        .attr('font-weight', '700')
        .text((d) => d.formattedViews);
    }
  }, [displayedTopics, viewMode, onSelectTopic]);

  return (
    <div className="p-3 border-b border-zinc-800 bg-[#121418]">
      {/* Header controls: Title, Filters, View Mode Toggle */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <TrendingUp size={14} className="text-[#00FF88]" />
          <span className="text-[11px] font-bold text-white tracking-wide uppercase flex items-center gap-1">
            Trending Topics
            <Sparkles size={11} className="text-[#FFD700]" />
          </span>
        </div>

        {/* View Switcher: Bubble Cloud vs Bar Chart */}
        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
          <button
            onClick={() => {
              playClickSound();
              setViewMode('bubbles');
            }}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 transition-all ${
              viewMode === 'bubbles'
                ? 'bg-[#00FF88] text-black shadow-sm font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="D3 Bubble Cloud"
          >
            <Disc size={10} />
            Bubbles
          </button>
          <button
            onClick={() => {
              playClickSound();
              setViewMode('bars');
            }}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 transition-all ${
              viewMode === 'bars'
                ? 'bg-[#00FF88] text-black shadow-sm font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="D3 Engagement Bar Chart"
          >
            <BarChart3 size={10} />
            Rank
          </button>
        </div>
      </div>

      {/* Filter Category Pills */}
      <div className="flex items-center gap-1.5 mb-2 overflow-x-auto no-scrollbar">
        {(['All', 'Hashtag', 'Category'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => {
              playClickSound();
              setFilterType(cat);
            }}
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium transition-all ${
              filterType === cat
                ? 'bg-zinc-800 text-[#00FF88] border border-[#00FF88]/50 shadow-[0_0_8px_rgba(0,255,136,0.15)] font-semibold'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            {cat === 'All' ? 'All Trends' : cat === 'Hashtag' ? 'Hashtags #' : 'Categories ⚡'}
          </button>
        ))}
        <span className="text-[10px] text-zinc-500 ml-auto shrink-0 flex items-center gap-0.5">
          <Flame size={11} className="text-orange-400" />
          Live D3 Visual
        </span>
      </div>

      {/* D3 SVG Container */}
      <div
        ref={containerRef}
        className="w-full relative flex items-center justify-center bg-black/40 rounded-xl border border-zinc-800/80 p-1 overflow-hidden min-h-[190px]"
      >
        <svg ref={svgRef} className="overflow-visible select-none" />
      </div>

      {/* Dynamic Hover / Active Engagement Badge */}
      <div className="mt-2 min-h-[22px] flex items-center justify-between px-1">
        {hoveredTopic ? (
          <div className="flex items-center justify-between w-full text-[10px] animate-fadeIn">
            <span className="font-bold text-white flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: hoveredTopic.color }} />
              {hoveredTopic.tag}
              <span className="text-zinc-400 font-normal">({hoveredTopic.name})</span>
            </span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <Eye size={10} /> {hoveredTopic.formattedViews} views •
              <span className="text-amber-400 font-bold">+{hoveredTopic.growth}% ↗</span>
            </span>
          </div>
        ) : (
          <p className="text-[10px] text-zinc-400 flex items-center gap-1">
            <span className="text-[#00FF88]">💡</span> Tap any bubble or bar to search and explore matching reels
          </p>
        )}
      </div>
    </div>
  );
};
