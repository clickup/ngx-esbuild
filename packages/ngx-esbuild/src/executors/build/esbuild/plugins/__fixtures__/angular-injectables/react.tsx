import { Component, ElementRef, Injector, ViewChild } from '@angular/core';
import { createRoot } from 'react-dom/client';

interface Props {
  injector: Injector;
}

export function App({ injector }: Props) {
  return <div />;
}

@Component({
  selector: 'react',
  template: `<div #container></div>`,
})
export class ReactComponent {
  @ViewChild('container', { static: true })
  container: ElementRef<HTMLDivElement> | undefined;

  constructor(private readonly injector: Injector) {}

  ngOnInit(): void {
    const root = createRoot(this.container?.nativeElement);
    root.render(<App injector={this.injector} />);
  }
}
