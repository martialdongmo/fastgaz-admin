import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'fcfaPipe',
})
export class FcfaPipePipe implements PipeTransform {

  transform(value: unknown, ...args: unknown[]): unknown {
    return null;
  }

}
