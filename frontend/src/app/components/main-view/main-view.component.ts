import { Component } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

import { ThemeToggleService } from '../../services/theme-toggle.service';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { NgIf } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-main-view',
  standalone: true,
  imports: [
    MatSidenavModule,
    MatListModule,
    RouterOutlet,
    MatButtonModule,
    RouterModule,
    MatIcon,
    NgIf,
    MatToolbarModule,
    MatMenuModule,
    MatTooltipModule,
  ],
  templateUrl: './main-view.component.html',
  styleUrl: './main-view.component.scss',
})
export class MainViewComponent {
  public username: string = '';
  public initialLetter: string = '';
  public themeIcon: "dark_mode" | "light_mode" = "light_mode"
  public sidebarCollapsed = false;

  constructor(
    private themeToggleService: ThemeToggleService,
    private api: ApiService,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.api.getUser().subscribe(user => {
      this.username = user.name || user.sub;
      this.initialLetter = this.username ? this.username[0].toUpperCase() : '';
    });

    this.themeToggleService.themeChanged$.subscribe(theme => {
      this.themeIcon = theme === 'dark' ? 'dark_mode' : 'light_mode';
    });

    this.sidebarCollapsed = sessionStorage.getItem('sidebarCollapsed') === 'true';
  }

  isLoginPage(): boolean {
    return this.router.url.includes('/login');
  }

  onLogout() {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }

  toggleTheme() {
    this.themeToggleService.toggleTheme();
  }

  setUsername(name: string) {
    this.username = name;
    this.initialLetter = name[0];
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    sessionStorage.setItem('sidebarCollapsed', this.sidebarCollapsed.toString());
  }

  onSearch(search: string) {
    this.router.navigate([`/search/${search}`]);
  }
}
