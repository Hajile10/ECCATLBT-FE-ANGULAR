import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { tokenInterceptor } from './app/api.service';
bootstrapApplication(AppComponent,{providers:[provideHttpClient(withInterceptors([tokenInterceptor]))]}).catch(console.error);
