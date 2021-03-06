import Tombola from "common/js/lib/tombola"
import SimplexNoise from "common/js/lib/class_perlin-simplex"
import Color from "common/js/lib/class_colorflex"

export let color = new Color();
let tombola = new Tombola();
export default class Paint {
  constructor(ctx, width, height, ratio, scale, col1, col2, col3, contrast, banding,addNoise,resetPaint,TAU) {
    this.i = -1;
    this.j = 0;
    this.completeCols = [];


    this.ctx = ctx;
    this.col1 = col1;
    this.col2 = col2;
    this.col3 = col3;

    this.ratio = ratio;
    this.noiseLevel = 4 * ratio;
    //this.noiseLevel = 255 * ratio;

    this.thickness = 3;

    this.addNoise = addNoise;

    this.resetPaint = resetPaint;

    this.TAU = TAU;

    // generate texture // 生成纹理
    this.simplex = new SimplexNoise(); // 实例化柏林噪点
    this.rowHeight = 135 * scale;
    this.height = Math.ceil(height);
    this.width = Math.ceil(width);


    this.contrast = contrast * 100;
    this.cells = this.width; // necessary?必要
    this.streakIndex = 0;
    this.rowOffset = 0;

    // make scale relative to canvas size //使尺寸相对于画布大小
    scale *= (Math.max(this.width, this.height) / (255 * ratio));
    this.wobbleHeight = tombola.rangeFloat(17, 26) * scale;
    this.driftHeight = 140 * scale;

    // total offset potential //总偏移潜力
    this.vertOffset = (this.rowHeight + this.wobbleHeight + this.driftHeight);

    this.banding = (banding || 0.8) * (scale / 1);
    this.pScale = this.banding / scale; // scale of chance percentage, color shift
    this.scale = scale * 400;

    // perlin scales //柏林噪音尺寸
    this.heightX = this.scale * 1.5;
    this.heightY = this.scale * 2;
    this.wobbleX = this.scale / 2;
    this.wobbleY = this.scale / 1.5;
    this.driftY = this.scale * 1.6;
    this.colorY = this.scale * 2;

    this.rows = this.height + (this.vertOffset * 2);
    this._newRow();
  }

  draw(speed) {

    // if there are rows to be drawn //如果有要绘制的行

    if (this.i < this.rows) {

      let ctx = this.ctx;
      // loop through rows * speed //循环行*速度
      let l = this.width * speed;
      for (let h = 0; h < l; h++) {

        // perlin noise offset // 柏林噪声偏移
        let y = this.simplex.noise(this.j / this.heightX, this.i / this.heightY) * this.rowHeight;
        let w = this.simplex.noise((this.j + 1000) / this.wobbleX, this.i / this.wobbleY) * this.wobbleHeight;
        let d = this.simplex.noise(2000, this.j / this.driftY) * this.driftHeight;
        let pos = this.i - this.vertOffset + (y + w + d);

        // don't render above screen // 不要在屏幕上方渲染
        if ((pos + this.thickness) < 0) {
          this._proceed();
          h--;
          continue;
        }

        // exit draw loop when screen is filled // 屏幕填满时退出绘制循环
        if (this.completeCols.length >= (this.width - 2)) {
          this.specks();
          this.i = this.rows;
          setTimeout( () => {
            this.resetPaint();
          }, 800);
          return;
        }

        // strike off complete filled columns // 打破完整的填充列
        if (pos >= this.height) {
          if (this.completeCols.indexOf(this.j) === -1) {
            this.completeCols.push(this.j);
          }
          this._proceed();
          continue;
        }

        // color value & contrast // 色彩值和对比度
        let n = this.simplex.noise(this.streakIndex, (this.j + this.rowOffset) / this.colorY);
        n += (Math.sign(n) * 0.01 * this.contrast);
        n = (n + 1) / 2; // normalise to range 0 - 1;

        // set blended fill color // 设置混合填充颜色
        let fillCol;
        if (n > 0.5) {
          n = (n - 0.5) * 2;
          fillCol = Color.blend2(this.col2, this.col3, n * 100);
        } else {
          n *= 2;
          fillCol = Color.blend2(this.col1, this.col2, n * 100);
        }

        // add noise to color // 添加噪点的颜色
        if (this.addNoise) {
          let noiseLvl = tombola.rangeFloat(-this.noiseLevel, this.noiseLevel);
          fillCol.R += noiseLvl;
          fillCol.G += noiseLvl;
          fillCol.B += noiseLvl;
        }


        // draw // 绘制
        color.fill(ctx, fillCol);
        ctx.fillRect(this.j, pos, 1, this.thickness);

        // done // 完成
        this._proceed();
      }

    }
  };

  _proceed() {
    this.j++;
    if (this.j >= this.width) {
      this._newRow();
    }
  };

  _newRow() {
    this.i++;
    this.j = 0;

    // progress perlin horizontal index for color // 进展perlin水平指数的颜色
    this.rowOffset += tombola.rangeFloat(-10, 10);

    // progress perlin vertical index for color // 进展perlin垂直指数的颜色
    let sm = 0.6;
    this.streakIndex += tombola.rangeFloat(-0.05 * sm, 0.05 * sm);
    if (tombola.percent(1.2 * this.pScale)) {
      this.streakIndex += tombola.rangeFloat(0.2 * sm, 0.3 * sm); // larger jump 更大的跳跃
    }
    else if (tombola.percent(0.7 * this.pScale)) {
      this.streakIndex += tombola.rangeFloat(1 * sm, 2 * sm); // larger still 更大
    }
  };

  specks() {

    // specks // 斑点
    if (tombola.percent(40)) {

      // number of clusters // 集群数量
      let clusterNo = tombola.weightedNumber([3, 2, 1, 1]);

      // scale // 尺寸
      let sc = this.scale / (1040 / this.ratio);
      let maxSize = 1.1;

      // color // 颜色
      let fillCol = Color.blend2(this.col1, this.col2, tombola.range(0, 50));
      color.fill(this.ctx, fillCol);

      // for each cluster of specks // 对于每个斑点群
      for (let j = 0; j < clusterNo; j++) {

        // number of specks // 斑点数量
        let speckNo = tombola.range(5, 11);

        // origin of cluster // 集群的起源
        let cx = tombola.range(0, this.cells);
        let cy = tombola.range(this.vertOffset, this.rows - this.vertOffset);

        // for each speck within this cluster // 对于此群集中的每个斑点
        for (let i = 0; i < speckNo; i++) {

          // size //
          let s = tombola.rangeFloat(0.1 * sc, 0.6 * sc);
          if (tombola.percent(10)) s = tombola.rangeFloat(0.6 * sc, 0.9 * sc);
          if (tombola.percent(2)) s = tombola.rangeFloat(0.9 * sc, maxSize * sc);


          // location // 位置
          let sm = (maxSize * sc) / s;
          let w = 23 * sm;
          let h = 4 * sm;
          let sx = cx + tombola.range(-w, w);
          let sy = cy + tombola.range(-h, h);

          // perlin offset matrix // 柏林偏移矩阵
          let y = this.simplex.noise(sx / this.heightX, sy / this.heightY) * this.rowHeight;
          w = this.simplex.noise((sx + 1000) / this.wobbleX, sy / this.wobbleY) * this.wobbleHeight;
          let d = this.simplex.noise(2000, sx / this.driftY) * this.driftHeight;
          sy += (y + w + d) - this.vertOffset;

          this.ctx.beginPath();
          this.ctx.arc(sx, sy, s, 0, this.TAU);
          this.ctx.fill();
        }
      }
    }
  };
}
