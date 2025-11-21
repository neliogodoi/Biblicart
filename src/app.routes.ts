
import { Routes } from '@angular/router';

export const appRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent),
    title: 'BiblicArt - Welcome'
  },
  {
    path: 'room/:id',
    loadComponent: () => import('./components/room/room.component').then(m => m.RoomComponent),
    title: 'BiblicArt - Game Room'
  },
  { path: '**', redirectTo: '' }
];
