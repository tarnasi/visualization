import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const WellProgressChart = ({ 
  plannedStartDate, 
  plannedEndDate, 
  targetDepth, 
  actualData 
}) => {
  const svgRef = useRef(null);
  
  useEffect(() => {
    if (!svgRef.current || !actualData || actualData.length === 0) return;
    
    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove();
    
    const margin = { top: 60, right: 120, bottom: 80, left: 80 };
    const width = svgRef.current.clientWidth - margin.left - margin.right;
    const height = svgRef.current.clientHeight - margin.top - margin.bottom;
    
    const svg = d3.select(svgRef.current)
      .append('svg')
      .attr('width', svgRef.current.clientWidth)
      .attr('height', svgRef.current.clientHeight)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Parse dates
    const startDate = new Date(plannedStartDate);
    const endDate = new Date(plannedEndDate);
    const today = new Date();
    
    // X scale (time)
    const xScale = d3.scaleTime()
      .domain([startDate, endDate])
      .range([0, width]);
    
    // Y scale (depth - inverted)
    const maxActualDepth = d3.max(actualData, d => d.depth) || targetDepth;
    const yScale = d3.scaleLinear()
      .domain([0, Math.max(targetDepth, maxActualDepth)])
      .range([0, height]);
    
    // Add grid lines
    svg.append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data(yScale.ticks(10))
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .attr('stroke', '#333')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2,2');
    
    // Planned progress line (linear from start to end)
    const plannedLine = d3.line()
      .x(d => xScale(d.date))
      .y(d => yScale(d.depth));
    
    const plannedData = [
      { date: startDate, depth: 0 },
      { date: endDate, depth: targetDepth }
    ];
    
    svg.append('path')
      .datum(plannedData)
      .attr('fill', 'none')
      .attr('stroke', '#00ff00')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5')
      .attr('d', plannedLine);
    
    // Actual progress line (sample every 10th point for performance)
    const sampledData = actualData.filter((_, i) => i % 10 === 0 || i === actualData.length - 1);
    const actualLine = d3.line()
      .x(d => {
        const date = new Date(d.time);
        return xScale(date);
      })
      .y(d => yScale(d.depth))
      .curve(d3.curveMonotoneX);
    
    svg.append('path')
      .datum(sampledData)
      .attr('fill', 'none')
      .attr('stroke', '#0088ff')
      .attr('stroke-width', 3)
      .attr('d', actualLine);
    
    // Data points
    svg.selectAll('.data-point')
      .data(sampledData)
      .enter()
      .append('circle')
      .attr('class', 'data-point')
      .attr('cx', d => xScale(new Date(d.time)))
      .attr('cy', d => yScale(d.depth))
      .attr('r', 3)
      .attr('fill', '#0088ff')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1);
    
    // Today line (if within range)
    if (today >= startDate && today <= endDate) {
      svg.append('line')
        .attr('x1', xScale(today))
        .attr('x2', xScale(today))
        .attr('y1', 0)
        .attr('y2', height)
        .attr('stroke', '#ff0000')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5');
      
      svg.append('text')
        .attr('x', xScale(today))
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .attr('fill', '#ff0000')
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .text('Today');
    }
    
    // X axis
    const xAxis = d3.axisBottom(xScale)
      .ticks(8)
      .tickFormat(d3.timeFormat('%Y-%m-%d'));
    
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis)
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('fill', '#fff')
      .attr('font-size', '11px');
    
    svg.selectAll('.domain, .tick line')
      .attr('stroke', '#666');
    
    // Y axis
    const yAxis = d3.axisLeft(yScale)
      .ticks(10);
    
    svg.append('g')
      .call(yAxis)
      .selectAll('text')
      .attr('fill', '#fff')
      .attr('font-size', '11px');
    
    svg.selectAll('.domain, .tick line')
      .attr('stroke', '#666');
    
    // Axis labels
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height + 70)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .text('Date');
    
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -60)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .text('Depth (m)');
    
    // Title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', -30)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '18px')
      .attr('font-weight', 'bold')
      .text('Well Drilling Progress');
    
    // Legend
    const legend = svg.append('g')
      .attr('transform', `translate(${width + 20}, 0)`);
    
    const legendItems = [
      { label: 'Planned', color: '#00ff00', dasharray: '5,5' },
      { label: 'Actual', color: '#0088ff', dasharray: 'none' },
      { label: 'Today', color: '#ff0000', dasharray: '5,5' }
    ];
    
    legendItems.forEach((item, i) => {
      const legendRow = legend.append('g')
        .attr('transform', `translate(0, ${i * 25})`);
      
      legendRow.append('line')
        .attr('x1', 0)
        .attr('x2', 30)
        .attr('y1', 0)
        .attr('y2', 0)
        .attr('stroke', item.color)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', item.dasharray);
      
      legendRow.append('text')
        .attr('x', 35)
        .attr('y', 4)
        .attr('fill', '#fff')
        .attr('font-size', '12px')
        .text(item.label);
    });
    
  }, [plannedStartDate, plannedEndDate, targetDepth, actualData]);
  
  if (!actualData || actualData.length === 0) {
    return (
      <div style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: 'white',
        fontSize: '18px'
      }}>
        No Data Available
      </div>
    );
  }
  
  return (
    <div 
      ref={svgRef} 
      style={{ 
        width: '100%', 
        height: '100%', 
        backgroundColor: '#0a0a0a',
        overflow: 'hidden'
      }} 
    />
  );
};

export default WellProgressChart;
