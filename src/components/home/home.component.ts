import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FirebaseService } from '../../services/firebase.service';

@Component({
  standalone: true,
  imports: [FormsModule],
  templateUrl: './home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
  private firebaseService = inject(FirebaseService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  playerName = signal('');
  roomCode = signal('');
  maxRounds = signal(7);
  isLoading = signal(false);
  showJoinForm = signal(false);

  ngOnInit(): void {
    const codeParam = this.route.snapshot.queryParamMap.get('code');
    if (codeParam) {
      this.showJoinForm.set(true);
      this.roomCode.set(codeParam.toUpperCase());
    }
  }

  private handleRoomActionError(error: any, action: 'criar' | 'entrar'): void {
    console.error(`Error ao ${action} sala:`, error);
    if (error.code === 'auth/configuration-not-found') {
      alert('Erro de configuração: o login anônimo não está habilitado.\n\nAtive o provedor anônimo nas configurações de autenticação do seu projeto.');
    } else if (error.code === 'permission-denied') {
      alert('Erro de permissão: as regras de segurança estão bloqueando a ação.\n\nVerifique as regras do banco de dados e permita acesso para usuários autenticados.');
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
