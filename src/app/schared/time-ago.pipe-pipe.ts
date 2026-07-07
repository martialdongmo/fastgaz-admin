import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timeAgoPipe',
})
export class TimeAgoPipePipe implements PipeTransform {

  transform(value: unknown, ...args: unknown[]): unknown {
    return null;
  }

}
