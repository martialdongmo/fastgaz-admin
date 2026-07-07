import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { AuthInterceptor } from './core/interceptor/interceptor-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([AuthInterceptor])),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes)
  ]
};
