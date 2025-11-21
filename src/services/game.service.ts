
import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Unsubscribe } from 'firebase/auth';
import { collection, doc, onSnapshot, query, orderBy, Firestore } from 'firebase/firestore';
import { Room, Player, Stroke, Guess, Round } from '../interfaces/game';
import { AuthService } from './auth.service';
import { FIRESTORE } from '../firebase.providers';

@Injectable({ providedIn: 'root' })
export class GameService {
  private authService = inject(AuthService);
  private router = inject(Router);
  private firestore = inject(FIRESTORE);

  // Raw state signals
  room = signal<Room | null>(null);
  players = signal<Player[]>([]);
  strokes = signal<Stroke[]>([]);
  guesses = signal<Guess[]>([]);
  round = signal<Round | null>(null);

  // Subscriptions
  private unsubscribes: Unsubscribe[] = [];

  // Computed signals for derived state
  user = this.authService.user;
  isHost = computed(() => this.user()?.uid === this.room()?.hostId);
  isDrawer = computed(() => this.user()?.uid === this.round()?.drawerId);
  currentPlayer = computed(() => this.players().find(p => p.id === this.user()?.uid));

  constructor() {
    effect(() => {
      const room = this.room();
      if (room) {
        this.listenToRound(room.id, room.currentRound);
      }
    }, { allowSignalWrites: true });
  }

  connectToRoom(roomId: string): void {
    this.cleanup();

    if (!this.firestore) {
      console.error("Firestore is not initialized. Check your Firebase config.");
      this.router.navigate(['/']);
      return;
    }

    const roomRef = doc(this.firestore, `rooms/${roomId}`);
    const roomUnsub = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) {
        this.room.set({ id: docSnap.id, ...docSnap.data() } as Room);
      } else {
        console.error('Room does not exist');
        this.router.navigate(['/']);
        this.cleanup();
      }
    });
    this.unsubscribes.push(roomUnsub);

    const playersQuery = query(collection(this.firestore, `rooms/${roomId}/players`), orderBy('joinedAt'));
    const playersUnsub = onSnapshot(playersQuery, (querySnap) => {
      this.players.set(querySnap.docs.map(d => ({ id: d.id, ...d.data() } as Player)));
    });
    this.unsubscribes.push(playersUnsub);

    const strokesQuery = query(collection(this.firestore, `rooms/${roomId}/strokes`), orderBy('createdAt'));
    const strokesUnsub = onSnapshot(strokesQuery, (querySnap) => {
       this.strokes.set(querySnap.docs.map(d => ({ id: d.id, ...d.data() } as Stroke)));
    });
    this.unsubscribes.push(strokesUnsub);

    const guessesQuery = query(collection(this.firestore, `rooms/${roomId}/guesses`), orderBy('createdAt'));
    const guessesUnsub = onSnapshot(guessesQuery, (querySnap) => {
      this.guesses.set(querySnap.docs.map(d => ({ id: d.id, ...d.data() } as Guess)));
    });
    this.unsubscribes.push(guessesUnsub);
  }

  listenToRound(roomId: string, roundNumber: number): void {
     if (roundNumber > 0 && this.firestore) {
        const roundRef = doc(this.firestore, `rooms/${roomId}/rounds/${roundNumber}`);
        const roundUnsub = onSnapshot(roundRef, (docSnap) => {
            if (docSnap.exists()) {
                this.round.set({ id: docSnap.id, ...docSnap.data() } as Round);
            } else {
                this.round.set(null);
            }
        });
        this.unsubscribes.push(roundUnsub);
     } else {
        this.round.set(null);
     }
  }

  cleanup(): void {
    this.unsubscribes.forEach(unsub => unsub());
    this.unsubscribes = [];
    this.room.set(null);
    this.players.set([]);
    this.strokes.set([]);
    this.guesses.set([]);
    this.round.set(null);
  }
}
