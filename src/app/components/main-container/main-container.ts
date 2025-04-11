import { Component } from "@angular/core";
import { CommonModule } from "@angular/common"; 
import { SideBar } from "../side-bar/side-bar";
import { LiDARComponent } from "../lidar/lidar";

@Component({
    selector: 'app-main-container',
    templateUrl: './main-container.html',
    styleUrl: './main-container.css',
    imports: [ CommonModule, SideBar, LiDARComponent]
})

export class MainContainer { 
    currentComponent: any; 
    handleSelectedComponent(component: string) {
        switch(component) {
            case 'LiDAR':
                this.currentComponent = LiDARComponent;
                break;
            default:
                this.currentComponent = LiDARComponent;
        }
    }
}