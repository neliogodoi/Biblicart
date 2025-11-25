import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { GameService } from '../../services/game.service';
import { FirebaseService } from '../../services/firebase.service';
import { FormsModule } from '@angular/forms';

@Component({
	selector: 'app-lobby',
	standalone: true,
	imports: [FormsModule],
	templateUrl: './lobby.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LobbyComponent {
	gameService = inject(GameService);
	firebaseService = inject(FirebaseService);
	roundsInput = signal(7);
	isUpdatingRounds = signal(false);

	constructor() {
		effect(() => {
			const room = this.gameService.room();
			if (room) {
				this.roundsInput.set(room.maxRounds ?? 7);
			}
		}, { allowSignalWrites: true });
	}

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

	updateRoundsInput(value: number | string) {
		const parsed = Math.floor(Number(value));
		const clamped = Math.min(15, Math.max(1, isNaN(parsed) ? 1 : parsed));
		this.roundsInput.set(clamped);
	}

	async saveRounds() {
		const room = this.gameService.room();
		if (!room || !this.gameService.isHost()) return;

		this.isUpdatingRounds.set(true);
		try {
			await this.firebaseService.updateMaxRounds(room.id, this.roundsInput());
		} catch (error: any) {
			console.error('Falha ao atualizar número de rodadas:', error);
			alert(`Não foi possível salvar as rodadas: ${error.message || error}`);
		} finally {
			this.isUpdatingRounds.set(false);
		}
	}
}
