
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { GameService } from '../../../services/game.service';
import { FirebaseService } from '../../../services/firebase.service';
import { SoundService } from '../../../services/sound.service';

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
  @ViewChild('guessInput') private guessInput!: ElementRef<HTMLInputElement>;

  gameService = inject(GameService);
  firebaseService = inject(FirebaseService);
  private sound = inject(SoundService);
  
  guessText = signal('');
  private lastGuessCount = 0;

  constructor() {
    effect(() => {
        // Triggered when guesses change
        const guesses = this.gameService.guesses();
        if (guesses.length > this.lastGuessCount) {
            const latest = guesses[guesses.length - 1];
            if (latest?.isCorrect) {
                this.sound.play('success');
            } else {
                this.sound.play('click');
            }
        }
        this.lastGuessCount = guesses.length;
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
        playerName: player.name,
    });
    this.sound.play('click');
    this.guessText.set('');
    // Remove foco para recolher o teclado em dispositivos móveis
    setTimeout(() => this.guessInput?.nativeElement?.blur(), 0);
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
