
import { ChangeDetectionStrategy, Component, inject, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GameService } from '../../services/game.service';
import { LobbyComponent } from '../lobby/lobby.component';
import { GameComponent } from '../game/game.component';
import { RankingComponent } from '../ranking/ranking.component';
import { CommonModule } from '@angular/common';
import { Room } from '../../interfaces/game';

@Component({
  standalone: true,
  imports: [CommonModule, LobbyComponent, GameComponent, RankingComponent],
  templateUrl: './room.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  gameService = inject(GameService);

  ngOnInit(): void {
    const roomId = this.route.snapshot.paramMap.get('id');
    if (roomId) {
      this.gameService.connectToRoom(roomId);
    }
  }

  ngOnDestroy(): void {
    this.gameService.cleanup();
  }
}
