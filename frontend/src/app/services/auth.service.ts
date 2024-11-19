import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private isAuthenticated = new BehaviorSubject<boolean>(false);
  userIsAuthenticated$ = this.isAuthenticated.asObservable();

  constructor(
    private router: Router
  ){}

  login() {
    this.isAuthenticated.next(true);
    this.router.navigate(['/dashboard']);
  }

  logout() {
    this.isAuthenticated.next(false);
    this.router.navigate(['/login']);
  }
  
  getIsAuth(){
    return true; // for debug purposes 


    //return this.isAuthenticated
  }
}
