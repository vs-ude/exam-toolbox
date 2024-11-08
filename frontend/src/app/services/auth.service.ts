import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userIsAuthenticated = new BehaviorSubject<boolean>(false)
  userIsAuthenticated$ = this.userIsAuthenticated.asObservable();


  constructor() { }

  getAuth(){
    return this.userIsAuthenticated
  }

  authUser(){
    this.userIsAuthenticated.next(true);
    localStorage.setItem
    console.log("User Authenticated")
  }

  logout(){
    this.userIsAuthenticated.next(false);
    console.log("User NOT Authenticated")
  }

  createUser(){
    // should create a new user
  }
}
