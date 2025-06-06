import { Component } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav'
import { MatListModule } from '@angular/material/list'
import { RouterOutlet, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button'
import { ThemeToggleService } from '../../services/theme-toggle.service';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-main-view',
  standalone: true,
  imports: [MatSidenavModule, MatListModule, RouterOutlet, MatButtonModule, RouterModule, MatIcon],
  templateUrl: './main-view.component.html',
  styleUrl: './main-view.component.scss'
})
export class MainViewComponent {

  constructor(
    private themeToggleService: ThemeToggleService,
  ){}

  onLogout(){
    console.log("Logging out")
  }

  toggleTheme() {
    this.themeToggleService.toggleTheme();
  }
}
