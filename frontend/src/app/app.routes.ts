import { Routes } from '@angular/router';
import { LoginPageComponent } from './components/login-page/login-page.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { AboutComponent } from './components/about/about.component';
import { GettingStartedComponent } from './components/getting-started/getting-started.component';
import { AuthGuard } from './auth.guard';
import { CreateExamComponent } from './components/create-exam/create-exam.component';
import { DebugComponent } from './components/debug/debug.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginPageComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'about', component: AboutComponent, canActivate: [AuthGuard] },
  { path: 'getting-started', component: GettingStartedComponent, canActivate: [AuthGuard] },
  { path: 'create-exam', component: CreateExamComponent, canActivate: [AuthGuard] },
  { path: 'debug', component: DebugComponent, canActivate: [AuthGuard] },
];
