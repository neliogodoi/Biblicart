
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, AfterViewInit, inject, effect, OnDestroy, signal } from '@angular/core';
import { GameService } from '../../../services/game.service';
import { FirebaseService } from '../../../services/firebase.service';
import { Stroke } from '../../../interfaces/game';

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [],
  templateUrl: './canvas.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CanvasComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  
  gameService = inject(GameService);
  firebaseService = inject(FirebaseService);

  private ctx!: CanvasRenderingContext2D;
  private isDrawing = false;
  private currentStroke: { x: number; y: number }[] = [];
  
  availableColors = ['#000000', '#EF4444', '#3B82F6', '#22C55E', '#EAB308', '#A16207'];
  availableThicknesses = [2, 5, 10];

  selectedColor = signal(this.availableColors[0]);
  selectedThickness = signal(this.availableThicknesses[1]);

  private resizeObserver: ResizeObserver;
  
  constructor() {
    effect(() => {
        // Redraw canvas when strokes from firestore change
        this.drawAllStrokes(this.gameService.strokes());
    });
    this.resizeObserver = new ResizeObserver(() => this.setCanvasSize());
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.resizeObserver.observe(canvas.parentElement!);
    this.setCanvasSize();
    this.addEventListeners();
    this.drawAllStrokes(this.gameService.strokes());
  }
  
  ngOnDestroy(): void {
    this.resizeObserver.disconnect();
  }

  setCanvasSize(): void {
    const canvas = this.canvasRef.nativeElement;
    const parent = canvas.parentElement!;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.drawAllStrokes(this.gameService.strokes());
  }

  private addEventListeners(): void {
    const canvas = this.canvasRef.nativeElement;
    canvas.addEventListener('mousedown', this.startDrawing.bind(this));
    canvas.addEventListener('mousemove', this.draw.bind(this));
    canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
    canvas.addEventListener('mouseout', this.stopDrawing.bind(this));
    canvas.addEventListener('touchstart', this.startDrawing.bind(this));
    canvas.addEventListener('touchmove', this.draw.bind(this));
    canvas.addEventListener('touchend', this.stopDrawing.bind(this));
  }

  private getCoords(event: MouseEvent | TouchEvent): { x: number; y: number } {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if (event instanceof MouseEvent) {
      clientX = event.clientX;
      clientY = event.clientY;
    } else {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    }
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  startDrawing(event: MouseEvent | TouchEvent): void {
    if (!this.gameService.isDrawer()) return;
    event.preventDefault();
    this.isDrawing = true;
    const { x, y } = this.getCoords(event);
    this.currentStroke.push({ x, y });
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.lineWidth = this.selectedThickness();
    this.ctx.strokeStyle = this.selectedColor();
  }

  draw(event: MouseEvent | TouchEvent): void {
    if (!this.isDrawing || !this.gameService.isDrawer()) return;
    event.preventDefault();
    const { x, y } = this.getCoords(event);
    this.currentStroke.push({ x, y });
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
  }

  stopDrawing(): void {
    if (!this.isDrawing || !this.gameService.isDrawer()) return;
    this.isDrawing = false;
    this.ctx.closePath();

    if (this.currentStroke.length > 1) {
      const stroke: Stroke = {
        points: this.currentStroke,
        color: this.selectedColor(),
        thickness: this.selectedThickness(),
      };
      this.firebaseService.addStroke(this.gameService.room()!.id, stroke);
    }
    this.currentStroke = [];
  }
  
  clearCanvas(): void {
    if(!this.gameService.isDrawer()) return;
    this.firebaseService.clearCanvas(this.gameService.room()!.id);
  }

  private drawAllStrokes(strokes: Stroke[]): void {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvasRef.nativeElement.width, this.canvasRef.nativeElement.height);
    strokes.forEach(stroke => {
      if(stroke.points.length < 2) return;
      this.ctx.beginPath();
      this.ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      this.ctx.lineWidth = stroke.thickness;
      this.ctx.strokeStyle = stroke.color;
      for (let i = 1; i < stroke.points.length; i++) {
        this.ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      this.ctx.stroke();
      this.ctx.closePath();
    });
  }
}
