import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { AboutComponent } from './components/about/about.component';
import { GettingStartedComponent } from './components/getting-started/getting-started.component';
import { CreateExamComponent } from './components/create-exam/create-exam.component';
import { DebugComponent } from './components/debug/debug.component';
import { TaskPoolComponent } from './components/task-pool/task-pool.component';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent},
  { path: 'about', component: AboutComponent},
  { path: 'getting-started', component: GettingStartedComponent},
  { path: 'create-exam/:id', component: CreateExamComponent},
  { path: 'create-exam', component: CreateExamComponent},
  { path: 'debug', component: DebugComponent},
  { path: 'task-pool', component: TaskPoolComponent},
];
