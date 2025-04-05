import { Component } from '@angular/core';
import { LidarGraph } from '../lidar-graph/lidar_graph';

@Component({
    selector: 'app-lidar',
    standalone: true, 
    templateUrl: './lidar.html',
    styleUrl: './lidar.css', 
    imports: [ LidarGraph ]
})

export class LiDARComponent {}