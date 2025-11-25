
import { ChangeDetectionStrategy, Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService } from '../../../services/game.service';
import { FirebaseService } from '../../../services/firebase.service';
import { SoundService } from '../../../services/sound.service';

type IconRule = { keyword: string; icon: string };
const iconRules: IconRule[] = [
  { keyword: 'arca', icon: 'sailing' },
  { keyword: 'noe', icon: 'sailing' },
  { keyword: 'diluv', icon: 'water_drop' },
  { keyword: 'mar vermelho', icon: 'water' },
  { keyword: 'agua', icon: 'water_drop' },
  { keyword: 'rio', icon: 'water' },
  { keyword: 'mar', icon: 'water' },
  { keyword: 'moises', icon: 'man' },
  { keyword: 'sinai', icon: 'terrain' },
  { keyword: 'mandamento', icon: 'article' },
  { keyword: 'tabua', icon: 'article' },
  { keyword: 'sarca', icon: 'local_fire_department' },
  { keyword: 'fogo', icon: 'local_fire_department' },
  { keyword: 'coluna', icon: 'lightbulb' },
  { keyword: 'nuvem', icon: 'cloud' },
  { keyword: 'deserto', icon: 'wb_sunny' },
  { keyword: 'maná', icon: 'bakery_dining' },
  { keyword: 'mana', icon: 'bakery_dining' },
  { keyword: 'cajado', icon: 'sports_handball' },
  { keyword: 'trombeta', icon: 'music_note' },
  { keyword: 'muralha', icon: 'fort' },
  { keyword: 'jerico', icon: 'fort' },
  { keyword: 'arca da aliança', icon: 'inventory_2' },
  { keyword: 'alianca', icon: 'link' },
  { keyword: 'samuel', icon: 'record_voice_over' },
  { keyword: 'reino', icon: 'account_balance' },
  { keyword: 'rei', icon: 'account_balance' },
  { keyword: 'coroa', icon: 'military_tech' },
  { keyword: 'trono', icon: 'chair_alt' },
  { keyword: 'salomao', icon: 'account_balance' },
  { keyword: 'davi', icon: 'sports_martial_arts' },
  { keyword: 'golias', icon: 'security' },
  { keyword: 'pedra', icon: 'sports_baseball' },
  { keyword: 'estilingue', icon: 'sports_kabaddi' },
  { keyword: 'harpa', icon: 'music_note' },
  { keyword: 'gigante', icon: 'accessibility' },
  { keyword: 'leao', icon: 'pets' },
  { keyword: 'cova', icon: 'circle' },
  { keyword: 'fornalha', icon: 'local_fire_department' },
  { keyword: 'estatua', icon: 'architecture' },
  { keyword: 'ouro', icon: 'star_rate' },
  { keyword: 'farao', icon: 'emoticon' },
  { keyword: 'praga', icon: 'bug_report' },
  { keyword: 'egito', icon: 'temple_hindu' },
  { keyword: 'arado', icon: 'agriculture' },
  { keyword: 'camp', icon: 'holiday_village' },
  { keyword: 'tabernaculo', icon: 'holiday_village' },
  { keyword: 'templo', icon: 'account_balance' },
  { keyword: 'pomba', icon: 'flag' },
  { keyword: 'pentecostes', icon: 'whatshot' },
  { keyword: 'lingua de fogo', icon: 'whatshot' },
  { keyword: 'espirito', icon: 'bolt' },
  { keyword: 'anjo', icon: 'flutter_dash' },
  { keyword: 'estrela', icon: 'star' },
  { keyword: 'magos', icon: 'redeem' },
  { keyword: 'belém', icon: 'home' },
  { keyword: 'belem', icon: 'home' },
  { keyword: 'manjedoura', icon: 'crib' },
  { keyword: 'jesus', icon: 'church' },
  { keyword: 'cruz', icon: 'add' },
  { keyword: 'ressurrei', icon: 'auto_awesome' },
  { keyword: 'sepulcro', icon: 'door_sliding' },
  { keyword: 'tumba', icon: 'door_sliding' },
  { keyword: 'anastacio', icon: 'auto_awesome' },
  { keyword: 'pesca', icon: 'set_meal' },
  { keyword: 'peixe', icon: 'set_meal' },
  { keyword: 'pao', icon: 'local_pizza' },
  { keyword: 'vinho', icon: 'wine_bar' },
  { keyword: 'agua', icon: 'water_drop' },
  { keyword: 'cana', icon: 'wine_bar' },
  { keyword: 'casamento', icon: 'favorite' },
  { keyword: 'tempestade', icon: 'thunderstorm' },
  { keyword: 'barco', icon: 'directions_boat' },
  { keyword: 'rede', icon: 'gesture' },
  { keyword: 'moeda', icon: 'paid' },
  { keyword: 'tesouro', icon: 'treasure_chest' },
  { keyword: 'perola', icon: 'diamond' },
  { keyword: 'joio', icon: 'grass' },
  { keyword: 'trigo', icon: 'spa' },
  { keyword: 'pastor', icon: 'diversity_3' },
  { keyword: 'ovelha', icon: 'agriculture' },
  { keyword: 'perdida', icon: 'help_center' },
  { keyword: 'prodig', icon: 'family_restroom' },
  { keyword: 'figueira', icon: 'yard' },
  { keyword: 'videira', icon: 'forest' },
  { keyword: 'mostarda', icon: 'local_florist' },
  { keyword: 'fermento', icon: 'science' },
  { keyword: 'lampada', icon: 'light' },
  { keyword: 'azeite', icon: 'emoji_food_beverage' },
  { keyword: 'virgem', icon: 'female' },
  { keyword: 'noivo', icon: 'favorite' },
  { keyword: 'talento', icon: 'savings' },
  { keyword: 'denario', icon: 'savings' },
  { keyword: 'vinha', icon: 'park' },
  { keyword: 'torre', icon: 'cell_tower' },
  { keyword: 'pedra angular', icon: 'construction' },
  { keyword: 'chave', icon: 'vpn_key' },
  { keyword: 'porta', icon: 'door_front' },
  { keyword: 'caminho', icon: 'alt_route' },
  { keyword: 'estreita', icon: 'alt_route' },
  { keyword: 'larga', icon: 'alt_route' },
  { keyword: 'apocalipse', icon: 'warning' },
  { keyword: 'selo', icon: 'verified' },
  { keyword: 'trombeta', icon: 'music_note' },
  { keyword: 'cavalo', icon: 'emoji_nature' },
  { keyword: 'dragao', icon: 'cruelty_free' },
  { keyword: 'nova jerusalem', icon: 'location_city' },
  { keyword: 'arvore da vida', icon: 'forest' },
  { keyword: 'cordeiro', icon: 'downhill_skiing' },
  { keyword: 'alfa', icon: 'filter_1' },
  { keyword: 'omega', icon: 'filter_9_plus' },
  { keyword: 'batismo', icon: 'waves' },
  { keyword: 'pomba', icon: 'flag' },
  { keyword: 'tentacao', icon: 'warning_amber' },
  { keyword: 'deserto', icon: 'wb_sunny' },
  { keyword: 'bem-aventuranca', icon: 'menu_book' },
  { keyword: 'sermao', icon: 'menu_book' },
  { keyword: 'casa na rocha', icon: 'home' },
  { keyword: 'casa na areia', icon: 'home' },
  { keyword: 'tempestade', icon: 'thunderstorm' },
  { keyword: 'gafanhoto', icon: 'pest_control' },
  { keyword: 'mel', icon: 'icecream' },
  { keyword: 'coroa de espinhos', icon: 'grass' },
  { keyword: 'manto', icon: 'checkroom' },
  { keyword: 'lanca', icon: 'swords' },
  { keyword: 'vinagre', icon: 'local_drink' },
  { keyword: 'tumba', icon: 'door_sliding' },
  { keyword: 'jardim', icon: 'yard' },
  { keyword: 'ascensao', icon: 'airplanemode_active' },
  { keyword: 'nuvem', icon: 'cloud' },
  { keyword: 'prison', icon: 'lock' },
  { keyword: 'corrente', icon: 'link' },
  { keyword: 'terremoto', icon: 'earthquake' },
  { keyword: 'naufragio', icon: 'ship' },
  { keyword: 'cobra', icon: 'pest_control' },
  { keyword: 'ilha', icon: 'island' },
  { keyword: 'armadura', icon: 'sports_mma' },
  { keyword: 'capacete', icon: 'sports_mma' },
  { keyword: 'couraça', icon: 'shield' },
  { keyword: 'escudo', icon: 'shield' },
  { keyword: 'espada', icon: 'swords' },
  { keyword: 'cinto', icon: 'checkroom' },
  { keyword: 'sandalia', icon: 'hiking' },
  { keyword: 'fruto do espirito', icon: 'emoji_food_beverage' },
  { keyword: 'videira verdadeira', icon: 'forest' },
  { keyword: 'galileia', icon: 'landscape' },
  { keyword: 'nazare', icon: 'home' },
  { keyword: 'jerusalem', icon: 'location_city' },
  { keyword: 'oliveiras', icon: 'nature' },
  { keyword: 'getsemani', icon: 'park' },
  { keyword: 'poço', icon: 'water_drop' },
  { keyword: 'samaritana', icon: 'diversity_1' },
  { keyword: 'carpintaria', icon: 'handyman' },
  { keyword: 'martelo', icon: 'construction' },
  { keyword: 'pregos', icon: 'construction' },
  { keyword: 'inri', icon: 'text_fields' },
  { keyword: 'lenha', icon: 'local_fire_department' },
  { keyword: 'ovelhas', icon: 'agriculture' },
  { keyword: 'pastor', icon: 'diversity_3' },
  { keyword: 'anjo', icon: 'flutter_dash' },
  { keyword: 'estrela', icon: 'star' },
  { keyword: 'manjedoura', icon: 'crib' },
  { keyword: 'barra de ouro', icon: 'star_rate' },
  { keyword: 'incenso', icon: 'local_fire_department' },
  { keyword: 'mirra', icon: 'local_florist' },
  { keyword: 'palmeira', icon: 'park' },
  { keyword: 'juiza', icon: 'gavel' },
  { keyword: 'martelo', icon: 'gavel' },
  { keyword: 'capa', icon: 'checkroom' },
  { keyword: 'sandalia', icon: 'hiking' },
  { keyword: 'anel', icon: 'ring_volume' },
  { keyword: 'banquete', icon: 'dinner_dining' },
  { keyword: 'ceia', icon: 'restaurant' },
  { keyword: 'cálice', icon: 'wine_bar' },
  { keyword: 'lavapes', icon: 'shower' },
  { keyword: 'galo', icon: 'rooster' },
  { keyword: 'fogueira', icon: 'local_fire_department' },
  { keyword: 'espinho', icon: 'grass' },
  { keyword: 'vinagre', icon: 'local_drink' },
  { keyword: 'escada', icon: 'stairs' },
  { keyword: 'jacó', icon: 'man' },
  { keyword: 'jaco', icon: 'man' },
  { keyword: 'essa', icon: 'man' },
  { keyword: 'sunem', icon: 'home' },
  { keyword: 'viuva', icon: 'face_retouching_natural' },
  { keyword: 'azeite', icon: 'oil_barrel' },
  { keyword: 'machado', icon: 'build' },
  { keyword: 'viagem', icon: 'flight_takeoff' },
  { keyword: 'camelo', icon: 'pedal_bike' },
  { keyword: 'areia', icon: 'beach_access' },
  { keyword: 'mão', icon: 'pan_tool' },
  { keyword: 'parede', icon: 'wallpaper' },
  { keyword: 'cetro', icon: 'military_tech' },
  { keyword: 'carta', icon: 'mail' },
  { keyword: 'perdao', icon: 'favorite' },
];

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
  private sound = inject(SoundService);
  
  words = signal<string[]>([]);
  selectedWord = signal<string | null>(null);
  countdown = signal(20);
  loadingWords = signal(true);
  private timerId: any;

  async ngOnInit(): Promise<void> {
    const room = this.gameService.room();
    if (room) {
      this.words.set(await this.firebaseService.getWordsToChoose(room.id));
      // Clear the canvas for the new round when this component loads for the new drawer
      this.firebaseService.clearCanvas(room.id);
    } else {
      this.words.set(await this.firebaseService.getWordsToChoose());
    }
    this.loadingWords.set(false);
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
        this.sound.play('click');
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
      this.sound.play('alert');
      this.firebaseService.skipWordSelection(room.id);
    }
  }

  iconFor(word: string): string {
    const norm = word
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
    const rule = iconRules.find(r => norm.includes(r.keyword));
    return rule?.icon || 'palette';
  }
}
