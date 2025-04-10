import { Component } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav'
import { MatListModule } from '@angular/material/list'
import { RouterOutlet, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MatButtonModule } from '@angular/material/button'
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-main-view',
  standalone: true,
  imports: [MatSidenavModule, MatListModule, RouterOutlet, MatButtonModule, RouterModule, ThemeToggleComponent],
  templateUrl: './main-view.component.html',
  styleUrl: './main-view.component.scss'
})
export class MainViewComponent {

  constructor(
    private authService: AuthService,
  ){}

  onLogout(){
    this.authService.logout();
  }
}
