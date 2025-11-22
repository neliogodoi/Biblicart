
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
  private roundUnsubscribe: Unsubscribe | null = null;

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
    const roomUnsub = onSnapshot(roomRef, 
      (docSnap) => {
        if (docSnap.exists()) {
          this.room.set({ id: docSnap.id, ...docSnap.data() } as Room);
        } else {
          console.error('A sala não existe.');
          alert('Erro: A sala que você está tentando acessar não existe.');
          this.router.navigate(['/']);
          this.cleanup();
        }
      },
      (error) => {
        console.error("Erro ao escutar o documento da sala:", error);
        alert("Não foi possível conectar à sala. Verifique suas Regras de Segurança do Firestore. Você será redirecionado para a página inicial.");
        this.router.navigate(['/']);
        this.cleanup();
      }
    );
    this.unsubscribes.push(roomUnsub);

    const playersQuery = query(collection(this.firestore, `rooms/${roomId}/players`), orderBy('joinedAt'));
    const playersUnsub = onSnapshot(playersQuery, 
      (querySnap) => {
        this.players.set(querySnap.docs.map(d => ({ id: d.id, ...d.data() } as Player)));
      },
      (error) => {
        console.error("Erro ao escutar a coleção de jogadores:", error);
      }
    );
    this.unsubscribes.push(playersUnsub);

    const strokesQuery = query(collection(this.firestore, `rooms/${roomId}/strokes`), orderBy('createdAt'));
    const strokesUnsub = onSnapshot(strokesQuery, 
      (querySnap) => {
         this.strokes.set(querySnap.docs.map(d => ({ id: d.id, ...d.data() } as Stroke)));
      },
      (error) => {
        console.error("Erro ao escutar a coleção de desenhos:", error);
      }
    );
    this.unsubscribes.push(strokesUnsub);

    const guessesQuery = query(collection(this.firestore, `rooms/${roomId}/guesses`), orderBy('createdAt'));
    const guessesUnsub = onSnapshot(guessesQuery, 
      (querySnap) => {
        this.guesses.set(querySnap.docs.map(d => ({ id: d.id, ...d.data() } as Guess)));
      },
      (error) => {
        console.error("Erro ao escutar a coleção de palpites:", error);
      }
    );
    this.unsubscribes.push(guessesUnsub);
  }

  listenToRound(roomId: string, roundNumber: number): void {
    if (this.roundUnsubscribe) {
        this.roundUnsubscribe();
        this.roundUnsubscribe = null;
    }

     if (roundNumber > 0 && this.firestore) {
        const roundRef = doc(this.firestore, `rooms/${roomId}/rounds/${roundNumber}`);
        this.roundUnsubscribe = onSnapshot(roundRef, 
          (docSnap) => {
            if (docSnap.exists()) {
                this.round.set({ id: docSnap.id, ...docSnap.data() } as Round);
            } else {
                this.round.set(null);
            }
          },
          (error) => {
            console.error(`Erro ao escutar a rodada ${roundNumber}:`, error);
            this.round.set(null);
          }
        );
     } else {
        this.round.set(null);
     }
  }

  cleanup(): void {
    this.unsubscribes.forEach(unsub => unsub());
    this.unsubscribes = [];
    if (this.roundUnsubscribe) {
        this.roundUnsubscribe();
        this.roundUnsubscribe = null;
    }
    this.room.set(null);
    this.players.set([]);
    this.strokes.set([]);
    this.guesses.set([]);
    this.round.set(null);
  }
}
