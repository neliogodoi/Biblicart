
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService } from '../../services/game.service';
import { Player } from '../../interfaces/game';
import { Router } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';

@Component({
  selector: 'app-ranking',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ranking.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RankingComponent {
  gameService = inject(GameService);
  private router = inject(Router);
  private firebaseService = inject(FirebaseService);

  isRestarting = signal(false);

  sortedPlayers = computed(() => {
    return [...this.gameService.players()].sort((a, b) => b.score - a.score);
  });

  async restartInSameRoom() {
    const room = this.gameService.room();
    if (!room) return;
    if (!this.gameService.isHost()) {
      alert('Apenas o host pode reiniciar a partida nesta sala.');
      return;
    }

    this.isRestarting.set(true);
    try {
      await this.firebaseService.restartGame(room.id);
      // Após limpar, voltar ao lobby da mesma sala; host precisará iniciar novamente.
      this.router.navigate(['/room', room.id]);
    } catch (error: any) {
      console.error('Erro ao reiniciar sala:', error);
      alert(`Erro ao reiniciar sala: ${error.message || error}`);
    } finally {
      this.isRestarting.set(false);
    }
  }
}
