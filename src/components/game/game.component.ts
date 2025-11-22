import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService } from '../../services/game.service';
import { CanvasComponent } from './canvas/canvas.component';
import { ChatComponent } from './chat/chat.component';
import { WordSelectionComponent } from './word-selection/word-selection.component';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule, CanvasComponent, ChatComponent, WordSelectionComponent],
  templateUrl: './game.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameComponent {
  gameService = inject(GameService);

  isPlayerListExpanded = signal(true);

  get maskedWord(): string {
    const word = this.gameService.round()?.secretWord;
    return word ? word.replace(/\w/g, '_') : '';
  }

  get drawerName(): string {
    const drawerId = this.gameService.round()?.drawerId;
    return this.gameService.players().find(p => p.id === drawerId)?.name || '...';
  }
}
