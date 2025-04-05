import { Component, OnInit, OnDestroy } from '@angular/core';
import * as d3 from 'd3';

@Component({
  selector: 'app-lidar-graph',
  standalone: true,
  template: `<div>
    <figure id="graph"></figure>
    <div *ngIf="connectionStatus !== 'connected'" class="status-message">
      {{ connectionStatus === 'connecting' ? 'Connecting to LiDAR...' : 'Connection error. Please check if the LiDAR server is running.' }}
    </div>
    <div class="data-stats" *ngIf="dataStats">
      <p>Points: {{dataStats.points}}</p>
      <p>Angle range: {{dataStats.minAngle.toFixed(1)}}° to {{dataStats.maxAngle.toFixed(1)}}°</p>
      <p>Distance range: {{dataStats.minDistance.toFixed(1)}} to {{dataStats.maxDistance.toFixed(1)}}mm</p>
    </div>
  </div>`
})
export class LidarGraph implements OnInit, OnDestroy {
  width = 600;
  height = 600;
  radius = Math.min(this.width, this.height) / 2 - 10;
  svg: any;
  rScale: any;
  websocket: WebSocket | null = null;
  connectionStatus: 'connecting' | 'connected' | 'error' = 'connecting';
  reconnectAttempts = 0;
  maxReconnectAttempts = 5;
  dataStats: any = null;
  
  // Define colors for the grid
  gridColor = "#888";
  axisColor = "#555";
  labelColor = "#666";
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
    // Cleanup any existing connection first
    this.cleanupWebSocket();
    
    // Use server IP from your Python client
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
          // Match exact same message as your Python client
          this.websocket.send('start');
          console.log('Sent start message');
        }
      };

      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Validate the data format (must have angle, distance, and quality arrays)
          if (!data.angle || !data.distance || !data.quality ||
              !Array.isArray(data.angle) || !Array.isArray(data.distance) || !Array.isArray(data.quality)) {
            console.warn('Invalid data format from server:', data);
            return;
          }
          
          // Make sure all arrays are the same length
          if (data.angle.length !== data.distance.length || data.angle.length !== data.quality.length) {
            console.warn('Mismatched array lengths in data');
            return;
          }
          
          // Log data statistics (similar to your Python client)
          const stats = {
            points: data.angle.length,
            minAngle: Math.min(...data.angle),
            maxAngle: Math.max(...data.angle),
            minDistance: Math.min(...data.distance),
            maxDistance: Math.max(...data.distance),
            minQuality: Math.min(...data.quality),
            maxQuality: Math.max(...data.quality)
          };
          
          console.log(`Received ${stats.points} data points`);
          console.log(`Angle range: ${stats.minAngle.toFixed(1)}° to ${stats.maxAngle.toFixed(1)}°`);
          console.log(`Distance range: ${stats.minDistance.toFixed(1)} to ${stats.maxDistance.toFixed(1)}`);
          console.log(`Quality range: ${stats.minQuality} to ${stats.maxQuality}`);
          
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
    // Clear any existing SVG first
    d3.select("figure#graph").selectAll("*").remove();
    
    // Create SVG with background color
    this.svg = d3.select("figure#graph")
      .append("svg")
      .attr("width", this.width)
      .attr("height", this.height)
      .append("g")
      .attr("transform", `translate(${this.width / 2},${this.height / 2})`);

    // Create a scale for distance - adjust domain based on your LiDAR specs
    this.rScale = d3.scaleLinear()
      .domain([0, 4000]) // Max 4000mm (4m) - adjust if needed
      .range([0, this.radius]);

    // Add the polar grid
    this.addPolarGrid();
  }

  addPolarGrid() {
    // Add radial grid lines (circles)
    const radialGridLines = [1000, 2000, 3000, 4000];
    
    // Add circles for distance markers
    radialGridLines.forEach(distance => {
      this.svg.append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", this.rScale(distance))
        .attr("fill", "none")
        .attr("stroke", this.gridColor)
        .attr("stroke-dasharray", "2,2")
        .attr("stroke-width", 0.5);
      
      // Add text labels for distances
      this.svg.append("text")
        .attr("x", 5)
        .attr("y", -this.rScale(distance))
        .attr("dy", "0.3em")
        .attr("fill", this.labelColor)
        .style("font-size", "10px")
        .text(`${distance}mm`);
    });

    // Add main axes (x and y) with solid lines and different color
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

    // Add angular grid lines (straight lines from center)
    const angleLines = [];
    for (let i = 0; i < 360; i += 30) {
      // Skip 0, 90, 180, 270 as they're already covered by the main axes
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
    
    // Add angle labels at 45-degree intervals
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
    
    // Add outer ring to define the boundary
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
      // Create formatted data points from the raw data
      const formattedData = [];
      
      for (let i = 0; i < data.angle.length; i++) {
        const angle = data.angle[i];
        const distance = data.distance[i];
        const quality = data.quality[i];
        
        // Filter out invalid or extreme values
        if (distance > 10 && distance < 4000 && quality > 0) {
          formattedData.push({
            angle: (angle * Math.PI) / 180, // Convert degrees to radians
            distance: distance,
            intensity: quality
          });
        }
      }
      
      // Only update if we have valid points
      if (formattedData.length > 0) {
        // Clear and redraw every 10 frames to prevent buildup
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
      // Simple point rendering - no transitions for better performance
      data.forEach(point => {
        // Calculate x,y from polar coordinates
        const x = this.rScale(point.distance) * Math.cos(point.angle);
        const y = this.rScale(point.distance) * Math.sin(point.angle);
        
        // Map intensity to color (brighter for stronger returns)
        const normalizedIntensity = Math.min(1, Math.max(0, point.intensity / 50));
        const colorValue = Math.floor(255 * normalizedIntensity);
        const color = `rgb(${colorValue}, ${colorValue}, ${colorValue})`;
        
        // Draw the point
        this.svg.append("circle")
          .attr("class", "lidar-point")
          .attr("cx", x)
          .attr("cy", y)
          .attr("r", 2)
          .attr("fill", color);
      });
      
      // Limit the total number of points to prevent performance issues
      // Limit the total number of points to prevent performance issues
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