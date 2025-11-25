
import { Injectable, inject } from '@angular/core';
import {
  collection, addDoc, query, where, getDocs, doc, setDoc,
  writeBatch, updateDoc, increment, runTransaction, Firestore, getDoc, arrayUnion, Timestamp
} from 'firebase/firestore';
import { AuthService } from './auth.service';
import { Stroke, Guess, Player, Room } from '../interfaces/game';
import { biblicalWords } from '../data/words';
import { FIRESTORE } from '../firebase.providers';


@Injectable({ providedIn: 'root' })
export class FirebaseService {
  private authService = inject(AuthService);
  private firestore = inject(FIRESTORE);

  private async clearCollection(path: string): Promise<void> {
    const colRef = collection(this.firestore!, path);
    const snap = await getDocs(colRef);
    if (snap.empty) return;
    const batch = writeBatch(this.firestore!);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }

  private async generateRoomCode(): Promise<string> {
    if (!this.firestore) throw new Error("Serviço de dados não inicializado");

    let code: string;
    let codeExists = true;
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    while (codeExists) {
        code = '';
        for (let i = 0; i < 4; i++) {
            code += characters.charAt(Math.floor(Math.random() * characters.length));
        }

        const roomsRef = collection(this.firestore, 'rooms');
        const q = query(roomsRef, where('code', '==', code));
        const snapshot = await getDocs(q);
        codeExists = !snapshot.empty;
    }
    return code;
  }

  async createRoom(playerName: string, maxRounds = 7): Promise<string> {
    const user = await this.authService.signIn();
    const roomCode = await this.generateRoomCode();
    const safeMaxRounds = Math.min(15, Math.max(1, Math.floor(maxRounds) || 1));
    
    const newRoomRef = doc(collection(this.firestore, 'rooms'));
    
    const hostPlayer: Player = {
        id: user.uid,
        name: playerName,
        score: 0,
        joinedAt: Date.now(),
    };

    const newRoom: Omit<Room, 'id'> = {
      code: roomCode,
      hostId: user.uid,
      status: 'waiting',
      currentRound: 0,
      maxRounds: safeMaxRounds,
      createdAt: Date.now(),
      players: [hostPlayer],
    };

    await setDoc(newRoomRef, newRoom);

    return newRoomRef.id;
  }

  async joinRoom(roomCode: string, playerName: string): Promise<string | null> {
    const user = await this.authService.signIn();

    // 1. Encontrar a sala pelo código
    const roomsRef = collection(this.firestore, 'rooms');
    const q = query(roomsRef, where('code', '==', roomCode.toUpperCase()), where('status', '==', 'waiting'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      alert('Sala não encontrada ou jogo já iniciado.');
      return null;
    }

    const roomDocInitial = snapshot.docs[0];
    const roomRef = roomDocInitial.ref;
    const roomData = roomDocInitial.data() as Room;
    const players = roomData.players || [];

    // Verifica se o usuário já está na sala
    if (players.some(p => p.id === user.uid)) {
        return roomDocInitial.id; // Já está na sala
    }

    try {
        const newPlayer: Player = {
            id: user.uid,
            name: playerName,
            score: 0,
            joinedAt: Date.now(),
        };

        // USAR arrayUnion PARA ADICIONAR ATOMICAMENTE
        await updateDoc(roomRef, {
            players: arrayUnion(newPlayer)
        });
        
        return roomDocInitial.id;
    } catch (error) {
        console.error("Falha ao entrar na sala: ", error);
        alert("Falha ao entrar na sala. Tente novamente.");
        return null;
    }
  }

  async startGame(roomId: string, players: Player[]) {
    if (!this.firestore) return;
    if (players.length < 2) return;

    const batch = writeBatch(this.firestore);
    const roomRef = doc(this.firestore, `rooms/${roomId}`);
    
    batch.update(roomRef, {
        status: 'word-selection',
        currentRound: 1,
    });
    
    const firstDrawerId = players[0].id;
    const roundRef = doc(this.firestore, `rooms/${roomId}/rounds/1`);
    batch.set(roundRef, {
        drawerId: firstDrawerId,
        secretWord: '',
        startedAt: Date.now()
    });

    await batch.commit();
  }
  
  async chooseWord(roomId: string, round: number, word: string) {
    if (!this.firestore) return;

    const batch = writeBatch(this.firestore);
    const roundRef = doc(this.firestore, `rooms/${roomId}/rounds/${round}`);
    batch.update(roundRef, { secretWord: word });

    const roomRef = doc(this.firestore, `rooms/${roomId}`);
    batch.update(roomRef, { status: 'playing' });

    await batch.commit();
  }

  /**
   * Advances the game when the drawer fails to pick a word in time.
   */
  async skipWordSelection(roomId: string) {
    if (!this.firestore) return;

    await runTransaction(this.firestore, async (transaction) => {
      const roomRef = doc(this.firestore, `rooms/${roomId}`);
      const roomDoc = await transaction.get(roomRef);
      if (!roomDoc.exists()) throw new Error("Room does not exist!");

      const roomData = roomDoc.data() as Room;
      const players = [...roomData.players];
      if (players.length === 0) throw new Error("No players in room");

      const currentRound = roomData.currentRound;
      const maxRounds = roomData.maxRounds;

      const currentRoundRef = doc(this.firestore, `rooms/${roomId}/rounds/${currentRound}`);
      const currentRoundDoc = await transaction.get(currentRoundRef);
      const currentDrawerId = currentRoundDoc.exists()
        ? currentRoundDoc.data().drawerId
        : players[0].id;
      const drawerName = players.find(p => p.id === currentDrawerId)?.name || 'Jogador';

      if (currentRound >= maxRounds) {
        transaction.update(roomRef, { players, status: 'ended' });
        const messageRef = doc(collection(this.firestore, `rooms/${roomId}/guesses`));
        transaction.set(messageRef, {
          playerId: 'system',
          playerName: 'Sistema',
          text: `${drawerName}: Perdeu a vez!`,
          isCorrect: false,
          createdAt: Date.now(),
        });
        return;
      }

      const nextRound = currentRound + 1;
      const currentDrawerIndex = players.findIndex(p => p.id === currentDrawerId);
      const nextDrawerIndex = (currentDrawerIndex + 1) % players.length;
      const nextDrawerId = players[nextDrawerIndex].id;

      const nextRoundRef = doc(this.firestore, `rooms/${roomId}/rounds/${nextRound}`);
      transaction.set(nextRoundRef, {
        drawerId: nextDrawerId,
        secretWord: '',
        startedAt: Date.now()
      });

      transaction.update(roomRef, {
          players,
          status: 'word-selection',
          currentRound: nextRound,
      });

      const messageRef = doc(collection(this.firestore, `rooms/${roomId}/guesses`));
      transaction.set(messageRef, {
        playerId: 'system',
        playerName: 'Sistema',
        text: `${drawerName}: Perdeu a vez!`,
        isCorrect: false,
        createdAt: Date.now(),
      });
    });
  }

  async addStroke(roomId: string, stroke: Stroke) {
    if (!this.firestore) return;
    await addDoc(collection(this.firestore, `rooms/${roomId}/strokes`), {
        ...stroke,
        createdAt: Date.now()
    });
  }

  async clearCanvas(roomId: string) {
    if (!this.firestore) return;
    const strokesRef = collection(this.firestore, `rooms/${roomId}/strokes`);
    const q = query(strokesRef);
    const snapshot = await getDocs(q);
    const batch = writeBatch(this.firestore);
    snapshot.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }

  private normalizeString(str: string): string {
    if (!str) return '';
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
  }

  async submitGuess(roomId: string, guess: { text: string; secretWord: string; playerId: string; playerName: string; }) {
      if (!this.firestore) return;

      const isCorrect = this.normalizeString(guess.text) === this.normalizeString(guess.secretWord);
      
      const guessPayload: Omit<Guess, 'id'> = {
          playerId: guess.playerId,
          playerName: guess.playerName,
          text: guess.text,
          isCorrect,
          createdAt: Date.now()
      };

      await addDoc(collection(this.firestore, `rooms/${roomId}/guesses`), guessPayload);

      if (isCorrect) {
          await runTransaction(this.firestore, async (transaction) => {
              const roomRef = doc(this.firestore, `rooms/${roomId}`);
              const roomDoc = await transaction.get(roomRef);
              if (!roomDoc.exists()) throw new Error("Room does not exist!");

              const roomData = roomDoc.data() as Room;
              let players = [...roomData.players];
              const currentRound = roomData.currentRound;
              const maxRounds = roomData.maxRounds;
              
              const currentRoundRef = doc(this.firestore, `rooms/${roomId}/rounds/${currentRound}`);
              const currentRoundDoc = await transaction.get(currentRoundRef);
              if (!currentRoundDoc.exists()) throw new Error(`Round ${currentRound} doesn't exist`);
              
              const drawerId = currentRoundDoc.data().drawerId;

              // Update scores
              const guesserIndex = players.findIndex(p => p.id === guess.playerId);
              const drawerIndex = players.findIndex(p => p.id === drawerId);

              if (guesserIndex !== -1) {
                  players[guesserIndex].score += 10;
              }
              if (drawerIndex !== -1) {
                  players[drawerIndex].score += 5;
              }

              if (currentRound >= maxRounds) {
                  transaction.update(roomRef, { players, status: 'ended' });
              } else {
                  const nextRound = currentRound + 1;
                  
                  const currentDrawerIndex = players.findIndex(p => p.id === drawerId);
                  const nextDrawerIndex = (currentDrawerIndex + 1) % players.length;
                  const nextDrawerId = players[nextDrawerIndex].id;
                  
                  const nextRoundRef = doc(this.firestore, `rooms/${roomId}/rounds/${nextRound}`);
                  transaction.set(nextRoundRef, {
                    drawerId: nextDrawerId,
                    secretWord: '',
                    startedAt: Date.now()
                  });
                  
                  transaction.update(roomRef, {
                      players,
                      status: 'word-selection',
                      currentRound: nextRound,
                  });
              }
          });
      }
  }

  /**
   * Resets a finished room to waiting state, clearing rounds, strokes and guesses,
   * and zeroing players' scores so everyone stays in the same room.
   */
  async restartGame(roomId: string) {
    if (!this.firestore) return;

    const roomRef = doc(this.firestore, `rooms/${roomId}`);
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) throw new Error("Room does not exist");

    const roomData = roomSnap.data() as Room;
    const resetPlayers = roomData.players.map(p => ({ ...p, score: 0 }));

    await Promise.all([
      this.clearCollection(`rooms/${roomId}/strokes`),
      this.clearCollection(`rooms/${roomId}/guesses`),
      this.clearCollection(`rooms/${roomId}/rounds`),
    ]);

    await updateDoc(roomRef, {
      players: resetPlayers,
      status: 'waiting',
      currentRound: 0,
    });
  }

  async updateMaxRounds(roomId: string, maxRounds: number) {
    if (!this.firestore) return;
    const safeMaxRounds = Math.min(15, Math.max(1, Math.floor(maxRounds) || 1));
    const roomRef = doc(this.firestore, `rooms/${roomId}`);
    // setDoc with merge to avoid issues if the doc is missing fields
    await setDoc(roomRef, { maxRounds: safeMaxRounds }, { merge: true });
  }

  async getWordsToChoose(roomId?: string): Promise<string[]> {
    const shuffled = [...biblicalWords].sort(() => 0.5 - Math.random());
    if (!roomId || !this.firestore) {
      return shuffled.slice(0, 2);
    }

    try {
      const roundsSnap = await getDocs(collection(this.firestore, `rooms/${roomId}/rounds`));
      const used = new Set<string>();
      roundsSnap.forEach(docSnap => {
        const word = (docSnap.data().secretWord as string) || '';
        const norm = this.normalizeString(word);
        if (norm) used.add(norm);
      });

      const available = shuffled.filter(w => !used.has(this.normalizeString(w)));
      if (available.length >= 2) {
        return available.slice(0, 2);
      }

      const combined = [...available, ...shuffled].filter((w, idx, arr) => arr.indexOf(w) === idx);
      return combined.slice(0, 2);
    } catch (error) {
      console.error('Erro ao obter palavras já usadas:', error);
      return shuffled.slice(0, 2);
    }
  }
}
