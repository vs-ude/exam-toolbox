/// <reference types="@angular/localize" />

import { bootstrapApplication } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
import localeEnGb from '@angular/common/locales/extra/en-GB';

registerLocaleData(localeDe, localeEnGb);

import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig).catch(err => console.error(err));
