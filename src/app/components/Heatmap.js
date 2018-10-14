import React, { Component } from 'react';
import { extent, max, min } from 'd3-array';
import { select, event } from 'd3-selection';
import { scaleLinear, scaleTime, scaleBand } from 'd3-scale';
import { axisBottom, axisLeft } from 'd3-axis';
import { timeFormat, timeParse } from 'd3-time-format';
import { interpolateHslLong } from 'd3-interpolate';
import { interpolatePlasma } from 'd3-scale-chromatic';
import { transition } from 'd3-transition';

export default class Heatmap extends Component {
  constructor(props) {
    super(props)
  
    this.state = {
      baseTemp: 0,
      data: [],
      height: 600,
      width: 1200,
      padding: 50,
      startYear: 0,
      endYear: 0,
    }
    this.createHeatmap = this.createHeatmap.bind(this);
    this.fetchData = this.fetchData.bind(this);
    this.handleErrors = this.handleErrors.bind(this)
  }
  componentDidMount() {
    console.log('component mounted!');
    let address = 'https://raw.githubusercontent.com/freeCodeCamp/ProjectReferenceData/master/global-temperature.json'
    this.fetchData(address)
  }
  componentDidUpdate(prevProps, prevState) {
    console.log('update state: ', this.state.data);
    this.createHeatmap(this.state.data);
  }
  handleErrors(response) {
    if (!response.ok) throw Error(response.statusText);
    else return response
  }
  fetchData(address) {
    fetch(address)
      .then(this.handleErrors)
      .then(response => response.json())
      .then(data => {
        this.setState({ 
          baseTemp: data['baseTemperature'],
          data: data['monthlyVariance'],
          startYear: data['monthlyVariance'][0]['year'],
          endYear: data['monthlyVariance'][data['monthlyVariance'].length - 1]['year']
        });
      })
  }
  createHeatmap(data) {
    console.log('creating svg...');
    const node = this.node;
    const h = this.state.height,
          w = this.state.width,
          p = this.state.padding,
          pl = this.state.padding*1.5, // padding left because month names must be complete
          pb = this.state.padding*2, // bottom padding to allow for legends
          n = this.state.endYear - this.state.startYear, // total number of columns
          // spotWidth = (w - pl - p) / (this.state.endYear - this.state.startYear),
          spotWidth = (w - (pl + p)) / (n+1),
          spotHeight = (h - p - pb) / 12,
          formatYear = timeFormat('%Y'), // formatTime returns human-readable strings
          parseYear = timeParse('%Y'), // parseTime returns machine friendly date objects
          // xFormattedDomain = data.map(d => formatYear(new Date(d.year, 1))),
          xParsedDomain = data.map(d => parseYear(d.year)),
          parseMonth = timeParse('%m'),
          formatMonth = timeFormat('%B'),
          yParsedDomain = data.map(d => parseMonth(d.month)),
          maxTemp = max(data.map(d => d.variance)),
          minTemp = min(data.map(d => d.variance)),
          tooltip = select('#tooltip');

    // console.log('sample parseYear(1850): ', parseYear(1850));
    // console.log('xFormattedDomain: ', xFormattedDomain);
    console.log('xParsedDomain: ', xParsedDomain);
    // const xScale = scaleLinear()
    //                 .domain([startYear, endYear])
    //                 .range([p, w-p]);
    const xScale = scaleTime()
                    .domain(extent(xParsedDomain))
                    .range([pl, w-p]);
    const xAxis = axisBottom(xScale)
                    .tickFormat(d => formatYear(d))
    select(node).append('g')
      .attr('id', 'x-axis')
      .attr('transform', `translate(0, ${h-pb})`)
      .call(xAxis);

    // console.log('yParsedDomain: ', yParsedDomain);
    // console.log('sample parseMonth(1)): ', parseMonth(1));
    console.log('formatMonth(1): ', formatMonth(new Date(2000, 1)));
    const yScale = scaleBand()
                    .domain([12,11,10,9,8,7,6,5,4,3,2,1])
                    .range([h-pb, p]);
    const yAxis = axisLeft(yScale)
                    .tickFormat((d) => formatMonth(new Date(2000, d-1)));
    select(node).append('g')
      .attr('id', 'y-axis')
      .attr('transform', `translate(${pl}, 0)`)
      .call(yAxis);

    const myInterpolator = (temp, maxTemp, minTemp) => {
      return ((temp - minTemp) / (maxTemp - minTemp));
    }

    const handleMouseover = (d) => {
      console.log('moused over');
      tooltip.transition()
        .duration(100)
        .style('opacity', 0.9)
        .style('transform', 'scale(1) translateY(-76px)')
        .attr('data-year', d.Year)
      tooltip.html(`
        ${d.year} - ${formatMonth(new Date(2000, d.month - 1))}
        <br/><br/>
        ${(this.state.baseTemp + d.variance).toFixed(2)}&deg;C<br/>
        ${(d.variance < 0 ? "" : "+") + d.variance.toString()}&deg;C
      `)
    };
    const handleMouseMove = () => {
      tooltip.style('top', `${event.pageY}`)
        .style('left', event.pageX)
    };
    const handleMouseOut = () => {
      tooltip.transition()
        .duration(50)
        .style('opacity', 0)
        .style('transform', 'scale(0)')
    };
    
    select(node).append('g')
      .attr('id', 'plot-area')
      .selectAll('rect')
      .data(data).enter()
      .append('rect')
        .attr('class', 'spot')
        .attr('x', d => xScale(parseYear(d.year)))
        // .attr('y', d => yScale(parseMonth(d.month))-spotHeight/2)
        .attr('y', d => yScale(d.month))
        .attr('width', spotWidth)
        .attr('height', spotHeight)
        .style('stroke-width', '0')
        .on('mouseover', handleMouseover)
        .on('mousemove', handleMouseMove)
        .on('mouseout', handleMouseOut)
        .style('fill', d => (
          interpolatePlasma(myInterpolator(d.variance, maxTemp, minTemp))
        ));
    
    
  }
  
  render() {
    let startYear = this.state.startYear,
        endYear = this.state.endYear,
        baseTemp = this.state.baseTemp
    return (
      <div id='svg-container'>
        <svg ref={node => this.node = node}
          viewBox={`0 0 ${this.state.width} ${this.state.height}`}
          preserveAspectRatio='xMidYMid meet'>
          <text id='title'>Monthly Global Land Surface Temperature</text>
          <text id='subtitle'>{startYear}-{endYear}: base temp {baseTemp}&deg;C</text>
        </svg>
        <div id='tooltip' style={{'opacity' : 0}}></div>
      </div>
    )
  }
}
