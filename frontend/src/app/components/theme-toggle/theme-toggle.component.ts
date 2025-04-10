import { Component } from '@angular/core';
import { ThemeToggleService } from '../../services/theme-toggle.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [],
  templateUrl: './theme-toggle.component.html',
  styleUrl: './theme-toggle.component.scss'
})
export class ThemeToggleComponent {

  constructor(private themeToggleService: ThemeToggleService){}

  public toggle(){
    this.themeToggleService.toggleTheme();
  }

}
