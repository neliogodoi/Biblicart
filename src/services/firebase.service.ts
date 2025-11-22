import { Injectable, inject } from '@angular/core';
import {
  collection, addDoc, query, where, getDocs, doc, setDoc,
  serverTimestamp, writeBatch, updateDoc, increment, runTransaction, Firestore, getDoc, arrayUnion
} from 'firebase/firestore';
import { AuthService } from './auth.service';
import { Stroke, Guess, Player } from '../interfaces/game';
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
    const roomsRef = collection(this.firestore, 'rooms');
    const newRoomRef = await addDoc(roomsRef, {
      code: roomCode,
      hostId: user.uid,
      status: 'waiting',
      currentRound: 0,
      maxRounds: 5,
      createdAt: serverTimestamp(),
      playerIds: [user.uid],
    });

    const playerRef = doc(this.firestore, `rooms/${newRoomRef.id}/players/${user.uid}`);
    await setDoc(playerRef, {
      name: playerName,
      score: 0,
      isHost: true,
      joinedAt: serverTimestamp(),
    });

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
    
    // Atomically add the new player's UID to the playerIds array.
    // This prevents race conditions if multiple players join at the same time.
    await updateDoc(roomDoc.ref, { 
      playerIds: arrayUnion(user.uid) 
    });

    const playerRef = doc(this.firestore, `rooms/${roomDoc.id}/players/${user.uid}`);
    await setDoc(playerRef, {
      name: playerName,
      score: 0,
      isHost: false,
      joinedAt: serverTimestamp(),
    });

    return roomDoc.id;
  }

  async startGame(roomId: string) {
    if (!this.firestore) return;

    const roomRef = doc(this.firestore, `rooms/${roomId}`);
    const roomDoc = await getDoc(roomRef);
    if (!roomDoc.exists()) throw new Error("Room doesn't exist");
    
    const playerIds = roomDoc.data().playerIds || [];
    if (playerIds.length < 2) return; 

    await updateDoc(roomRef, {
        status: 'word-selection',
        currentRound: 1,
    });
    
    const firstDrawerId = playerIds[0];
    const roundRef = doc(this.firestore, `rooms/${roomId}/rounds/1`);
    await setDoc(roundRef, {
        drawerId: firstDrawerId,
        secretWord: '',
        startedAt: serverTimestamp()
    });
  }
  
  async chooseWord(roomId: string, round: number, word: string) {
    if (!this.firestore) return;

    const roundRef = doc(this.firestore, `rooms/${roomId}/rounds/${round}`);
    await updateDoc(roundRef, { secretWord: word });

    const roomRef = doc(this.firestore, `rooms/${roomId}`);
    await updateDoc(roomRef, { status: 'playing' });
  }

  async addStroke(roomId: string, stroke: Stroke) {
    if (!this.firestore) return;
    await addDoc(collection(this.firestore, `rooms/${roomId}/strokes`), {
        ...stroke,
        createdAt: serverTimestamp()
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
          createdAt: serverTimestamp() as any
      };

      await addDoc(collection(this.firestore, `rooms/${roomId}/guesses`), guessPayload);

      if (isCorrect) {
          await runTransaction(this.firestore, async (transaction) => {
              const roomRef = doc(this.firestore, `rooms/${roomId}`);
              const roomDoc = await transaction.get(roomRef);
              if (!roomDoc.exists()) throw new Error("Room does not exist!");

              const roomData = roomDoc.data();
              const playerIds = roomData.playerIds as string[] || [];
              const currentRound = roomData.currentRound;
              const maxRounds = roomData.maxRounds;

              const guesserRef = doc(this.firestore, `rooms/${roomId}/players/${guess.playerId}`);
              const currentRoundRef = doc(this.firestore, `rooms/${roomId}/rounds/${currentRound}`);
              const currentRoundDoc = await transaction.get(currentRoundRef);
              if (!currentRoundDoc.exists()) throw new Error(`Round ${currentRound} doesn't exist`);

              const drawerId = currentRoundDoc.data().drawerId;
              const drawerPlayerRef = doc(this.firestore, `rooms/${roomId}/players/${drawerId}`);

              transaction.update(guesserRef, { score: increment(10) });
              transaction.update(drawerPlayerRef, { score: increment(5) });

              if (currentRound >= maxRounds) {
                  transaction.update(roomRef, { status: 'ended' });
              } else {
                  const nextRound = currentRound + 1;
                  transaction.update(roomRef, {
                      status: 'word-selection',
                      currentRound: nextRound,
                  });
                  
                  const currentDrawerIndex = playerIds.indexOf(drawerId);
                  const nextDrawerIndex = (currentDrawerIndex === -1 ? 0 : currentDrawerIndex + 1) % playerIds.length;
                  const nextDrawerId = playerIds[nextDrawerIndex];
                  
                  const nextRoundRef = doc(this.firestore, `rooms/${roomId}/rounds/${nextRound}`);
                  transaction.set(nextRoundRef, {
                    drawerId: nextDrawerId,
                    secretWord: '',
                    startedAt: serverTimestamp()
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