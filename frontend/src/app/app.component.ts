import { Component } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { LoginPageComponent } from './components/login-page/login-page.component';
import { AuthService } from './services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, LoginPageComponent, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'exascan-toolbox';
  isLoggedIn = false;

  constructor(
    private authService: AuthService, 
    private router: Router
  ){}

  ngOnInit(): void{
    this.authService.userIsAuthenticated$.subscribe((isAuth: boolean) => {
      this.isLoggedIn = isAuth
      console.log("Authentication status: " + isAuth)

      if(isAuth){
        this.router.navigate(['/app'])
      }else{
        this.router.navigate(['/login'])
      }
    })
  }
}
