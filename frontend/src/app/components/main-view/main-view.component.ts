import { Component, ElementRef, ViewChild, viewChild } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { ThemeToggleService } from '../../services/theme-toggle.service';
import { MatIcon } from '@angular/material/icon';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { NgIf } from '@angular/common';

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
  ],
  templateUrl: './main-view.component.html',
  styleUrl: './main-view.component.scss',
})
export class MainViewComponent {
  public username: string = '';
  public initialLetter: string = '';
  public isNavCollapsed: boolean = false;
  @ViewChild('sidenav')
  sidenav!: ElementRef;
  @ViewChild('content')
  content!: ElementRef;

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

  toggleNavCollapse() {
    this.isNavCollapsed = !this.isNavCollapsed;
    this.sidenav.nativeElement.style.width = this.isNavCollapsed ? '0' : '12%';
    this.content.nativeElement.style.width = this.isNavCollapsed
      ? '100%'
      : '88%';
  }

  onSearch(search: string) {
    this.router.navigate([`/search/${search}`]);
  }
}
