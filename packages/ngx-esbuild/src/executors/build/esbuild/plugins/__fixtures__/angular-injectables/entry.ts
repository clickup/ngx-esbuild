import { ApplicationRef, Injectable } from '@angular/core';
import { ReactComponent } from './react';

console.log(ReactComponent);

@Injectable()
export class MyService {
  constructor(private readonly appRef: ApplicationRef) {}
}
