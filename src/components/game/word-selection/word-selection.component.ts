
import { ChangeDetectionStrategy, Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService } from '../../../services/game.service';
import { FirebaseService } from '../../../services/firebase.service';

@Component({
  selector: 'app-word-selection',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './word-selection.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WordSelectionComponent implements OnInit, OnDestroy {
  gameService = inject(GameService);
  firebaseService = inject(FirebaseService);
  
  words = signal<string[]>([]);
  selectedWord = signal<string | null>(null);
  countdown = signal(20);
  private timerId: any;

  ngOnInit(): void {
    this.words.set(this.firebaseService.getWordsToChoose());
    // Clear the canvas for the new round when this component loads for the new drawer
    const room = this.gameService.room();
    if (room) {
      this.firebaseService.clearCanvas(room.id);
    }
    this.startCountdown();
  }

  ngOnDestroy(): void {
    this.stopCountdown();
  }

  chooseWord(word: string): void {
    this.selectedWord.set(word);
    this.stopCountdown();
    const room = this.gameService.room();
    if (room) {
        this.firebaseService.chooseWord(room.id, room.currentRound, word);
    }
  }

  private startCountdown(): void {
    this.countdown.set(20);
    this.timerId = setInterval(() => {
      const next = this.countdown() - 1;
      this.countdown.set(next);
      if (next <= 0) {
        this.stopCountdown();
        this.handleTimeout();
      }
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private handleTimeout(): void {
    if (this.selectedWord()) return;
    const room = this.gameService.room();
    if (room) {
      this.firebaseService.skipWordSelection(room.id);
    }
  }
}
