import { Component, OnInit, OnDestroy } from '@angular/core';
import * as d3 from 'd3';

@Component({
  selector: 'app-lidar-graph',
  standalone: true,
  template: `<div>
    <figure id="graph"></figure>
  </div>`
})
export class LidarGraph implements OnInit, OnDestroy {
  width = 500;
  height = 500;
  radius = Math.min(this.width, this.height) / 2 - 10;
  svg: any;
  rScale: any;
  websocket: WebSocket | null = null;
  connectionStatus: 'connecting' | 'connected' | 'error' = 'connecting';
  reconnectAttempts = 0;
  maxReconnectAttempts = 5;
  dataStats: any = null;
  
  gridColor = "#99FFBF";
  axisColor = "#99FFBF";
  labelColor = "#FFFFFF";
  backgroundColor = "#f8f8f8";

  ngOnInit() {
    this.initializeGraph();
    this.connectToLidarServer();
  }

  ngOnDestroy() {
    this.cleanupWebSocket();
  }

  cleanupWebSocket() {
    if (this.websocket) {
      this.websocket.onopen = null;
      this.websocket.onmessage = null;
      this.websocket.onerror = null;
      this.websocket.onclose = null;
      
      if (this.websocket.readyState === WebSocket.OPEN || 
          this.websocket.readyState === WebSocket.CONNECTING) {
        this.websocket.close();
      }
      this.websocket = null;
    }
  }

  connectToLidarServer() {
    this.cleanupWebSocket();
    
    this.connectionStatus = 'connecting';
    const serverUrl = 'ws://10.59.48.166:8801';
    
    try {
      console.log(`Connecting to ${serverUrl}...`);
      this.websocket = new WebSocket(serverUrl);
      
      this.websocket.onopen = () => {
        console.log('Connected to LiDAR server');
        this.connectionStatus = 'connected';
        this.reconnectAttempts = 0;
        
        if (this.websocket) {
          this.websocket.send('start');
          console.log('Sent start message');
        }
      };

      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (!data.angle || !data.distance || !data.quality ||
              !Array.isArray(data.angle) || !Array.isArray(data.distance) || !Array.isArray(data.quality)) {
            console.warn('Invalid data format from server:', data);
            return;
          }
          
          if (data.angle.length !== data.distance.length || data.angle.length !== data.quality.length) {
            console.warn('Mismatched array lengths in data');
            return;
          }
          
          const stats = {
            points: data.angle.length,
            minAngle: Math.min(...data.angle),
            maxAngle: Math.max(...data.angle),
            minDistance: Math.min(...data.distance),
            maxDistance: Math.max(...data.distance),
            minQuality: Math.min(...data.quality),
            maxQuality: Math.max(...data.quality)
          };
                    
          this.dataStats = stats;
          this.processLidarData(data);
        } catch (error) {
          console.error('Error processing LiDAR data:', error);
        }
      };

      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.connectionStatus = 'error';
      };

      this.websocket.onclose = (event) => {
        console.log(`WebSocket closed: ${event.code} ${event.reason}`);
        this.connectionStatus = 'error';
        
        if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
          setTimeout(() => this.connectToLidarServer(), 2000);
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      this.connectionStatus = 'error';
    }
  }

  initializeGraph() {
    d3.select("figure#graph").selectAll("*").remove();
    
    this.svg = d3.select("figure#graph")
      .append("svg")
      .attr("width", this.width)
      .attr("height", this.height)
      .append("g")
      .attr("transform", `translate(${this.width / 2},${this.height / 2})`);

    this.rScale = d3.scaleLinear()
      .domain([0, 4000]) // Max 4000mm (4m) 
      .range([0, this.radius]);
    /*
    const defs = this.svg.append("defs");
    const filter = defs.append("filter")
    .attr("id", "glow")
    .attr("x", "-50%")
    .attr("y", "-50%")
    .attr("width", "200%")
    .attr("height", "200%")

    filter.append("feGaussianBlur")
    .attr("stdDeviation", "3")
    .attr("result", "coloredBlur")

    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode")
    .attr("in", "coloredBlur")
    feMerge.append("feMerge")
    .attr("in", "SourceGraphic") */

     

    // Add the polar grid
    this.addPolarGrid();
  }

  addPolarGrid() {
    const radialGridLines = [500, 1000, 1500, 2000, 2500, 3000, 3500, 4000];
    
    radialGridLines.forEach(distance => {
      this.svg.append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", this.rScale(distance))
        .attr("fill", "none")
        .attr("stroke", this.gridColor)
        .attr("stroke-dasharray", "2,2")
        .attr("stroke-width", 0.5);
      
      this.svg.append("text")
        .attr("x", 5)
        .attr("y", -this.rScale(distance))
        .attr("dy", "0.3em")
        .attr("fill", this.labelColor)
        .style("font-size", "10px")
        .text(`${distance}mm`);
    });

    this.svg.append("line")
      .attr("x1", -this.radius)
      .attr("y1", 0)
      .attr("x2", this.radius)
      .attr("y2", 0)
      .attr("stroke", this.axisColor)
      .attr("stroke-width", 1);
      
    this.svg.append("line")
      .attr("x1", 0)
      .attr("y1", -this.radius)
      .attr("x2", 0)
      .attr("y2", this.radius)
      .attr("stroke", this.axisColor)
      .attr("stroke-width", 1);

    const angleLines = [];
    for (let i = 0; i < 360; i += 30) {
      if (i % 90 !== 0) {
        angleLines.push(i);
      }
    }

    angleLines.forEach(angle => {
      const radians = (angle * Math.PI) / 180;
      const x = this.radius * Math.cos(radians);
      const y = this.radius * Math.sin(radians);
      
      this.svg.append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", x)
        .attr("y2", y)
        .attr("stroke", this.gridColor)
        .attr("stroke-dasharray", "2,2")
        .attr("stroke-width", 0.5);
    });
    
    for (let i = 0; i < 360; i += 45) {
      const radians = (i * Math.PI) / 180;
      const labelX = (this.radius + 15) * Math.cos(radians);
      const labelY = (this.radius + 15) * Math.sin(radians);
      
      this.svg.append("text")
        .attr("x", labelX)
        .attr("y", labelY)
        .attr("text-anchor", "middle")
        .attr("dy", "0.3em")
        .attr("fill", this.labelColor)
        .style("font-size", "10px")
        .text(`${i}°`);
    }
    
    this.svg.append("circle")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("r", this.radius)
      .attr("fill", "none")
      .attr("stroke", this.axisColor)
      .attr("stroke-width", 1);
  }

  processLidarData(data: any) {
    try {
      const formattedData = [];
      
      for (let i = 0; i < data.angle.length; i++) {
        const angle = data.angle[i];
        const distance = data.distance[i];
        const quality = data.quality[i];
        
        if (distance > 10 && distance < 4000 && quality > 0) {
          formattedData.push({
            angle: (angle * Math.PI) / 180, 
            distance: distance,
            intensity: quality
          });
        }
      }

      if (formattedData.length > 0) {
        if (Math.random() < 0.1) {
          this.svg.selectAll("circle.lidar-point").remove();
        }
        
        this.updateLidar(formattedData);
      }
    } catch (error) {
      console.error('Error processing data:', error);
    }
  }

  updateLidar(data: any[]) {
    try {
      data.forEach(point => { 
        const x = this.rScale(point.distance) * Math.cos(point.angle);
        const y = this.rScale(point.distance) * Math.sin(point.angle);
        const angle = (point.angle * Math.PI)/180;
        const radius = this.rScale(point.distance)
        
        const normalizedIntensity = Math.min(1, Math.max(0, point.intensity / 50));
        const colorValue = Math.floor(255 * normalizedIntensity);
        const color = `rgb(${colorValue}, ${colorValue}, ${colorValue})`;

        /*
        const trailLength = radius * 0.3;
        const innerX = (radius - trailLength) * Math.cos(angle);
        const innerY = (radius - trailLength) * Math.sin(angle);

        this.svg.append("path")
          .attr("class", "radar-blip")
          .attr("d", `M ${innerX} ${innerY} L ${x} ${y}`)
          .attr("stroke-width", 5)
          .attr("stroke", "rgba(0, 255, 0, 0.5)")
          .attr("stroke-linecap", "round")
          .attr("filter", "url(#glow)"); */

        this.svg.append("circle")
          .attr("class", "lidar-point")
          .attr("cx", x)
          .attr("cy", y)
          .attr("r", 2)
          .attr("fill", color);
      });
      

    const maxPoints = 1000;
    const points = this.svg.selectAll("circle.lidar-point");
    if (points.size() > maxPoints) {
      // Use arrow function to maintain correct 'this' context
      points.each((d: any, i: number, nodes: any[]) => {
        if (i < points.size() - maxPoints) {
          d3.select(nodes[i]).remove();
        }
      });
    }
    } catch (error) {
      console.error('Error updating visualization:', error);
    }
  }
}