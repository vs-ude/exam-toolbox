import { trigger, transition, style, animate } from '@angular/animations';

export const TaskAnimations = {
  inOutAnimation: trigger('inOutAnimation', [
    transition(':enter', [
      style({ height: 0, opacity: 0 }),
      animate('0.2s ease-out', style({ height: '*', opacity: 1 })),
    ]),
    transition(':leave', [
      style({ height: '*', opacity: 1 }),
      animate('.2s ease-in', style({ height: 0, opacity: 0 })),
    ]),
  ]),
  leftRightAnimation: trigger('leftRightAnimation', [
    transition(':enter', [
      style({ height: 0, opacity: 0, transform: 'translateX(-100%)' }),
      animate(
        '0.1s ease-out',
        style({ height: '*', opacity: 1, transform: 'translateX(0%)' }),
      ),
    ]),
    transition(':leave', [
      style({ height: '*', opacity: 1, transform: 'translateX(0%)' }),
      animate(
        '0.1s ease-in',
        style({ height: 0, opacity: 0, transform: 'translateX(100%)' }),
      ),
    ]),
  ]),
};
