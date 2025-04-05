import { Component } from "@angular/core";
import { CommonModule } from "@angular/common"; 
import { SideBar } from "../side-bar/side-bar";
import { DriverStationComponent } from "../driverstation/driverstation";
import { CameraComponent } from "../camera/camera";
import { LiDARComponent } from "../lidar/lidar";

@Component({
    selector: 'app-main-container',
    templateUrl: './main-container.html',
    styleUrl: './main-container.css',
    imports: [ CommonModule, SideBar, DriverStationComponent, LiDARComponent, CameraComponent ]
})

export class MainContainer { 
    currentComponent: any; //atributo default de la clase
    handleSelectedComponent(component: string) {
        switch(component) {
            case 'Driver Station':
                this.currentComponent = DriverStationComponent;
                break;
            case 'LiDAR':
                this.currentComponent = LiDARComponent;
                break;
            case 'Cameras':
                this.currentComponent = CameraComponent;
                break;
            default:
                this.currentComponent = DriverStationComponent;
        }
    }
}