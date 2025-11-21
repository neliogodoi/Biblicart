
import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
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
export class WordSelectionComponent implements OnInit {
  gameService = inject(GameService);
  firebaseService = inject(FirebaseService);
  
  words = signal<string[]>([]);
  selectedWord = signal<string | null>(null);

  ngOnInit(): void {
    this.words.set(this.firebaseService.getWordsToChoose());
  }

  chooseWord(word: string): void {
    this.selectedWord.set(word);
    const room = this.gameService.room();
    if (room) {
        this.firebaseService.chooseWord(room.id, room.currentRound, word);
    }
  }
}
