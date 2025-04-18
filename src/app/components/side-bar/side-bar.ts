import { Component, EventEmitter, Output } from "@angular/core";


@Component({
    selector: 'app-side-bar',
    templateUrl: './side-bar.html',
    styleUrl: './side-bar.css'
})

export class SideBar {
    @Output() selectedComponent = new EventEmitter<string>();

    buttons = [
        { name: 'LiDAR' }
    ];
    
    selectComponent(component:string) {
        this.selectedComponent.emit(component);
    }
 }