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

	async startGame(): Promise<void> {
		const room = this.gameService.room();
		const players = this.gameService.players();
		if (room && this.gameService.isHost() && players.length > 1) {
			try {
				await this.firebaseService.startGame(room.id, players);
			} catch (error: any) {
				console.error("Failed to start game:", error);
				alert(`Ocorreu um erro ao iniciar o jogo: ${error.message}`);
			}
		}
	}

	copyCode() {
		const code = this.gameService.room()?.code;
		if (code) {
			navigator.clipboard.writeText(code);
			// Maybe show a small toast notification here in a real app
		}
	}
}
