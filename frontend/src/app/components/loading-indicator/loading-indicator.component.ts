import {
  Component,
  ContentChild,
  Input,
  TemplateRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { AsyncPipe, NgTemplateOutlet } from '@angular/common';
import {
  RouteConfigLoadEnd,
  RouteConfigLoadStart,
  Router,
} from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable, tap } from 'rxjs';

import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-loading-indicator',
  imports: [MatProgressSpinnerModule, AsyncPipe, NgTemplateOutlet],
  templateUrl: './loading-indicator.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './loading-indicator.component.scss',
})
export class LoadingIndicatorComponent {
  loading$: Observable<boolean>;

  @Input()
  detectRouteTransitions = false;

  @ContentChild('loading')
  customLoadingIndicator: TemplateRef<any> | null = null;

  constructor(
    private loadingService: LoadingService,
    private router: Router,
  ) {
    this.loading$ = this.loadingService.loading$;
  }

  ngOnInit() {
    if (this.detectRouteTransitions) {
      this.router.events
        .pipe(
          tap(event => {
            if (event instanceof RouteConfigLoadStart) {
              this.loadingService.loadingOn();
            } else if (event instanceof RouteConfigLoadEnd) {
              this.loadingService.loadingOff();
            }
          }),
        )
        .subscribe();
    }
  }
}
