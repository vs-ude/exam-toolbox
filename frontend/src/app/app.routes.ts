import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { AboutComponent } from './components/about/about.component';
import { GettingStartedComponent } from './components/getting-started/getting-started.component';
import { CreateExamComponent } from './components/create-exam/create-exam.component';
import { DebugComponent } from './components/debug/debug.component';
import { TaskPoolComponent } from './components/task-pool/task-pool.component';
import { ExamsPoolComponent } from './components/exams-pool/exams-pool.component';
import { SearchComponent } from './components/search/search.component';
import { LoginComponent } from './components/login/login.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'about', component: AboutComponent },
      { path: 'getting-started', component: GettingStartedComponent },
      { path: 'create-exam/:id', component: CreateExamComponent },
      { path: 'create-exam', component: CreateExamComponent },
      { path: 'debug', component: DebugComponent },
      { path: 'task-pool', component: TaskPoolComponent },
      { path: 'exams-pool', component: ExamsPoolComponent },
      { path: 'search/:text', component: SearchComponent },
      { path: 'search', component: SearchComponent },
    ],
  },
];
