
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { GameService } from '../../../services/game.service';
import { FirebaseService } from '../../../services/firebase.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatComponent {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  gameService = inject(GameService);
  firebaseService = inject(FirebaseService);
  
  guessText = signal('');

  constructor() {
    effect(() => {
        // Triggered when guesses change
        this.gameService.guesses();
        this.scrollToBottom();
    });
  }

  submitGuess(): void {
    const text = this.guessText().trim();
    const room = this.gameService.room();
    const round = this.gameService.round();
    const player = this.gameService.currentPlayer();
    const isDrawer = this.gameService.isDrawer();

    if (!text || !room || !round?.secretWord || !player || isDrawer) return;

    this.firebaseService.submitGuess(room.id, {
        text: text,
        secretWord: round.secretWord,
        playerId: player.id,
        playerName: player.name
    });
    this.guessText.set('');
  }

  private scrollToBottom(): void {
    setTimeout(() => {
        try {
            if(this.scrollContainer) {
                this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
            }
        } catch(err) { }
    }, 10);
  }
}
