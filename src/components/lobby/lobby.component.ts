
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { GameService } from '../../services/game.service';
import { FirebaseService } from '../../services/firebase.service';

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [],
  templateUrl: './lobby.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LobbyComponent {
  gameService = inject(GameService);
  firebaseService = inject(FirebaseService);

  startGame(): void {
    const room = this.gameService.room();
    const players = this.gameService.players();
    if (room && this.gameService.isHost() && players.length > 1) {
      this.firebaseService.startGame(room.id, players);
    }
  }

  copyCode() {
    const code = this.gameService.room()?.code;
    if(code) {
      navigator.clipboard.writeText(code);
      // Maybe show a small toast notification here in a real app
    }
  }
}
