import { Component } from '@angular/core';
import { Header } from './components/header/header';
import { MainContainer } from './components/main-container/main-container';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  imports: [Header, MainContainer]
})
export class AppComponent { }
