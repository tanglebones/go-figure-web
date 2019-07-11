import { ActivatedRoute } from '@angular/router';
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';

import { ApiService } from '@app/api/api.service';

class Vector {
  start: {x: number, y: number} = {x: 0, y: 0};
  end: {x: number, y: number} = {x: 0, y: 0};
}

@Component({
  selector: 'iai-animator',
  templateUrl: './animator.component.html',
  styleUrls: ['./animator.component.scss']
})
export class AnimatorComponent implements OnInit {

  t: number;
  timeInterval: number = .005;
  run: boolean = false;
  timeout: number = 100;
  params: {n: number, c: number}[];
  vectors: Vector[];
  functionValues: {x: number, y: number, t: number, opacity: number}[] = [];
  offset: {x: number, y: number} = {x: 200, y: -200};
  pathTransparencyRatio: number = .4;

  @ViewChild('canvas') canvas: ElementRef;
  drawer: CanvasRenderingContext2D;

  constructor(private route: ActivatedRoute, private api: ApiService) { }

  ngOnInit() {
    let id = this.route.snapshot.paramMap.get('id');

    this.t = -1 * this.timeInterval;
    this.params = [
      {n: 0, c: 1},
      {n: 1, c: .5},
      {n: -1, c: .4},
      {n: 2, c: .3},
    ];

    this.vectors = this.params.map(() => new Vector);
  }

  ngAfterViewInit() {
    this.drawer = this.canvas.nativeElement.getContext('2d');
  }

  stop()  {
    this.run = false;
    this.t = -1 * this.timeInterval;
    this.functionValues = [];
  }

  pause()  {
    this.run = false;
  }

  start()  {
    if (this.run)
      return;

    this.run = true;

    this.animate();
  }

  animate() {
    if (!this.run)
      return;

    this.t += this.timeInterval;

    if (this.t >= 1)
      this.t -= 1;

    this.drawer.clearRect(0, 0, 500, 500)
    this.drawVectors();
    this.drawFunction();

    window.requestAnimationFrame(() => this.animate());
  }

  drawVectors() {
    this.drawer.lineWidth = 1;
    this.drawer.strokeStyle = 'rgba(0, 0, 0, 1)'

    this.drawer.beginPath();

    this.vectors.forEach((v: Vector, i: number) =>  {
      this.updateVector(v, i)
      this.drawVector(v);
    });

    this.drawer.stroke();
  }

  drawVector(v: Vector) {
    this.drawer.moveTo(this.offset.x + 100 * v.start.x, -1 * (this.offset.y + 100 * v.start.y));
    this.drawer.lineTo(this.offset.x + 100 * v.end.x, -1 * (this.offset.y + 100 * v.end.y));
  }

  drawFunction() {
    this.updateFunctionValues();

    let lastPoint;

    this.functionValues.forEach((point, i) =>  {
      if (i != 0) {
        this.drawer.lineWidth = 3;
        this.drawer.strokeStyle = "rgba(255, 165, 0, "  + point.opacity + ")"

        this.drawer.beginPath();
        this.drawer.moveTo(this.offset.x + 100 * lastPoint.x, -1 * (this.offset.y + 100 * lastPoint.y));
        this.drawer.lineTo(this.offset.x + 100 * point.x, -1 * (this.offset.y + 100 * point.y));
        this.drawer.stroke();
      }

      lastPoint = point;
    });
  }

  updateVector(v: Vector, index: number) {
    let params = this.params[index],
        val = 2 * Math.PI * params.n * this.t;

    v.start.x = index == 0 ? 0 : this.vectors[index-1].end.x;
    v.start.y = index == 0 ? 0 : this.vectors[index-1].end.y;
    v.end.x = v.start.x + params.c * Math.cos(val);
    v.end.y = v.start.y + params.c * Math.sin(val);
  }

  updateFunctionValues() {
    if (!this.vectors.length)
      return;

    this.appendNewFunctionValue();

    this.removeCyclicalFunctionValues();
    this.applyFunctionTransparency();
  }

  appendNewFunctionValue() {
    let lastVector = this.vectors[this.vectors.length - 1];

    this.functionValues.push({x: lastVector.end.x, y: lastVector.end.y, t: this.t, opacity: 1});
  }

  removeCyclicalFunctionValues() {
    let removeCount = 0;

    for (let i = 0; i < this.functionValues.length; ++i) {
      //remove points close to new point
      if (this.getNormalizedDistance(this.functionValues[i]) >= .99)
        removeCount++;

      else
        break;
    }

    if (removeCount)
      this.functionValues.splice(0, removeCount + 1)
  }

  applyFunctionTransparency() {
    let distance,
        transparencySlope = 1 / this.pathTransparencyRatio;

    for (let i = 0; i < this.functionValues.length; ++i) {
      distance = this.getNormalizedDistance(this.functionValues[i]);

      if (distance >= 1 - this.pathTransparencyRatio)
        this.functionValues[i].opacity = -1 * transparencySlope * distance + transparencySlope;

      else
        return;
    }
  }

  getNormalizedDistance(currentValue) {
    let lastTime = this.functionValues[this.functionValues.length - 1].t,
        currentTime = currentValue.t;

      if (currentTime > lastTime)
        lastTime += 1;

      return Math.abs(lastTime - currentTime);
  }

}
