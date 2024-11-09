import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { CommonModule } from '@angular/common';
import { MainViewComponent } from './components/main-view/main-view.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, MainViewComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  isLoggedIn = false;
  private authSubscription!: Subscription

  constructor(
    private authService: AuthService,
  ){}

  ngOnInit(): void{
    this.authService.userIsAuthenticated$.subscribe((isAuth: boolean) => {
      this.isLoggedIn = isAuth
      console.log("Authentication status: " + isAuth)
    })
  }

  ngOnDestroy(){
    if(this.authSubscription){
      this.authSubscription.unsubscribe()
    }
  }
}
