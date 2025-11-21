
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FirebaseService } from '../../services/firebase.service';

@Component({
  standalone: true,
  imports: [FormsModule],
  templateUrl: './home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private firebaseService = inject(FirebaseService);
  private router = inject(Router);

  playerName = signal('');
  roomCode = signal('');
  isLoading = signal(false);
  showJoinForm = signal(false);

  async createRoom() {
    if (!this.playerName() || this.isLoading()) return;
    this.isLoading.set(true);
    try {
      const roomId = await this.firebaseService.createRoom(this.playerName());
      if (roomId) {
        this.router.navigate(['/room', roomId]);
      } else {
        // This case might not be reached if service throws, but is good for safety.
        alert('Could not create room.');
      }
    } catch (error: any) {
      console.error("Error creating room:", error);
      alert(`Failed to create room: ${error.message}`);
    } finally {
      this.isLoading.set(false);
    }
  }

  async joinRoom() {
    if (!this.playerName() || !this.roomCode() || this.isLoading()) return;
    this.isLoading.set(true);
    try {
      const roomId = await this.firebaseService.joinRoom(this.roomCode(), this.playerName());
      if (roomId) {
        this.router.navigate(['/room', roomId]);
      }
      // Error is handled inside the service with an alert, or if it returns null.
    } catch (error: any) {
      console.error("Error joining room:", error);
      alert(`Failed to join room: ${error.message}`);
    } finally {
      this.isLoading.set(false);
    }
  }
}
