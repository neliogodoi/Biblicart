import { Injectable, inject } from '@angular/core';
import {
  collection, addDoc, query, where, getDocs, doc, setDoc,
  writeBatch, updateDoc, increment, runTransaction, Firestore, getDoc, arrayUnion
} from 'firebase/firestore';
import { AuthService } from './auth.service';
import { Stroke, Guess, Player, Room } from '../interfaces/game';
import { biblicalWords } from '../data/words';
import { FIRESTORE } from '../firebase.providers';


@Injectable({ providedIn: 'root' })
export class FirebaseService {
  private authService = inject(AuthService);
  private firestore = inject(FIRESTORE);

  private async generateRoomCode(): Promise<string> {
    if (!this.firestore) throw new Error("Firestore not initialized");

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

  async createRoom(playerName: string): Promise<string> {
    const user = await this.authService.signIn();
    const roomCode = await this.generateRoomCode();
    
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
      maxRounds: 5,
      createdAt: Date.now(),
      players: [hostPlayer],
    };

    await setDoc(newRoomRef, newRoom);

    return newRoomRef.id;
  }

  async joinRoom(roomCode: string, playerName: string): Promise<string | null> {
    const user = await this.authService.signIn();

    const roomsRef = collection(this.firestore, 'rooms');
    const q = query(roomsRef, where('code', '==', roomCode.toUpperCase()), where('status', '==', 'waiting'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      alert('Room not found or game has already started.');
      return null;
    }

    const roomDoc = snapshot.docs[0];
    const roomRef = roomDoc.ref;
    const roomData = roomDoc.data() as Room;

    // Prevent joining if already in the room
    if (roomData.players && roomData.players.some(p => p.id === user.uid)) {
        return roomDoc.id; // Already in room, just return the ID.
    }
    
    const newPlayer: Player = {
        id: user.uid,
        name: playerName,
        score: 0,
        joinedAt: Date.now(),
    };

    try {
        await updateDoc(roomRef, {
            players: arrayUnion(newPlayer)
        });
        return roomDoc.id;
    } catch (error) {
        console.error("Failed to join room: ", error);
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

    getWordsToChoose(): string[] {
        const shuffled = biblicalWords.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, 2);
    }
}