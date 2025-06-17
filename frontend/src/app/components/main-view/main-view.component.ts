import { Component } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav'
import { MatListModule } from '@angular/material/list'
import { RouterOutlet, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button'
import { ThemeToggleService } from '../../services/theme-toggle.service';
import { MatIcon } from '@angular/material/icon';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-main-view',
  standalone: true,
  imports: [MatSidenavModule, MatListModule, RouterOutlet, MatButtonModule, RouterModule, MatIcon],
  templateUrl: './main-view.component.html',
  styleUrl: './main-view.component.scss'
})
export class MainViewComponent {
  username: string = ""
  initialLetter: string = ""

  constructor(
    private themeToggleService: ThemeToggleService,
    private api: ApiService
  ){}

  ngOnInit(){
    this.api.getUser().subscribe(
      user => {
        this.username = user.id
        this.initialLetter = user.id[0]
      }
    )
  }

  onLogout(){
    console.log("-- Logging out --")
    window.location.href = '/auth/logout'
  }

  toggleTheme() {
    this.themeToggleService.toggleTheme();
  }

  setUsername(name: string){
    this.username = name
    this.initialLetter = name[0]
  }
}
