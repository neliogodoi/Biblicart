
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService } from '../../services/game.service';
import { Player } from '../../interfaces/game';
import { Router } from '@angular/router';

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

  sortedPlayers = computed(() => {
    return [...this.gameService.players()].sort((a, b) => b.score - a.score);
  });

  goToHome() {
    this.router.navigate(['/']);
  }
}
