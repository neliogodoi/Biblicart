import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { isFirebaseConfigValid } from './firebase.config';
import { CommonModule } from '@angular/common';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [RouterOutlet, CommonModule],
})
export class AppComponent {
  themeService = inject(ThemeService);
  isConfigValid = signal(isFirebaseConfigValid());
}
