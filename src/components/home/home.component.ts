import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FirebaseService } from '../../services/firebase.service';

@Component({
  standalone: true,
  imports: [FormsModule],
  templateUrl: './home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private firebaseService = inject(FirebaseService);
  private router = inject(Router);

  playerName = signal('');
  roomCode = signal('');
  maxRounds = signal(7);
  isLoading = signal(false);
  showJoinForm = signal(false);

  private handleRoomActionError(error: any, action: 'criar' | 'entrar'): void {
    console.error(`Error ao ${action} sala:`, error);
    if (error.code === 'auth/configuration-not-found') {
      alert('Erro de Configuração: O login anônimo não está habilitado no seu projeto Firebase.\n\nPara corrigir, vá ao seu Console do Firebase > Authentication > Sign-in method e habilite o provedor "Anônimo".');
    } else if (error.code === 'permission-denied') {
        alert('Erro de Permissão: Suas Regras de Segurança do Firestore estão bloqueando a ação.\n\nIsso é comum na configuração inicial. Para corrigir, acesse seu painel do Firebase:\n1. Vá para "Firestore Database".\n2. Clique na aba "Regras".\n3. Substitua o conteúdo pelas seguintes regras e clique em "Publicar":\n\nrules_version = \'2\';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} {\n      allow read, write: if request.auth != null;\n    }\n  }\n}');
    } else {
      alert(`Falha ao ${action} sala: ${error.message}`);
    }
  }

  async createRoom() {
    if (!this.playerName() || this.isLoading()) return;
    this.isLoading.set(true);
    try {
      const roomId = await this.firebaseService.createRoom(this.playerName(), this.maxRounds());
      if (roomId) {
        this.router.navigate(['/room', roomId]);
      } else {
        alert('Não foi possível criar a sala.');
      }
    } catch (error: any) {
      this.handleRoomActionError(error, 'criar');
    } finally {
      this.isLoading.set(false);
    }
  }

  updateMaxRounds(value: number | string) {
    const parsed = Math.floor(Number(value));
    const clamped = Math.min(15, Math.max(1, isNaN(parsed) ? 1 : parsed));
    this.maxRounds.set(clamped);
  }

  async joinRoom() {
    if (!this.playerName() || !this.roomCode() || this.isLoading()) return;
    this.isLoading.set(true);
    try {
      const roomId = await this.firebaseService.joinRoom(this.roomCode(), this.playerName());
      if (roomId) {
        this.router.navigate(['/room', roomId]);
      }
    } catch (error: any) {
      this.handleRoomActionError(error, 'entrar');
    } finally {
      this.isLoading.set(false);
    }
  }
}
